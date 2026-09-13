/**
 * Applying and validating admin overrides.
 *
 * Pure and testable, like the pricing and delivery engines. Nothing here reads
 * a database, a clock, or the environment.
 *
 * Two jobs, and the second one matters more than the first:
 *
 *   1. Merge overrides onto the defaults.
 *   2. REFUSE overrides that would break the storefront.
 *
 * (2) is the real work. The pricing engine throws when a tier table has no
 * size-1 tier, and the delivery engine refuses to quote at all once weight
 * tiers exist but a SKU has no weight. Either mistake is two clicks away in a
 * form, and either one takes down every product page or every checkout. So the
 * validation here is deliberately strict, and its messages say what to do.
 */

import type { BundleTier, ProductKind } from "../pricing.ts";
import type { Product } from "../catalog.ts";
import type { DeliveryConfig, WeightTier } from "@/config/delivery";
import type { SettingsOverrides } from "./types.ts";

export type FieldIssue = { field: string; message: string };

// ---------------------------------------------------------------------------
// Money parsing
// ---------------------------------------------------------------------------

/**
 * "15", "15.5", "$15.00" -> 1500. Null when it is not a price.
 *
 * String parsing rather than Math.round(parseFloat(x) * 100), because that
 * route goes through a float and money never goes through a float here.
 */
export function parseDollarsToCents(input: string): number | null {
  const trimmed = input.trim().replace(/^\$/, "");

  // Commas are allowed only where a thousands separator belongs. Stripping
  // every comma first would quietly read "1,2,3" as $123.
  const grouped = /^\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?$/.test(trimmed);
  const plain = /^\d+(?:\.\d{1,2})?$/.test(trimmed);
  if (!grouped && !plain) return null;

  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(trimmed.replace(/,/g, ""));
  if (!match) return null;

  const dollars = Number(match[1]);
  const fraction = (match[2] ?? "").padEnd(2, "0");
  return dollars * 100 + Number(fraction);
}

/** Integer cents to a plain "15.00", for populating a form field. */
export function centsToDollarInput(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

/** The label we suggest when the owner leaves one blank. */
export function defaultTierLabel(size: number, priceCents: number): string {
  const price = `$${Math.floor(priceCents / 100)}${
    priceCents % 100 === 0 ? "" : `.${String(priceCents % 100).padStart(2, "0")}`
  }`;
  return size === 1 ? `${price} each` : `${size} for ${price}`;
}

/**
 * A packaged weight in ounces. Blank means "not weighed yet", which is a real
 * answer and not the same as zero.
 *
 * The upper bound is a typo guard, not a policy: 1000 oz is 62 lb, so anything
 * above it is a slipped decimal point rather than a box of chocolates.
 */
export function parseOunces(
  input: string,
): { ok: true; value: number | null } | { ok: false; message: string } {
  const trimmed = input.trim();
  if (trimmed === "") return { ok: true, value: null };

  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    return { ok: false, message: `"${trimmed}" is not a weight in ounces.` };
  }
  if (value <= 0) {
    return {
      ok: false,
      message: "A packaged weight has to be more than zero. Leave it blank if it is not weighed yet.",
    };
  }
  if (value > 1000) {
    return { ok: false, message: `${value} oz is over 60 lb. Check the decimal point.` };
  }
  // Two decimals is a kitchen scale's resolution, and it matches the
  // numeric(6,2) column the weights land in.
  return { ok: true, value: Math.round(value * 100) / 100 };
}

// ---------------------------------------------------------------------------
// Tier validation
// ---------------------------------------------------------------------------

export type TierDraft = { size: string; price: string; label: string };

export type TierValidation =
  | { ok: true; tiers: BundleTier[] }
  | { ok: false; issues: FieldIssue[] };

/**
 * Turn raw form rows into a tier table, or explain why they are not one.
 *
 * A row with an empty size AND an empty price is an unused blank row in the
 * form, not an error — that is how a tier is deleted, and how the spare rows
 * at the bottom behave when nobody fills them in.
 */
export function validateTierDrafts(
  drafts: readonly TierDraft[],
  kind: ProductKind,
): TierValidation {
  const issues: FieldIssue[] = [];
  const tiers: BundleTier[] = [];
  const seenSizes = new Set<number>();

  drafts.forEach((draft, index) => {
    const sizeRaw = draft.size.trim();
    const priceRaw = draft.price.trim();
    const field = `tiers.${kind}.${index}`;

    if (sizeRaw === "" && priceRaw === "") return;

    if (sizeRaw === "" || priceRaw === "") {
      issues.push({
        field,
        message: "A price needs both a quantity and an amount. Clear both to remove it.",
      });
      return;
    }

    const size = Number(sizeRaw);
    if (!Number.isInteger(size) || size < 1) {
      issues.push({ field, message: `"${sizeRaw}" is not a whole number of pieces.` });
      return;
    }
    if (seenSizes.has(size)) {
      issues.push({
        field,
        message: `There is already a price for ${size}. Each quantity can only appear once.`,
      });
      return;
    }

    const priceCents = parseDollarsToCents(priceRaw);
    if (priceCents === null) {
      issues.push({ field, message: `"${priceRaw}" is not a price. Try 15 or 15.00.` });
      return;
    }
    if (priceCents < 1) {
      issues.push({ field, message: "A price has to be more than nothing." });
      return;
    }

    seenSizes.add(size);
    tiers.push({
      size,
      priceCents,
      label: draft.label.trim() || defaultTierLabel(size, priceCents),
    });
  });

  if (issues.length > 0) return { ok: false, issues };

  if (tiers.length === 0) {
    return {
      ok: false,
      issues: [{ field: `tiers.${kind}`, message: "There has to be at least one price." }],
    };
  }

  // THE SIZE-1 RULE. Without a single-unit price, priceQuantity() throws and
  // everything that prices this kind goes down with it — the shop, the product
  // page, the cart, and checkout. Caught here so the form can say so instead.
  const unit = tiers.find((tier) => tier.size === 1);
  if (!unit) {
    return {
      ok: false,
      issues: [
        {
          field: `tiers.${kind}`,
          message:
            "Keep a price for a single one. Every other price is worked out against it, and without it nothing on the site can be priced at all.",
        },
      ],
    };
  }

  // A bundle that costs no less than the same count bought singly would never
  // be chosen by the engine, so it would sit in the form doing nothing while
  // looking like an offer.
  for (const tier of tiers) {
    if (tier.size > 1 && tier.priceCents >= unit.priceCents * tier.size) {
      issues.push({
        field: `tiers.${kind}`,
        message: `${tier.size} for $${centsToDollarInput(tier.priceCents)} is not cheaper than ${tier.size} at the single price, so nobody would ever be charged it.`,
      });
    }
  }
  if (issues.length > 0) return { ok: false, issues };

  tiers.sort((a, b) => a.size - b.size);
  return { ok: true, tiers };
}

// ---------------------------------------------------------------------------
// Delivery validation
// ---------------------------------------------------------------------------

export type ZipListValidation =
  | { ok: true; zips: string[] }
  | { ok: false; issues: FieldIssue[] };

/**
 * Parse a pasted ZIP list. Commas, spaces and newlines all work, because the
 * owner will paste this out of a spreadsheet or an email rather than type it.
 *
 * Deduplicated and sorted, so the saved list is stable and the same ZIP
 * entered twice is not a reason to refuse the save.
 */
export function validateZipList(raw: string, field: string): ZipListValidation {
  const parts = raw
    .split(/[\s,;]+/)
    .map((part) => part.trim())
    .filter((part) => part !== "");

  const bad = parts.filter((part) => !/^\d{5}$/.test(part));
  if (bad.length > 0) {
    const shown = bad.slice(0, 3).join(", ");
    const rest = bad.length > 3 ? ` and ${bad.length - 3} more` : "";
    return {
      ok: false,
      issues: [
        {
          field,
          message:
            bad.length === 1
              ? `"${shown}" is not a five-digit ZIP code.`
              : `${shown}${rest} are not five-digit ZIP codes.`,
        },
      ],
    };
  }

  return { ok: true, zips: [...new Set(parts)].sort() };
}

export type WeightTierDraft = { maxOunces: string; price: string };

export type WeightTierValidation =
  | { ok: true; tiers: WeightTier[] }
  | { ok: false; issues: FieldIssue[] };

/**
 * Weight tiers, with the guard Step 6 asked for.
 *
 * `unweighedVariants` is every sellable variant with no packaged weight. If
 * that list is not empty, a non-empty tier table is REFUSED: the delivery
 * engine answers "needs_weight" for any order whose weight it cannot work out,
 * so switching tiers on before the weights exist would refuse every order on
 * the site. The message names the variants, so the fix is obvious.
 */
export function validateWeightTierDrafts(
  drafts: readonly WeightTierDraft[],
  unweighedVariants: readonly string[],
): WeightTierValidation {
  const issues: FieldIssue[] = [];
  const tiers: WeightTier[] = [];
  const seen = new Set<number>();

  drafts.forEach((draft, index) => {
    const ouncesRaw = draft.maxOunces.trim();
    const priceRaw = draft.price.trim();
    const field = `delivery.weightTiers.${index}`;

    if (ouncesRaw === "" && priceRaw === "") return;

    if (ouncesRaw === "" || priceRaw === "") {
      issues.push({
        field,
        message: "A weight tier needs both a weight and a price. Clear both to remove it.",
      });
      return;
    }

    const maxOunces = Number(ouncesRaw);
    if (!Number.isFinite(maxOunces) || maxOunces <= 0) {
      issues.push({ field, message: `"${ouncesRaw}" is not a weight in ounces.` });
      return;
    }
    if (seen.has(maxOunces)) {
      issues.push({ field, message: `There is already a tier up to ${maxOunces} oz.` });
      return;
    }

    const priceCents = parseDollarsToCents(priceRaw);
    if (priceCents === null) {
      issues.push({ field, message: `"${priceRaw}" is not a price. Try 5.99.` });
      return;
    }

    seen.add(maxOunces);
    tiers.push({ maxOunces, priceCents });
  });

  if (issues.length > 0) return { ok: false, issues };

  if (tiers.length > 0 && unweighedVariants.length > 0) {
    return {
      ok: false,
      issues: [
        {
          field: "delivery.weightTiers",
          message: `Weigh everything first. ${unweighedVariants.join(", ")} ${
            unweighedVariants.length === 1 ? "has" : "have"
          } no packaged weight, and once weight tiers exist the site refuses any order it cannot weigh — which right now would be every order. Set the packaged weights on the Products page, then come back.`,
        },
      ],
    };
  }

  tiers.sort((a, b) => a.maxOunces - b.maxOunces);
  return { ok: true, tiers };
}

// ---------------------------------------------------------------------------
// Merging
// ---------------------------------------------------------------------------

/**
 * Overlay product overrides.
 *
 * Only availability and packaged weight can be overridden. Names,
 * descriptions, flavors and allergens stay in code where they are reviewed —
 * an allergen list is not something to edit in a text box at eleven at night.
 */
export function applyProductOverrides(
  products: readonly Product[],
  overrides: SettingsOverrides,
): Product[] {
  return products.map((product) => {
    const override = overrides.products[product.slug];
    if (!override) return product;

    return {
      ...product,
      isAvailable: override.isAvailable ?? product.isAvailable,
      variants: product.variants.map((variant) => {
        const patch = override.variants?.[variant.slug];
        if (!patch) return variant;
        return {
          ...variant,
          isAvailable: patch.isAvailable ?? variant.isAvailable,
          // `?? variant.x` would be wrong here: null is a meaningful value
          // that means "no longer weighed", and ?? would swallow it.
          packagedWeightOz:
            patch.packagedWeightOz !== undefined
              ? patch.packagedWeightOz
              : variant.packagedWeightOz,
        };
      }),
    };
  });
}

export function applyTierOverrides(
  defaults: Record<ProductKind, readonly BundleTier[]>,
  overrides: SettingsOverrides,
): Record<ProductKind, readonly BundleTier[]> {
  return {
    bonbon: overrides.tiers.bonbon ?? defaults.bonbon,
    bar: overrides.tiers.bar ?? defaults.bar,
  };
}

export function applyDeliveryOverrides(
  defaults: DeliveryConfig,
  overrides: SettingsOverrides,
): DeliveryConfig {
  const patch = overrides.delivery;
  return {
    ...defaults,
    standardCents: patch.standardCents ?? defaults.standardCents,
    freeCounty: {
      alwaysFree: patch.freeCounty?.alwaysFree ?? defaults.freeCounty.alwaysFree,
      thresholdCents: patch.freeCounty?.thresholdCents ?? defaults.freeCounty.thresholdCents,
      thresholdInclusive:
        patch.freeCounty?.thresholdInclusive ?? defaults.freeCounty.thresholdInclusive,
    },
    freeCountyZips: patch.freeCountyZips ?? defaults.freeCountyZips,
    weightTiers: patch.weightTiers ?? defaults.weightTiers,
    excludedZips: patch.excludedZips ?? defaults.excludedZips,
  };
}

/** Sellable variants with no packaged weight, by customer-facing name. */
export function unweighedVariantNames(products: readonly Product[]): string[] {
  return products.flatMap((product) =>
    product.variants
      .filter((variant) => variant.packagedWeightOz === null)
      .map((variant) => `${product.name} — ${variant.name}`),
  );
}
