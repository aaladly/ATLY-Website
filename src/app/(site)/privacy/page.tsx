import type { Metadata } from "next";
import Link from "next/link";
import { Placeholder } from "@/components/Placeholder";
import { LegalTableOfContents, LegalSection } from "@/components/LegalSection";
import { CookieSettingsLink } from "@/components/CookieConsent";
import { BUSINESS } from "@/lib/site";
import { ANALYTICS_ENABLED } from "@/lib/analytics";
import { CONSENT_MAX_AGE_DAYS } from "@/lib/consent";
import {
  DATA_REQUEST_RESPONSE_DAYS,
  HOSTING_PROVIDER,
  LEGAL_HAS_PLACEHOLDERS,
  PRIVACY_LAST_UPDATED,
  PRIVACY_LAST_UPDATED_LABEL,
  PRIVACY_SECTIONS,
  RECORD_RETENTION_YEARS,
} from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What ATLY Belgian Chocolate collects when you order, who it is shared with, how long it is kept, and how to ask us to delete it.",
  alternates: { canonical: "/privacy" },
};

/**
 * Privacy policy.
 *
 * Written from the code, not from a template. Every claim is checkable against
 * a file in this repository, and the claims about what we DON'T do are the
 * ones most worth keeping true:
 *   - card numbers never reach the server (Stripe hosted checkout)
 *   - the cart is localStorage, not a cookie (src/lib/cartStore.ts)
 *   - analytics loads only on consent (src/lib/analytics.ts)
 *
 * Deliberately NOT claimed anywhere: that ATLY is "compliant with", "certified
 * under" or "regulated by" any statute. A small chocolate business is below
 * the thresholds of the New Jersey Data Privacy Act and the CCPA, and claiming
 * a certification nobody holds is a worse problem than the one it pretends to
 * solve.
 *
 * The cookie section reflects what is ACTUALLY configured. With no measurement
 * ID set there is no analytics and no banner, and the page says so rather than
 * describing tracking that is not happening.
 */
export default function PrivacyPage() {
  const mail = `mailto:${BUSINESS.contactEmail}`;

  return (
    <main className="mx-auto max-w-2xl px-gutter py-section">
      <p className="label-caps">Privacy</p>
      <h1 className="mt-3 text-display-l">What we collect, and what we do not</h1>

      <p className="mt-6 text-body-m text-cocoa">
        Last updated{" "}
        <time dateTime={PRIVACY_LAST_UPDATED}>{PRIVACY_LAST_UPDATED_LABEL}</time>
        .
      </p>

      {LEGAL_HAS_PLACEHOLDERS && (
        <div role="note" className="mt-8 border-2 border-error bg-ivory p-6">
          <h2 className="text-display-s text-error">Not finished yet</h2>
          <p className="mt-3 text-body-m">
            Anything marked in brackets below is a detail we have not settled,
            and nobody qualified has reviewed this page. Please do not rely on
            it as it stands. Email{" "}
            <a href={mail} className="text-gold-deep">
              {BUSINESS.contactEmail}
            </a>{" "}
            and we will answer you directly.
          </p>
        </div>
      )}

      <LegalTableOfContents sections={PRIVACY_SECTIONS} />

      <div className="mt-12 space-y-12">
        {/* ===== 1 ===== */}
        <LegalSection sections={PRIVACY_SECTIONS} id="introduction">
          <p>
            We are ATLY, a family chocolate business in {BUSINESS.areaServed}.
            We sell at farmers markets and through this website, and we deliver
            within {BUSINESS.areaServed} only.
          </p>
          <p>
            This policy covers what we do with your information when you use
            this site or order from us. We are a small business, not a data
            company, and this is the whole of it.
          </p>
          <p className="text-body-s text-cocoa">
            Effective{" "}
            <time dateTime={PRIVACY_LAST_UPDATED}>
              {PRIVACY_LAST_UPDATED_LABEL}
            </time>
            .
          </p>
        </LegalSection>

        {/* ===== 2 ===== */}
        <LegalSection sections={PRIVACY_SECTIONS} id="collect">
          <h3 className="text-display-s">What you give us directly</h3>
          <ul className="ml-5 list-disc space-y-1">
            <li>your name</li>
            <li>your email address</li>
            <li>your phone number</li>
            <li>your delivery address</li>
            <li>what you ordered, and your order history</li>
            <li>any delivery instructions, order notes or gift message</li>
          </ul>

          <h3 className="text-display-s">What is collected automatically</h3>
          <ul className="ml-5 list-disc space-y-1">
            <li>
              your IP address and basic browser and device information, in the
              server logs that every website keeps
            </li>
            {ANALYTICS_ENABLED && (
              <li>
                Google Analytics data about which pages you visit — and only
                after you have agreed to it
              </li>
            )}
          </ul>

          <div className="border border-rule bg-ivory p-5">
            <p className="text-body-m">
              <strong>We never see your card number.</strong> Payment happens on
              Stripe&rsquo;s own checkout pages. Your card details go directly
              to Stripe and are handled on their systems; we are told that the
              payment succeeded and get the last four digits, and nothing else.
            </p>
          </div>
        </LegalSection>

        {/* ===== 3 ===== */}
        <LegalSection sections={PRIVACY_SECTIONS} id="use">
          <p>We use what you give us to:</p>
          <ul className="ml-5 list-disc space-y-1">
            <li>make and deliver your order</li>
            <li>send you a confirmation and tell you when it is on its way</li>
            <li>answer you when you get in touch</li>
            {ANALYTICS_ENABLED && (
              <li>
                understand which parts of the site people actually use — only if
                you agreed to analytics
              </li>
            )}
          </ul>
          <p className="text-body-l">
            <strong>
              We do not sell or rent your personal information. To anyone. Ever.
            </strong>
          </p>
        </LegalSection>

        {/* ===== 4 ===== */}
        <LegalSection sections={PRIVACY_SECTIONS} id="share">
          <p>
            Running a shop means using a few other companies, and your details
            pass through them:
          </p>
          <ul className="ml-5 list-disc space-y-2">
            <li>
              <strong>Stripe</strong> — payment processing.
            </li>
            <li>
              <strong>{HOSTING_PROVIDER}</strong> — hosting this website, which
              means their servers handle the requests your browser makes.
            </li>
            <li>
              <strong>Resend</strong> — sending your order confirmation, so it
              handles your email address.
            </li>
            {ANALYTICS_ENABLED && (
              <li>
                <strong>Google Analytics</strong> — measuring site usage, and
                only if you have agreed to it.
              </li>
            )}
          </ul>
          <p>
            Beyond those, we share your information only where the law requires
            it.
          </p>
        </LegalSection>

        {/* ===== 5 ===== */}
        <LegalSection sections={PRIVACY_SECTIONS} id="cookies">
          <h3 className="text-display-s">Cookies we cannot do without</h3>
          {ANALYTICS_ENABLED ? (
            <p>
              A small number of cookies keep the shop working: securing the
              checkout, and remembering your cookie choice so we do not ask
              again. These run at all times and there is no way to switch them
              off and still order.
            </p>
          ) : (
            /*
              With no analytics there is no consent cookie either, because
              there is no question being asked. Describing one anyway would be
              claiming a cookie a customer does not actually have.
            */
            <p>
              <strong>We do not give you any cookies at all.</strong> The only
              cookie in this whole website is the one that keeps the shop owner
              signed in to their own admin screens, and you will never be
              issued it.
            </p>
          )}
          <p>
            Your basket is kept in your own browser&rsquo;s storage rather than
            in a cookie, which is why it survives a refresh and disappears when
            you clear your browsing data. It is not sent to us until you check
            out.
          </p>

          {ANALYTICS_ENABLED ? (
            <>
              <h3 className="text-display-s">Analytics, only if you say yes</h3>
              <p>
                Google Analytics measures which pages people use.{" "}
                <strong>It does not load, run, or set a single cookie until
                you choose to accept it.</strong>{" "}
                It is off by default, and nothing is pre-ticked.
              </p>
              <p>
                Your choice is stored in a first-party cookie for{" "}
                {CONSENT_MAX_AGE_DAYS} days, after which we ask again. We also
                ask again if we change what the categories cover.
              </p>
              <p>
                You can change or withdraw your answer at any time —{" "}
                <CookieSettingsLink className="text-gold-deep underline underline-offset-4" />{" "}
                is in the footer of every page. Withdrawing stops the scripts
                and deletes the Google Analytics cookies from your browser.
              </p>
            </>
          ) : (
            <>
              <h3 className="text-display-s">
                No analytics, and no cookie banner
              </h3>
              <p>
                There is no analytics on this site at the moment. No tracking
                pixels, no advertising tags, nothing counting what you look at.
                Nothing on these pages is loaded from anyone else&rsquo;s
                server — even the fonts are served from here — so visiting this
                site does not tell another company that you did.
              </p>
              <p>
                That is why you were not asked to accept cookies when you
                arrived: there is nothing to accept. If that ever changes, this
                page changes first, and you will be asked before anything
                measures you.
              </p>
            </>
          )}
        </LegalSection>

        {/* ===== 6 ===== */}
        <LegalSection sections={PRIVACY_SECTIONS} id="marketing">
          <p>
            We send you email about your order — the confirmation, and news that
            it is on its way. Those are not marketing and you cannot unsubscribe
            from them without cancelling the order.
          </p>
          <p>
            If you choose to hear about new flavours and market dates, every one
            of those emails has an unsubscribe link, and using it takes you off
            the list for good.
          </p>
          <p className="text-body-l">
            <strong>We do not send marketing text messages.</strong>
          </p>
        </LegalSection>

        {/* ===== 7 ===== */}
        <LegalSection sections={PRIVACY_SECTIONS} id="retention">
          <ul className="ml-5 list-disc space-y-1">
            <li>
              <strong>Orders and payment records</strong> — kept for{" "}
              {RECORD_RETENTION_YEARS} years, because tax and accounting rules
              require it.
            </li>
            {ANALYTICS_ENABLED && (
              <li>
                <strong>Analytics data</strong> — kept for as long as
                Google&rsquo;s retention settings on our account allow.
              </li>
            )}
            <li>
              <strong>Marketing list</strong> — deleted when you unsubscribe.
            </li>
          </ul>
        </LegalSection>

        {/* ===== 8 ===== */}
        <LegalSection sections={PRIVACY_SECTIONS} id="security">
          <p>
            The site is served over HTTPS. Payments are handled entirely by
            Stripe, so there is no card data here to lose. Access to order
            information is limited to the family members who make and deliver
            the orders.
          </p>
          <p className="text-body-s text-cocoa">
            We are not going to tell you your data is perfectly safe, because
            nobody can honestly say that. We hold as little as we can and we do
            not hold the dangerous part at all.
          </p>
        </LegalSection>

        {/* ===== 9 ===== */}
        <LegalSection sections={PRIVACY_SECTIONS} id="rights">
          <p>
            Email{" "}
            <a href={mail} className="text-gold-deep">
              {BUSINESS.contactEmail}
            </a>{" "}
            and you can:
          </p>
          <ul className="ml-5 list-disc space-y-1">
            <li>ask for a copy of what we hold about you</li>
            <li>ask us to correct something that is wrong</li>
            <li>
              ask us to delete it — other than the order records we are required
              to keep for {RECORD_RETENTION_YEARS} years
            </li>
            <li>ask to be taken off the marketing list</li>
          </ul>
          <p>
            We answer within {DATA_REQUEST_RESPONSE_DAYS} days. Usually much
            sooner — there are not many of us and there is not much to look
            through.
          </p>
        </LegalSection>

        {/* ===== 10 ===== */}
        <LegalSection sections={PRIVACY_SECTIONS} id="children">
          <p>
            This is a shop for chocolate, not a service for children. It is not
            directed at anyone under 13 and we do not knowingly collect
            information from them.
          </p>
        </LegalSection>

        {/* ===== 11 ===== */}
        <LegalSection sections={PRIVACY_SECTIONS} id="changes">
          <p>
            If this changes, the page changes, and the date at the top changes
            with it.
          </p>
          <p>
            If we ever start doing something materially different with your
            information — new analytics, a new company handling your data — we
            will ask again before it starts, rather than quietly updating a page
            you have already read.
          </p>
        </LegalSection>

        {/* ===== 12 ===== */}
        <LegalSection sections={PRIVACY_SECTIONS} id="contact">
          <ul className="ml-5 list-disc space-y-1">
            <li>
              <Placeholder>registered legal entity</Placeholder>
            </li>
            <li>
              <Placeholder>business address</Placeholder>
            </li>
            <li>
              <a href={mail} className="text-gold-deep">
                {BUSINESS.contactEmail}
              </a>
            </li>
          </ul>
        </LegalSection>
      </div>

      <p className="mt-section text-body-s">
        <Link href="/terms" className="text-gold-deep">
          Terms and conditions
        </Link>
        <span className="mx-3 text-cocoa">·</span>
        <Link href="/" className="back-link text-cocoa-deep">
          Back to the shop
        </Link>
      </p>
    </main>
  );
}
