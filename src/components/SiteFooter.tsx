import { BRAND } from "@/lib/catalog";
import { Wordmark } from "./Wordmark";
import { SocialLinks } from "./SocialLinks";

export function SiteFooter() {
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
              We deliver within {BRAND.delivery.stateOnly} only.
            </p>
            <p className="mt-3 text-body-s text-cocoa">
              Free delivery throughout {BRAND.delivery.freeCounty}, which we
              deliver by hand. $5.99 elsewhere in {BRAND.delivery.stateOnly}.
            </p>
          </div>
        </div>

        {/*
          No year in the copyright line. These pages are prerendered, so a
          hardcoded year goes stale silently and a build-time year is a lie
          about when the page was served. TODO: Step 10 adds the privacy,
          terms, and refund links here.
        */}
        <div className="mt-14 border-t border-rule pt-6 text-body-s text-cocoa">
          <p>&copy; ATLY Belgian Chocolate</p>
        </div>
      </div>
    </footer>
  );
}
