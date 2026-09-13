/**
 * Server-side checkout validation.
 *
 * THE RULE: nothing that arrives from the browser is trusted. Not the prices,
 * not the totals, not the delivery cost, not the tax, and not the state. The
 * request carries variant ids and quantities and an address; every figure is
 * recomputed here from the catalog and the engines.
 *
 * Pure and testable — no React, no database, no network, no clock. Everything
 * it depends on is injected, including the reference generator, so a test can
 * assert on an exact order.
 */

import {
  priceCart,
  TIERS_BY_KIND,
  type BundleTier,
  type CartItem,
  type ProductKind,
} from "./pricing.ts";
import { quoteDelivery, totalPackagedWeightOz } from "./delivery.ts";
import { calculateTax, type TaxConfig } from "./tax.ts";
import type { DeliveryConfig } from "@/config/delivery";

export type CheckoutContact = {
  email: string;
  name: string;
  phone: string;
};

export type CheckoutAddress = {
  line1: string;
  line2: string;
  city: string;
  state: string;
  zip: string;
};

/** Exactly what the browser is allowed to say. Note: no prices. */
export type CheckoutRequest = {
  contact: CheckoutContact;
  address: CheckoutAddress;
  items: { variantId: string; quantity: number }[];
  giftNote: string;
};

export type VariantRecord = {
  variantId: string;
  productName: string;
  variantName: string;
  kind: ProductKind;
  packagedWeightOz: number | null;
  isAvailable: boolean;
};

export type CheckoutDeps = {
  lookupVariant: (variantId: string) => VariantRecord | undefined;
  deliveryConfig: DeliveryConfig;
  /**
   * Bundle prices in force right now. Injected rather than imported, because
   * the owner can edit them from the admin and the charge has to use what
   * they last saved. Omitted means the defaults in code.
   */
  tiersByKind?: Record<ProductKind, readonly BundleTier[]>;
  taxConfig: TaxConfig;
  /** Injected so tests get a deterministic reference. */
  makeReference: () => string;
  maxLineQuantity: number;
};

export type ValidationIssue = {
  /** Dotted path, e.g. "contact.email", so a form can put it in the right place. */
  field: string;
  message: string;
};

export type OrderLine = {
  variantId: string;
  productName: string;
  variantName: string;
  kind: ProductKind;
  quantity: number;
  lineTotalCents: number;
};

export type ValidatedOrder = {
  reference: string;
  contact: CheckoutContact;
  address: CheckoutAddress;
  lines: OrderLine[];
  appliedBundles: { kind: ProductKind; label: string; count: number }[];
  subtotalCents: number;
  savingsCents: number;
  deliveryCents: number;
  taxCents: number;
  totalCents: number;
  inFreeCounty: boolean;
  giftNote: string;
};

export type CheckoutResult =
  | { ok: true; order: ValidatedOrder }
  | { ok: false; issues: ValidationIssue[] };

/**
 * Deliberately permissive: shape only, no attempt to decide whether an address
 * can receive mail. Over-strict email validation rejects real addresses, and
 * the only real proof is sending to it.
 */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const MAX_LENGTHS = {
  name: 120,
  email: 254,
  phone: 40,
  line1: 200,
  line2: 200,
  city: 100,
  giftNote: 500,
} as const;

const clean = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

export function validateCheckout(
  request: CheckoutRequest,
  deps: CheckoutDeps,
): CheckoutResult {
  const issues: ValidationIssue[] = [];

  // ---- Contact -----------------------------------------------------------
  const contact: CheckoutContact = {
    name: clean(request.contact?.name),
    email: clean(request.contact?.email).toLowerCase(),
    phone: clean(request.contact?.phone),
  };

  if (contact.name === "") {
    issues.push({ field: "contact.name", message: "Please tell us your name." });
  } else if (contact.name.length > MAX_LENGTHS.name) {
    issues.push({ field: "contact.name", message: "That name is too long." });
  }

  if (contact.email === "") {
    issues.push({ field: "contact.email", message: "We need an email to send your confirmation." });
  } else if (contact.email.length > MAX_LENGTHS.email || !EMAIL_SHAPE.test(contact.email)) {
    issues.push({ field: "contact.email", message: "That does not look like an email address." });
  }

  if (contact.phone === "") {
    issues.push({ field: "contact.phone", message: "A phone number helps us find you on delivery day." });
  } else if (contact.phone.length > MAX_LENGTHS.phone) {
    issues.push({ field: "contact.phone", message: "That phone number is too long." });
  }

  // ---- Address -----------------------------------------------------------
  const address: CheckoutAddress = {
    line1: clean(request.address?.line1),
    line2: clean(request.address?.line2),
    city: clean(request.address?.city),
    state: clean(request.address?.state).toUpperCase(),
    zip: clean(request.address?.zip),
  };

  if (address.line1 === "") {
    issues.push({ field: "address.line1", message: "We need a street address." });
  } else if (address.line1.length > MAX_LENGTHS.line1) {
    issues.push({ field: "address.line1", message: "That address line is too long." });
  }
  if (address.line2.length > MAX_LENGTHS.line2) {
    issues.push({ field: "address.line2", message: "That address line is too long." });
  }
  if (address.city === "") {
    issues.push({ field: "address.city", message: "We need a town or city." });
  } else if (address.city.length > MAX_LENGTHS.city) {
    issues.push({ field: "address.city", message: "That town name is too long." });
  }

  const giftNote = clean(request.giftNote).slice(0, MAX_LENGTHS.giftNote);

  // ---- Items -------------------------------------------------------------
  // Rebuilt from the catalog. The browser supplies ids and quantities only.
  const items: CartItem[] = [];
  const records = new Map<string, VariantRecord>();

  if (!Array.isArray(request.items) || request.items.length === 0) {
    issues.push({ field: "items", message: "Your cart is empty." });
  } else {
    for (const raw of request.items) {
      const variantId = clean(raw?.variantId);
      const record = variantId ? deps.lookupVariant(variantId) : undefined;

      if (!record) {
        issues.push({
          field: "items",
          message: "Something in your cart is no longer available. Please review it and try again.",
        });
        continue;
      }
      if (!record.isAvailable) {
        issues.push({
          field: "items",
          message: `${record.variantName} has sold out. Please remove it and try again.`,
        });
        continue;
      }

      const quantity = Math.floor(Number(raw?.quantity));
      if (!Number.isFinite(quantity) || quantity < 1) {
        issues.push({ field: "items", message: `Please choose a quantity for ${record.variantName}.` });
        continue;
      }
      if (quantity > deps.maxLineQuantity) {
        issues.push({
          field: "items",
          message: `We can only take ${deps.maxLineQuantity} of ${record.variantName} in one order.`,
        });
        continue;
      }

      records.set(variantId, record);
      const existing = items.find((i) => i.variantId === variantId);
      if (existing) existing.quantity += quantity;
      else
        items.push({
          variantId,
          kind: record.kind,
          flavorName: record.variantName,
          quantity,
        });
    }
  }

  // Pricing and delivery both need a valid cart, so stop here if it is not.
  if (issues.length > 0 || items.length === 0) {
    return {
      ok: false,
      issues: issues.length > 0 ? issues : [{ field: "items", message: "Your cart is empty." }],
    };
  }

  // ---- Recompute every figure -------------------------------------------
  const price = priceCart(items, deps.tiersByKind ?? TIERS_BY_KIND);

  const weight = totalPackagedWeightOz(
    items.map((item) => ({
      quantity: item.quantity,
      packagedWeightOz: records.get(item.variantId)?.packagedWeightOz ?? null,
    })),
  );

  const delivery = quoteDelivery(
    {
      address: { state: address.state, zip: address.zip },
      subtotalCents: price.subtotalCents,
      totalWeightOz: weight,
    },
    deps.deliveryConfig,
  );

  // THE STATE GATE, server side. The browser already refused out-of-state
  // addresses, but the browser is not where this decision is allowed to live.
  if (delivery.kind === "unavailable") {
    return {
      ok: false,
      issues: [
        {
          field: delivery.reason === "out_of_state" ? "address.state" : "address.zip",
          message: delivery.message,
        },
      ],
    };
  }

  if (delivery.kind === "needs_weight") {
    return { ok: false, issues: [{ field: "items", message: delivery.message }] };
  }

  const tax = calculateTax(
    { taxableGoodsCents: price.subtotalCents, deliveryCents: delivery.costCents },
    deps.taxConfig,
  );

  const lines: OrderLine[] = price.groups.flatMap((group) =>
    group.allocations.map((allocation) => {
      const record = records.get(allocation.variantId)!;
      return {
        variantId: allocation.variantId,
        productName: record.productName,
        variantName: record.variantName,
        kind: group.kind,
        quantity: allocation.quantity,
        lineTotalCents: allocation.allocatedCents,
      };
    }),
  );

  const appliedBundles = price.groups.flatMap((group) =>
    group.price.bundles
      .filter((bundle) => bundle.size > 1)
      .map((bundle) => ({ kind: group.kind, label: bundle.label, count: bundle.count })),
  );

  return {
    ok: true,
    order: {
      reference: deps.makeReference(),
      contact,
      address,
      lines,
      appliedBundles,
      subtotalCents: price.subtotalCents,
      savingsCents: price.savingsCents,
      deliveryCents: delivery.costCents,
      taxCents: tax.taxCents,
      totalCents: price.subtotalCents + delivery.costCents + tax.taxCents,
      inFreeCounty: delivery.inFreeCounty,
      giftNote,
    },
  };
}
