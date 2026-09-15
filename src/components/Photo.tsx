import {
  PHOTOS,
  sourceLabel,
  PHOTO_FORMATS,
  PHOTO_WIDTHS,
  FALLBACK_WIDTH,
  photoPresent,
  photoSrcSet,
  photoUrl,
  photoHeight,
  type PhotoKey,
} from "@/lib/images";

/**
 * A product photograph, or an honest placeholder when the file is not in the
 * project yet.
 *
 * Deliberately a hand-written <picture> rather than next/image. Two reasons,
 * and the second is the real one:
 *
 *   1. The derivatives are already generated, ahead of time, by
 *      scripts/build-images.mts. next/image would re-encode the same images
 *      again on demand.
 *   2. This site is going on Hostinger — one modest long-running Node process.
 *      next/image's optimiser does that re-encoding IN that process, on the
 *      first request for each size, while it is also meant to be serving the
 *      shop. Static files served straight off disk cost it nothing.
 *
 * The placeholder is a designed empty state rather than a grey box, and never
 * stock photography: a missing photo should be obvious to whoever is reviewing
 * the site and must never reach a customer looking like a finished panel.
 */
export function Photo({
  slot,
  className = "",
  sizes = "100vw",
  priority = false,
}: {
  slot: PhotoKey;
  className?: string;
  /**
   * What width this image will actually occupy, so the browser can pick a
   * derivative instead of guessing 100vw and pulling the largest one.
   */
  sizes?: string;
  /**
   * The LCP image. Loads eagerly, at high priority, and asks the browser to
   * start fetching it from the document head before the markup that uses it
   * has been parsed. Exactly one image per page should set this — marking
   * everything urgent is the same as marking nothing urgent.
   */
  priority?: boolean;
}) {
  const photo = PHOTOS[slot];

  if (!photoPresent(slot)) {
    return (
      <div
        className={`flex items-center justify-center border border-rule bg-ivory ${className}`}
        role="img"
        aria-label={`Photograph pending: ${photo.note}`}
      >
        <div className="max-w-[22rem] px-6 py-10 text-center">
          <div className="mx-auto mb-4 h-px w-10 bg-gold" aria-hidden="true" />
          <p className="label-caps">Photograph pending</p>
          <p className="mt-3 text-body-s text-cocoa">{photo.note}</p>
          <p className="mt-3 text-body-s text-cocoa">
            <code>
              {sourceLabel(photo.sourceBase)} &rarr; npm run build:images
            </code>
          </p>
        </div>
      </div>
    );
  }

  const [avif, webp, jpeg] = PHOTO_FORMATS;
  const largest = PHOTO_WIDTHS[PHOTO_WIDTHS.length - 1];

  return (
    <>
      {priority && (
        /*
          React hoists this into <head>. Only the AVIF set is preloaded: a
          browser that cannot decode AVIF ignores a preload carrying that type
          and falls back to the <source> list below, which is the correct
          outcome — better than preloading a JPEG that every modern browser
          then declines to use.
        */
        <link
          rel="preload"
          as="image"
          type={avif.mime}
          imageSrcSet={photoSrcSet(photo.base, avif.ext)}
          imageSizes={sizes}
          fetchPriority="high"
        />
      )}
      <picture>
        <source
          type={avif.mime}
          srcSet={photoSrcSet(photo.base, avif.ext)}
          sizes={sizes}
        />
        <source
          type={webp.mime}
          srcSet={photoSrcSet(photo.base, webp.ext)}
          sizes={sizes}
        />
        <img
          src={photoUrl(photo.base, FALLBACK_WIDTH, jpeg.ext)}
          srcSet={photoSrcSet(photo.base, jpeg.ext)}
          sizes={sizes}
          alt={photo.alt}
          /*
            The intrinsic size of the largest derivative. The frame around this
            is already 4:5, so these attributes are belt and braces — but they
            are what holds the layout if the stylesheet is slow, and a product
            grid that reflows under the customer's thumb as photos arrive is
            how somebody taps the wrong chocolate.
          */
          width={largest}
          height={photoHeight(largest)}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          className={`object-cover ${className}`}
        />
      </picture>
    </>
  );
}
