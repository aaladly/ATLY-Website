/**
 * The photography manifest.
 *
 * One list, read by two things that must never disagree:
 *   - scripts/build-images.mts, which generates the derivatives
 *   - src/components/Photo.tsx, which renders them
 * If the widths, the formats or the file names lived in both places they would
 * drift, and the failure mode is a 404 on a product photograph.
 *
 * This module is imported by a plain Node script as well as by the app, so it
 * must stay free of `@/` aliases, React, and anything server-only.
 *
 * TO ADD OR REPLACE PHOTOGRAPHY:
 *   1. Put the full-resolution original in assets/source/ under the `source`
 *      name below.
 *   2. Run `npm run build:images`.
 * The script writes the derivatives AND rewrites images.generated.ts, so the
 * site switches from placeholder to photograph on its own. Nothing else to
 * remember.
 */

import { GENERATED_PHOTOS, GENERATED_LOGO } from "./images.generated.ts";

// ---------------------------------------------------------------------------
// Output settings
// ---------------------------------------------------------------------------

/**
 * Every product photograph is 4:5 portrait, and every frame on the site that
 * holds one is 4:5 too. Same shape in and out means `object-fit: cover` has
 * nothing to crop — a hand-composed product shot is not something to trim to
 * fit a layout decision.
 */
export const PHOTO_ASPECT = { w: 4, h: 5 } as const;

/** Rendered widths. Heights follow from the aspect: 500 / 1000 / 1500. */
export const PHOTO_WIDTHS = [400, 800, 1200] as const;

/**
 * Formats in the order a browser should prefer them. AVIF is roughly half the
 * weight of WebP at this quality; JPEG exists so that nothing is ever broken.
 * Quality figures are per the brief.
 */
export const PHOTO_FORMATS = [
  { ext: "avif", mime: "image/avif", quality: 55 },
  { ext: "webp", mime: "image/webp", quality: 75 },
  { ext: "jpg", mime: "image/jpeg", quality: 82 },
] as const;

/** The fallback `src`, and the one the budget below is measured against. */
export const FALLBACK_WIDTH = 800;

/**
 * Size budget at the fallback width, in bytes.
 *
 * The customer this site is built for is standing at a market table on a phone
 * on cellular data. The build script fails rather than warns when a derivative
 * goes over, because a warning in a build log is a warning nobody reads.
 */
export const PHOTO_BUDGET_BYTES = 150 * 1024;

export const PRODUCTS_DIR = "/images/products";
export const SOURCE_DIR = "assets/source";

// ---------------------------------------------------------------------------
// The photographs
// ---------------------------------------------------------------------------

export type PhotoSlot = {
  /** File name in assets/source/. */
  source: string;
  /** Output basename: `${base}-800.webp` and so on. */
  base: string;
  /**
   * Alt text, supplied by the owner.
   *
   * Describes what is visible and nothing else. No flavour is named here —
   * the bon-bons are visually near-identical and a guess at "salted caramel"
   * in alt text is a guess about an allergen to somebody using a screen
   * reader.
   */
  alt: string;
  /** What the slot is for, shown in the placeholder while the file is absent. */
  note: string;
};

export const PHOTOS = {
  collectionAssortment: {
    source: "collection-assortment.png",
    base: "collection-assortment",
    alt: "An assortment of ATLY bon-bons in clear boxes, including rose-shaped and dome-shaped milk chocolates",
    note: "The full lineup — the establishing shot for the home page",
  },
  barMilkChocolate: {
    source: "bar-milk-chocolate.png",
    base: "bar-milk-chocolate",
    alt: "ATLY milk chocolate bar in a clear sleeve, scored into fifteen segments with a gold shimmer finish",
    note: "A single wrapped bar",
  },
  bonbons6Piece: {
    source: "bonbons-6-piece.png",
    base: "bonbons-6-piece",
    alt: "Six dome-shaped ATLY milk chocolate bon-bons with a gold shimmer finish, in a clear six-piece box",
    note: "A six-piece bon-bon box",
  },
  bonbonsRose3Piece: {
    source: "bonbons-rose-3-piece.png",
    base: "bonbons-rose-3-piece",
    alt: "Three rose-shaped ATLY milk chocolate bon-bons in a clear three-piece box",
    note: "A three-piece rose bon-bon box",
  },
} as const satisfies Record<string, PhotoSlot>;

export type PhotoKey = keyof typeof PHOTOS;

export const PHOTO_KEYS = Object.keys(PHOTOS) as PhotoKey[];

/** True once `npm run build:images` has produced this slot's derivatives. */
export const photoPresent = (key: PhotoKey): boolean =>
  GENERATED_PHOTOS.includes(PHOTOS[key].base);

export const missingPhotos = (): PhotoKey[] =>
  PHOTO_KEYS.filter((key) => !photoPresent(key));

export const allPhotosPresent = (): boolean => missingPhotos().length === 0;

/**
 * Which photographs belong to which product, in the order they are shown.
 *
 * Keyed by the catalog product slug. The first is the card image and the one
 * a link preview would use; the rest are further views in the gallery.
 *
 * Note what this map does NOT do: it does not invent a product. The six-piece
 * box and the three-piece rose box are two photographs of bon-bons, not two
 * new things to sell — quantity and price already come from the pricing
 * engine, and a customer picks how many pieces they want there. Adding
 * "6 Piece Box" as a product would mean a second, contradictory answer to
 * "what does a box of six cost".
 */
export const PRODUCT_PHOTOS: Record<string, readonly PhotoKey[]> = {
  "bon-bons": ["bonbons6Piece", "bonbonsRose3Piece"],
  bars: ["barMilkChocolate"],
};

/** The card image for a product — the first of its photographs. */
export const productPhoto = (slug: string): PhotoKey | undefined =>
  PRODUCT_PHOTOS[slug]?.[0];

// ---------------------------------------------------------------------------
// URL building
// ---------------------------------------------------------------------------

export const photoHeight = (width: number): number =>
  Math.round((width * PHOTO_ASPECT.h) / PHOTO_ASPECT.w);

export const photoUrl = (base: string, width: number, ext: string): string =>
  `${PRODUCTS_DIR}/${base}-${width}.${ext}`;

/** A `srcset` for one format, across every generated width. */
export const photoSrcSet = (base: string, ext: string): string =>
  PHOTO_WIDTHS.map((w) => `${photoUrl(base, w, ext)} ${w}w`).join(", ");

// ---------------------------------------------------------------------------
// The logo
// ---------------------------------------------------------------------------

/**
 * The supplied artwork is dark brown line art on a flat cream ground, which is
 * the one case where a background can be keyed out cleanly. The build script
 * attempts it, measures the result, and refuses to publish a cutout it cannot
 * do well — a haloed logo on a dark footer is worse than a cream tile.
 */
export const LOGO = {
  source: "logo-atly.png",
  /** Header lockup, cream ground intact. */
  base: "atly-logo",
  /** Header lockup with the ground keyed out, when the key is clean. */
  cutoutBase: "atly-logo-cutout",
  /** 2x the rendered header height. */
  headerHeight: 56,
  alt: "ATLY Artisan Chocolates",
} as const;

export const logoPresent = (): boolean => GENERATED_LOGO.present;

/** True only when the keyed version was judged clean enough to ship. */
export const logoCutoutPresent = (): boolean => GENERATED_LOGO.cutout;

export const logoUrl = (): string =>
  `/images/${logoCutoutPresent() ? LOGO.cutoutBase : LOGO.base}.png`;
