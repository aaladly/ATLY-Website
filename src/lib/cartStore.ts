/**
 * The cart as an external store, for useSyncExternalStore.
 *
 * The cart genuinely lives outside React — in localStorage, shared across
 * tabs. Mirroring it into component state with an effect means the store and
 * the render can disagree for a frame, which is what the
 * react-hooks/set-state-in-effect rule is warning about. Subscribing to it
 * directly removes that gap.
 *
 * Server rendering returns a fixed empty snapshot, so the HTML never claims to
 * know what is in a particular visitor's cart. React uses that snapshot during
 * hydration too, then re-reads once mounted — which is why `hydrated` flips
 * only after the client has actually looked at storage.
 */

import {
  CART_STORAGE_KEY,
  emptyCart,
  parseStoredCart,
  serializeCart,
  type CartState,
} from "./cart";
import { KNOWN_VARIANT_IDS } from "./catalog";

export type CartSnapshot = {
  cart: CartState;
  /** False until localStorage has actually been read on the client. */
  hydrated: boolean;
};

const SERVER_SNAPSHOT: CartSnapshot = Object.freeze({
  cart: emptyCart(),
  hydrated: false,
});

// The snapshot object identity must stay stable between changes, or
// useSyncExternalStore re-renders forever.
let snapshot: CartSnapshot = SERVER_SNAPSHOT;
let initialized = false;
const listeners = new Set<() => void>();

const emit = () => {
  for (const listener of listeners) listener();
};

const readStorage = (): CartState => {
  try {
    return parseStoredCart(
      window.localStorage.getItem(CART_STORAGE_KEY),
      KNOWN_VARIANT_IDS,
    );
  } catch {
    // Private browsing, disabled storage, or a quota error. An unreadable
    // cart is an empty cart — never a crash on page load.
    return emptyCart();
  }
};

const writeStorage = (cart: CartState) => {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, serializeCart(cart));
  } catch {
    // Storage full or blocked. The cart still works for this page view; it
    // just will not survive a reload.
  }
};

/** Read storage once, lazily, the first time the client asks for a snapshot. */
const ensureInitialized = () => {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  snapshot = { cart: readStorage(), hydrated: true };
};

export const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);

  // Keep two open tabs in agreement. Without this, adding in one tab and
  // checking out in another silently loses items.
  if (listeners.size === 1 && typeof window !== "undefined") {
    window.addEventListener("storage", onStorageEvent);
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== "undefined") {
      window.removeEventListener("storage", onStorageEvent);
    }
  };
};

function onStorageEvent(event: StorageEvent) {
  if (event.key !== CART_STORAGE_KEY) return;
  snapshot = {
    cart: parseStoredCart(event.newValue, KNOWN_VARIANT_IDS),
    hydrated: true,
  };
  emit();
}

export const getSnapshot = (): CartSnapshot => {
  ensureInitialized();
  return snapshot;
};

export const getServerSnapshot = (): CartSnapshot => SERVER_SNAPSHOT;

/** Apply a pure transition from lib/cart.ts, persist it, and notify. */
export function dispatch(transition: (current: CartState) => CartState): void {
  ensureInitialized();
  const next = transition(snapshot.cart);
  if (next === snapshot.cart) return;
  snapshot = { cart: next, hydrated: true };
  writeStorage(next);
  emit();
}

/** Test seam: drop all state so a suite can start clean. */
export function __resetForTests(): void {
  snapshot = SERVER_SNAPSHOT;
  initialized = false;
  listeners.clear();
}
