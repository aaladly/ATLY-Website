import Link from "next/link";
import { Wordmark } from "./Wordmark";
import { CartBadge } from "./CartBadge";

const NAV = [
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "Our Story" },
];

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
