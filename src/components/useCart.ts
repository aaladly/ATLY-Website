"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  addToCart as addLine,
  adjustQuantity as adjustLine,
  emptyCart,
  removeLine as dropLine,
  setQuantity as setLineQuantity,
  toCartItems,
  totalItems,
  lineQuantity as readLineQuantity,
  type CartState,
} from "@/lib/cart";
import {
  dispatch,
  getServerSnapshot,
  getSnapshot,
  subscribe,
} from "@/lib/cartStore";
import { priceCart, type CartPrice } from "@/lib/pricing";
import { useTiers, useVariantLookup } from "./StorefrontSettings";

export type UseCart = {
  cart: CartState;
  /**
   * False during server rendering and the hydration pass, true once the
   * browser has actually read the stored cart. Anything whose content depends
   * on the cart waits on this rather than flashing an empty state.
   */
  hydrated: boolean;
  price: CartPrice;
  itemCount: number;
  add: (variantId: string, quantity: number) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  /** Change by a delta against current state. Use this for stepper buttons:
   *  computing an absolute value from a rendered prop loses rapid taps. */
  adjust: (variantId: string, delta: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
  quantityOf: (variantId: string) => number;
};

/**
 * Subscribes to the cart store.
 *
 * No context provider is needed: the store is a module singleton, so every
 * component that calls this sees the same cart and re-renders together.
 */
export function useCart(): UseCart {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { cart, hydrated } = snapshot;

  // Prices and availability as the owner has them set right now, not as they
  // were when this bundle was built.
  const tiers = useTiers();
  const variantLookup = useVariantLookup();

  const add = useCallback((variantId: string, quantity: number) => {
    dispatch((current) => addLine(current, variantId, quantity));
  }, []);

  const setQuantity = useCallback((variantId: string, quantity: number) => {
    dispatch((current) => setLineQuantity(current, variantId, quantity));
  }, []);

  const adjust = useCallback((variantId: string, delta: number) => {
    dispatch((current) => adjustLine(current, variantId, delta));
  }, []);

  const remove = useCallback((variantId: string) => {
    dispatch((current) => dropLine(current, variantId));
  }, []);

  const clear = useCallback(() => dispatch(() => emptyCart()), []);

  return useMemo<UseCart>(
    () => ({
      cart,
      hydrated,
      price: priceCart(toCartItems(cart, variantLookup), tiers),
      itemCount: totalItems(cart),
      add,
      setQuantity,
      adjust,
      remove,
      clear,
      quantityOf: (variantId: string) => readLineQuantity(cart, variantId),
    }),
    [cart, hydrated, tiers, variantLookup, add, setQuantity, adjust, remove, clear],
  );
}
