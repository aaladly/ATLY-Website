/**
 * Wallet sheet tests.
 *
 * Run: npm test
 *
 * Stripe totals the Apple Pay / Google Pay sheet by SUMMING these line items.
 * It does not take a total. So the sheet's arithmetic is ours, and getting it
 * wrong is not cosmetic — it is the figure the customer authorises, on a
 * screen drawn by the operating system that vanishes the instant they do.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  walletLineItems,
  lineItemsMatchTotal,
  DELIVERY_FREE_LABEL,
  DELIVERY_LABEL,
} from "./walletLineItems.ts";

/** Hoboken, under $50: delivery charged. */
const paid = {
  subtotalCents: 4700,
  deliveryCents: 599,
  taxCents: 351,
  totalCents: 5650,
};

/** Hoboken at exactly $50, or anywhere in Hunterdon: delivery waived. */
const free = {
  subtotalCents: 5000,
  deliveryCents: 0,
  taxCents: 331,
  totalCents: 5331,
};

describe("the sheet adds up", () => {
  test("a paid delivery sums to the total", () => {
    assert.ok(lineItemsMatchTotal(walletLineItems(paid), paid.totalCents));
  });

  test("a free delivery sums to the total", () => {
    assert.ok(lineItemsMatchTotal(walletLineItems(free), free.totalCents));
  });

  test("bundle savings are not subtracted twice", () => {
    // The pricing engine discounts INTO the subtotal rather than carrying a
    // separate savings line. Adding one here would take the same money off
    // again, and the sheet would show less than is charged.
    const items = walletLineItems(free);
    const chocolates = items.find((item) => item.name === "Chocolates");
    assert.equal(chocolates?.amount, free.subtotalCents);
    assert.ok(items.every((item) => item.amount >= 0), "no negative lines");
  });

  test("a mismatch is caught rather than shown", () => {
    // The guard the component calls before opening the sheet. If this ever
    // returns true for a wrong total, nothing downstream would notice.
    assert.equal(lineItemsMatchTotal(walletLineItems(paid), paid.totalCents + 1), false);
    assert.equal(lineItemsMatchTotal([], 100), false);
  });
});

describe("what the customer reads", () => {
  test("free delivery says FREE, not $0.00", () => {
    // A zero next to a line somebody expected to pay for reads as a bug in
    // the sheet, and there is no page to check it against.
    const items = walletLineItems(free);
    assert.ok(items.some((item) => item.name === DELIVERY_FREE_LABEL));
    assert.ok(!items.some((item) => item.name === DELIVERY_LABEL));
  });

  test("a charged delivery is just Delivery", () => {
    const items = walletLineItems(paid);
    assert.ok(items.some((item) => item.name === DELIVERY_LABEL && item.amount === 599));
    assert.ok(!items.some((item) => item.name === DELIVERY_FREE_LABEL));
  });

  test("delivery always appears, even at zero", () => {
    // Free delivery is worth showing. Dropping the line would hide the fact
    // that delivery was free at all.
    assert.equal(
      walletLineItems(free).filter((i) => i.name.startsWith("Delivery")).length,
      1,
    );
  });

  test("a zero tax line is left out", () => {
    // Some wallets draw a zero row as an empty line.
    const noTax = { subtotalCents: 1000, deliveryCents: 0, taxCents: 0, totalCents: 1000 };
    const items = walletLineItems(noTax);
    assert.ok(!items.some((item) => item.name === "Sales tax"));
    assert.ok(lineItemsMatchTotal(items, noTax.totalCents));
  });
});

describe("against real figures from the test run", () => {
  // Both taken from orders actually placed through this checkout, so the
  // sheet and the card summary are known to agree on the same numbers.
  test("Hunterdon, 2 bars: $10.66", () => {
    const totals = {
      subtotalCents: 1000,
      deliveryCents: 0,
      taxCents: 66,
      totalCents: 1066,
    };
    const items = walletLineItems(totals);
    assert.ok(lineItemsMatchTotal(items, 1066));
    assert.ok(items.some((item) => item.name === DELIVERY_FREE_LABEL));
  });

  test("Hoboken, 10 bars at exactly $50: $53.31, delivery waived", () => {
    const totals = {
      subtotalCents: 5000,
      deliveryCents: 0,
      taxCents: 331,
      totalCents: 5331,
    };
    assert.ok(lineItemsMatchTotal(walletLineItems(totals), 5331));
  });
});
