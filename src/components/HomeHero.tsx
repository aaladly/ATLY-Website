import Link from "next/link";
import { Wordmark } from "./Wordmark";
import { BRAND } from "@/lib/catalog";
import {
  PHOTOS,
  PHOTO_FORMATS,
  FALLBACK_WIDTH,
  HERO,
  photoPresent,
  photoSrcSet,
  photoUrl,
  heroSrcSet,
  heroWidePresent,
} from "@/lib/images";

/**
 * The home page hero.
 *
 * A photograph the full width of the page, with the lockup over it. The
 * working agreement asks for photography-led, and until there were photographs
 * that was a promise this page could not keep — so it led with type instead.
 * It does not have to any more.
 *
 * ART DIRECTION, NOT SCALING -------------------------------------------------
 * Two different crops of one photograph. A phone gets the 4:5 original, which
 * is already the right shape for a tall frame. Anything wider gets a 3:2 crop,
 * because a 4:5 photograph stretched across a laptop is a wall of chocolate you
 * scroll past to reach the sentence that says what this business is.
 *
 * THE SCRIM IS LOAD-BEARING --------------------------------------------------
 * Cream text on a photograph is the classic way to ship a heading nobody can
 * read. The numbers here are measured, not chosen by eye: composite a flat
 * cocoa-deep scrim over this crop and check every pixel in it against cream —
 *
 *     50%  2.49:1    65%  3.87:1    75%  5.33:1
 *     60%  3.32:1    70%  4.53:1    80%  6.27:1
 *
 * — so at 80% and above, cream clears AA against the WORST pixel in the
 * photograph, and it does not matter what the text happens to land on. Both
 * gradients below hold at 86% or stronger everywhere text can reach, and fall
 * away only outside it, which is what keeps the photograph looking like a
 * photograph rather than a brown rectangle.
 *
 * Then verified against what actually renders, rather than trusting the table:
 * the served file decoded into a canvas, the gradient applied at each point,
 * every other pixel inside the real text box sampled.
 *
 *     desktop 1440   51,914 px   worst 7.76:1
 *     mobile   375   39,524 px   worst 7.83:1
 *
 * Both clear AAA. That second pass was not ceremony — the first mobile
 * gradient measured 2.58:1 and looked perfectly fine to the eye.
 *
 * If you change the photograph, re-run those numbers. If you soften the scrim
 * to show more of it, you are trading away the heading.
 */

/*
  Nearly flat, and that is the finding rather than the intent.

  The first version faded out over the top third, on the assumption that the
  text lived in the lower part of the frame. It does not: on a phone the copy
  fills the hero almost edge to edge, and the ATLY lockup starts 7% down —
  where the fade had already dropped to 43% and cream measured 2.58:1. Half
  the required contrast, on the brand name, on the device this shop was built
  for.

  So it holds at 86% or better everywhere the text reaches and lifts only in
  the last 5%, above the lockup. The photograph reads as a dark ground on a
  phone. That is the real cost of putting this much copy over a picture in a
  375px column, and it is the right way round: the picture gives way to the
  words, not the other way about.
*/
const SCRIM_MOBILE =
  "linear-gradient(to top, rgba(78,25,1,0.93) 0%, rgba(78,25,1,0.88) 55%, rgba(78,25,1,0.86) 95%, rgba(78,25,1,0.60) 100%)";

/*
  Full strength to the half-way line. The text column sits inside a centred
  max-w-6xl container and never reaches past about 48% of the viewport at any
  width — checked at 1280, 1440 and 2560 — so it is always over the flat part.
*/
const SCRIM_WIDE =
  "linear-gradient(to right, rgba(78,25,1,0.92) 0%, rgba(78,25,1,0.86) 50%, rgba(78,25,1,0.22) 82%, rgba(78,25,1,0.10) 100%)";

export function HomeHero() {
  const photo = PHOTOS[HERO.photo];
  const hasPhoto = photoPresent(HERO.photo);
  const hasWide = heroWidePresent();
  const [avif, webp, jpeg] = PHOTO_FORMATS;

  return (
    <section
      className={`on-dark relative isolate flex min-h-[34rem] items-end overflow-hidden md:min-h-[38rem] md:items-center lg:min-h-[44rem] ${
        hasPhoto ? "text-cream" : "bg-cocoa-deep text-cream"
      }`}
    >
      {hasPhoto && (
        <>
          {/*
            Preloaded per breakpoint, because the two crops are different
            files and preloading both would download a hero the visitor will
            never see. React hoists these into <head>.
          */}
          {hasWide && (
            <link
              rel="preload"
              as="image"
              type={avif.mime}
              media={HERO.wideFrom}
              imageSrcSet={heroSrcSet(avif.ext)}
              imageSizes="100vw"
              fetchPriority="high"
            />
          )}
          <link
            rel="preload"
            as="image"
            type={avif.mime}
            media="(max-width: 767px)"
            imageSrcSet={photoSrcSet(photo.base, avif.ext)}
            imageSizes="100vw"
            fetchPriority="high"
          />

          <picture>
            {hasWide && (
              <>
                <source
                  media={HERO.wideFrom}
                  type={avif.mime}
                  srcSet={heroSrcSet(avif.ext)}
                  sizes="100vw"
                />
                <source
                  media={HERO.wideFrom}
                  type={webp.mime}
                  srcSet={heroSrcSet(webp.ext)}
                  sizes="100vw"
                />
                <source
                  media={HERO.wideFrom}
                  type={jpeg.mime}
                  srcSet={heroSrcSet(jpeg.ext)}
                  sizes="100vw"
                />
              </>
            )}
            <source
              type={avif.mime}
              srcSet={photoSrcSet(photo.base, avif.ext)}
              sizes="100vw"
            />
            <source
              type={webp.mime}
              srcSet={photoSrcSet(photo.base, webp.ext)}
              sizes="100vw"
            />
            {/*
              The last resort: reached only when no <source> above matched,
              which means a narrow screen on a browser with neither AVIF nor
              WebP. So it is the PORTRAIT jpeg — the wide crop is served by its
              own media-scoped <source>, and pointing this at the wide file
              would hand a phone a landscape hero.
            */}
            <img
              src={photoUrl(photo.base, FALLBACK_WIDTH, jpeg.ext)}
              srcSet={photoSrcSet(photo.base, jpeg.ext)}
              sizes="100vw"
              alt={photo.alt}
              loading="eager"
              decoding="async"
              fetchPriority="high"
              className="absolute inset-0 -z-10 h-full w-full object-cover"
            />
          </picture>

          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 md:hidden"
            style={{ background: SCRIM_MOBILE }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 hidden md:block"
            style={{ background: SCRIM_WIDE }}
          />
        </>
      )}

      {/*
        Tighter vertical rhythm on phones than the rest of the site uses, and
        deliberately so. The smallest phone still in circulation is 667px tall:
        at the site default this block pushed "Order online" past the bottom of
        it, and an ordering CTA the customer has to hunt for is the one thing
        this page cannot afford. Measured, not guessed — 682px before, 621px
        after.
      */}
      <div className="mx-auto w-full max-w-6xl px-gutter py-10 md:py-20">
        <div className="max-w-lg">
          {/*
            The lockup is the page's main heading. Without it the home page has
            no h1 at all and headings start at H2. The visible wordmark is
            decorative inside the heading; the accessible name is the sr-only
            text, so the heading reads as one sentence.
          */}
          <h1>
            <span className="sr-only">
              ATLY Belgian Chocolate — handmade Belgian chocolate in New Jersey
            </span>
            <span aria-hidden="true">
              <Wordmark size="lg" className="items-start" />
            </span>
          </h1>

          <p className="mt-6 font-display text-display-m md:mt-8">
            {BRAND.tagline}
          </p>

          <p className="mt-4 max-w-md text-body-l md:mt-6">
            Handmade Belgian chocolate from a family kitchen in New Jersey, made
            in small batches from {BRAND.cocoaPercent} Belgian couverture.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 md:mt-10">
            {/*
              Cream on cocoa-deep, the one pairing on this page that is not
              sitting on the photograph at all. 11.39:1.
            */}
            <Link
              href="/shop"
              className="inline-flex items-center justify-center bg-cream px-8 py-4 text-label uppercase text-cocoa-deep no-underline transition-colors duration-200 hover:bg-ivory"
            >
              Order online
            </Link>
            <span className="text-body-s">{BRAND.secondaryTagline}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
