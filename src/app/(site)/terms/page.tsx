import type { Metadata } from "next";
import Link from "next/link";
import { Placeholder } from "@/components/Placeholder";
import { LegalTableOfContents, LegalSection } from "@/components/LegalSection";
import { SocialLinks } from "@/components/SocialLinks";
import { formatCents } from "@/lib/pricing";
import { getStorefrontSettings } from "@/lib/settings/resolve";
import { BUSINESS } from "@/lib/site";
import { CROSS_CONTACT_STATEMENT } from "@/lib/catalog";
import {
  CANCEL_WINDOW_HOURS,
  DELIVERY_DAY,
  DELIVERY_WINDOW,
  LEGAL_HAS_PLACEHOLDERS,
  ORDER_CUTOFF,
  REPORT_WINDOW_HOURS,
  TERMS_LAST_UPDATED,
  TERMS_LAST_UPDATED_LABEL,
  TERMS_SECTIONS,
  VENUE_COUNTY,
} from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms and conditions",
  description:
    "The terms you agree to when you order from ATLY Belgian Chocolate: allergens, ordering, delivery, cancellations and refunds.",
  alternates: { canonical: "/terms" },
};

/**
 * Terms and conditions.
 *
 * Plain English, short paragraphs. A customer should read a section once and
 * know where they stand; a wall of defined terms is how a business ends up
 * with terms nobody has read, which is not the same as terms nobody can argue
 * with.
 *
 * Two rules held throughout:
 *
 *   1. Nothing unsupplied is filled in. The legal entity and the notice
 *      address render as visible markers, as do the three open allergen
 *      questions.
 *   2. Prices and delivery rules are read from the live configuration rather
 *      than typed out, so the terms cannot promise a rate the checkout does
 *      not charge.
 */
export default async function TermsPage() {
  const { delivery } = await getStorefrontSettings();
  const mail = `mailto:${BUSINESS.contactEmail}`;

  return (
    <main className="mx-auto max-w-2xl px-gutter py-section">
      <p className="label-caps">Terms and conditions</p>
      <h1 className="mt-3 text-display-l">The small print, in plain English</h1>

      <p className="mt-6 text-body-m text-cocoa">
        Last updated{" "}
        <time dateTime={TERMS_LAST_UPDATED}>{TERMS_LAST_UPDATED_LABEL}</time>.
      </p>

      {/*
        The allergen notice proper is section 4, where the brief put it. This
        strip sits above everything so that someone who reads one line of this
        page reads the line that matters, and can jump straight to the rest.
      */}
      <aside className="mt-8 border-2 border-error bg-ivory p-5">
        <p className="text-body-m text-error">
          <strong>
            Contains milk, peanuts, hazelnut and pistachio. Made in a shared
            kitchen.
          </strong>
        </p>
        <p className="mt-2 text-body-s">
          <a href="#allergens" className="text-gold-deep">
            Read the full allergen notice
          </a>{" "}
          before ordering.
        </p>
      </aside>

      {LEGAL_HAS_PLACEHOLDERS && (
        <div role="note" className="mt-8 border-2 border-error bg-ivory p-6">
          <h2 className="text-display-s text-error">Not finished yet</h2>
          <p className="mt-3 text-body-m">
            Anything marked in brackets below is a detail we have not settled.
            We have left the gaps visible rather than filling them in with
            something that sounds right — and nobody qualified has reviewed this
            page yet, so please do not rely on it as it stands.
          </p>
          <p className="mt-3 text-body-m text-cocoa">
            If you need an answer before we finish, email{" "}
            <a href={mail} className="text-gold-deep">
              {BUSINESS.contactEmail}
            </a>
            .
          </p>
        </div>
      )}

      <LegalTableOfContents sections={TERMS_SECTIONS} />

      <div className="mt-12 space-y-12">
        {/* ===== 1 ===== */}
        <LegalSection sections={TERMS_SECTIONS} id="acceptance">
          <p>
            Using this website or placing an order means you agree to these
            terms. If you do not agree to them, please do not order.
          </p>
          <p>
            These terms are between you and{" "}
            <Placeholder>registered legal entity, e.g. ATLY LLC</Placeholder>, a
            family chocolate business in {BUSINESS.areaServed}.
          </p>
        </LegalSection>

        {/* ===== 2 ===== */}
        <LegalSection sections={TERMS_SECTIONS} id="eligibility">
          <p>
            You need to be 18 or over to place an order. If you are under 18, a
            parent or guardian has to place it for you, or give you permission
            to do it.
          </p>
          <p>
            You also need a delivery address in {delivery.allowedStateName}. See{" "}
            <a href="#delivery" className="text-gold-deep">
              delivery
            </a>
            .
          </p>
        </LegalSection>

        {/* ===== 3 ===== */}
        <LegalSection sections={TERMS_SECTIONS} id="products">
          <p>
            Every piece is made by hand in small batches. That is the point of
            it, and it has a consequence: no two are identical. Appearance,
            decoration and weight vary a little from batch to batch.
          </p>
          <p>
            Photographs on this site show the kind of thing you will get, not
            the exact piece. Yours will be recognisably the same product and
            will not be identical to the picture.
          </p>
          <p>
            Seasonal and market items can sell out without notice. If something
            sells out after you order it, see{" "}
            <a href="#ordering" className="text-gold-deep">
              ordering
            </a>
            .
          </p>
        </LegalSection>

        {/* ===== 4. ALLERGENS ===== */}
        <LegalSection sections={TERMS_SECTIONS} id="allergens">
          <div className="border-2 border-error bg-ivory p-6">
            <p className="text-body-l text-error">
              <strong>
                Our products contain milk, peanuts, hazelnut and pistachio
                (tree nuts).
              </strong>
            </p>

            <p className="mt-5 text-body-m">
              <strong>
                All products are made in a shared kitchen on shared equipment.
                Any item may contain traces of soy, eggs, wheat and other tree
                nuts, even where they are not listed as an ingredient.
              </strong>
            </p>

            <p className="mt-5 text-body-m">
              <strong>
                We cannot guarantee that any product is free from any allergen.
              </strong>
            </p>

            <p className="mt-5 text-body-m">
              Still being checked, and to be treated as present until we
              confirm otherwise:{" "}
              <Placeholder>
                soy — soy lecithin is in most couverture, and if ours has it,
                soy is an ingredient and not a trace
              </Placeholder>{" "}
              <Placeholder>eggs</Placeholder>{" "}
              <Placeholder>wheat</Placeholder>{" "}
              <Placeholder>
                which tree nuts are in the Mixed Nuts bar, named individually
              </Placeholder>
            </p>

            <p className="mt-5 text-body-m">
              If you have a severe allergy, email us at{" "}
              <a href={mail} className="text-gold-deep">
                {BUSINESS.contactEmail}
              </a>{" "}
              before you order.
            </p>
          </div>

          {CROSS_CONTACT_STATEMENT && (
            <p className="text-body-s text-cocoa">{CROSS_CONTACT_STATEMENT}</p>
          )}

          <p className="text-body-s text-cocoa">
            Per-product allergen information is on the{" "}
            <Link href="/allergens" className="text-gold-deep">
              allergens page
            </Link>{" "}
            and on every product page.
          </p>
        </LegalSection>

        {/* ===== 5 ===== */}
        <LegalSection sections={TERMS_SECTIONS} id="ordering">
          <p>
            Placing an order is an offer to buy. It is accepted when we send you
            an email confirmation, and that confirmation is what forms the
            contract.
          </p>
          <p>We may refuse or cancel an order. The usual reasons are:</p>
          <ul className="ml-5 list-disc space-y-1">
            <li>something has sold out</li>
            <li>the address is outside the area we deliver to</li>
            <li>we suspect the payment is fraudulent</li>
            <li>
              we cannot make the order safely or in time — a kitchen problem, an
              ingredient we cannot get
            </li>
          </ul>
          <p>
            If we cancel an order you have paid for, you are refunded in full.
          </p>
        </LegalSection>

        {/* ===== 6 ===== */}
        <LegalSection sections={TERMS_SECTIONS} id="pricing">
          <p>
            All prices are in US dollars. New Jersey sales tax is added where it
            applies, and is shown separately before you pay.
          </p>
          <p>
            Payment is processed by <strong>Stripe</strong>, on Stripe&rsquo;s
            own hosted checkout. Your card details go straight to them and never
            reach us — we do not receive or store your full card number.
          </p>
          <p>
            Prices can change at any time. The price that applies to your order
            is the one shown at checkout when you place it, and that is the
            amount you are charged: every figure is recalculated on our side
            before payment is taken.
          </p>
        </LegalSection>

        {/* ===== 7 ===== */}
        <LegalSection sections={TERMS_SECTIONS} id="delivery">
          <p>
            We deliver within {delivery.allowedStateName} only. We do not ship
            out of state.
          </p>
          <ul className="ml-5 list-disc space-y-1">
            <li>
              <strong>{delivery.freeCountyName}</strong> — delivered by hand,{" "}
              {delivery.freeCounty.alwaysFree
                ? "free on every order, with no minimum"
                : `free on orders of ${formatCents(delivery.freeCounty.thresholdCents)} or more`}
              .
            </li>
            <li>
              <strong>Elsewhere in {delivery.allowedStateName}</strong> —{" "}
              {formatCents(delivery.standardCents)}, by carrier.
            </li>
          </ul>
          <p>
            You can place an order at any time, day or night. The cutoff for a
            given week is <strong>{ORDER_CUTOFF}</strong> — order by then and it
            goes out that {DELIVERY_DAY}; order after it and it goes out the
            following {DELIVERY_DAY}.
          </p>
          <p>
            Deliveries arrive on {DELIVERY_DAY} between{" "}
            <strong>{DELIVERY_WINDOW}</strong>.
          </p>
          <p>
            Someone should be available to receive the order. If nobody is, we
            leave it at the address you gave us — and then it is out in the
            weather, so please read the next section.
          </p>
        </LegalSection>

        {/* ===== 8 ===== */}
        <LegalSection sections={TERMS_SECTIONS} id="heat">
          <p>
            Chocolate melts. Ours has no preservatives and nothing added to make
            it survive a hot afternoon on a doorstep, which is the same reason
            it tastes the way it does.
          </p>
          <p>
            Once an order has been delivered to the address you gave us,
            collecting it promptly and keeping it somewhere cool is up to you.
            We are not liable for melting, blooming or damage that happens after
            delivery, or for an order left uncollected.
          </p>
          <p>
            If the weather on your delivery day worries you, email{" "}
            <a href={mail} className="text-gold-deep">
              {BUSINESS.contactEmail}
            </a>{" "}
            and we will work something out before we send it.
          </p>
        </LegalSection>

        {/* ===== 9 ===== */}
        <LegalSection sections={TERMS_SECTIONS} id="cancellations">
          <p className="text-body-l">
            <strong>All sales are final.</strong>
          </p>
          <p>
            These are handmade perishable food items, made to order. Once an
            order is placed we do not accept returns, and we do not offer
            refunds or exchanges, except in the cases below.
          </p>

          <h3 className="text-display-s">When we will put it right</h3>
          <p>
            Email{" "}
            <a href={mail} className="text-gold-deep">
              {BUSINESS.contactEmail}
            </a>{" "}
            within <strong>{REPORT_WINDOW_HOURS} hours of delivery</strong> if:
          </p>
          <ol className="ml-5 list-[lower-alpha] space-y-1">
            <li>your order never arrived</li>
            <li>we sent you the wrong items</li>
            <li>
              it arrived damaged or in a state you could not serve — please send
              a photograph
            </li>
          </ol>
          <p>
            In any of those cases we will either remake the order or refund it.
            Which one is our decision, and we will tell you which before we do
            it.
          </p>

          <h3 className="text-display-s">Changing your mind</h3>
          <p>
            You can cancel up to{" "}
            <strong>{CANCEL_WINDOW_HOURS} hours before your delivery date</strong>{" "}
            and we will refund you in full. After that we have started making
            it, and it cannot be cancelled.
          </p>

          <h3 className="text-display-s">What we will not refund</h3>
          <ul className="ml-5 list-disc space-y-1">
            <li>melting or damage that happened after a successful delivery</li>
            <li>an order left uncollected where we delivered it</li>
            <li>
              a problem told to us more than {REPORT_WINDOW_HOURS} hours after
              delivery
            </li>
            <li>
              changing your mind less than {CANCEL_WINDOW_HOURS} hours before
              delivery
            </li>
          </ul>
          <p className="text-body-s text-cocoa">
            None of this affects any right you have under New Jersey or federal
            law that cannot be signed away.
          </p>
        </LegalSection>

        {/* ===== 10 ===== */}
        <LegalSection sections={TERMS_SECTIONS} id="ip">
          <p>
            The ATLY name and branding, the photographs, the writing on this site
            and our recipes belong to{" "}
            <Placeholder>registered legal entity</Placeholder> and may not be
            reproduced without written permission.
          </p>
          <p>
            You are welcome to share a link to any page here, and to post a
            photograph of chocolate you bought from us.
          </p>
        </LegalSection>

        {/* ===== 11 ===== */}
        <LegalSection sections={TERMS_SECTIONS} id="acceptable-use">
          <p>Please do not:</p>
          <ul className="ml-5 list-disc space-y-1">
            <li>resell our products without a written agreement with us</li>
            <li>scrape the site or collect data from it automatically</li>
            <li>place orders with a bot or a script, or in bulk by automation</li>
            <li>interfere with how the site runs</li>
          </ul>
          <p>
            We may refuse service to anyone doing these things, and cancel their
            orders.
          </p>
        </LegalSection>

        {/* ===== 12 ===== */}
        <LegalSection sections={TERMS_SECTIONS} id="warranties">
          <p>
            This website and everything on it is provided as it is, without
            warranties of any kind, to the fullest extent the law allows. We do
            not promise it will always be available or free of errors.
          </p>
          <p>
            That is about the website. It is not about the chocolate — that we do
            stand behind.
          </p>
        </LegalSection>

        {/* ===== 13 ===== */}
        <LegalSection sections={TERMS_SECTIONS} id="liability">
          <p>
            Our total liability arising from any order is limited to the amount
            you paid for that order, to the maximum extent permitted by New
            Jersey law.
          </p>
          <p>
            <strong>
              Nothing in these terms limits our responsibility for death or
              personal injury caused by our negligence, for gross negligence, or
              for anything else the law does not allow us to sign away.
            </strong>{" "}
            We sell food. That responsibility is not something to bargain over,
            and a clause trying to disclaim it would not be enforceable anyway.
          </p>
        </LegalSection>

        {/* ===== 14 ===== */}
        <LegalSection sections={TERMS_SECTIONS} id="indemnification">
          <p>
            If you break these terms — reselling without an agreement, misusing
            the site, giving us details that are not yours — and that costs us
            money, we may ask you to cover it.
          </p>
          <p>
            This works both ways: if we cause you a loss through our own fault,
            that is ours to put right.
          </p>
        </LegalSection>

        {/* ===== 15 ===== */}
        <LegalSection sections={TERMS_SECTIONS} id="changes">
          <p>
            We may update these terms. The date at the top of this page tells you
            when they last changed, and continuing to use the site means you
            accept the current version.
          </p>
          <p>
            The version that applies to your order is the one published when you
            placed it. We record which that was on the order itself, so there is
            never a question about which set you agreed to.
          </p>
        </LegalSection>

        {/* ===== 16 ===== */}
        <LegalSection sections={TERMS_SECTIONS} id="law">
          <p>
            These terms are governed by the law of the State of New Jersey. Any
            dispute goes to the state or federal courts sitting in{" "}
            {VENUE_COUNTY}, New Jersey.
          </p>
        </LegalSection>

        {/* ===== 17 ===== */}
        <LegalSection sections={TERMS_SECTIONS} id="contact">
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
          <p>
            Email is the fastest way to reach us — for orders, allergies, or
            anything else. You can also find us here:
          </p>
          <SocialLinks className="mt-2" />
        </LegalSection>
      </div>

      <p className="mt-section text-body-s">
        <Link href="/privacy" className="text-gold-deep">
          Privacy policy
        </Link>
        <span className="mx-3 text-cocoa">·</span>
        <Link href="/" className="back-link text-cocoa-deep">
          Back to the shop
        </Link>
      </p>
    </main>
  );
}
