/**
 * Delivery rules engine.
 *
 * Pure and testable per the working agreement: no React, no database calls, no
 * clock. Configuration is passed in rather than imported, so tests can drive
 * tier tables and ZIP lists that do not exist in production yet.
 *
 * The state gate here is the customer-facing one. It must ALSO be enforced
 * server-side at checkout in Step 7 — this module runs in the browser, and
 * anything that runs in the browser is advisory.
 */

import type { DeliveryConfig, WeightTier } from "@/config/delivery";

export type DeliveryAddress = {
  /** Two-letter code, any case. */
  state: string;
  /** Five digits; ZIP+4 is accepted and truncated. */
  zip: string;
};

export type DeliveryQuoteInput = {
  address: DeliveryAddress;
  subtotalCents: number;
  /**
   * Packaged weight of the whole order, or null when it cannot be known.
   *
   * Null is the normal case today: no SKU has been weighed. It only matters
   * once weight tiers are configured.
   */
  totalWeightOz: number | null;
};

export type DeliveryQuote =
  | {
      kind: "unavailable";
      reason: "out_of_state" | "excluded_area" | "invalid_zip";
      /** Customer-facing, friendly, and specific about what to do next. */
      message: string;
    }
  | {
      kind: "needs_weight";
      message: string;
    }
  | {
      kind: "quoted";
      costCents: number;
      /**
       * What this delivery would have cost without any free-delivery rule.
       *
       * Equal to costCents when nothing was waived. The checkout summary
       * strikes this through beside the word FREE, and the difference is the
       * savings line — so "free" is visibly worth something rather than just
       * a word where a number should be.
       */
      standardCostCents: number;
      isFree: boolean;
      inFreeCounty: boolean;
      /** Customer-facing explanation of why this is the price. */
      explanation: string;
      /** How much more to spend to reach free delivery, when applicable. */
      centsToFreeDelivery: number | null;
    };

/** Five digits, from "08822", "08822-1234", or " 08822 ". */
export function normalizeZip(zip: string): string | null {
  const trimmed = zip.trim();
  const match = /^(\d{5})(?:-\d{4})?$/.exec(trimmed);
  return match ? match[1] : null;
}

export const normalizeState = (state: string): string => state.trim().toUpperCase();

/**
 * Money for prose, not for a table.
 *
 * Whole amounts lose their trailing zeros — "orders of $50 or more" rather
 * than "$50.00 or more", which reads like a form field in the middle of a
 * sentence. Amounts with cents keep them, so "$5.99" is untouched. Product
 * prices are NOT formatted with this: a price list wants its columns to line
 * up, which is what formatCents in pricing.ts is for.
 */
const formatDollars = (cents: number): string => {
  const whole = Math.floor(cents / 100);
  const remainder = Math.abs(cents) % 100;
  return remainder === 0
    ? `$${whole}`
    : `$${whole}.${String(remainder).padStart(2, "0")}`;
};

/** Cheapest tier whose bound covers the weight. Null if none does. */
export function findWeightTier(
  ounces: number,
  tiers: readonly WeightTier[],
): WeightTier | null {
  const sorted = [...tiers].sort((a, b) => a.maxOunces - b.maxOunces);
  return sorted.find((tier) => ounces <= tier.maxOunces) ?? null;
}

/**
 * Quote delivery for an address and order subtotal.
 *
 * Order of checks matters: state before ZIP, because "we do not deliver to
 * your state" is a more useful message than "that ZIP is not in our area".
 */
export function quoteDelivery(
  input: DeliveryQuoteInput,
  config: DeliveryConfig,
): DeliveryQuote {
  const state = normalizeState(input.address.state);

  if (state !== config.allowedState) {
    return {
      kind: "unavailable",
      reason: "out_of_state",
      message: `We deliver within ${config.allowedStateName} only at the moment. Leave us your email and we will tell you as soon as we can reach you.`,
    };
  }

  const zip = normalizeZip(input.address.zip);
  if (!zip) {
    return {
      kind: "unavailable",
      reason: "invalid_zip",
      message: "That does not look like a ZIP code. Five digits, please.",
    };
  }

  if (config.excludedZips.includes(zip)) {
    return {
      kind: "unavailable",
      reason: "excluded_area",
      message: `We are not able to deliver to ${zip} yet. Leave us your email and we will tell you when that changes.`,
    };
  }

  const inFreeCounty = config.freeCountyZips.includes(zip);
  const { alwaysFree, thresholdCents, thresholdInclusive } = config.freeCounty;

  /**
   * What this order would be charged if no free-delivery rule applied, or null
   * when that cannot be worked out — an unweighed order, or one heavier than
   * the heaviest tier.
   *
   * NOT returned early on null. Free delivery outranks not knowing the price:
   * a Hunterdon order too heavy to price is still delivered free, because the
   * promise is "free throughout the county", not "free unless it is awkward".
   * Bailing out here instead sent that customer to "please get in touch",
   * which is how this got caught.
   */
  const standardCostCents = standardCost(input, config);

  /** Free, with nothing credible to strike through when the cost is unknown. */
  const waived = standardCostCents ?? 0;

  // ---- Free inside the county -------------------------------------------
  const meetsCountyThreshold =
    alwaysFree ||
    (thresholdInclusive
      ? input.subtotalCents >= thresholdCents
      : input.subtotalCents > thresholdCents);

  if (inFreeCounty && meetsCountyThreshold) {
    return {
      kind: "quoted",
      costCents: 0,
      standardCostCents: waived,
      isFree: true,
      inFreeCounty: true,
      explanation: alwaysFree
        ? `Free delivery throughout ${config.freeCountyName}.`
        : `Free delivery — orders of ${formatDollars(thresholdCents)} or more in ${config.freeCountyName}.`,
      centsToFreeDelivery: null,
    };
  }

  // ---- Free anywhere, once the order is big enough -----------------------
  // The rule that makes a long drive worth making. Applies inside the county
  // too, for the configuration where the county has a threshold of its own
  // and this one is lower.
  const { freeOver } = config;
  const meetsFreeOver =
    freeOver !== null &&
    (freeOver.inclusive
      ? input.subtotalCents >= freeOver.thresholdCents
      : input.subtotalCents > freeOver.thresholdCents);

  if (meetsFreeOver) {
    return {
      kind: "quoted",
      costCents: 0,
      standardCostCents: waived,
      isFree: true,
      inFreeCounty,
      explanation: `Free delivery — orders of ${formatDollars(
        freeOver!.thresholdCents,
      )} or more.`,
      centsToFreeDelivery: null,
    };
  }

  /**
   * How much more would reach free delivery.
   *
   * The nearest free delivery this customer can actually reach, which is not
   * always the same rule: somebody inside the county with a county threshold
   * may reach that sooner than the statewide one. Null when there is nothing
   * to reach, because telling a customer to spend more for a discount that
   * does not exist for them is a lie with a price attached.
   */
  const shortfallTo = (cents: number, inclusive: boolean): number | null => {
    const gap = inclusive
      ? cents - input.subtotalCents
      : cents - input.subtotalCents + 1;
    return gap > 0 ? gap : null;
  };

  const reachable = [
    inFreeCounty && !alwaysFree
      ? shortfallTo(thresholdCents, thresholdInclusive)
      : null,
    freeOver !== null ? shortfallTo(freeOver.thresholdCents, freeOver.inclusive) : null,
  ].filter((gap): gap is number => gap !== null);

  const centsToFreeDelivery = reachable.length > 0 ? Math.min(...reachable) : null;

  // Nothing was waived, so the customer pays — and now the price has to be
  // knowable, which is the point at which an unweighed or over-heavy order
  // becomes a problem rather than a curiosity.
  if (standardCostCents === null) {
    return {
      kind: "needs_weight",
      message:
        input.totalWeightOz === null
          ? "We cannot work out delivery for this order yet. Please get in touch and we will sort it out with you."
          : "This order is heavier than our usual delivery. Please get in touch and we will arrange it with you.",
    };
  }

  const tiered = config.weightTiers.length > 0;
  return {
    kind: "quoted",
    costCents: standardCostCents,
    standardCostCents,
    isFree: standardCostCents === 0,
    inFreeCounty,
    explanation: tiered
      ? `Delivery for a package up to ${findWeightTier(input.totalWeightOz ?? 0, config.weightTiers)?.maxOunces} oz.`
      : freeOver !== null
        ? `${formatDollars(standardCostCents)} delivery. Orders of ${formatDollars(
            freeOver.thresholdCents,
          )} or more are delivered free.`
        : `${formatDollars(standardCostCents)} delivery within ${config.allowedStateName}.`,
    centsToFreeDelivery,
  };
}

/**
 * What an order costs to deliver before any free-delivery rule is considered.
 *
 * Null means the cost cannot be determined at all — no weight for a
 * weight-tiered order, or an order heavier than the heaviest tier. Pulled out
 * here because the free branches need this number too: "FREE" next to a
 * struck-through price is only honest if the struck-through price is the one
 * that would genuinely have been charged.
 */
function standardCost(input: DeliveryQuoteInput, config: DeliveryConfig): number | null {
  if (config.weightTiers.length === 0) return config.standardCents;
  if (input.totalWeightOz === null) return null;
  return findWeightTier(input.totalWeightOz, config.weightTiers)?.priceCents ?? null;
}

/**
 * Total packaged weight of an order, or null when any item's weight is unknown.
 *
 * Null rather than a partial sum on purpose: a total that silently omits the
 * items nobody weighed would quote a delivery price that is too low, and the
 * shortfall comes out of the owner's margin.
 */
export function totalPackagedWeightOz(
  lines: readonly { quantity: number; packagedWeightOz: number | null }[],
): number | null {
  let total = 0;
  for (const line of lines) {
    if (line.packagedWeightOz === null) return null;
    total += line.packagedWeightOz * line.quantity;
  }
  return total;
}

/**
 * The delivery policy in one sentence, for the places that promise it.
 *
 * Built from the config rather than written out, because it appears in the
 * footer, in the cart, on the home page, on the shop and on every product
 * page — and a promise that is typed out five times is a promise that is
 * wrong in four of them the day a rule changes. That is not hypothetical:
 * adding free delivery over $50 left every one of those lines saying "$5.99
 * elsewhere in New Jersey", which was no longer true.
 */
export function deliveryPolicySummary(config: DeliveryConfig): string {
  const clauses: string[] = [
    config.freeCounty.alwaysFree
      ? `Free delivery throughout ${config.freeCountyName}`
      : `Free delivery on orders of ${formatDollars(
          config.freeCounty.thresholdCents,
        )} or more in ${config.freeCountyName}`,
  ];

  if (config.freeOver !== null) {
    clauses.push(
      `and on orders of ${formatDollars(
        config.freeOver.thresholdCents,
      )} or more anywhere in ${config.allowedStateName}`,
    );
  }

  // "otherwise" rather than "elsewhere in New Jersey": once there is a
  // statewide threshold, "elsewhere" is wrong — a large order in Hoboken is
  // also free, and the distinction is no longer purely geographic.
  return `${clauses.join(", ")}. ${formatDollars(config.standardCents)} otherwise.`;
}
