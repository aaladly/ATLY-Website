import Link from "next/link";
import { BRAND } from "@/lib/catalog";
import { formatCents } from "@/lib/pricing";
import type { DeliveryConfig } from "@/config/delivery";
import { Wordmark } from "./Wordmark";
import { SocialLinks } from "./SocialLinks";
import { CookieSettingsLink } from "./CookieConsent";

/**
 * Delivery rules arrive as a prop rather than being imported, so the footer
 * quotes whatever the owner last set in the admin. Passed down from the root
 * layout, which already has them, instead of making the whole footer a client
 * component for the sake of two numbers.
 */
export function SiteFooter({ delivery }: { delivery: DeliveryConfig }) {
  const freeLine = delivery.freeCounty.alwaysFree
    ? `Free delivery throughout ${delivery.freeCountyName}, which we deliver by hand.`
    : `Free delivery on orders of ${formatCents(delivery.freeCounty.thresholdCents)} or more in ${delivery.freeCountyName}, which we deliver by hand.`;

  return (
    <footer className="mt-section border-t border-rule-strong">
      <div className="mx-auto max-w-6xl px-gutter py-14">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Wordmark size="sm" className="items-start" />
            <p className="mt-5 max-w-xs text-body-s text-cocoa">
              {BRAND.tagline}
            </p>
          </div>

          <div>
            <h2 className="label-caps">You can also find us here!</h2>
            <SocialLinks className="mt-4" />
          </div>

          <div>
            <h2 className="label-caps">Delivery</h2>
            <p className="mt-4 text-body-m">
              We deliver within {delivery.allowedStateName} only.
            </p>
            <p className="mt-3 text-body-s text-cocoa">
              {freeLine} {formatCents(delivery.standardCents)} elsewhere in{" "}
              {delivery.allowedStateName}.
            </p>
          </div>
        </div>

        {/*
          No year in the copyright line. These pages are prerendered, so a
          hardcoded year goes stale silently and a build-time year is a lie
          about when the page was served.
        */}
        <div className="mt-14 flex flex-wrap items-center justify-between gap-x-8 gap-y-4 border-t border-rule pt-6 text-body-s text-cocoa">
          <p>&copy; ATLY Belgian Chocolate</p>
          <nav aria-label="Legal and allergens">
            <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {[
                // Allergens first, and not buried among the legal links: it is
                // the one a customer may genuinely need before they order.
                { href: "/allergens", label: "Allergens" },
                { href: "/privacy", label: "Privacy" },
                { href: "/terms", label: "Terms" },
                { href: "/refunds", label: "Returns" },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-cocoa no-underline hover:text-gold-deep"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              {/* Renders only when there is analytics to consent to, and only
                  once JavaScript is running — it reopens a dialog, so it
                  cannot work without either. */}
              <li>
                <CookieSettingsLink />
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
