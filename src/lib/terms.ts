/**
 * The terms, as data.
 *
 * The section list lives here so the table of contents and the headings on the
 * page are generated from one array and cannot drift apart — a jump link that
 * lands nowhere is worse than no jump link.
 *
 * The facts the owner supplied also live here, once, so that the terms page,
 * the refunds page and the checkout all state the same thing. A refund window
 * written out twice is a refund window that will eventually say two different
 * numbers.
 */

/**
 * Shown at the top of the terms, and snapshotted onto every order so that
 * months later it is possible to say which version a customer agreed to.
 *
 * Update it whenever the terms change in substance.
 */
export const TERMS_LAST_UPDATED = "2026-09-14";

export const TERMS_LAST_UPDATED_LABEL = "14 September 2026";

/** How long after delivery a problem can be reported. Owner-supplied. */
export const REPORT_WINDOW_HOURS = 24;

export const TERMS_SECTIONS: readonly { id: string; title: string }[] = [
  // The allergen notice is first rather than fourth. It was asked for
  // "prominent, near the top, not buried", and it is the only section here
  // that can put someone in hospital — everything else is about money.
  { id: "allergens", title: "Food allergen notice" },
  { id: "acceptance", title: "Accepting these terms" },
  { id: "eligibility", title: "Who can order" },
  { id: "products", title: "Our products" },
  { id: "ordering", title: "Ordering" },
  { id: "pricing", title: "Prices and payment" },
  { id: "delivery", title: "Delivery" },
  { id: "heat", title: "Heat, and how long it keeps" },
  { id: "cancellations", title: "Cancellations and refunds" },
  { id: "ip", title: "What belongs to us" },
  { id: "acceptable-use", title: "Using this site" },
  { id: "warranties", title: "The site itself" },
  { id: "liability", title: "Limits on what we owe you" },
  { id: "indemnification", title: "If you cause us a loss" },
  { id: "changes", title: "Changes to these terms" },
  { id: "law", title: "Which law applies" },
  { id: "contact", title: "How to reach us" },
] as const;

/**
 * Facts the owner has not supplied.
 *
 * Every one renders on the page as a visible marker rather than being quietly
 * filled in with something plausible, and `npm run check:launch` fails while
 * this list is not empty. A terms page is a contract; a guess in one is a
 * promise nobody made.
 */
export const TERMS_PLACEHOLDERS: readonly string[] = [
  "Soy — whether the couverture contains soy lecithin",
  "Eggs and wheat — whether any filling or inclusion uses them",
  "Which tree nuts are in the Mixed Nuts bar",
  "Delivery windows — what time of day a delivery arrives",
  "Venue county for disputes",
  "Registered legal form — whether ATLY is an LLC, a sole proprietorship, or something else",
];

export const TERMS_HAS_PLACEHOLDERS = TERMS_PLACEHOLDERS.length > 0;
