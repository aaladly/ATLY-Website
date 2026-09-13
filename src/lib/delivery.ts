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

const formatDollars = (cents: number): string =>
  `$${Math.floor(cents / 100)}.${String(Math.abs(cents) % 100).padStart(2, "0")}`;

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

  const meetsThreshold =
    alwaysFree ||
    (thresholdInclusive
      ? input.subtotalCents >= thresholdCents
      : input.subtotalCents > thresholdCents);

  if (inFreeCounty && meetsThreshold) {
    return {
      kind: "quoted",
      costCents: 0,
      isFree: true,
      inFreeCounty: true,
      explanation: alwaysFree
        ? `Free delivery throughout ${config.freeCountyName}.`
        : `Free delivery — orders of ${formatDollars(thresholdCents)} or more in ${config.freeCountyName}.`,
      centsToFreeDelivery: null,
    };
  }

  // How much more would reach free delivery, for customers who can get there.
  // Never shown when the county is always free (nothing to reach) or when the
  // customer is outside it (telling them to spend more for delivery they can
  // never get free would be a lie).
  const shortfall = thresholdInclusive
    ? thresholdCents - input.subtotalCents
    : thresholdCents - input.subtotalCents + 1;
  const centsToFreeDelivery =
    inFreeCounty && !alwaysFree && shortfall > 0 ? shortfall : null;

  // Weight tiers, once the owner has approved a table.
  if (config.weightTiers.length > 0) {
    if (input.totalWeightOz === null) {
      return {
        kind: "needs_weight",
        message:
          "We cannot work out delivery for this order yet. Please get in touch and we will sort it out with you.",
      };
    }

    const tier = findWeightTier(input.totalWeightOz, config.weightTiers);
    if (!tier) {
      return {
        kind: "needs_weight",
        message:
          "This order is heavier than our usual delivery. Please get in touch and we will arrange it with you.",
      };
    }

    return {
      kind: "quoted",
      costCents: tier.priceCents,
      isFree: tier.priceCents === 0,
      inFreeCounty,
      explanation: `Delivery for a package up to ${tier.maxOunces} oz.`,
      centsToFreeDelivery,
    };
  }

  // No tiers configured: the flat standard rate.
  return {
    kind: "quoted",
    costCents: config.standardCents,
    isFree: false,
    inFreeCounty,
    explanation: inFreeCounty
      ? `${formatDollars(config.standardCents)} delivery. Orders of ${formatDollars(thresholdCents)} or more in ${config.freeCountyName} are delivered free.`
      : `${formatDollars(config.standardCents)} delivery within ${config.allowedStateName}.`,
    centsToFreeDelivery,
  };
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
