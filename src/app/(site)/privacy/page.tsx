import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Section, Undecided } from "@/components/LegalPage";
import { BUSINESS } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What ATLY Belgian Chocolate collects when you order, who it is shared with, and what we do not do.",
  alternates: { canonical: "/privacy" },
};

/**
 * Written from the code, not from a template.
 *
 * Every claim here is checkable against a file in this repository, and the
 * claims about what we DON'T do are the ones most worth keeping true:
 *   - no analytics of any kind is installed (check package.json and layout.tsx)
 *   - the only cookie is the admin session (src/lib/admin/auth.ts)
 *   - the cart never leaves the browser until checkout (src/lib/cartStore.ts)
 *
 * If any of those stop being true, this page changes in the same commit.
 */
export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="What we collect"
      intro="We are a family chocolate business, not a data company. This is the whole of it."
    >
      <Section heading="What you give us when you order">
        <p>
          To take an order and bring it to you we ask for your name, email
          address, phone number and delivery address. If you write a gift note,
          we keep that too, because someone has to write it on the card.
        </p>
        <p>
          The phone number is so we can find you on delivery day. The email is
          so we can send your confirmation. We do not use either to send you
          anything you did not ask for.
        </p>
      </Section>

      <Section heading="Your cart stays in your browser">
        <p>
          What you put in your cart is saved in your own browser and is not sent
          to us until you check out. Clearing your browser data clears it. We
          cannot see an abandoned cart, because there is nothing on our side to
          see.
        </p>
      </Section>

      <Section heading="Who else touches it">
        <p>
          Taking payment, sending email and keeping your order somewhere means
          using other companies, and your details pass through them:
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li>
            <strong>Stripe</strong> handles payment. Your card details go
            straight to Stripe and never reach us — we are told only that the
            payment succeeded.
          </li>
          <li>
            <strong>Resend</strong> sends your order confirmation, so it
            handles your email address.
          </li>
          <li>
            <strong>Supabase</strong> stores the order itself.
          </li>
          <li>
            <strong>Vercel</strong> serves this website.
          </li>
        </ul>
        <p>
          We do not sell your details, and we do not share them with anyone
          beyond the companies above.
        </p>
      </Section>

      {/*
        !! THIS SECTION IS A FACTUAL CLAIM, AND IT IS CHECKABLE !! ------------
        Every sentence below is true of this codebase today and was verified
        against a running page: document.cookie is empty for a customer, there
        are no third-party origins in the network log, and the fonts are
        self-hosted by next/font.

        It is ALSO the reason this site has no cookie banner. There is nothing
        to consent to, and a banner with nothing behind it is friction for
        nobody's benefit.

        If analytics, an advertising pixel, embedded video, a map, or a
        third-party font ever gets added, this section stops being true and a
        consent banner becomes necessary — non-essential scripts blocked until
        the visitor chooses, Reject as easy as Accept, nothing pre-ticked.
        Change this page in the same commit as the script. A stale privacy
        policy is not an oversight; it is a false statement about what you do
        with someone's data.
        ---------------------------------------------------------------------
      */}
      <Section heading="Cookies, and why there is no cookie banner">
        <p>
          <strong>We do not give you any cookies.</strong> Not one — not for
          analytics, not for advertising, not for remembering you.
        </p>
        <p>
          There is a single cookie in this whole website, and it is the one that
          keeps the shop owner signed in to their own admin screens. You will
          never be issued it.
        </p>
        <p>
          Your cart is kept in your own browser&rsquo;s storage rather than in a
          cookie, which is why it survives a refresh and disappears when you
          clear your browsing data. It is never sent to us until you check out.
        </p>
        <p>
          There is also no analytics on this site. No tracking pixels, no
          advertising tags, nothing counting or measuring what you look at.
          Nothing on these pages is loaded from anyone else&rsquo;s server —
          even the fonts are served from here — so visiting this site does not
          tell any other company that you did.
        </p>
        <p>
          That is why you were not asked to accept cookies when you arrived.
          There is nothing to accept. If that ever changes, this page changes
          first.
        </p>
      </Section>

      <Section heading="How long we keep it">
        <Undecided>
          how long we hold onto an order once it has been delivered.
        </Undecided>
      </Section>

      <Section heading="Asking us to delete it">
        <p>
          Email{" "}
          <a href={`mailto:${BUSINESS.contactEmail}`} className="text-gold-deep">
            {BUSINESS.contactEmail}
          </a>{" "}
          and we will tell you what we hold about you, or delete it. We have to
          keep what the tax rules require us to keep, and nothing else.
        </p>
        <Undecided>how quickly we promise to answer that request.</Undecided>
      </Section>

      <Section heading="Children">
        <p>
          This is a shop for chocolate, not a service for children, and we do
          not knowingly collect anything from anyone under 13.
        </p>
      </Section>

      <Section heading="Changes">
        <p>
          If this changes, the page changes, and the date at the bottom changes
          with it.
        </p>
        <Undecided>
          the date this takes effect. Nothing here is in force until it has been
          read by someone qualified.
        </Undecided>
        <p className="text-body-s text-cocoa">
          See also our{" "}
          <Link href="/terms" className="text-gold-deep">
            terms
          </Link>{" "}
          and our{" "}
          <Link href="/refunds" className="text-gold-deep">
            returns and refunds
          </Link>{" "}
          page.
        </p>
      </Section>
    </LegalPage>
  );
}
