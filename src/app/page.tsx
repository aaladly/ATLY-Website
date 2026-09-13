import Link from "next/link";
import { Photo } from "@/components/Photo";
import { Wordmark } from "@/components/Wordmark";
import { DeliveryNotice } from "@/components/DeliveryNotice";
import { PRODUCTS, BRAND, productAllergens, ALLERGEN_LABEL } from "@/lib/catalog";
import { PRODUCT_IMAGE } from "@/lib/images";
import { TIERS_BY_KIND, priceQuantity, formatCents } from "@/lib/pricing";

export default function Home() {
  return (
    <main>
      {/* ---------------- Hero ---------------- */}
      <section className="mx-auto max-w-6xl px-gutter pt-section pb-14">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            {/*
              The hero lockup is the page's main heading. Without this the home
              page has no h1 at all — headings would start at H2, which is wrong
              for both screen readers and search engines. The visible wordmark
              is decorative inside the heading; the accessible name is carried
              by the sr-only text so the heading reads as one sentence.
            */}
            <h1>
              <span className="sr-only">
                ATLY Belgian Chocolate — handmade Belgian chocolate in New
                Jersey
              </span>
              <span aria-hidden="true">
                <Wordmark size="lg" className="items-start" />
              </span>
            </h1>
            <p className="mt-8 max-w-md font-display text-display-m">
              {BRAND.tagline}
            </p>
            <p className="mt-6 max-w-md text-body-l text-cocoa">
              Handmade Belgian chocolate from a family kitchen in New Jersey,
              made in small batches from {BRAND.cocoaPercent} Belgian
              couverture.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href="/shop"
                className="inline-flex items-center justify-center bg-cocoa-deep px-8 py-4 text-label uppercase text-cream no-underline transition-colors duration-200 hover:bg-cocoa"
              >
                Order online
              </Link>
              <span className="text-body-s text-cocoa">
                {BRAND.secondaryTagline}
              </span>
            </div>
          </div>

          <div className="relative aspect-[4/5] w-full overflow-hidden">
            <Photo
              slot="heroSpread"
              className="h-full w-full"
              sizes="(min-width: 1024px) 50vw, 100vw"
              priority
            />
          </div>
        </div>
      </section>

      <DeliveryNotice tone="prominent" />

      {/* ---------------- Why it is different ----------------
          The owner's founding motivation, and per the working agreement it
          gets real estate rather than a footnote. Stated as fact only — no
          health claims about chocolate, ever. */}
      <section className="mx-auto max-w-6xl px-gutter py-section">
        <div className="mx-auto max-w-3xl text-center">
          <p className="label-caps">What makes it different</p>
          <h2 className="mt-4 text-display-l">
            No preservatives. No additives.
          </h2>
          <p className="mt-8 text-body-l text-cocoa">
            ATLY began with one wish: chocolate made from real ingredients, with
            nothing added that did not need to be there. The fillings are made
            by hand from all-natural ingredients. Nothing is preserved, nothing
            is stabilised, and nothing is added to make it keep longer on a
            shelf.
          </p>
          <p className="mt-5 text-body-l text-cocoa">
            Everything is made by hand, in batches small enough to check every
            piece.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-4xl gap-5 sm:grid-cols-3">
          {[
            ["All-natural fillings", "Made by hand, from ingredients you can name."],
            ["No preservatives", "Nothing added to extend shelf life."],
            ["Small batches", "Every piece is checked by hand."],
          ].map(([title, body]) => (
            <div key={title} className="border-t border-gold pt-5">
              <h3 className="text-display-s">{title}</h3>
              <p className="mt-2 text-body-s text-cocoa">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- The Belcolade credential ----------------
          A real credential, so it is named specifically rather than described
          vaguely as "fine Belgian chocolate". */}
      <section className="bg-cocoa-deep text-cream">
        <div className="on-dark mx-auto grid max-w-6xl items-center gap-12 px-gutter py-section lg:grid-cols-2 lg:gap-16">
          <div className="relative aspect-[4/3] w-full overflow-hidden">
            <Photo
              slot="bonbonsRose"
              className="h-full w-full"
              sizes="(min-width: 1024px) 50vw, 100vw"
            />
          </div>
          <div>
            <p className="text-label font-medium uppercase tracking-[0.18em] text-gold">
              The chocolate itself
            </p>
            <h2 className="mt-4 text-display-l">{BRAND.couverture}</h2>
            <p className="mt-7 text-body-l">
              Genuine Belgian couverture, at {BRAND.cocoaPercent} cocoa per
              Belcolade&rsquo;s own product specification. Couverture is the
              grade of chocolate used by pastry kitchens rather than the
              confectionery aisle — it is what lets a shell snap cleanly and
              melt evenly.
            </p>
            <p className="mt-5 text-body-m">
              We name the product because it is a real credential, not a
              marketing phrase.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------- Product highlights ---------------- */}
      <section className="mx-auto max-w-6xl px-gutter py-section">
        <div className="border-t border-rule-strong pt-5">
          <p className="label-caps">The launch lineup</p>
          <h2 className="mt-3 text-display-l">Two things, made properly</h2>
        </div>

        <div className="mt-12 grid gap-10 sm:grid-cols-2 sm:gap-8">
          {PRODUCTS.map((product) => {
            const tiers = TIERS_BY_KIND[product.kind];
            const best = [...tiers].sort((a, b) => b.size - a.size)[0];
            const bestPrice = priceQuantity(best.size, tiers);
            const allergens = productAllergens(product);

            return (
              <article key={product.slug} className="flex flex-col">
                <Link
                  href={`/shop/${product.slug}`}
                  className="group no-underline"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden">
                    <Photo
                      slot={PRODUCT_IMAGE[product.slug]}
                      className="h-full w-full"
                      sizes="(min-width: 640px) 50vw, 100vw"
                    />
                  </div>
                  <h3 className="mt-6 text-display-m group-hover:text-gold-deep">
                    {product.name}
                  </h3>
                </Link>
                <p className="mt-2 text-body-m text-cocoa">{product.tagline}</p>
                <p className="mt-5 text-body-m">{product.offerSummary}</p>
                <p className="mt-2 text-body-s text-gold-deep">
                  Best value: {best.label} — save{" "}
                  {formatCents(bestPrice.savingsCents)}
                </p>
                <p className="mt-4 text-body-s text-cocoa">
                  {product.variants.map((v) => v.name).join(" · ")}
                </p>
                <p className="mt-2 text-body-s text-cocoa">
                  Contains{" "}
                  {allergens.map((a) => ALLERGEN_LABEL[a].toLowerCase()).join(", ")}.
                </p>
                <div className="mt-6">
                  <Link
                    href={`/shop/${product.slug}`}
                    className="inline-flex items-center border border-cocoa-deep px-6 py-3 text-label uppercase text-cocoa-deep no-underline transition-colors duration-200 hover:bg-cocoa-deep hover:text-cream"
                  >
                    See {product.name.toLowerCase()}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* ---------------- Ordering CTA ----------------
          Online ordering is the entire point of the site, so it gets its own
          closing section rather than only a header link. */}
      <section className="mx-auto max-w-6xl px-gutter pb-section">
        <div className="border border-rule-strong bg-ivory px-8 py-14 text-center sm:px-14">
          <p className="label-caps">Ordering</p>
          <h2 className="mt-4 text-display-l">
            You asked how to order online.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-body-l text-cocoa">
            It was the question we heard most at the market. Now you can put a
            box together from your phone and we will bring it to you.
          </p>
          <div className="mt-9">
            <Link
              href="/shop"
              className="inline-flex items-center justify-center bg-cocoa-deep px-8 py-4 text-label uppercase text-cream no-underline transition-colors duration-200 hover:bg-cocoa"
            >
              Start an order
            </Link>
          </div>
          <div className="mx-auto mt-8 max-w-md">
            <DeliveryNotice />
          </div>
        </div>
      </section>
    </main>
  );
}
