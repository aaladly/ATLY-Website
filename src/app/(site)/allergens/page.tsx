import type { Metadata } from "next";
import Link from "next/link";
import { AllergenNotice } from "@/components/AllergenNotice";
import { SocialLinks } from "@/components/SocialLinks";
import { BRAND } from "@/lib/catalog";
import { getStorefrontSettings } from "@/lib/settings/resolve";

export const metadata: Metadata = {
  title: "Allergens",
  description:
    "Allergen information for ATLY Belgian Chocolate. Everything is made by hand in one family kitchen that handles peanuts and tree nuts.",
  alternates: { canonical: "/allergens" },
};

export default async function AllergensPage() {
  const { products } = await getStorefrontSettings();

  return (
    <main className="mx-auto max-w-3xl px-gutter py-section">
      <p className="label-caps">Allergens</p>
      <h1 className="mt-3 text-display-xl">What is in it</h1>

      <p className="mt-7 text-body-l text-cocoa">
        Everything is made by hand, in small batches, in one kitchen. That
        kitchen handles peanuts, hazelnuts and mixed nuts.
      </p>
      <p className="mt-4 text-body-m text-cocoa">
        Sold-out flavors are listed here too. What we make does not change when
        something runs out, and neither does what is in the kitchen.
      </p>

      <div className="mt-12">
        <AllergenNotice products={products} />
      </div>

      <section className="mt-section border-t border-rule-strong pt-8">
        <h2 className="text-display-s">Ask us</h2>
        <p className="mt-3 text-body-m text-cocoa">
          If you have an allergy and anything here is not clear enough to decide
          on, message us before you order. We would far rather answer the
          question than have you guess.
        </p>
        <SocialLinks className="mt-6" />
        <p className="mt-8 text-body-s">
          <Link href="/shop" className="back-link text-cocoa-deep">
            &larr; Back to the shop
          </Link>
        </p>
      </section>

      <p className="mt-section text-body-s text-cocoa">
        {BRAND.couverture} is a milk chocolate, so every product contains milk.
      </p>
    </main>
  );
}
