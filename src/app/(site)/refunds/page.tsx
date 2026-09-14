import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Section } from "@/components/LegalPage";
import { SocialLinks } from "@/components/SocialLinks";
import { BUSINESS } from "@/lib/site";
import { REPORT_WINDOW_HOURS } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Returns and refunds",
  description:
    "All sales are final, with limited exceptions: an order that never arrived, the wrong items, or items that arrived damaged.",
  alternates: { canonical: "/refunds" },
};

/**
 * The short version.
 *
 * The binding wording lives in one place — section 9 of the terms — and this
 * page is a signpost to it. Restating a refund policy in full on two pages is
 * how a business ends up with two refund policies that disagree, and the
 * customer gets to pick whichever one suits them.
 *
 * The one number that appears in both (the reporting window) is imported
 * rather than typed, so it cannot drift either.
 */
export default function RefundsPage() {
  const mail = `mailto:${BUSINESS.contactEmail}`;

  return (
    <LegalPage
      eyebrow="Returns and refunds"
      title="If it is not right"
      intro="Tell us. We would far rather hear about it than have you quietly not order again."
    >
      <Section heading="The short version">
        <p>
          <strong>All sales are final.</strong> Everything is made by hand to
          order and it is perishable food, so we cannot take it back and resell
          it.
        </p>
        <p>
          There are three exceptions, and in any of them we will remake your
          order or refund it:
        </p>
        <ul className="ml-5 list-disc space-y-1">
          <li>it never arrived</li>
          <li>we sent the wrong thing</li>
          <li>
            it arrived damaged or in a state you could not serve — send us a
            photograph
          </li>
        </ul>
        <p>
          Email{" "}
          <a href={mail} className="text-gold-deep">
            {BUSINESS.contactEmail}
          </a>{" "}
          within <strong>{REPORT_WINDOW_HOURS} hours of delivery</strong>.
        </p>
      </Section>

      <Section heading="Cancelling">
        <p>
          You can cancel any time before your order goes out for delivery, and
          we will refund you in full — even if we have already made it. Once it
          has left us it cannot be cancelled.
        </p>
      </Section>

      <Section heading="Melting">
        <p>
          Once a delivery has been made successfully, melting is outside what we
          can cover — and so is an order left uncollected where we delivered it.
          Chocolate on a doorstep in July does not wait.
        </p>
        <p>
          If the forecast worries you, email us before your delivery day and we
          will work something out.
        </p>
      </Section>

      <Section heading="The full wording">
        <p>
          This page is the summary.{" "}
          <Link href="/terms#cancellations" className="text-gold-deep">
            Section 9 of our terms
          </Link>{" "}
          is the version that actually binds, and it says the same thing at
          slightly greater length.
        </p>
        <p className="text-body-s text-cocoa">
          None of this affects any right you have under New Jersey or federal
          law that cannot be signed away.
        </p>
      </Section>

      <Section heading="How to reach us">
        <p>
          Email{" "}
          <a href={mail} className="text-gold-deep">
            {BUSINESS.contactEmail}
          </a>{" "}
          with your order reference — the code beginning ATLY on your
          confirmation. Or message us:
        </p>
        <SocialLinks className="mt-4" />
      </Section>
    </LegalPage>
  );
}
