import type { ProductKind } from "../pricing.ts";
import type { OrderStatus } from "./status.ts";
import type { StoredOrder } from "./store.ts";

/**
 * Translation between the shape the application uses and the shape the
 * database uses.
 *
 * Kept pure and in its own file on purpose: this is the part of the Supabase
 * store that can actually be wrong in an interesting way — a field dropped
 * silently, a total read back from the wrong column, cents parsed as a string.
 * None of that needs a network to test, and none of it should have to wait for
 * somebody to connect a project before anyone finds out.
 */

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

/** The jsonb argument to the place_order() function in migration 0003. */
export type PlaceOrderPayload = {
  reference: string;
  status: OrderStatus;
  contact: { email: string; name: string; phone: string };
  address: {
    name: string;
    line1: string;
    line2: string;
    city: string;
    state: string;
    zip: string;
  };
  lines: {
    variant_ref: string;
    product_name: string;
    variant_name: string;
    product_kind: ProductKind;
    quantity: number;
    line_total_cents: number;
  }[];
  applied_bundles: { kind: ProductKind; label: string; count: number }[];
  subtotal_cents: number;
  savings_cents: number;
  delivery_cents: number;
  tax_cents: number;
  total_cents: number;
  is_hunterdon: boolean;
  gift_note: string;
  accepted_terms_version: string;
  placed_at: string;
};

export function toPlaceOrderPayload(order: StoredOrder): PlaceOrderPayload {
  return {
    reference: order.reference,
    status: order.status,
    contact: {
      email: order.contact.email,
      name: order.contact.name,
      phone: order.contact.phone,
    },
    address: {
      // The orders table has one name, and it is the name on the doorstep.
      // There is only one name on a ValidatedOrder, so this is it.
      name: order.contact.name,
      line1: order.address.line1,
      line2: order.address.line2,
      city: order.address.city,
      state: order.address.state,
      zip: order.address.zip,
    },
    lines: order.lines.map((line) => ({
      variant_ref: line.variantId,
      product_name: line.productName,
      variant_name: line.variantName,
      product_kind: line.kind,
      quantity: line.quantity,
      line_total_cents: line.lineTotalCents,
    })),
    applied_bundles: order.appliedBundles,
    subtotal_cents: order.subtotalCents,
    savings_cents: order.savingsCents,
    delivery_cents: order.deliveryCents,
    tax_cents: order.taxCents,
    total_cents: order.totalCents,
    is_hunterdon: order.inFreeCounty,
    gift_note: order.giftNote,
    accepted_terms_version: order.acceptedTermsVersion,
    placed_at: order.placedAt,
  };
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

/** One row of `orders`, joined to its customer, as selected by the store. */
export type OrderRow = {
  reference: string;
  status: string;
  subtotal_cents: number;
  savings_cents: number;
  delivery_cents: number;
  tax_cents: number;
  total_cents: number;
  delivery_name: string | null;
  delivery_line1: string | null;
  delivery_line2: string | null;
  delivery_city: string | null;
  delivery_state: string | null;
  delivery_zip: string | null;
  is_hunterdon: boolean | null;
  gift_note: string | null;
  accepted_terms_version: string | null;
  applied_bundles: unknown;
  placed_at: string;
  status_changed_at: string | null;
  customers: { email: string | null; name: string | null; phone: string | null } | null;
};

export type OrderItemRow = {
  variant_ref: string | null;
  product_name: string;
  variant_name: string;
  product_kind: string;
  quantity: number;
  line_total_cents: number;
};

/**
 * Nulls become empty strings, not "null" and not undefined.
 *
 * Every one of these columns is nullable in Postgres but non-optional in
 * TypeScript, and an order rendered with the word "null" where a flat number
 * should be is the kind of thing that reaches a customer.
 */
const text = (value: string | null | undefined): string => value ?? "";

const asKind = (value: string): ProductKind =>
  value === "bar" ? "bar" : "bonbon";

export function fromRows(order: OrderRow, items: OrderItemRow[]): StoredOrder {
  return {
    reference: order.reference,
    status: order.status as OrderStatus,
    contact: {
      email: text(order.customers?.email),
      name: text(order.customers?.name ?? order.delivery_name),
      phone: text(order.customers?.phone),
    },
    address: {
      line1: text(order.delivery_line1),
      line2: text(order.delivery_line2),
      city: text(order.delivery_city),
      state: text(order.delivery_state),
      zip: text(order.delivery_zip),
    },
    lines: items.map((item) => ({
      variantId: text(item.variant_ref),
      productName: item.product_name,
      variantName: item.variant_name,
      kind: asKind(item.product_kind),
      quantity: item.quantity,
      lineTotalCents: item.line_total_cents,
    })),
    /*
      jsonb comes back as `unknown`. It was written by this application, but
      "we wrote it" is not the same as "it is still the shape we wrote" — a
      migration, a manual edit in the Supabase table editor, or an older
      version of this code could all have put something else there. An order
      page that throws because a summary field is malformed helps nobody.
    */
    appliedBundles: Array.isArray(order.applied_bundles)
      ? (order.applied_bundles as StoredOrder["appliedBundles"])
      : [],
    subtotalCents: order.subtotal_cents,
    savingsCents: order.savings_cents,
    deliveryCents: order.delivery_cents,
    taxCents: order.tax_cents,
    totalCents: order.total_cents,
    inFreeCounty: order.is_hunterdon === true,
    giftNote: text(order.gift_note),
    acceptedTermsVersion: text(order.accepted_terms_version),
    placedAt: order.placed_at,
    statusChangedAt: order.status_changed_at,
  };
}

/** The column list the store selects. Kept beside the row type it produces. */
export const ORDER_SELECT =
  "reference, status, subtotal_cents, savings_cents, delivery_cents, " +
  "tax_cents, total_cents, delivery_name, delivery_line1, delivery_line2, " +
  "delivery_city, delivery_state, delivery_zip, is_hunterdon, gift_note, " +
  "accepted_terms_version, applied_bundles, placed_at, status_changed_at, " +
  "customers ( email, name, phone ), " +
  "order_items ( variant_ref, product_name, variant_name, product_kind, " +
  "quantity, line_total_cents )";
