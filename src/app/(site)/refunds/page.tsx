import type { Metadata } from "next";
import { LegalPage, Section, Undecided } from "@/components/LegalPage";
import { SocialLinks } from "@/components/SocialLinks";

export const metadata: Metadata = {
  title: "Returns and refunds",
  description:
    "What to do if something arrives wrong, melted, or not what you ordered.",
  alternates: { canonical: "/refunds" },
};

/**
 * Almost entirely undecided, and deliberately so.
 *
 * A refund policy is a commercial promise. The window, who pays for a return,
 * what counts as "arrived in poor condition" for something that melts — every
 * one of those is the owner's decision and costs them real money. Filling them
 * in with the usual e-commerce defaults would be inventing terms on their
 * behalf, and they would be bound by whatever this page said.
 *
 * So the page exists, says what is actually true (tell us, we will sort it
 * out), and marks each decision as open.
 */
export default function RefundsPage() {
  return (
    <LegalPage
      eyebrow="Returns and refunds"
      title="If it is not right"
      intro="Tell us. We would far rather hear about it than have you quietly not order again."
    >
      <Section heading="Something arrived damaged or melted">
        <p>
          Send us a photograph and your order reference and we will put it
          right. Chocolate travels badly in warm weather and we know it.
        </p>
        <Undecided>
          exactly what we will do — replace it, refund it, or let you choose —
          and how long after delivery you can ask.
        </Undecided>
      </Section>

      <Section heading="We sent the wrong thing">
        <p>
          That one is on us. Tell us what you got and what you ordered, and we
          will fix it.
        </p>
      </Section>

      <Section heading="You changed your mind">
        <p>
          Everything is made to order by hand, and it is food, so it cannot be
          resold once it has left us.
        </p>
        <Undecided>
          whether an order can be cancelled after it is placed, and up to what
          point — before it is made, before it is out for delivery, or not at
          all.
        </Undecided>
      </Section>

      <Section heading="How to reach us">
        <p>
          Message us with your order reference — it is the code beginning ATLY
          on your confirmation.
        </p>
        <SocialLinks className="mt-4" />
        <Undecided>
          a proper contact email address for orders. Right now the fastest way
          to reach us is a message on Instagram or Facebook.
        </Undecided>
      </Section>
    </LegalPage>
  );
}
