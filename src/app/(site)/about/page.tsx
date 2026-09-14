import type { Metadata } from "next";
import Link from "next/link";
import { Photo } from "@/components/Photo";
import { SocialLinks } from "@/components/SocialLinks";
import { BRAND, FOUNDER_STORY } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Our Story",
  description:
    "ATLY began with one wish: chocolate made from real ingredients. A family business in New Jersey, making Belgian chocolate by hand in small batches.",
  alternates: { canonical: "/about" },
};

/**
 * The About page.
 *
 * The design showpiece, and the most restrained page on the site. The founder's
 * story is rendered verbatim from FOUNDER_STORY and is given the whole width of
 * the reader's attention: no buttons interrupting it, no pull quotes shouting
 * a line back at them, no photograph competing with it. One quiet link to the
 * shop, after the story has finished.
 *
 * Nothing here claims chocolate is good for anyone.
 */
export default function AboutPage() {
  return (
    <main>
      {/* ---- Quiet opening ---- */}
      <section className="mx-auto max-w-3xl px-gutter pt-section text-center">
        <p className="label-caps">Our story</p>
        <h1 className="mt-5 text-display-xl">{BRAND.storyHeadline}</h1>
        <div className="mx-auto mt-10 h-px w-16 bg-gold" aria-hidden="true" />
      </section>

      {/* ---- The letter ----
          Set in the display serif at reading size with generous leading and a
          narrow measure. This is the one place on the site where the type is
          doing the whole job. */}
      <section className="mx-auto max-w-2xl px-gutter pt-14 pb-section">
        <div className="space-y-8">
          {FOUNDER_STORY.map((paragraph) => (
            <p
              key={paragraph}
              className="font-display text-[1.6rem] leading-[1.55] sm:text-[1.75rem]"
            >
              {paragraph}
            </p>
          ))}
        </div>

        {/*
          Deliberately unsigned. The story is written in the first person and a
          signature would normally close it, but the owner has not told us which
          name to use and inventing one on the most personal page of the site
          would be the wrong kind of guess.
          TODO: ask the owner whether to sign this, and with what.
        */}

        <div className="mt-14 h-px w-16 bg-gold" aria-hidden="true" />
        <p className="mt-10 font-display text-display-s text-cocoa">
          {BRAND.tagline}
        </p>
      </section>

      {/* ---- How it is made ---- */}
      <section className="bg-cocoa-deep text-cream">
        <div className="on-dark mx-auto grid max-w-6xl items-center gap-12 px-gutter py-section-lg lg:grid-cols-2 lg:gap-16">
          <div className="relative aspect-[4/5] w-full overflow-hidden">
            <Photo
              slot="bonbonsRose"
              className="h-full w-full"
              sizes="(min-width: 1024px) 50vw, 100vw"
            />
          </div>

          <div>
            <p className="text-label font-medium uppercase tracking-[0.18em] text-gold">
              How it is made
            </p>
            <h2 className="mt-4 text-display-l">Real ingredients, and nothing else</h2>

            <div className="mt-9 space-y-7">
              <div>
                <h3 className="text-display-s">{BRAND.couverture}</h3>
                <p className="mt-2 text-body-m">
                  Genuine Belgian couverture at {BRAND.cocoaPercent} cocoa, per
                  Belcolade&rsquo;s own product specification. Couverture is the
                  grade of chocolate used in pastry kitchens rather than the
                  confectionery aisle.
                </p>
              </div>

              <div>
                <h3 className="text-display-s">Fillings made by hand</h3>
                <p className="mt-2 text-body-m">
                  Every bon-bon is filled and finished by hand, from all-natural
                  ingredients.
                </p>
              </div>

              <div>
                <h3 className="text-display-s">No preservatives, no additives</h3>
                <p className="mt-2 text-body-m">
                  Nothing is added to make it keep longer on a shelf. It is made
                  to be eaten, not stored.
                </p>
              </div>

              <div>
                <h3 className="text-display-s">Small batches</h3>
                <p className="mt-2 text-body-m">
                  Batches small enough that every piece is checked by hand.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Where to find us ---- */}
      <section className="mx-auto max-w-6xl px-gutter py-section">
        <div className="grid gap-12 sm:grid-cols-2">
          <div>
            <h2 className="text-display-m">You can also find us here!</h2>
            <SocialLinks size="lg" className="mt-7" />
          </div>

          <div className="sm:text-right">
            <p className="font-display text-display-s">
              {BRAND.secondaryTagline}
            </p>
            <p className="mt-6 text-body-m text-cocoa">
              We deliver within {BRAND.delivery.stateOnly}, and you will still
              find us at the market.
            </p>
            <Link
              href="/shop"
              className="mt-8 inline-flex items-center border border-cocoa-deep px-7 py-3.5 text-label uppercase text-cocoa-deep no-underline transition-colors duration-200 hover:bg-cocoa-deep hover:text-cream"
            >
              See the chocolate
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
