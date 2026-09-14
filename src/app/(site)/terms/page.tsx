import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Section, Undecided } from "@/components/LegalPage";
import { getStorefrontSettings } from "@/lib/settings/resolve";
import { formatCents } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Terms",
  description:
    "How ordering from ATLY Belgian Chocolate works: pricing, availability, delivery area, and what happens when something goes wrong.",
  alternates: { canonical: "/terms" },
};

export default async function TermsPage() {
  const { delivery } = await getStorefrontSettings();

  return (
    <LegalPage
      eyebrow="Terms"
      title="How ordering works"
      intro="Plainly, and in the same words we would use at the market table."
    >
      <Section heading="What we sell, and when we can">
        <p>
          Everything is made by hand in small batches, so what is available
          changes. If something has sold out between you adding it to your cart
          and checking out, we will tell you before you pay — you will not be
          charged for something we cannot make.
        </p>
      </Section>

      <Section heading="Prices">
        <p>
          Prices are shown per piece and per bundle, and the cheapest
          combination of our offers is worked out for you automatically. You do
          not need to pick a box size to get the better price.
        </p>
        <p>
          The total you are shown at checkout is the total you are charged. Every
          figure is recalculated on our side before payment is taken, so a price
          that has changed since you loaded the page is caught there rather than
          on your card.
        </p>
        <p>
          Prices can change. The price that applies to your order is the one you
          are shown at checkout.
        </p>
      </Section>

      <Section heading="Where we deliver">
        <p>
          {delivery.allowedStateName} only, for now. We say so on the shop, on
          every product, and in your cart, so it is never a surprise at the
          address step.
        </p>
        <p>
          {delivery.freeCounty.alwaysFree
            ? `Delivery is free throughout ${delivery.freeCountyName}, which we deliver by hand.`
            : `Delivery is free on orders of ${formatCents(delivery.freeCounty.thresholdCents)} or more in ${delivery.freeCountyName}.`}{" "}
          Everywhere else in {delivery.allowedStateName} it is{" "}
          {formatCents(delivery.standardCents)}.
        </p>
        <Undecided>
          how long delivery takes, and what we do about hot weather. Chocolate
          and a warm van are not friends, and we have not settled what we
          promise about it.
        </Undecided>
      </Section>

      <Section heading="Allergies">
        <p>
          Everything is made in one family kitchen that handles peanuts and tree
          nuts. Please read the{" "}
          <Link href="/allergens" className="text-gold-deep">
            allergen page
          </Link>{" "}
          before ordering, and message us if anything there is not clear enough
          to decide on.
        </p>
      </Section>

      <Section heading="If something goes wrong">
        <p>
          Tell us. We are a small family business and we would rather hear about
          it than not. How returns and refunds work is on the{" "}
          <Link href="/refunds" className="text-gold-deep">
            refunds page
          </Link>
          .
        </p>
      </Section>

      <Section heading="The legal part">
        <Undecided>
          which state&rsquo;s law governs these terms, how a dispute would be
          handled, and what we are and are not liable for. These are not
          questions to answer from a template, and they have not been answered
          yet.
        </Undecided>
      </Section>
    </LegalPage>
  );
}
