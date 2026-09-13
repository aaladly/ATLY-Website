/**
 * Photography manifest.
 *
 * The owner's logoandprodpics.zip has not been added to the project yet, so
 * public/images/ is empty. Rather than ship broken <img> tags or invent stock
 * photography, every slot is declared here with `present: false` and the
 * component renders a labelled placeholder instead.
 *
 * TO ADD THE REAL PHOTOGRAPHY:
 *   1. Extract logoandprodpics.zip into public/images/
 *   2. Rename the files to the `src` values below (or edit these to match)
 *   3. Flip `present` to true and fill in the real `alt` text
 * Nothing else needs to change. The layouts are already sized for them.
 *
 * The four supplied product photographs, per the owner's description:
 *   bon-bons in clear boxes · rose-moulded bon-bons · a multi-box spread ·
 *   a wrapped bar. All shot on plain warm stone.
 */

export type ImageSlot = {
  src: string;
  /**
   * Alt text. Required and never decorative — these are product photographs
   * that carry information a customer needs.
   * TODO: rewrite once the real files are in hand and can be described
   * accurately rather than from the owner's summary.
   */
  alt: string;
  present: boolean;
  /** What this slot is for, so the placeholder can say something useful. */
  note: string;
};

export const IMAGES = {
  logo: {
    src: "/images/atly-logo.png",
    alt: "ATLY Belgian Chocolate",
    present: false,
    note: "Circular logo — must read BELGIAN CHOCOLATE, not ARTISAN CHOCOLATES",
  },
  heroSpread: {
    src: "/images/bon-bon-box-spread.jpg",
    alt: "An assortment of ATLY bon-bon boxes on warm stone",
    present: false,
    note: "Multi-box spread, shot on warm stone",
  },
  bonbonsInBox: {
    src: "/images/bon-bons-clear-box.jpg",
    alt: "Hand-filled ATLY bon-bons in a clear presentation box",
    present: false,
    note: "Bon-bons in clear boxes",
  },
  bonbonsRose: {
    src: "/images/bon-bons-rose.jpg",
    alt: "Rose-moulded ATLY bon-bons dusted with gold",
    present: false,
    note: "Rose-moulded bon-bons",
  },
  barWrapped: {
    src: "/images/bar-wrapped.jpg",
    alt: "A wrapped ATLY Belgian chocolate bar",
    present: false,
    note: "Wrapped bar",
  },
} as const satisfies Record<string, ImageSlot>;

export type ImageKey = keyof typeof IMAGES;

/** The hero image for a product's detail page and shop card. */
export const PRODUCT_IMAGE: Record<string, ImageKey> = {
  "bon-bons": "bonbonsInBox",
  bars: "barWrapped",
};

/** True when every slot has been supplied — used to warn during the build. */
export const allImagesPresent = (): boolean =>
  Object.values(IMAGES).every((slot) => slot.present);

/** Slots still waiting on the owner, for the README and the build log. */
export const missingImages = (): ImageSlot[] =>
  Object.values(IMAGES).filter((slot) => !slot.present);
