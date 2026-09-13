import type { Metadata } from "next";
import Link from "next/link";
import { Photo } from "@/components/Photo";
import { DeliveryNotice } from "@/components/DeliveryNotice";
import { PRODUCTS, productAllergens, ALLERGEN_LABEL } from "@/lib/catalog";
import { PRODUCT_IMAGE } from "@/lib/images";
import { TIERS_BY_KIND, priceQuantity, formatCents } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Hand-filled bon-bons and hand-moulded bars, made from Belgian couverture in small batches. Delivered within New Jersey.",
};

export default function Shop() {
  return (
    <main>
      <section className="mx-auto max-w-6xl px-gutter pt-section pb-12">
        <p className="label-caps">Shop</p>
        <h1 className="mt-3 text-display-xl">The lineup</h1>
        <p className="mt-6 max-w-2xl text-body-l text-cocoa">
          Everything is made by hand in small batches. Bundles apply
          automatically as you add pieces — a box may mix flavors freely.
        </p>
      </section>

      <DeliveryNotice tone="prominent" />

      <section className="mx-auto max-w-6xl px-gutter py-section">
        <div className="grid gap-14 lg:grid-cols-2 lg:gap-10">
          {PRODUCTS.map((product) => {
            const tiers = [...TIERS_BY_KIND[product.kind]].sort(
              (a, b) => a.size - b.size,
            );
            const allergens = productAllergens(product);

            return (
              <article key={product.slug} className="flex flex-col">
                <Link href={`/shop/${product.slug}`} className="group no-underline">
                  <div className="relative aspect-[4/3] w-full overflow-hidden">
                    <Photo
                      slot={PRODUCT_IMAGE[product.slug]}
                      className="h-full w-full"
                      sizes="(min-width: 1024px) 50vw, 100vw"
                    />
                  </div>
                  <h2 className="mt-6 text-display-m group-hover:text-gold-deep">
                    {product.name}
                  </h2>
                </Link>

                <p className="mt-3 text-body-m text-cocoa">{product.description}</p>

                <h3 className="label-caps mt-7">Pricing</h3>
                <ul className="mt-3 divide-y divide-rule border-y border-rule">
                  {tiers.map((tier) => {
                    const p = priceQuantity(tier.size, tiers);
                    return (
                      <li
                        key={tier.size}
                        className="flex items-baseline justify-between gap-4 py-3"
                      >
                        <span className="text-body-m">{tier.label}</span>
                        <span className="text-body-s text-cocoa">
                          {tier.size > 1 && p.savingsCents > 0 ? (
                            <span className="text-gold-deep">
                              save {formatCents(p.savingsCents)}
                            </span>
                          ) : (
                            <span>
                              {formatCents(tier.priceCents)}
                              {tier.size === 1 ? " each" : ""}
                            </span>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                <h3 className="label-caps mt-7">Flavors</h3>
                <p className="mt-2 text-body-m">
                  {product.variants.map((v) => v.name).join(" · ")}
                </p>

                <p className="mt-5 text-body-s text-cocoa">
                  Contains {allergens.map((a) => ALLERGEN_LABEL[a].toLowerCase()).join(", ")}.
                </p>

                <div className="mt-7">
                  <Link
                    href={`/shop/${product.slug}`}
                    className="inline-flex items-center bg-cocoa-deep px-7 py-3.5 text-label uppercase text-cream no-underline transition-colors duration-200 hover:bg-cocoa"
                  >
                    Choose flavors
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
