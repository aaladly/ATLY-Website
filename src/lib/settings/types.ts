/**
 * Admin-editable overrides.
 *
 * These are a SPARSE PATCH over the static defaults in src/lib/catalog.ts,
 * src/lib/pricing.ts and src/config/delivery.ts — not a replacement for them.
 * Anything the owner has not touched keeps coming from code, so adding a
 * flavor or a tier in a future step appears immediately rather than being
 * shadowed by a stale copy sitting in a settings row.
 *
 * Pure types and data. No React, no database, no clock — the same rule the
 * pricing and delivery engines follow.
 */

import type { BundleTier, ProductKind } from "../pricing";
import type { WeightTier } from "@/config/delivery";

export type VariantOverride = {
  isAvailable?: boolean;
  /**
   * Packaged shipping weight in ounces, or null for "still not weighed".
   *
   * This is the field that unblocks Step 6: delivery weight tiers cannot be
   * switched on until every sellable variant has one.
   */
  packagedWeightOz?: number | null;
};

export type ProductOverride = {
  isAvailable?: boolean;
  /** Keyed by variant slug, e.g. "salted-caramel". */
  variants?: Record<string, VariantOverride>;
};

export type DeliveryOverride = {
  standardCents?: number;
  freeCounty?: {
    alwaysFree?: boolean;
    thresholdCents?: number;
    thresholdInclusive?: boolean;
  };
  freeCountyZips?: readonly string[];
  weightTiers?: readonly WeightTier[];
  excludedZips?: readonly string[];
};

export type SettingsOverrides = {
  version: 1;
  /** Keyed by product slug, e.g. "bon-bons". */
  products: Record<string, ProductOverride>;
  tiers: Partial<Record<ProductKind, readonly BundleTier[]>>;
  delivery: DeliveryOverride;
  /** ISO timestamp of the last save, or null if nothing has been changed. */
  updatedAt: string | null;
};

export const SETTINGS_VERSION = 1 as const;

/** No overrides at all: the site runs entirely on the values in code. */
export const EMPTY_OVERRIDES: SettingsOverrides = {
  version: SETTINGS_VERSION,
  products: {},
  tiers: {},
  delivery: {},
  updatedAt: null,
};
