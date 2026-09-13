/**
 * Cart state tests.
 *
 * Heavy on parseStoredCart, because that is the only function here that takes
 * hostile input: the stored string lives in the customer's browser where it
 * can be edited freely, and may have been written by an older build.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  CART_VERSION,
  MAX_LINE_QUANTITY,
  emptyCart,
  addToCart,
  setQuantity,
  removeLine,
  adjustQuantity,
  totalItems,
  isEmpty,
  lineQuantity,
  parseStoredCart,
  serializeCart,
  toCartItems,
  type CartState,
} from "./cart.ts";

const KNOWN = new Set(["bon-bons/salted-caramel", "bon-bons/peanut-butter", "bars/plain"]);

const lookup = (id: string) => {
  const map: Record<string, { kind: "bonbon" | "bar"; flavorName: string; isAvailable: boolean }> = {
    "bon-bons/salted-caramel": { kind: "bonbon", flavorName: "Salted Caramel", isAvailable: true },
    "bon-bons/peanut-butter": { kind: "bonbon", flavorName: "Peanut Butter", isAvailable: true },
    "bars/plain": { kind: "bar", flavorName: "Plain", isAvailable: true },
    "bars/discontinued": { kind: "bar", flavorName: "Discontinued", isAvailable: false },
  };
  return map[id];
};

describe("adding and adjusting", () => {
  test("adds a line", () => {
    const cart = addToCart(emptyCart(), "bars/plain", 2);
    assert.equal(totalItems(cart), 2);
    assert.equal(lineQuantity(cart, "bars/plain"), 2);
  });

  test("accumulates onto an existing line rather than duplicating it", () => {
    let cart = addToCart(emptyCart(), "bars/plain", 1);
    cart = addToCart(cart, "bars/plain", 2);
    assert.equal(cart.lines.length, 1);
    assert.equal(lineQuantity(cart, "bars/plain"), 3);
  });

  test("never exceeds the per-line cap", () => {
    let cart = addToCart(emptyCart(), "bars/plain", MAX_LINE_QUANTITY);
    cart = addToCart(cart, "bars/plain", 50);
    assert.equal(lineQuantity(cart, "bars/plain"), MAX_LINE_QUANTITY);
  });

  test("ignores zero and negative additions", () => {
    const cart = addToCart(emptyCart(), "bars/plain", 0);
    assert.ok(isEmpty(cart));
    assert.ok(isEmpty(addToCart(emptyCart(), "bars/plain", -5)));
  });

  test("floors a fractional quantity rather than storing it", () => {
    const cart = addToCart(emptyCart(), "bars/plain", 2.9);
    assert.equal(lineQuantity(cart, "bars/plain"), 2);
  });

  test("setting quantity to zero removes the line entirely", () => {
    let cart = addToCart(emptyCart(), "bars/plain", 3);
    cart = setQuantity(cart, "bars/plain", 0);
    assert.deepEqual(cart.lines, []);
    assert.ok(isEmpty(cart));
  });

  test("setQuantity replaces rather than adds", () => {
    let cart = addToCart(emptyCart(), "bars/plain", 3);
    cart = setQuantity(cart, "bars/plain", 1);
    assert.equal(lineQuantity(cart, "bars/plain"), 1);
  });

  test("setQuantity inserts a line that is not in the cart yet", () => {
    const cart = setQuantity(emptyCart(), "bars/plain", 4);
    assert.equal(lineQuantity(cart, "bars/plain"), 4);
  });

  test("setQuantity to zero on an absent line is a no-op, not an insert", () => {
    const cart = setQuantity(emptyCart(), "bars/plain", 0);
    assert.deepEqual(cart.lines, []);
  });

  test("adjust applies a delta against current state", () => {
    let cart = addToCart(emptyCart(), "bars/plain", 3);
    cart = adjustQuantity(cart, "bars/plain", 2);
    assert.equal(lineQuantity(cart, "bars/plain"), 5);
    cart = adjustQuantity(cart, "bars/plain", -4);
    assert.equal(lineQuantity(cart, "bars/plain"), 1);
  });

  test("repeated deltas accumulate -- the rapid-tap case", () => {
    // Ten quick taps on "+" must land on ten, not one. Computing an absolute
    // value from a rendered prop loses taps that arrive before a re-render.
    let cart = emptyCart();
    for (let i = 0; i < 10; i++) cart = adjustQuantity(cart, "bars/plain", 1);
    assert.equal(lineQuantity(cart, "bars/plain"), 10);
  });

  test("adjust cannot drive a quantity below zero", () => {
    let cart = addToCart(emptyCart(), "bars/plain", 1);
    cart = adjustQuantity(cart, "bars/plain", -5);
    assert.equal(lineQuantity(cart, "bars/plain"), 0);
    assert.deepEqual(cart.lines, []);
  });

  test("adjust respects the per-line cap", () => {
    let cart = addToCart(emptyCart(), "bars/plain", MAX_LINE_QUANTITY - 1);
    cart = adjustQuantity(cart, "bars/plain", 10);
    assert.equal(lineQuantity(cart, "bars/plain"), MAX_LINE_QUANTITY);
  });

  test("removes a line", () => {
    let cart = addToCart(emptyCart(), "bars/plain", 3);
    cart = addToCart(cart, "bon-bons/peanut-butter", 2);
    cart = removeLine(cart, "bars/plain");
    assert.equal(cart.lines.length, 1);
    assert.equal(lineQuantity(cart, "bars/plain"), 0);
  });

  test("does not mutate the input state", () => {
    const original = addToCart(emptyCart(), "bars/plain", 1);
    const snapshot = JSON.stringify(original);
    addToCart(original, "bars/plain", 5);
    setQuantity(original, "bars/plain", 9);
    removeLine(original, "bars/plain");
    assert.equal(JSON.stringify(original), snapshot);
  });
});

describe("parsing a stored cart (hostile input)", () => {
  const parse = (raw: string | null) => parseStoredCart(raw, KNOWN);

  test("null and empty give an empty cart", () => {
    assert.ok(isEmpty(parse(null)));
    assert.ok(isEmpty(parse("")));
  });

  test("malformed JSON gives an empty cart rather than throwing", () => {
    assert.ok(isEmpty(parse("{not json")));
    assert.ok(isEmpty(parse("[1,2,3")));
  });

  test("non-objects give an empty cart", () => {
    assert.ok(isEmpty(parse("null")));
    assert.ok(isEmpty(parse('"a string"')));
    assert.ok(isEmpty(parse("42")));
  });

  test("a cart from an older version is discarded, not migrated", () => {
    const old = JSON.stringify({ version: 0, lines: [{ variantId: "bars/plain", quantity: 3 }] });
    assert.ok(isEmpty(parse(old)));
  });

  test("a variant no longer in the catalog is dropped", () => {
    const raw = JSON.stringify({
      version: CART_VERSION,
      lines: [
        { variantId: "bars/plain", quantity: 2 },
        { variantId: "bars/retired-flavor", quantity: 5 },
      ],
    });
    const cart = parse(raw);
    assert.equal(cart.lines.length, 1);
    assert.equal(lineQuantity(cart, "bars/plain"), 2);
  });

  test("duplicate lines collapse to the first", () => {
    const raw = JSON.stringify({
      version: CART_VERSION,
      lines: [
        { variantId: "bars/plain", quantity: 2 },
        { variantId: "bars/plain", quantity: 7 },
      ],
    });
    const cart = parse(raw);
    assert.equal(cart.lines.length, 1);
    assert.equal(lineQuantity(cart, "bars/plain"), 2);
  });

  test("hand-edited quantities are clamped, not trusted", () => {
    const raw = JSON.stringify({
      version: CART_VERSION,
      lines: [
        { variantId: "bars/plain", quantity: 999999 },
        { variantId: "bon-bons/peanut-butter", quantity: -3 },
        { variantId: "bon-bons/salted-caramel", quantity: "12" },
      ],
    });
    const cart = parse(raw);
    assert.equal(lineQuantity(cart, "bars/plain"), MAX_LINE_QUANTITY);
    assert.equal(lineQuantity(cart, "bon-bons/peanut-butter"), 0);
    // A numeric string is coerced; anything non-numeric would drop out.
    assert.equal(lineQuantity(cart, "bon-bons/salted-caramel"), 12);
  });

  test("NaN, Infinity and junk quantities drop the line", () => {
    const raw = JSON.stringify({
      version: CART_VERSION,
      lines: [
        { variantId: "bars/plain", quantity: "banana" },
        { variantId: "bon-bons/peanut-butter", quantity: null },
      ],
    });
    assert.ok(isEmpty(parse(raw)));
  });

  test("junk entries inside a valid lines array are skipped individually", () => {
    const raw = JSON.stringify({
      version: CART_VERSION,
      lines: [null, 5, "x", { variantId: "bars/plain", quantity: 1 }, { quantity: 2 }],
    });
    const cart = parse(raw);
    assert.equal(cart.lines.length, 1);
    assert.equal(lineQuantity(cart, "bars/plain"), 1);
  });

  test("lines that is not an array gives an empty cart", () => {
    assert.ok(isEmpty(parse(JSON.stringify({ version: CART_VERSION, lines: "nope" }))));
  });

  test("round-trips through serialize", () => {
    let cart = addToCart(emptyCart(), "bars/plain", 2);
    cart = addToCart(cart, "bon-bons/salted-caramel", 5);
    const restored = parse(serializeCart(cart));
    assert.deepEqual(restored, cart);
  });
});

describe("handing lines to the pricing engine", () => {
  const cartWith = (...pairs: [string, number][]): CartState =>
    pairs.reduce((c, [id, q]) => addToCart(c, id, q), emptyCart());

  test("maps lines to priced items", () => {
    const items = toCartItems(cartWith(["bars/plain", 2], ["bon-bons/salted-caramel", 3]), lookup);
    assert.deepEqual(items, [
      { variantId: "bars/plain", kind: "bar", flavorName: "Plain", quantity: 2 },
      {
        variantId: "bon-bons/salted-caramel",
        kind: "bonbon",
        flavorName: "Salted Caramel",
        quantity: 3,
      },
    ]);
  });

  test("skips an unavailable variant so it is never priced", () => {
    // Something sold out must not reach the total, even if it is in storage.
    const items = toCartItems(cartWith(["bars/discontinued", 4], ["bars/plain", 1]), lookup);
    assert.equal(items.length, 1);
    assert.equal(items[0].variantId, "bars/plain");
  });

  test("skips a variant the catalog no longer knows", () => {
    const items = toCartItems(cartWith(["bars/ghost", 4]), lookup);
    assert.deepEqual(items, []);
  });

  test("an empty cart maps to no items", () => {
    assert.deepEqual(toCartItems(emptyCart(), lookup), []);
  });
});
