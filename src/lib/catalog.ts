/**
 * The launch catalog, as static data.
 *
 * This mirrors supabase/migrations/0001 exactly. It exists because Step 4 is
 * static by design — the cart is not wired and no Supabase project is
 * connected yet. When the database is live this module becomes the fallback
 * and the queries take over; the shapes are deliberately identical so that
 * swap does not touch any component.
 *
 * Every string here is real copy from the owner. Nothing is placeholder text.
 */

import type { ProductKind } from "./pricing";

export type Allergen = "milk" | "peanuts" | "tree_nuts";

export const ALLERGEN_LABEL: Record<Allergen, string> = {
  milk: "Milk",
  peanuts: "Peanuts",
  tree_nuts: "Tree nuts",
};

export type Variant = {
  slug: string;
  name: string;
  /** Chocolate and filling weight, from the owner's costing figures. */
  unitWeightGrams: number;
  /** TODO: owner to weigh a packaged unit. Blocks Step 6 delivery tiers. */
  packagedWeightOz: number | null;
  containsAllergens: Allergen[];
  isAvailable: boolean;
};

export type Product = {
  slug: string;
  name: string;
  kind: ProductKind;
  /** One line, used on cards. */
  tagline: string;
  /** Two or three sentences, used on the detail page. */
  description: string;
  basePriceCents: number;
  /** Customer-facing summary of the bundle offers, e.g. "3 for $5 · 10 for $15". */
  offerSummary: string;
  variants: Variant[];
  isAvailable: boolean;
};

export const PRODUCTS: Product[] = [
  {
    slug: "bon-bons",
    name: "Bon-bons",
    kind: "bonbon",
    tagline: "Hand-filled, in small batches.",
    description:
      "Each bon-bon is filled and finished by hand, in batches small enough to check every piece. The fillings are made from all-natural ingredients, with no preservatives and no additives.",
    basePriceCents: 200,
    offerSummary: "$2 each · 3 for $5 · 10 for $15",
    isAvailable: true,
    variants: [
      {
        slug: "salted-caramel",
        name: "Salted Caramel",
        unitWeightGrams: 9,
        packagedWeightOz: null,
        containsAllergens: ["milk"],
        isAvailable: true,
      },
      {
        slug: "peanut-butter",
        name: "Peanut Butter",
        unitWeightGrams: 9,
        packagedWeightOz: null,
        containsAllergens: ["milk", "peanuts"],
        isAvailable: true,
      },
    ],
  },
  {
    slug: "bars",
    name: "Bars",
    kind: "bar",
    tagline: "Belgian couverture, moulded by hand.",
    description:
      "Moulded and wrapped by hand from Belcolade Lait Selection 34% Milk Couverture — genuine Belgian couverture at 34% cocoa, per Belcolade's own product specification. No preservatives, no additives.",
    basePriceCents: 700,
    offerSummary: "$7 each · 2 for $10",
    isAvailable: true,
    variants: [
      {
        slug: "plain",
        name: "Plain",
        unitWeightGrams: 27.5,
        packagedWeightOz: null,
        containsAllergens: ["milk"],
        isAvailable: true,
      },
      {
        slug: "hazelnut",
        name: "Hazelnut",
        unitWeightGrams: 27.5,
        packagedWeightOz: null,
        containsAllergens: ["milk", "tree_nuts"],
        isAvailable: true,
      },
      {
        slug: "mixed-nuts",
        name: "Mixed Nuts",
        unitWeightGrams: 27.5,
        packagedWeightOz: null,
        containsAllergens: ["milk", "tree_nuts"],
        isAvailable: true,
      },
    ],
  },
];

export const getProduct = (slug: string): Product | undefined =>
  PRODUCTS.find((p) => p.slug === slug);

/** Every allergen present anywhere in a product, deduplicated. */
export const productAllergens = (product: Product): Allergen[] => [
  ...new Set(product.variants.flatMap((v) => v.containsAllergens)),
];

/**
 * Brand facts, kept in one place so the same claim is never worded two ways.
 * These are the owner's stated facts. Do not add to this list without being
 * told, and never turn any of it into a health claim.
 */
export const BRAND = {
  tagline: "Pure chocolate. Real ingredients. A bigger purpose.",
  secondaryTagline: "Small bites of happiness.",
  storyHeadline: "A Sweet Story of Strength",
  couverture: "Belcolade Lait Selection 34% Milk Couverture",
  cocoaPercent: "34%",
  social: {
    facebook: "https://www.facebook.com/share/1Emqbe33p5/?mibextid=wwXIfr",
    instagram: "https://www.instagram.com/atlychocolate",
  },
  delivery: {
    stateOnly: "New Jersey",
    freeCounty: "Hunterdon County",
    // Owner-confirmed, Step 6: every Hunterdon order is free, no threshold.
    // The original "$50" figure no longer applies anywhere on the site.
    freeCountyAlwaysFree: true,
    standardCents: 599,
  },
} as const;

// ---------------------------------------------------------------------------
// Variant lookup
// ---------------------------------------------------------------------------
// The cart stores variant ids and nothing else, so it needs a stable id and a
// way back to the product. "bon-bons/salted-caramel" is readable in devtools
// and in a stored cart, which makes debugging an order far easier than a uuid.

export const makeVariantId = (productSlug: string, variantSlug: string): string =>
  `${productSlug}/${variantSlug}`;

export type ResolvedVariant = {
  id: string;
  product: Product;
  variant: Variant;
};

export const VARIANT_INDEX: ReadonlyMap<string, ResolvedVariant> = new Map(
  PRODUCTS.flatMap((product) =>
    product.variants.map((variant) => {
      const id = makeVariantId(product.slug, variant.slug);
      return [id, { id, product, variant }] as const;
    }),
  ),
);

export const findVariant = (id: string): ResolvedVariant | undefined =>
  VARIANT_INDEX.get(id);

/** Every id the catalog currently knows. A stored cart is filtered against this. */
export const KNOWN_VARIANT_IDS: ReadonlySet<string> = new Set(VARIANT_INDEX.keys());

/** The shape lib/cart.ts wants, without cart.ts having to import the catalog. */
export const variantLookup = (id: string) => {
  const found = VARIANT_INDEX.get(id);
  if (!found) return undefined;
  return {
    kind: found.product.kind,
    flavorName: found.variant.name,
    isAvailable: found.product.isAvailable && found.variant.isAvailable,
  };
};
