"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Something broke while rendering the shop.
 *
 * Two rules here.
 *
 * One: the customer is never shown the error. A stack trace or a message from
 * an exception can carry a file path, a query, or a fragment of somebody's
 * data, and none of that helps the person standing at the market table anyway.
 * They get a digest they can quote to us, and a way out.
 *
 * Two: `reset()` is offered, because plenty of failures are transient and
 * trying again genuinely works. It is the first button, not a footnote.
 */
export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Development only. TODO: wire to real error reporting at launch — until
    // something is collecting these, an error nobody saw is an error nobody
    // fixes.
    if (process.env.NODE_ENV === "development") {
      console.error("Shop render error:", error);
    }
  }, [error]);

  return (
    <main className="mx-auto max-w-xl px-gutter py-section text-center">
      <p className="label-caps">Something went wrong</p>
      <h1 className="mt-4 text-display-l">That did not work</h1>
      <p className="mx-auto mt-6 max-w-md text-body-l text-cocoa">
        Our fault, not yours. Try again — and if it keeps happening, tell us and
        we will take the order by hand.
      </p>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center justify-center bg-cocoa-deep px-8 py-4 text-label uppercase text-cream transition-colors duration-200 hover:bg-cocoa"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center border border-cocoa-deep px-7 py-3.5 text-label uppercase text-cocoa-deep no-underline transition-colors duration-200 hover:bg-cocoa-deep hover:text-cream"
        >
          Home
        </Link>
      </div>

      {error.digest && (
        <p className="mt-10 text-body-s text-cocoa">
          If you get in touch, quote this: <code>{error.digest}</code>
        </p>
      )}
    </main>
  );
}
