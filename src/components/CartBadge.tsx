"use client";

import Link from "next/link";
import { useCart } from "./useCart";

/**
 * Header cart link with a live count.
 *
 * Until the stored cart has been read the count is omitted rather than shown
 * as zero — rendering "Cart (0)" and then flipping to "Cart (6)" reads as a
 * bug to anyone watching, and rendering the real count on the server is
 * impossible because the cart lives in the browser.
 */
export function CartBadge() {
  const { itemCount, hydrated } = useCart();

  return (
    <Link
      href="/cart"
      className="label-caps text-cocoa-deep no-underline hover:text-gold-deep"
    >
      Cart
      {hydrated && itemCount > 0 && (
        <>
          {" "}
          <span
            className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-cocoa-deep px-1.5 text-[0.65rem] tracking-normal text-cream"
            aria-hidden="true"
          >
            {itemCount}
          </span>
          <span className="sr-only">
            , {itemCount} item{itemCount === 1 ? "" : "s"}
          </span>
        </>
      )}
    </Link>
  );
}
