import Link from "next/link";

/**
 * The 404 body, shared by the root not-found (unmatched URLs) and the shop's
 * own (a product slug that does not exist).
 *
 * A 404 is usually someone following an old link to something that sold out or
 * a QR code that got mistyped at the market, so it offers the two places they
 * were probably heading rather than apologising at length.
 */
export function NotFoundContent() {
  return (
    <div className="mx-auto max-w-xl px-gutter py-section text-center">
      <p className="label-caps">Not found</p>
      <h1 className="mt-4 text-display-l">That page has gone</h1>
      <p className="mx-auto mt-6 max-w-md text-body-l text-cocoa">
        Either the link is old, or we have moved something. Neither is your
        fault.
      </p>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/shop"
          className="inline-flex items-center justify-center bg-cocoa-deep px-8 py-4 text-label uppercase text-cream no-underline transition-colors duration-200 hover:bg-cocoa"
        >
          Browse the shop
        </Link>
        <Link
          href="/"
          className="inline-flex items-center border border-cocoa-deep px-7 py-3.5 text-label uppercase text-cocoa-deep no-underline transition-colors duration-200 hover:bg-cocoa-deep hover:text-cream"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
