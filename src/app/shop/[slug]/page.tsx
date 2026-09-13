import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Photo } from "@/components/Photo";
import { DeliveryNotice } from "@/components/DeliveryNotice";
import {
  PRODUCTS,
  getProduct,
  productAllergens,
  ALLERGEN_LABEL,
  BRAND,
} from "@/lib/catalog";
import { PRODUCT_IMAGE } from "@/lib/images";
import { TIERS_BY_KIND, priceQuantity, formatCents } from "@/lib/pricing";

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }));
}

// Next 16: params is async and must be awaited, in metadata as well as the page.
export async function generateMetadata({
  params,
}: PageProps<"/shop/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) return { title: "Not found" };
  return {
    title: product.name,
    description: product.description,
  };
}

export default async function ProductPage({ params }: PageProps<"/shop/[slug]">) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  const tiers = [...TIERS_BY_KIND[product.kind]].sort((a, b) => a.size - b.size);
  const allergens = productAllergens(product);

  // A worked table so the bundle maths is visible before anyone commits to a
  // quantity. Quantities chosen to show both tier boundaries and the awkward
  // in-between counts.
  const sampleQuantities =
    product.kind === "bonbon" ? [1, 3, 6, 9, 10, 13, 20] : [1, 2, 3, 4, 5, 6];

  return (
    <main>
      <div className="mx-auto max-w-6xl px-gutter pt-10">
        <Link href="/shop" className="label-caps text-cocoa no-underline hover:text-gold-deep">
          &larr; Shop
        </Link>
      </div>

      <section className="mx-auto max-w-6xl px-gutter pt-8 pb-section">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="relative aspect-[4/5] w-full overflow-hidden">
            <Photo
              slot={PRODUCT_IMAGE[product.slug]}
              className="h-full w-full"
              sizes="(min-width: 1024px) 50vw, 100vw"
              priority
            />
          </div>

          <div>
            <h1 className="text-display-xl">{product.name}</h1>
            <p className="mt-5 text-body-l text-cocoa">{product.description}</p>

            <p className="mt-8 font-display text-display-s">
              {product.offerSummary}
            </p>

            {/* --- Flavors --- */}
            <h2 className="label-caps mt-10">Flavors</h2>
            <ul className="mt-3 divide-y divide-rule border-y border-rule">
              {product.variants.map((variant) => (
                <li
                  key={variant.slug}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3"
                >
                  <span className="text-body-m">{variant.name}</span>
                  <span className="text-body-s text-cocoa">
                    Contains{" "}
                    {variant.containsAllergens
                      .map((a) => ALLERGEN_LABEL[a].toLowerCase())
                      .join(", ")}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-body-s text-cocoa">
              A {product.kind === "bonbon" ? "box" : "pair"} may mix flavors
              freely — the bundle price applies either way.
            </p>

            {/* --- Ordering ---
                Not wired until Step 5. Rendered as a disabled button with the
                reason stated, rather than a button that silently does nothing. */}
            <div className="mt-10">
              <button
                type="button"
                disabled
                className="inline-flex w-full items-center justify-center bg-cocoa-deep px-8 py-4 text-label uppercase text-cream disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
              >
                Add to cart
              </button>
              <p className="mt-3 text-body-s text-cocoa">
                Online ordering opens shortly. Until then you can find us at the
                market, or message us on{" "}
                <a
                  href={BRAND.social.instagram}
                  className="text-gold-deep"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Instagram
                </a>
                .
              </p>
            </div>

            <div className="mt-8 border-t border-rule pt-6">
              <DeliveryNotice />
            </div>
          </div>
        </div>

        {/* --- Worked pricing --- */}
        <div className="mt-section border-t border-rule-strong pt-5">
          <p className="label-caps">How the pricing works</p>
          <h2 className="mt-3 text-display-m">
            Bundles apply automatically
          </h2>
          <p className="mt-4 max-w-2xl text-body-m text-cocoa">
            You do not pick a box size. Add the pieces you want and the best
            combination of offers is applied for you.
          </p>

          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[34rem] border-collapse text-left">
              <caption className="sr-only">
                Worked examples of {product.name.toLowerCase()} pricing at
                several quantities
              </caption>
              <thead>
                <tr className="border-b border-rule-strong">
                  <th scope="col" className="label-caps py-3 pr-4">
                    {product.kind === "bonbon" ? "Pieces" : "Bars"}
                  </th>
                  <th scope="col" className="label-caps py-3 pr-4">
                    Total
                  </th>
                  <th scope="col" className="label-caps py-3 pr-4">
                    Each
                  </th>
                  <th scope="col" className="label-caps py-3">
                    You save
                  </th>
                </tr>
              </thead>
              <tbody>
                {sampleQuantities.map((qty) => {
                  const p = priceQuantity(qty, tiers);
                  return (
                    <tr key={qty} className="border-b border-rule">
                      <td className="py-3 pr-4 text-body-m">{qty}</td>
                      <td className="py-3 pr-4 text-body-m">
                        {formatCents(p.totalCents)}
                      </td>
                      <td className="py-3 pr-4 text-body-s text-cocoa">
                        {formatCents(Math.round(p.totalCents / qty))}
                      </td>
                      <td className="py-3 text-body-s">
                        {p.savingsCents > 0 ? (
                          <span className="text-gold-deep">
                            {formatCents(p.savingsCents)}
                          </span>
                        ) : (
                          <span className="text-cocoa">&mdash;</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* --- Allergens ---
            TODO: Step 10 replaces this with the owner's exact ingredient lists
            and the shared-kitchen cross-contact statement. Nothing here is
            written from guesswork: the couverture is a milk chocolate, and the
            nut products are named for their nuts. */}
        <div className="mt-section border border-rule bg-ivory p-7">
          <h2 className="label-caps">Allergens</h2>
          <p className="mt-3 text-body-m">
            {product.name} contain{" "}
            {allergens.map((a) => ALLERGEN_LABEL[a].toLowerCase()).join(", ")}.
          </p>
          <p className="mt-3 text-body-s text-cocoa">
            TODO: full ingredient lists and our shared-kitchen statement are
            being finalised and will appear here before ordering opens.
          </p>
        </div>
      </section>
    </main>
  );
}
