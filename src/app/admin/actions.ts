"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PRODUCTS } from "@/lib/catalog";
import { type ProductKind } from "@/lib/pricing";
import { validateCheckout } from "@/lib/checkout";
import { checkoutDeps } from "@/lib/checkoutDeps";
import { makeOrderReference } from "@/lib/orderReference";
import { orderStore } from "@/lib/orders/store";
import { isOrderStatus } from "@/lib/orders/status";
import { requireAdmin, signIn, signOut, LOGIN_PATH } from "@/lib/admin/auth";
import { settingsStore } from "@/lib/settings/store";
import { getStorefrontSettings } from "@/lib/settings/resolve";
import { SETTINGS_VERSION, type SettingsOverrides } from "@/lib/settings/types";
import {
  applyProductOverrides,
  parseDollarsToCents,
  parseOunces,
  unweighedVariantNames,
  validateTierDrafts,
  validateWeightTierDrafts,
  validateZipList,
  type FieldIssue,
  type TierDraft,
  type WeightTierDraft,
} from "@/lib/settings/apply";

/**
 * Every admin Server Action.
 *
 * A Server Action is a public endpoint. It can be invoked by anyone who knows
 * its id, without ever loading the page it was written for, so EVERY action
 * here calls requireAdmin() first. The guard in the layout is for the person
 * clicking; this one is the one that actually holds.
 */

export type ActionState = { ok?: true; issues?: FieldIssue[]; message?: string };

const issue = (field: string, message: string): ActionState => ({
  issues: [{ field, message }],
});

/**
 * Rebuild everything after a settings change.
 *
 * Prices, availability and delivery rules appear on the home page, the shop,
 * every product page, the cart and the checkout — which is all of it. Naming
 * individual paths here would mean remembering to add the next one, and
 * forgetting would leave a stale price on a page nobody thought about.
 */
function revalidateStorefront(): void {
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export async function loginAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const password = String(formData.get("password") ?? "");
  const result = await signIn(password);
  if (!result.ok) return issue("password", result.message);
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await signOut();
  redirect(LOGIN_PATH);
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export async function setOrderStatusAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const reference = String(formData.get("reference") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  if (!isOrderStatus(status)) {
    return issue("status", "That is not a status this site uses.");
  }

  const updated = await orderStore.setStatus(reference, status, new Date().toISOString());
  if (!updated) {
    return issue("reference", "That order is not here any more. Reload the list.");
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${reference}`);
  return { ok: true, message: "Status saved." };
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

async function patchSettings(
  change: (current: SettingsOverrides) => SettingsOverrides,
): Promise<void> {
  const current = await settingsStore.read();
  const next = change(current);
  await settingsStore.write({
    ...next,
    version: SETTINGS_VERSION,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Availability and packaged weights.
 *
 * Names, descriptions, flavors and allergens are NOT editable here and are not
 * read from this form. They live in code, where a change is reviewed — an
 * allergen list is not something to retype into a text box.
 */
export async function saveProductsAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const issues: FieldIssue[] = [];
  const products: SettingsOverrides["products"] = {};

  // Driven by the catalog, not by what the form happened to send: an unchecked
  // checkbox submits nothing at all, so "absent" has to mean "off" and that is
  // only safe if we know the full list of checkboxes that existed.
  for (const product of PRODUCTS) {
    const variants: Record<string, { isAvailable: boolean; packagedWeightOz: number | null }> = {};

    for (const variant of product.variants) {
      const key = `${product.slug}/${variant.slug}`;
      const weight = parseOunces(String(formData.get(`weight:${key}`) ?? ""));
      if (!weight.ok) {
        issues.push({ field: `weight:${key}`, message: weight.message });
        continue;
      }
      variants[variant.slug] = {
        isAvailable: formData.has(`available:${key}`),
        packagedWeightOz: weight.value,
      };
    }

    products[product.slug] = {
      isAvailable: formData.has(`available:${product.slug}`),
      variants,
    };
  }

  if (issues.length > 0) return { issues };

  /**
   * The weight guard, in the other direction.
   *
   * Weight tiers may already be switched on. Clearing a weight while they are
   * would make the delivery engine refuse every order containing that flavor,
   * so it is refused here instead — with the reason, rather than as a mystery
   * at someone's checkout.
   */
  const settings = await getStorefrontSettings();
  if (settings.delivery.weightTiers.length > 0) {
    const after = applyProductOverrides(PRODUCTS, {
      ...(await settingsStore.read()),
      products,
    });
    const unweighed = unweighedVariantNames(after);
    if (unweighed.length > 0) {
      return issue(
        "weights",
        `Delivery is priced by weight at the moment, so every flavor needs one. ${unweighed.join(", ")} would be left without a packaged weight, and orders containing ${unweighed.length === 1 ? "it" : "them"} could not be delivered at all.`,
      );
    }
  }

  await patchSettings((current) => ({ ...current, products }));
  revalidateStorefront();
  return { ok: true, message: "Saved." };
}

function readTierDrafts(formData: FormData, kind: ProductKind): TierDraft[] {
  const rows = Number(formData.get(`tierRows:${kind}`) ?? 0);
  const drafts: TierDraft[] = [];
  for (let index = 0; index < rows; index++) {
    drafts.push({
      size: String(formData.get(`tier:${kind}:${index}:size`) ?? ""),
      price: String(formData.get(`tier:${kind}:${index}:price`) ?? ""),
      label: String(formData.get(`tier:${kind}:${index}:label`) ?? ""),
    });
  }
  return drafts;
}

export async function savePricingAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const issues: FieldIssue[] = [];
  const tiers: SettingsOverrides["tiers"] = {};

  for (const kind of ["bonbon", "bar"] as const) {
    const result = validateTierDrafts(readTierDrafts(formData, kind), kind);
    if (!result.ok) {
      issues.push(...result.issues);
      continue;
    }
    tiers[kind] = result.tiers;
  }

  if (issues.length > 0) return { issues };

  await patchSettings((current) => ({ ...current, tiers }));
  revalidateStorefront();
  return { ok: true, message: "Prices saved. They are live on the site now." };
}

export async function saveDeliveryAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const issues: FieldIssue[] = [];

  const standardCents = parseDollarsToCents(String(formData.get("standard") ?? ""));
  if (standardCents === null) {
    issues.push({ field: "standard", message: "That is not a price. Try 5.99." });
  }

  const alwaysFree = formData.has("alwaysFree");
  const thresholdCents = parseDollarsToCents(String(formData.get("threshold") ?? ""));
  if (thresholdCents === null) {
    issues.push({
      field: "threshold",
      message: "That is not a price. Try 50, or 0 for no minimum.",
    });
  }

  const freeZips = validateZipList(String(formData.get("freeZips") ?? ""), "freeZips");
  if (!freeZips.ok) issues.push(...freeZips.issues);

  const excludedZips = validateZipList(
    String(formData.get("excludedZips") ?? ""),
    "excludedZips",
  );
  if (!excludedZips.ok) issues.push(...excludedZips.issues);

  const weightRows = Number(formData.get("wtRows") ?? 0);
  const weightDrafts: WeightTierDraft[] = [];
  for (let index = 0; index < weightRows; index++) {
    weightDrafts.push({
      maxOunces: String(formData.get(`wt:${index}:oz`) ?? ""),
      price: String(formData.get(`wt:${index}:price`) ?? ""),
    });
  }

  // Measured against the EFFECTIVE products, so weights the owner entered a
  // moment ago on the Products page count.
  const settings = await getStorefrontSettings();
  const weightTiers = validateWeightTierDrafts(
    weightDrafts,
    unweighedVariantNames(settings.products),
  );
  if (!weightTiers.ok) issues.push(...weightTiers.issues);

  if (issues.length > 0 || !freeZips.ok || !excludedZips.ok || !weightTiers.ok) {
    return { issues };
  }

  await patchSettings((current) => ({
    ...current,
    delivery: {
      standardCents: standardCents!,
      freeCounty: {
        alwaysFree,
        thresholdCents: thresholdCents!,
        thresholdInclusive: formData.has("thresholdInclusive"),
      },
      freeCountyZips: freeZips.zips,
      excludedZips: excludedZips.zips,
      weightTiers: weightTiers.tiers,
    },
  }));

  revalidateStorefront();
  return { ok: true, message: "Delivery rules saved." };
}

/**
 * Put everything back to the values in the code.
 *
 * The escape hatch for a settings change that broke something: one click, and
 * the site is running on Schedule A and the delivery config in the repository
 * again.
 */
export async function resetSettingsAction(): Promise<ActionState> {
  await requireAdmin();
  await settingsStore.write({
    version: SETTINGS_VERSION,
    products: {},
    tiers: {},
    delivery: {},
    updatedAt: new Date().toISOString(),
  });
  revalidateStorefront();
  return { ok: true, message: "Back to the prices and rules in the code." };
}

// ---------------------------------------------------------------------------
// Development only
// ---------------------------------------------------------------------------

/**
 * Put one obviously-fake order in the list.
 *
 * There is no Stripe key yet, so checkout refuses every order and the order
 * screens have nothing to show. This exists so the owner can see what an order
 * looks like and try the status buttons before the first real one arrives.
 *
 * Built through validateCheckout with the real dependencies, so it is a
 * genuinely valid order rather than a hand-made object that agrees with
 * nothing. The customer name says what it is, in as many words, so it can
 * never be mistaken for a real one.
 *
 * Guarded twice: the button only renders in development, and the action checks
 * again — a Server Action is a public endpoint and the button is not the lock.
 */
export async function seedSampleOrderAction(): Promise<ActionState> {
  await requireAdmin();

  if (process.env.NODE_ENV !== "development") {
    return issue("sample", "Sample orders can only be made on a development machine.");
  }

  const settings = await getStorefrontSettings();
  const sellable = settings.products.flatMap((product) =>
    product.variants
      .filter((variant) => product.isAvailable && variant.isAvailable)
      .map((variant) => `${product.slug}/${variant.slug}`),
  );

  if (sellable.length === 0) {
    return issue("sample", "Everything is marked sold out, so there is nothing to put in a sample order.");
  }

  const result = validateCheckout(
    {
      contact: {
        name: "SAMPLE ORDER — not a real customer",
        email: "sample@example.invalid",
        phone: "000-000-0000",
      },
      address: {
        line1: "1 Sample Street",
        line2: "",
        city: "Flemington",
        state: "NJ",
        // A Hunterdon ZIP, so the sample exercises the free-delivery path.
        zip: "08822",
      },
      items: sellable.slice(0, 2).map((variantId, index) => ({
        variantId,
        quantity: index === 0 ? 3 : 2,
      })),
      giftNote: "This order was created by the Add a sample order button.",
    },
    await checkoutDeps(() => makeOrderReference()),
  );

  if (!result.ok) {
    return issue("sample", result.issues[0]?.message ?? "Could not build a sample order.");
  }

  await orderStore.save({
    ...result.order,
    status: "new",
    placedAt: new Date().toISOString(),
    statusChangedAt: null,
  });

  revalidatePath("/admin/orders");
  return { ok: true, message: `Sample order ${result.order.reference} added.` };
}
