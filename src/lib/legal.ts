/**
 * The legal pages, as data.
 *
 * Section lists live here so each table of contents and the headings it points
 * at are generated from one array and cannot drift apart — a jump link that
 * lands nowhere is worse than no jump link.
 *
 * Facts the owner supplied live here once, so the terms, the privacy policy,
 * the refunds page and the checkout all state the same thing. A refund window
 * written out three times is a refund window that will eventually say three
 * different numbers.
 */

/**
 * Shown at the top of the legal pages, and snapshotted onto every order so
 * that months later it is possible to say which version a customer agreed to.
 *
 * Update whenever the terms change in substance.
 */
export const TERMS_LAST_UPDATED = "2026-09-14";
export const TERMS_LAST_UPDATED_LABEL = "14 September 2026";

export const PRIVACY_LAST_UPDATED = "2026-09-14";
export const PRIVACY_LAST_UPDATED_LABEL = "14 September 2026";

// ---------------------------------------------------------------------------
// Owner-supplied facts
// ---------------------------------------------------------------------------

/** How long after delivery a problem can be reported. */
export const REPORT_WINDOW_HOURS = 24;

/** How long before the delivery date an order can still be cancelled. */
export const CANCEL_WINDOW_HOURS = 48;

/**
 * Ordering is open around the clock — the owner asked for no cutoff on
 * *placing* an order. The Wednesday deadline is the cutoff for a given
 * Saturday's run, which is a different thing and the two are stated together
 * so neither reads as a contradiction of the other.
 */
export const ORDER_CUTOFF = "Wednesday 11:59pm ET";
export const DELIVERY_DAY = "Saturday";
export const DELIVERY_WINDOW = "10:00am to 4:00pm ET";

/** Tax and accounting. */
export const RECORD_RETENTION_YEARS = 7;

/** How quickly a data request is answered. */
export const DATA_REQUEST_RESPONSE_DAYS = 30;

/** Where a dispute is heard. Owner-confirmed: Hunterdon, not Hudson. */
export const VENUE_COUNTY = "Hunterdon County";

/**
 * Who serves the website.
 *
 * Owner-confirmed as Hostinger. This is named in the privacy policy as a
 * processor of personal data, so it has to be the company that actually
 * receives the requests — not the one the project was scaffolded for.
 */
export const HOSTING_PROVIDER = "Hostinger";

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

export const TERMS_SECTIONS: readonly { id: string; title: string }[] = [
  { id: "acceptance", title: "Accepting these terms" },
  { id: "eligibility", title: "Who can order" },
  { id: "products", title: "Our products" },
  { id: "allergens", title: "Food allergen notice" },
  { id: "ordering", title: "Ordering" },
  { id: "pricing", title: "Prices and payment" },
  { id: "delivery", title: "Delivery" },
  { id: "heat", title: "Heat and perishability" },
  { id: "cancellations", title: "Cancellations and refunds" },
  { id: "ip", title: "Intellectual property" },
  { id: "acceptable-use", title: "Acceptable use" },
  { id: "warranties", title: "Disclaimer of warranties" },
  { id: "liability", title: "Limitation of liability" },
  { id: "indemnification", title: "Indemnification" },
  { id: "changes", title: "Changes to these terms" },
  { id: "law", title: "Governing law" },
  { id: "contact", title: "Contact" },
] as const;

export const PRIVACY_SECTIONS: readonly { id: string; title: string }[] = [
  { id: "introduction", title: "Introduction" },
  { id: "collect", title: "What we collect" },
  { id: "use", title: "How we use it" },
  { id: "share", title: "Who we share it with" },
  { id: "cookies", title: "Cookies and tracking" },
  { id: "marketing", title: "Marketing emails" },
  { id: "retention", title: "How long we keep it" },
  { id: "security", title: "Security" },
  { id: "rights", title: "Your choices" },
  { id: "children", title: "Children" },
  { id: "changes", title: "Changes to this policy" },
  { id: "contact", title: "Contact us" },
] as const;

// ---------------------------------------------------------------------------
// Still outstanding
// ---------------------------------------------------------------------------

/**
 * Facts nobody has supplied.
 *
 * Every one renders on the page as a visible marker rather than being quietly
 * filled in with something plausible, and `npm run check:launch` fails while
 * this list is not empty. A terms page is a contract; a guess in one is a
 * promise nobody made, on behalf of a business that never agreed to it.
 *
 * The owner left the first two blank deliberately: "Inventing a legal entity
 * name or a notice address on a contract page creates a real problem." Agreed,
 * and they stay blank until they are answered.
 */
export const LEGAL_PLACEHOLDERS: readonly string[] = [
  "Registered legal entity — e.g. ATLY LLC. Who a customer contracts with, sues, or serves notice on",
  "Business address — the legal notice address on the terms and privacy pages",
  "Whether the couverture contains soy lecithin — if it does, soy is an ingredient and moves to Contains",
  "Whether any filling or inclusion contains eggs or wheat",
  "Which tree nuts are in the Mixed Nuts bar, named individually",
];

export const LEGAL_HAS_PLACEHOLDERS = LEGAL_PLACEHOLDERS.length > 0;
