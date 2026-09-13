import { BRAND } from "@/lib/catalog";
import { Wordmark } from "./Wordmark";

/**
 * Line icons in the brand brown, drawn inline.
 *
 * Deliberately not the official coloured badge graphics: those would drop
 * bright blue and magenta into a palette that is brown, cream and gold, and
 * nothing else.
 */
function FacebookIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 3h-2.5A3.5 3.5 0 0 0 9 6.5V9H6.5v3H9v9h3v-9h2.5l.5-3H12V6.5a1 1 0 0 1 1-1h2Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <circle cx="12" cy="12" r="3.75" />
      <circle cx="17" cy="7" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

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
            <ul className="mt-4 space-y-3">
              <li>
                <a
                  href={BRAND.social.instagram}
                  className="inline-flex items-center gap-3 text-body-m text-cocoa-deep no-underline hover:text-gold-deep"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <InstagramIcon />
                  Instagram
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
              <li>
                <a
                  href={BRAND.social.facebook}
                  className="inline-flex items-center gap-3 text-body-m text-cocoa-deep no-underline hover:text-gold-deep"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FacebookIcon />
                  Facebook
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            </ul>
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
