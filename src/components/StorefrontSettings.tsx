"use client";

import { createContext, useContext, useMemo } from "react";
import { TIERS_BY_KIND, type BundleTier, type ProductKind } from "@/lib/pricing";
import { DELIVERY_CONFIG, type DeliveryConfig } from "@/config/delivery";
import { variantLookup as staticVariantLookup } from "@/lib/catalog";

/**
 * The effective settings, handed to the browser once.
 *
 * Prices and delivery rules are editable from the admin, and several client
 * components price things locally: the quantity stepper, the cart, and the
 * cart's delivery estimate. Without this they would keep using the values
 * compiled into the bundle, so the owner would change a price, see it on the
 * shop page, and watch the cart quietly disagree.
 *
 * Seeded by the root layout from the server, so there is exactly ONE place
 * where the browser learns what the prices are.
 *
 * Deliberately small — tiers, delivery rules, and which variants are sellable.
 * Names, descriptions and allergens are not editable and stay in the bundle.
 */

export type StorefrontSettingsValue = {
  tiers: Record<ProductKind, readonly BundleTier[]>;
  delivery: DeliveryConfig;
  /** Keyed by variant id ("bon-bons/salted-caramel"). Absent means sellable. */
  availability: Record<string, boolean>;
  /**
   * Packaged shipping weight in ounces, keyed by variant id. Null where the
   * owner has not weighed it yet, which is every variant until they do.
   */
  weights: Record<string, number | null>;
};

const FALLBACK: StorefrontSettingsValue = {
  tiers: TIERS_BY_KIND,
  delivery: DELIVERY_CONFIG,
  availability: {},
  weights: {},
};

/**
 * The defaults are the fallback rather than a thrown error. A component
 * rendered outside the provider — a test, a future embed — should show the
 * prices in code, not crash.
 */
const SettingsContext = createContext<StorefrontSettingsValue>(FALLBACK);

export function StorefrontSettingsProvider({
  value,
  children,
}: {
  value: StorefrontSettingsValue;
  children: React.ReactNode;
}) {
  return <SettingsContext value={value}>{children}</SettingsContext>;
}

export const useStorefrontSettings = (): StorefrontSettingsValue =>
  useContext(SettingsContext);

export const useTiers = (): Record<ProductKind, readonly BundleTier[]> =>
  useStorefrontSettings().tiers;

export const useDeliveryConfig = (): DeliveryConfig =>
  useStorefrontSettings().delivery;

export const useVariantWeights = (): Record<string, number | null> =>
  useStorefrontSettings().weights;

/**
 * The catalog lookup the cart needs, with live availability layered on top.
 *
 * Kinds and flavor names come from the bundled catalog; only "can this still
 * be bought" comes from the admin.
 */
export function useVariantLookup() {
  const { availability } = useStorefrontSettings();
  return useMemo(
    () =>
      (variantId: string) => {
        const found = staticVariantLookup(variantId);
        if (!found) return undefined;
        return {
          ...found,
          isAvailable: availability[variantId] ?? found.isAvailable,
        };
      },
    [availability],
  );
}
