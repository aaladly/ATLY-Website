import Link from "next/link";
import { Wordmark } from "./Wordmark";
import { CartBadge } from "./CartBadge";

// "Our Story" is deliberately absent until Step 8 builds /about. A nav link
// to a route that does not exist is a 404 in the primary navigation, which is
// worse than a nav with one item.
const NAV = [{ href: "/shop", label: "Shop" }];

/**
 * Site header. Mobile-first: the primary customer is standing at the market
 * table with a phone, so the wordmark and the one CTA that matters are what
 * fit on a small screen. No hamburger for two links.
 */
export function SiteHeader() {
  return (
    <header className="border-b border-rule">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-gutter py-6 sm:flex-row sm:justify-between sm:gap-8">
        <Link
          href="/"
          className="shrink-0 no-underline"
          aria-label="ATLY Belgian Chocolate — home"
        >
          <Wordmark size="sm" />
        </Link>

        <nav aria-label="Main">
          <ul className="flex items-center gap-7">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="label-caps text-cocoa-deep no-underline hover:text-gold-deep"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <CartBadge />
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
