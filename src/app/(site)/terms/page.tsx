import type { Metadata } from "next";
import Link from "next/link";
import { Placeholder } from "@/components/Placeholder";
import { SocialLinks } from "@/components/SocialLinks";
import { formatCents } from "@/lib/pricing";
import { getStorefrontSettings } from "@/lib/settings/resolve";
import { BUSINESS } from "@/lib/site";
import {
  CROSS_CONTACT_STATEMENT,
  TREE_NUTS_PRESENT,
  TREE_NUTS_UNCONFIRMED,
} from "@/lib/catalog";
import {
  REPORT_WINDOW_HOURS,
  TERMS_HAS_PLACEHOLDERS,
  TERMS_LAST_UPDATED,
  TERMS_LAST_UPDATED_LABEL,
  TERMS_SECTIONS,
} from "@/lib/terms";

export const metadata: Metadata = {
  title: "Terms and conditions",
  description:
    "The terms you agree to when you order from ATLY Belgian Chocolate: allergens, ordering, delivery, cancellations and refunds.",
  alternates: { canonical: "/terms" },
};

/**
 * Terms and conditions.
 *
 * Written in plain English on purpose. A customer should be able to read a
 * section once and know where they stand; a wall of defined terms and
 * subclauses is how a business ends up with terms nobody has read, which is
 * not the same as terms nobody can argue with.
 *
 * Three rules held throughout:
 *
 *   1. The allergen notice comes FIRST and is not softened. It is the only
 *      section here that can hurt someone — the rest is about money.
 *   2. Nothing the owner has not supplied is filled in. Delivery windows, the
 *      order cutoff, the venue county and three allergen questions all render
 *      as visible markers.
 *   3. Prices and delivery rules are read from the live configuration rather
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

      {TERMS_HAS_PLACEHOLDERS && (
        <div role="note" className="mt-8 border-2 border-error bg-ivory p-6">
          <h2 className="text-display-s text-error">Not finished yet</h2>
          <p className="mt-3 text-body-m">
            Anything still marked in brackets below is a detail we have not
            settled. We have left the gaps visible rather than filling them in
            with something that sounds right — and nobody qualified has
            reviewed this page yet, so please do not rely on it as it stands.
          </p>
          <p className="mt-3 text-body-m text-cocoa">
            If you need an answer about any of it before we finish, email{" "}
            <a href={mail} className="text-gold-deep">
              {BUSINESS.contactEmail}
            </a>{" "}
            and we will answer you directly.
          </p>
        </div>
      )}

      {/* ---- Jump to a section ---- */}
      <nav aria-labelledby="toc-heading" className="mt-12 border-y border-rule py-6">
        <h2 id="toc-heading" className="label-caps">
          Jump to a section
        </h2>
        <ol className="mt-4 grid gap-x-8 gap-y-1 sm:grid-cols-2">
          {TERMS_SECTIONS.map((section, index) => (
            <li key={section.id} className="text-body-s">
              <a
                href={`#${section.id}`}
                className="back-link text-cocoa-deep no-underline hover:text-gold-deep"
              >
                <span className="mr-2 text-cocoa tabular-nums">{index + 1}.</span>
                {section.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-12 space-y-12">
        {/* ============ 1. Allergens ============ */}
        <Section id="allergens" title="Food allergen notice">
          <div className="border-2 border-error bg-ivory p-6">
            <p className="text-body-l text-error">
              Our chocolate contains milk, peanuts and tree nuts.
            </p>

            <p className="mt-5 text-body-m">The tree nuts in our kitchen are:</p>
            <ul className="mt-2 ml-5 list-disc space-y-1 text-body-m">
              {TREE_NUTS_PRESENT.map((nut) => (
                <li key={nut}>{nut}</li>
              ))}
              {TREE_NUTS_UNCONFIRMED && (
                <li>
                  <Placeholder>
                    which nuts are in the Mixed Nuts bar — to be named
                    individually
                  </Placeholder>
                </li>
              )}
            </ul>

            <p className="mt-5 text-body-m">
              We also need to confirm whether our chocolate or fillings contain{" "}
              <Placeholder>soy — soy lecithin is common in couverture</Placeholder>{" "}
              <Placeholder>eggs</Placeholder>{" "}
              <Placeholder>wheat</Placeholder>. Until we have checked, please
              assume they may be present.
            </p>

            {CROSS_CONTACT_STATEMENT && (
              <p className="mt-5 text-body-m">{CROSS_CONTACT_STATEMENT}</p>
            )}

            <p className="mt-5 text-body-m">
              If you have a severe allergy, email us at{" "}
              <a href={mail} className="text-gold-deep">
                {BUSINESS.contactEmail}
              </a>{" "}
              before you order, and we will tell you exactly how we work.
            </p>
          </div>

          <p className="text-body-s text-cocoa">
            Per-product allergen information is on the{" "}
            <Link href="/allergens" className="text-gold-deep">
              allergens page
            </Link>{" "}
            and on every product page.
          </p>
        </Section>

        {/* ============ 2. Acceptance ============ */}
        <Section id="acceptance" title="Accepting these terms">
          <p>
            Using this website or placing an order means you agree to these
            terms. If you do not agree to them, please do not order.
          </p>
          <p>
            These terms are between you and {BUSINESS.tradingName}, a family
            chocolate business in {BUSINESS.areaServed}{" "}
            <Placeholder>
              registered legal form — LLC, sole proprietorship, or other
            </Placeholder>
            .
          </p>
        </Section>

        {/* ============ 3. Eligibility ============ */}
        <Section id="eligibility" title="Who can order">
          <p>
            You need to be 18 or over to place an order. If you are under 18,
            a parent or guardian has to place it for you or give you permission
            to do it.
          </p>
          <p>
            You also need a delivery address in {delivery.allowedStateName}.
            See <a href="#delivery" className="text-gold-deep">delivery</a>.
          </p>
        </Section>

        {/* ============ 4. Products ============ */}
        <Section id="products" title="Our products">
          <p>
            Everything is made by hand, in small batches. That is the point of
            it, and it has a consequence: no two pieces are identical. Colour,
            finish, decoration and weight vary a little from batch to batch.
          </p>
          <p>
            Photographs on this site show the kind of thing you will get, not
            the exact piece. Yours will be recognisably the same product and
            will not be identical to the picture.
          </p>
          <p>
            Chocolate is a natural product and its appearance changes with
            temperature and time. See{" "}
            <a href="#heat" className="text-gold-deep">
              heat, and how long it keeps
            </a>
            .
          </p>
        </Section>

        {/* ============ 5. Ordering ============ */}
        <Section id="ordering" title="Ordering">
          <p>
            When you place an order you are making us an offer to buy. The
            order is not accepted until we confirm it by email, and that
            confirmation is what forms the contract.
          </p>
          <p>We may refuse or cancel an order. The usual reasons are:</p>
          <ul className="ml-5 list-disc space-y-1">
            <li>something has sold out</li>
            <li>
              the address is outside the area we deliver to
            </li>
            <li>we suspect the payment is fraudulent</li>
            <li>
              we cannot make the order safely or in time — a kitchen problem, an
              ingredient we cannot get
            </li>
          </ul>
          <p>
            If we cancel an order you have already paid for, you get the whole
            amount back.
          </p>
        </Section>

        {/* ============ 6. Prices and payment ============ */}
        <Section id="pricing" title="Prices and payment">
          <p>
            All prices are in US dollars. New Jersey sales tax is added where it
            applies, and is shown separately before you pay.
          </p>
          <p>
            The total you are shown at checkout is the total you are charged.
            Every figure is recalculated on our side before payment is taken, so
            a price that changed while you were shopping is caught there rather
            than on your card.
          </p>
          <p>
            Payment is processed by <strong>Stripe</strong>. Your card details
            go straight to Stripe and never reach our servers — we are told only
            that the payment succeeded. We do not store card numbers.
          </p>
          <p>
            Prices can change. The price that applies to your order is the one
            shown at checkout when you place it.
          </p>
        </Section>

        {/* ============ 7. Delivery ============ */}
        <Section id="delivery" title="Delivery">
          <p>
            We deliver within {delivery.allowedStateName} only. We do not ship
            anywhere else, and we say so throughout the site rather than
            springing it on you at the address step.
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
            We take and make orders from 9am to 5pm, every day except Sunday.
          </p>
          <p>
            <Placeholder>
              order cutoff — the time after which an order is made the next
              working day
            </Placeholder>{" "}
            <Placeholder>
              delivery windows — what time of day a delivery arrives
            </Placeholder>
          </p>
          <p>
            You are responsible for giving us an address someone can receive a
            delivery at. If nobody is there, see{" "}
            <a href="#heat" className="text-gold-deep">
              the next section
            </a>{" "}
            — chocolate left outside in summer does not survive.
          </p>
        </Section>

        {/* ============ 8. Heat ============ */}
        <Section id="heat" title="Heat, and how long it keeps">
          <p>
            Chocolate melts. Ours has no preservatives and nothing added to make
            it survive a hot afternoon on a doorstep, which is the same reason
            it tastes the way it does.
          </p>
          <p>
            Please collect your delivery promptly and get it somewhere cool. Once
            a delivery has been made successfully we are not responsible for
            melting or damage that happens afterwards, or for an order left
            uncollected where we delivered it.
          </p>
          <p>
            If you are worried about the weather on your delivery day, email us
            at{" "}
            <a href={mail} className="text-gold-deep">
              {BUSINESS.contactEmail}
            </a>{" "}
            and we will work something out with you before we send it.
          </p>
        </Section>

        {/* ============ 9. Cancellations and refunds ============ */}
        <Section id="cancellations" title="Cancellations and refunds">
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
            Email us at{" "}
            <a href={mail} className="text-gold-deep">
              {BUSINESS.contactEmail}
            </a>{" "}
            within <strong>{REPORT_WINDOW_HOURS} hours of delivery</strong> if:
          </p>
          <ol className="ml-5 list-[lower-alpha] space-y-1">
            <li>your order never arrived</li>
            <li>we sent you the wrong items</li>
            <li>
              it arrived damaged or in a state you could not serve — please
              send us a photograph
            </li>
          </ol>
          <p>
            In any of those cases we will either remake the order or refund it.
            Which one is our decision, and we will tell you which before we do
            it.
          </p>

          <h3 className="text-display-s">Changing your mind</h3>
          <p>
            You can cancel an order any time before it goes out for delivery —
            email us and we will refund you in full. Once it has left us it
            cannot be cancelled.
          </p>

          <h3 className="text-display-s">What we will not refund</h3>
          <ul className="ml-5 list-disc space-y-1">
            <li>
              melting or damage that happened after we delivered successfully
            </li>
            <li>an order left uncollected where we delivered it</li>
            <li>
              a problem told to us more than {REPORT_WINDOW_HOURS} hours after
              delivery
            </li>
            <li>simply changing your mind after it has gone out</li>
          </ul>
          <p className="text-body-s text-cocoa">
            None of this affects any right you have under New Jersey or federal
            law that cannot be signed away.
          </p>
        </Section>

        {/* ============ 10. IP ============ */}
        <Section id="ip" title="What belongs to us">
          <p>
            The ATLY name, the logo, the photographs, the writing on this site
            and our recipes are ours. Please do not copy, republish or use them
            for anything commercial without asking us first.
          </p>
          <p>
            You are welcome to share a link to any page here, and to post a
            photograph of chocolate you bought from us.
          </p>
        </Section>

        {/* ============ 11. Acceptable use ============ */}
        <Section id="acceptable-use" title="Using this site">
          <p>Please do not:</p>
          <ul className="ml-5 list-disc space-y-1">
            <li>buy from us to resell, without an arrangement with us first</li>
            <li>scrape the site or collect data from it automatically</li>
            <li>place orders with a bot or a script</li>
            <li>
              try to get at parts of the site that are not meant to be public
            </li>
          </ul>
          <p>
            We may refuse service to anyone doing these things, and cancel their
            orders.
          </p>
        </Section>

        {/* ============ 12. Warranties ============ */}
        <Section id="warranties" title="The site itself">
          <p>
            This website is provided as it is. We do not promise it will always
            be available, or free of errors. We do try to keep everything on it
            accurate, and if you spot something wrong we would genuinely like to
            know.
          </p>
          <p>
            This is about the website. It is not about the chocolate — that we
            do stand behind.
          </p>
        </Section>

        {/* ============ 13. Liability ============ */}
        <Section id="liability" title="Limits on what we owe you">
          <p>
            If something goes wrong with an order, what we owe you is limited to
            what you paid for that order, as far as New Jersey law allows.
          </p>
          <p>
            <strong>
              Nothing in these terms limits our responsibility for death or
              personal injury caused by our negligence, for gross negligence, or
              for anything else the law does not allow us to sign away.
            </strong>{" "}
            We sell food. That responsibility is not something to bargain over,
            and a term trying to disclaim it would not be enforceable anyway.
          </p>
        </Section>

        {/* ============ 14. Indemnification ============ */}
        <Section id="indemnification" title="If you cause us a loss">
          <p>
            If you break these terms — reselling without an arrangement, misusing
            the site, giving us details that are not yours — and that costs us
            money, we may ask you to cover it.
          </p>
        </Section>

        {/* ============ 15. Changes ============ */}
        <Section id="changes" title="Changes to these terms">
          <p>
            We may update these terms. The version that applies to your order is
            the one published when you placed it, and the date at the top of this
            page tells you when it last changed.
          </p>
          <p className="text-body-s text-cocoa">
            Last updated{" "}
            <time dateTime={TERMS_LAST_UPDATED}>{TERMS_LAST_UPDATED_LABEL}</time>
            .
          </p>
        </Section>

        {/* ============ 16. Law ============ */}
        <Section id="law" title="Which law applies">
          <p>
            These terms are governed by the law of the State of New Jersey. Any
            dispute goes to the state or federal courts sitting in{" "}
            <Placeholder>venue county</Placeholder> County, New Jersey.
          </p>
        </Section>

        {/* ============ 17. Contact ============ */}
        <Section id="contact" title="How to reach us">
          <p>
            Email{" "}
            <a href={mail} className="text-gold-deep">
              {BUSINESS.contactEmail}
            </a>{" "}
            — for orders, allergies, or anything else. It is the fastest way to
            get a real answer from us.
          </p>
          <p>You can also find us here:</p>
          <SocialLinks className="mt-2" />
          <p className="text-body-s text-cocoa">
            We are a family business working out of one kitchen, so we do not
            publish a street address. Everything reaches us by email.
          </p>
        </Section>
      </div>

      <p className="mt-section text-body-s">
        <Link href="/" className="back-link text-cocoa-deep">
          &larr; Back to the shop
        </Link>
      </p>
    </main>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  const index = TERMS_SECTIONS.findIndex((section) => section.id === id);

  return (
    // scroll-mt so a jump link does not land with the heading jammed against
    // the top edge of the window.
    <section id={id} className="scroll-mt-8">
      <h2 className="text-display-m">
        <span className="mr-3 text-cocoa tabular-nums">{index + 1}.</span>
        {title}
      </h2>
      <div className="mt-5 space-y-4 text-body-m">{children}</div>
    </section>
  );
}
