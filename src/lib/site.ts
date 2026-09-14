/**
 * Where this site lives, and what it is allowed to claim about itself.
 *
 * Every absolute URL the site emits — canonical links, Open Graph images, the
 * sitemap, the structured data — is built from SITE_URL. Getting it wrong is
 * not a visible bug: the pages render fine and the wrong address is quietly
 * published to search engines and to every link preview.
 *
 * So there is no invented default. With NEXT_PUBLIC_SITE_URL unset it falls
 * back to localhost, which is correct in development and obviously wrong
 * anywhere else, and `npm run check:launch` refuses to pass while it is still
 * the fallback.
 */

const FALLBACK_URL = "http://localhost:3100";

const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");

export const SITE_URL = configured && configured !== "" ? configured : FALLBACK_URL;

/** True while the site has no real address configured. */
export const SITE_URL_IS_PLACEHOLDER = SITE_URL === FALLBACK_URL;

export const absoluteUrl = (path: string): string =>
  `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

/**
 * Whether the legal pages have been read by someone qualified.
 *
 * The privacy, terms and refund pages are drafts written from what this code
 * actually does. They are accurate about the mechanics — what is collected,
 * who it is sent to — but they are NOT a substitute for advice, and several
 * of the commercial terms are the owner's to decide rather than ours to
 * invent.
 *
 * While this is false, each of those pages carries a visible draft notice and
 * `npm run check:launch` fails. Flip it only once a person has actually read
 * them and filled in the TODOs. An unreviewed policy that looks official is
 * worse than an obviously unfinished one.
 */
export const LEGAL_REVIEWED = false;

/**
 * Business facts used in structured data.
 *
 * Deliberately no postal address. The kitchen is a family home, the owner has
 * not said whether they want that address on the public internet, and a
 * LocalBusiness record is exactly how it would end up on a map. An
 * Organization without an address is honest; a LocalBusiness with an invented
 * one is not.
 *
 * TODO: ask the owner whether there is a business address they want published.
 * If there is, this becomes a LocalBusiness / FoodEstablishment record and
 * gets the map listing that goes with it.
 */
export const BUSINESS = {
  /**
   * The trading name. The owner gave "ATLY" as the legal entity but not its
   * registered form — LLC, sole proprietorship, or something else. That
   * matters in the terms, because who exactly a customer is contracting with
   * is the first thing a contract has to say, so it is tracked as an
   * outstanding placeholder rather than assumed.
   */
  legalName: "ATLY Belgian Chocolate",
  tradingName: "ATLY",
  contactEmail: "atlychocolate@gmail.com",
  areaServed: "New Jersey",
} as const;
