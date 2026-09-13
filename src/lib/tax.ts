/**
 * New Jersey sales tax.
 *
 * Pure and testable. Rates are injected so a rate change is config, not code.
 *
 * !! NOT TAX ADVICE — CONFIRM BEFORE LAUNCH !! -------------------------------
 * Two decisions are baked in here and BOTH need an accountant's sign-off:
 *
 * 1. CHOCOLATE IS TREATED AS TAXABLE. New Jersey exempts "food and food
 *    ingredients" but specifically carves candy back out of that exemption, and
 *    chocolate without flour falls under the candy definition. So unlike most
 *    of what a food business sells, this is taxable. Getting this wrong means
 *    either absorbing the tax or over-collecting from customers, and
 *    over-collecting is the worse of the two.
 *
 * 2. DELIVERY IS TREATED AS TAXABLE. New Jersey generally taxes delivery
 *    charges when the goods being delivered are themselves taxable. If every
 *    item in an order were exempt the delivery would be too, which cannot
 *    currently happen because every product is taxable.
 *
 * Both are configurable. Neither is a guess about arithmetic — they are
 * guesses about tax law, which is why they are flagged this loudly.
 * ---------------------------------------------------------------------------
 */

/**
 * Rates are integers over 100,000, so 6.625% is 6625. Storing a percentage as
 * a float and multiplying invites the drift that integer cents exist to avoid.
 */
export const RATE_DENOMINATOR = 100_000;

export type TaxConfig = {
  /** e.g. 6625 for New Jersey's 6.625%. */
  rateNumerator: number;
  /** Shown to the customer, e.g. "6.625%". */
  rateLabel: string;
  jurisdiction: string;
  /** Whether delivery is taxed alongside taxable goods. */
  taxDelivery: boolean;
};

export const NJ_TAX: TaxConfig = {
  rateNumerator: 6625,
  rateLabel: "6.625%",
  jurisdiction: "New Jersey",
  taxDelivery: true,
};

export type TaxInput = {
  /** Goods subtotal after bundle discounts. */
  taxableGoodsCents: number;
  deliveryCents: number;
};

export type TaxResult = {
  taxableBaseCents: number;
  taxCents: number;
};

/**
 * Sales tax on an order.
 *
 * Rounds half away from zero on the total taxable base rather than per line.
 * Per-line rounding accumulates error, and the figure the customer is charged
 * should be derivable from the figures they can see.
 */
export function calculateTax(input: TaxInput, config: TaxConfig): TaxResult {
  if (!Number.isInteger(input.taxableGoodsCents) || input.taxableGoodsCents < 0) {
    throw new RangeError(
      `taxableGoodsCents must be a non-negative integer, got ${input.taxableGoodsCents}`,
    );
  }
  if (!Number.isInteger(input.deliveryCents) || input.deliveryCents < 0) {
    throw new RangeError(
      `deliveryCents must be a non-negative integer, got ${input.deliveryCents}`,
    );
  }

  const taxableBaseCents =
    input.taxableGoodsCents + (config.taxDelivery ? input.deliveryCents : 0);

  const taxCents = Math.round(
    (taxableBaseCents * config.rateNumerator) / RATE_DENOMINATOR,
  );

  return { taxableBaseCents, taxCents };
}
