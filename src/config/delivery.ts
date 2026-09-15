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

  /**
   * Free-delivery policy for the home county.
   *
   * The owner's original brief said "free on orders over $50 in Hunterdon",
   * then confirmed in Step 6 that it is free for ANY order in the county.
   * alwaysFree reflects that. thresholdCents is kept so a threshold can be
   * reintroduced — here or for the rest of the state — without a code change,
   * and is ignored entirely while alwaysFree is true.
   */
  freeCounty: {
    alwaysFree: boolean;
    thresholdCents: number;
    /** Whether a subtotal exactly equal to the threshold qualifies. */
    thresholdInclusive: boolean;
  };

  freeCountyName: string;

  /**
   * Free delivery once the subtotal reaches this, ANYWHERE we deliver.
   *
   * Distinct from freeCounty.thresholdCents, which only ever applied inside
   * the free county. This is the floor for everyone else: Hunterdon is free
   * because the drive is short, and an order big enough elsewhere in New
   * Jersey earns the same.
   *
   * null switches it off entirely, which is what it was before 2026-09-15 —
   * the engine had the machinery but no order outside Hunterdon could ever
   * reach free delivery at any size.
   */
  freeOver: {
    thresholdCents: number;
    /** Whether a subtotal exactly equal to the threshold qualifies. */
    inclusive: boolean;
  } | null;

  /**
   * ZIP codes that qualify for free delivery.
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
   * Whether a person has checked the free-delivery ZIP list against USPS.
   *
   * Flip to true only after someone has actually done it. `npm run
   * check:launch` fails while this is false, because the list decides who is
   * charged for delivery and who is not, and "probably right" is not a
   * standard to take money against.
   */
  freeCountyZipsVerified: boolean;

  /**
   * Weight-based pricing.
   *
   * EMPTY ON PURPOSE. The brief says delivery is $5.99 flat AND that it varies
   * by package weight, which cannot both be true as written. The owner has not
   * yet chosen between a flat rate up to a weight threshold with tiers above,
   * or tiers from the first ounce — and no packaged weights have been measured
   * either.
   *
   * Owner-approved shape (Step 6): $5.99 flat up to 48 oz, tiers above that.
   * NOT ACTIVATED YET, and deliberately so — no SKU has a packaged weight, and
   * once this array is non-empty the engine refuses to quote an order whose
   * weight it cannot determine. Turning it on before weights exist would break
   * every order on the site.
   *
   * To activate: measure packagedWeightOz for every variant, then add
   *   { maxOunces: 48, priceCents: 599 }
   * plus the owner's rates for anything heavier.
   *
   * While this array is empty the engine charges the flat standard rate and
   * says so. Do not invent tiers to fill it.
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
  freeCounty: {
    // Owner-confirmed, Step 6: every Hunterdon order is delivered free,
    // regardless of size. These are hand-delivered locally, so the cost is
    // time and fuel rather than postage.
    alwaysFree: true,
    thresholdCents: 5000,
    thresholdInclusive: true,
  },
  freeCountyName: "Hunterdon County",

  /**
   * Owner-approved 2026-09-15: free delivery on $50 or more, outside Hunterdon
   * as well as in it.
   *
   * INCLUSIVE, so exactly $50.00 qualifies. "Over $50" is ambiguous at the
   * boundary and the customer-facing copy says "$50 or more" so that nobody
   * has to guess — a customer who lands on $50.00 and is charged $5.99 has
   * been told one thing and billed another.
   */
  freeOver: { thresholdCents: 5000, inclusive: true },

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

  // Not checked against USPS. See the UNVERIFIED warning above.
  freeCountyZipsVerified: false,

  weightTiers: [],
  excludedZips: [],
};
