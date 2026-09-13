import "server-only";

import { PRODUCTS, makeVariantId, type Product } from "@/lib/catalog";
import { TIERS_BY_KIND, type BundleTier, type ProductKind } from "@/lib/pricing";
import { DELIVERY_CONFIG, type DeliveryConfig } from "@/config/delivery";
import { settingsStore } from "./store";
import {
  applyDeliveryOverrides,
  applyProductOverrides,
  applyTierOverrides,
} from "./apply";
import type { SettingsOverrides } from "./types";

/**
 * The effective configuration: what is in code, with the owner's overrides on
 * top of it.
 *
 * EVERY server-rendered part of the site reads from here rather than importing
 * PRODUCTS, TIERS_BY_KIND or DELIVERY_CONFIG directly. That is the whole point
 * of Step 9 — a "sold out" toggle that the shop page ignores is worse than no
 * toggle at all, because it tells the owner something is off the menu while
 * customers keep buying it.
 *
 * Static rendering still works. Nothing here touches cookies() or headers(),
 * so pages that call it are prerendered as before; admin saves call
 * revalidatePath() to rebuild them.
 */

export type StorefrontSettings = {
  products: Product[];
  tiers: Record<ProductKind, readonly BundleTier[]>;
  delivery: DeliveryConfig;
  /** ISO timestamp of the last admin save, or null if nothing was changed. */
  updatedAt: string | null;
};

export async function getOverrides(): Promise<SettingsOverrides> {
  return settingsStore.read();
}

export async function getStorefrontSettings(): Promise<StorefrontSettings> {
  const overrides = await settingsStore.read();
  return {
    products: applyProductOverrides(PRODUCTS, overrides),
    tiers: applyTierOverrides(TIERS_BY_KIND, overrides),
    delivery: applyDeliveryOverrides(DELIVERY_CONFIG, overrides),
    updatedAt: overrides.updatedAt,
  };
}

/**
 * The subset of the settings the browser needs, in a shape that serializes.
 *
 * Availability is a flat map rather than the product tree, because the client
 * only ever asks "can this variant still be bought" — and sending the whole
 * catalog twice, once as HTML and once as props, would be waste.
 */
export function toClientSettings(settings: StorefrontSettings) {
  const availability: Record<string, boolean> = {};
  const weights: Record<string, number | null> = {};
  for (const product of settings.products) {
    for (const variant of product.variants) {
      const id = makeVariantId(product.slug, variant.slug);
      availability[id] = product.isAvailable && variant.isAvailable;
      weights[id] = variant.packagedWeightOz;
    }
  }
  return {
    tiers: settings.tiers,
    delivery: settings.delivery,
    availability,
    weights,
  };
}

export type EffectiveVariant = {
  id: string;
  product: Product;
  variant: Product["variants"][number];
};

/** Effective variants, keyed the same way the cart keys them. */
export function indexVariants(
  products: readonly Product[],
): Map<string, EffectiveVariant> {
  return new Map(
    products.flatMap((product) =>
      product.variants.map((variant) => {
        const id = makeVariantId(product.slug, variant.slug);
        return [id, { id, product, variant }] as const;
      }),
    ),
  );
}
