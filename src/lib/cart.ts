/**
 * Cart state — pure and testable.
 *
 * No React, no storage calls, no clock. Every function takes state and returns
 * new state. The React layer (useCart) and the persistence layer (cartStore) are
 * thin wrappers over this, so the rules that matter can be tested without a browser.
 *
 * The cart deliberately stores only variant ids and quantities. Prices are
 * never persisted: they are recomputed from the pricing engine on every render,
 * so a cart left open in a tab overnight cannot show a stale price, and a cart
 * restored from storage cannot carry a price the customer invented.
 */

import type { CartItem, ProductKind } from "./pricing";

export type CartLine = {
  variantId: string;
  quantity: number;
};

export type CartState = {
  /** Bumped when the stored shape changes, so old carts are discarded safely. */
  version: number;
  lines: CartLine[];
};

export const CART_VERSION = 1;
export const CART_STORAGE_KEY = "atly.cart";

/**
 * Per-line cap. Not a business rule from the owner — a guard so a stuck key
 * or a scripted request cannot put 10,000 hand-made bon-bons into an order.
 * TODO: confirm a real per-order maximum with the owner; a batch size limit
 * probably exists in the kitchen.
 */
export const MAX_LINE_QUANTITY = 99;

export const emptyCart = (): CartState => ({ version: CART_VERSION, lines: [] });

const clampQuantity = (quantity: number): number => {
  if (!Number.isFinite(quantity)) return 0;
  const whole = Math.floor(quantity);
  if (whole < 0) return 0;
  return Math.min(whole, MAX_LINE_QUANTITY);
};

/** Drop zero-quantity lines so an empty cart is always structurally empty. */
const prune = (lines: CartLine[]): CartLine[] => lines.filter((l) => l.quantity > 0);

export function addToCart(
  state: CartState,
  variantId: string,
  quantity: number,
): CartState {
  const delta = clampQuantity(quantity);
  if (delta === 0) return state;

  const existing = state.lines.find((l) => l.variantId === variantId);
  const lines = existing
    ? state.lines.map((l) =>
        l.variantId === variantId
          ? { ...l, quantity: clampQuantity(l.quantity + delta) }
          : l,
      )
    : [...state.lines, { variantId, quantity: delta }];

  return { ...state, lines: prune(lines) };
}

/**
 * Set an absolute quantity. Zero removes the line.
 *
 * Inserts the line when the variant is not in the cart yet. Mapping over
 * existing lines alone would make this a silent no-op for a variant that is
 * not there, which is a trap for any caller that does not already know the
 * line exists — adjustQuantity() from an empty cart being the obvious one.
 */
export function setQuantity(
  state: CartState,
  variantId: string,
  quantity: number,
): CartState {
  const next = clampQuantity(quantity);
  const exists = state.lines.some((l) => l.variantId === variantId);

  const lines = exists
    ? state.lines.map((l) => (l.variantId === variantId ? { ...l, quantity: next } : l))
    : next > 0
      ? [...state.lines, { variantId, quantity: next }]
      : state.lines;

  return { ...state, lines: prune(lines) };
}

/**
 * Change a quantity by a delta, relative to current state.
 *
 * Distinct from setQuantity on purpose. A stepper button that computes
 * `current - 1` from a value captured in its click handler reads a stale
 * number when taps arrive faster than React re-renders, so ten rapid taps
 * register as one. Deltas are applied against whatever the state actually is
 * at the moment they are processed.
 */
export function adjustQuantity(
  state: CartState,
  variantId: string,
  delta: number,
): CartState {
  const current = lineQuantity(state, variantId);
  return setQuantity(state, variantId, current + Math.trunc(delta));
}

export function removeLine(state: CartState, variantId: string): CartState {
  return { ...state, lines: state.lines.filter((l) => l.variantId !== variantId) };
}

export const clearCart = (): CartState => emptyCart();

export const totalItems = (state: CartState): number =>
  state.lines.reduce((sum, l) => sum + l.quantity, 0);

export const isEmpty = (state: CartState): boolean => totalItems(state) === 0;

export const lineQuantity = (state: CartState, variantId: string): number =>
  state.lines.find((l) => l.variantId === variantId)?.quantity ?? 0;

/**
 * Read a cart back from storage.
 *
 * Everything here is hostile-input handling. The string comes from the
 * browser, where the customer can edit it freely, and from a past version of
 * this code that may have stored a different shape. Anything unrecognised is
 * dropped rather than repaired, and a variant that no longer exists in the
 * catalog is discarded — otherwise a discontinued flavor could be ordered.
 */
export function parseStoredCart(
  raw: string | null,
  knownVariantIds: ReadonlySet<string>,
): CartState {
  if (!raw) return emptyCart();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return emptyCart();
  }

  if (typeof parsed !== "object" || parsed === null) return emptyCart();
  const candidate = parsed as Partial<CartState>;

  // A cart written by an older shape is discarded, not migrated. There is no
  // version 0 worth rescuing, and silently half-migrating a cart is worse.
  if (candidate.version !== CART_VERSION) return emptyCart();
  if (!Array.isArray(candidate.lines)) return emptyCart();

  const seen = new Set<string>();
  const lines: CartLine[] = [];

  for (const entry of candidate.lines) {
    if (typeof entry !== "object" || entry === null) continue;
    const line = entry as Partial<CartLine>;
    if (typeof line.variantId !== "string") continue;
    if (!knownVariantIds.has(line.variantId)) continue;
    if (seen.has(line.variantId)) continue;

    const quantity = clampQuantity(Number(line.quantity));
    if (quantity === 0) continue;

    seen.add(line.variantId);
    lines.push({ variantId: line.variantId, quantity });
  }

  return { version: CART_VERSION, lines };
}

export const serializeCart = (state: CartState): string =>
  JSON.stringify({ version: CART_VERSION, lines: prune(state.lines) });

/**
 * Turn stored lines into the shape the pricing engine wants.
 *
 * `lookup` is passed in rather than imported so this stays pure and so tests
 * can use a fixture catalog. Unknown or unavailable variants are skipped: an
 * item that cannot be made must not be priced.
 */
export function toCartItems(
  state: CartState,
  lookup: (variantId: string) =>
    | { kind: ProductKind; flavorName: string; isAvailable: boolean }
    | undefined,
): CartItem[] {
  const items: CartItem[] = [];
  for (const line of state.lines) {
    const found = lookup(line.variantId);
    if (!found || !found.isAvailable) continue;
    items.push({
      variantId: line.variantId,
      kind: found.kind,
      flavorName: found.flavorName,
      quantity: line.quantity,
    });
  }
  return items;
}
