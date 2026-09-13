/**
 * Delivery configuration.
 *
 * Editable data, deliberately not hardcoded inside a component. Step 9's admin
 * edits these values without a deploy, and the migration that backs them lands
 * with that step. Until then this file is the source of truth.
 */

export type WeightTier = {
  /** Inclusive upper bound in ounces. */
  maxOunces: number;
  priceCents: number;
};

export type DeliveryConfig = {
  /** Two-letter state code. Everything else is refused. */
  allowedState: string;
  allowedStateName: string;

  /** The flat rate for a qualifying order outside the free-delivery county. */
  standardCents: number;

  freeThreshold: {
    cents: number;
    /**
     * The owner's wording is "free delivery on orders over $50".
     *
     * Read literally, $50.00 exactly does NOT qualify. Most shops mean "$50 or
     * more", and a customer whose subtotal lands on exactly $50.00 and is
     * charged $5.99 will write in about it. Set to true to make $50.00 qualify.
     *
     * TODO: owner to confirm. Implemented literally for now, and the boundary
     * is covered by a test either way.
     */
     inclusive: boolean;
  };

  freeCountyName: string;

  /**
   * ZIP codes that qualify for free delivery over the threshold.
   *
   * !! UNVERIFIED !! ---------------------------------------------------------
   * This is a best-effort draft of Hunterdon County, NJ ZIP codes. It has NOT
   * been checked against USPS or the county, and it decides who gets free
   * delivery, so it is a money question.
   *
   * The engine fails SAFE: a ZIP missing from this list is charged the standard
   * rate rather than given free delivery. So an incomplete list under-grants
   * (a Hunterdon customer pays $5.99 they should not have), it never
   * over-grants. That is the recoverable direction of error, but it is still
   * wrong, so the owner must verify this list before launch.
   * --------------------------------------------------------------------------
   */
  freeCountyZips: readonly string[];

  /**
   * Weight-based pricing.
   *
   * EMPTY ON PURPOSE. The brief says delivery is $5.99 flat AND that it varies
   * by package weight, which cannot both be true as written. The owner has not
   * yet chosen between a flat rate up to a weight threshold with tiers above,
   * or tiers from the first ounce — and no packaged weights have been measured
   * either.
   *
   * While this array is empty the engine charges the flat standard rate and
   * says so. Populating it switches the engine to tiered pricing with no code
   * change. Do not invent tiers to fill it.
   */
  weightTiers: readonly WeightTier[];

  /**
   * NJ areas not delivered to at all.
   * TODO: owner to confirm whether any exist.
   */
  excludedZips: readonly string[];
};

export const DELIVERY_CONFIG: DeliveryConfig = {
  allowedState: "NJ",
  allowedStateName: "New Jersey",
  standardCents: 599,
  freeThreshold: {
    cents: 5000,
    inclusive: false,
  },
  freeCountyName: "Hunterdon County",

  // Draft list — see the UNVERIFIED warning above.
  freeCountyZips: [
    "07830", // Califon
    "08801", // Annandale
    "08802", // Asbury
    "08803", // Baptistown
    "08804", // Bloomsbury
    "08809", // Clinton
    "08822", // Flemington
    "08825", // Frenchtown
    "08826", // Glen Gardner
    "08827", // Hampton
    "08829", // High Bridge
    "08833", // Lebanon
    "08834", // Little York
    "08848", // Milford
    "08551", // Ringoes
    "08553", // Rocky Hill area
    "08556", // Rosemont
    "08557", // Sergeantsville
    "08558", // Skillman area
    "08559", // Stockton
    "08530", // Lambertville
    "08867", // Pittstown
    "08868", // Quakertown
    "08885", // Stanton
    "08887", // Three Bridges
    "08889", // Whitehouse Station
    "08858", // Oldwick
  ],

  weightTiers: [],
  excludedZips: [],
};
