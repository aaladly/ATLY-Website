/**
 * Pricing engine tests — Schedule A.
 *
 * Run: npm test
 *
 * Uses the Node built-in test runner, so the project needs no test dependency.
 * The file is .mts so Node treats it as ESM and strips the types natively.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  BONBON_TIERS,
  BAR_TIERS,
  priceQuantity,
  priceCart,
  allocateProportionally,
  findFreeUpgrade,
  formatCents,
  type BundleTier,
  type CartItem,
} from "./pricing.ts";

/**
 * Independent exhaustive search, deliberately written a different way from the
 * engine's dynamic programming. If both agree the engine is not just
 * self-consistent.
 */
function bruteForce(quantity: number, tiers: readonly BundleTier[]): number {
  if (quantity === 0) return 0;
  let best = Number.POSITIVE_INFINITY;
  const walk = (remaining: number, spent: number) => {
    if (spent >= best) return;
    if (remaining === 0) {
      best = spent;
      return;
    }
    for (const t of tiers) {
      if (t.size <= remaining) walk(remaining - t.size, spent + t.priceCents);
    }
  };
  walk(quantity, 0);
  return best;
}

describe("bon-bon pricing — $2 each, 3 for $5, 10 for $15", () => {
  // Worked by hand from Schedule A, then confirmed against brute force below.
  const expected: Record<number, number> = {
    0: 0,
    1: 200,
    2: 400,
    3: 500, // the 3-for-$5 special
    4: 700, // 3 + 1
    5: 900, // 3 + 1 + 1
    6: 1000, // 3 + 3
    7: 1200, // 3 + 3 + 1
    8: 1400, // 3 + 3 + 1 + 1  (the old 8-for-$10 tier is gone)
    9: 1500, // 3 + 3 + 3
    10: 1500, // the 10-for-$15 special — same price as 9
    11: 1700, // 10 + 1
    12: 1900, // 10 + 1 + 1
    13: 2000, // 10 + 3
    14: 2200, // 10 + 3 + 1
    15: 2400, // 10 + 3 + 1 + 1
    16: 2500, // 10 + 3 + 3
    17: 2700,
    18: 2900,
    19: 3000, // 10 + 3 + 3 + 3
    20: 3000, // two 10-boxes — same price as 19
  };

  for (const [qtyStr, cents] of Object.entries(expected)) {
    const qty = Number(qtyStr);
    test(`${qty} pieces costs ${formatCents(cents)}`, () => {
      assert.equal(priceQuantity(qty, BONBON_TIERS).totalCents, cents);
    });
  }

  test("10 for $15 reports a $5 saving against $2 each", () => {
    const p = priceQuantity(10, BONBON_TIERS);
    assert.equal(p.baseTotalCents, 2000);
    assert.equal(p.totalCents, 1500);
    assert.equal(p.savingsCents, 500);
  });

  test("3 for $5 reports a $1 saving", () => {
    const p = priceQuantity(3, BONBON_TIERS);
    assert.equal(p.savingsCents, 100);
    assert.deepEqual(
      p.bundles.map((b) => [b.size, b.count]),
      [[3, 1]],
    );
  });

  test("13 pieces breaks down as one 10-box plus one 3-box", () => {
    const p = priceQuantity(13, BONBON_TIERS);
    assert.deepEqual(
      p.bundles.map((b) => [b.size, b.count]),
      [
        [10, 1],
        [3, 1],
      ],
    );
  });

  test("the volume discount floors at the 10-box and never goes deeper", () => {
    // 100 pieces must be exactly ten 10-boxes, not a further discount.
    const p = priceQuantity(100, BONBON_TIERS);
    assert.equal(p.totalCents, 15000);
    assert.equal(p.totalCents / 100, 150); // $1.50 a piece, same as a single 10-box
  });
});

describe("bar pricing — $7 each, 2 for $10", () => {
  const expected: Record<number, number> = {
    0: 0,
    1: 700,
    2: 1000,
    3: 1700, // pair + single, the rule the owner confirmed
    4: 2000,
    5: 2700,
    6: 3000,
    7: 3700,
    8: 4000,
  };

  for (const [qtyStr, cents] of Object.entries(expected)) {
    const qty = Number(qtyStr);
    test(`${qty} bars costs ${formatCents(cents)}`, () => {
      assert.equal(priceQuantity(qty, BAR_TIERS).totalCents, cents);
    });
  }

  test("2 for $10 reports a $4 saving", () => {
    const p = priceQuantity(2, BAR_TIERS);
    assert.equal(p.savingsCents, 400);
  });

  test("odd counts pair up and charge the remainder at full price", () => {
    const p = priceQuantity(5, BAR_TIERS);
    assert.deepEqual(
      p.bundles.map((b) => [b.size, b.count]),
      [
        [2, 2],
        [1, 1],
      ],
    );
  });
});

describe("engine correctness", () => {
  test("matches an independent brute-force search for 0..40", () => {
    for (const tiers of [BONBON_TIERS, BAR_TIERS]) {
      for (let q = 0; q <= 40; q++) {
        assert.equal(
          priceQuantity(q, tiers).totalCents,
          bruteForce(q, tiers),
          `disagreement at quantity ${q}`,
        );
      }
    }
  });

  test("price never decreases as quantity rises", () => {
    for (const tiers of [BONBON_TIERS, BAR_TIERS]) {
      let previous = 0;
      for (let q = 0; q <= 60; q++) {
        const total = priceQuantity(q, tiers).totalCents;
        assert.ok(total >= previous, `quantity ${q} cost less than ${q - 1}`);
        previous = total;
      }
    }
  });

  test("the bundle breakdown accounts for every unit and every cent", () => {
    for (const tiers of [BONBON_TIERS, BAR_TIERS]) {
      for (let q = 0; q <= 40; q++) {
        const p = priceQuantity(q, tiers);
        const units = p.bundles.reduce((s, b) => s + b.size * b.count, 0);
        const cents = p.bundles.reduce((s, b) => s + b.priceCents * b.count, 0);
        assert.equal(units, q, `unit mismatch at ${q}`);
        assert.equal(cents, p.totalCents, `cent mismatch at ${q}`);
      }
    }
  });

  test("stays correct for a tier set nobody designed for", () => {
    // A deliberately awkward set where a greedy pass would overcharge:
    // greedy on 6 takes the 5-tier then a single (600), the optimum is two 3s (500).
    const awkward: BundleTier[] = [
      { size: 1, priceCents: 200, label: "$2 each" },
      { size: 3, priceCents: 250, label: "3 for $2.50" },
      { size: 5, priceCents: 400, label: "5 for $4" },
    ];
    assert.equal(priceQuantity(6, awkward).totalCents, 500);
    for (let q = 0; q <= 30; q++) {
      assert.equal(priceQuantity(q, awkward).totalCents, bruteForce(q, awkward));
    }
  });

  test("rejects nonsense input rather than guessing", () => {
    assert.throws(() => priceQuantity(-1, BAR_TIERS), RangeError);
    assert.throws(() => priceQuantity(2.5, BAR_TIERS), RangeError);
    assert.throws(() => priceQuantity(5, []), RangeError);
    assert.throws(
      () => priceQuantity(5, [{ size: 2, priceCents: 1000, label: "pair" }]),
      RangeError,
      "a tier set with no single-unit price must be rejected",
    );
  });
});

describe("proportional allocation", () => {
  test("splits evenly when it divides", () => {
    assert.deepEqual(allocateProportionally(1500, [5, 5]), [750, 750]);
    assert.deepEqual(allocateProportionally(1500, [3, 7]), [450, 1050]);
  });

  test("gives leftover cents to the largest fraction and still sums exactly", () => {
    // $5.00 across 1 and 2 units: 166.67 / 333.33
    assert.deepEqual(allocateProportionally(500, [1, 2]), [167, 333]);
  });

  test("always sums to the total, across many awkward splits", () => {
    for (let total = 0; total <= 400; total += 7) {
      for (const weights of [[1, 1, 1], [1, 2, 4], [5, 1], [9, 8, 7, 6], [1]]) {
        const parts = allocateProportionally(total, weights);
        assert.equal(
          parts.reduce((a, b) => a + b, 0),
          total,
          `allocation of ${total} across ${weights} did not sum`,
        );
        assert.ok(parts.every((p) => p >= 0));
      }
    }
  });

  test("handles a zero total and zero weights", () => {
    assert.deepEqual(allocateProportionally(0, [1, 2]), [0, 0]);
    assert.deepEqual(allocateProportionally(500, [0, 0]), [0, 0]);
  });
});

describe("cart pricing with mixed flavors", () => {
  const bonbon = (variantId: string, flavorName: string, quantity: number): CartItem => ({
    variantId,
    kind: "bonbon",
    flavorName,
    quantity,
  });
  const bar = (variantId: string, flavorName: string, quantity: number): CartItem => ({
    variantId,
    kind: "bar",
    flavorName,
    quantity,
  });

  test("a mixed 10-piece box still gets the 10-for-$15 price", () => {
    const cart = priceCart([
      bonbon("sc", "Salted Caramel", 5),
      bonbon("pb", "Peanut Butter", 5),
    ]);
    assert.equal(cart.subtotalCents, 1500);
    assert.equal(cart.savingsCents, 500);
    assert.deepEqual(
      cart.groups[0].allocations.map((a) => a.allocatedCents),
      [750, 750],
    );
  });

  test("a mixed bar pair gets 2-for-$10", () => {
    const cart = priceCart([bar("pl", "Plain", 1), bar("hz", "Hazelnut", 1)]);
    assert.equal(cart.subtotalCents, 1000);
    assert.equal(cart.savingsCents, 400);
  });

  test("three different single bars still pair up", () => {
    // Mixing is allowed, so this is one pair at $10 plus one bar at $7.
    const cart = priceCart([
      bar("pl", "Plain", 1),
      bar("hz", "Hazelnut", 1),
      bar("mx", "Mixed Nuts", 1),
    ]);
    assert.equal(cart.subtotalCents, 1700);
  });

  test("allocations sum exactly to each group total", () => {
    const cart = priceCart([
      bonbon("sc", "Salted Caramel", 1),
      bonbon("pb", "Peanut Butter", 2),
    ]);
    const group = cart.groups[0];
    assert.equal(group.price.totalCents, 500);
    assert.equal(
      group.allocations.reduce((s, a) => s + a.allocatedCents, 0),
      500,
    );
  });

  test("a large mixed cart prices each kind on its own tiers", () => {
    const cart = priceCart([
      bonbon("sc", "Salted Caramel", 7),
      bonbon("pb", "Peanut Butter", 6), // 13 bon-bons -> $20.00
      bar("pl", "Plain", 3),
      bar("hz", "Hazelnut", 2), // 5 bars -> $27.00
    ]);
    assert.equal(cart.subtotalCents, 4700);
    assert.equal(cart.savingsCents, 600 + 800);

    const bonbons = cart.groups.find((g) => g.kind === "bonbon")!;
    const bars = cart.groups.find((g) => g.kind === "bar")!;
    assert.equal(bonbons.price.totalCents, 2000);
    assert.equal(bars.price.totalCents, 2700);
    for (const g of cart.groups) {
      assert.equal(
        g.allocations.reduce((s, a) => s + a.allocatedCents, 0),
        g.price.totalCents,
      );
    }
  });

  test("merges duplicate lines for the same variant before bundling", () => {
    // Two separate add-to-cart actions for the same flavor must bundle together,
    // not price as two separate singles.
    const cart = priceCart([bar("pl", "Plain", 1), bar("pl", "Plain", 1)]);
    assert.equal(cart.subtotalCents, 1000);
    assert.equal(cart.groups[0].allocations.length, 1);
    assert.equal(cart.groups[0].allocations[0].quantity, 2);
  });

  test("an empty cart is free and has no groups", () => {
    const cart = priceCart([]);
    assert.equal(cart.subtotalCents, 0);
    assert.deepEqual(cart.groups, []);
  });

  test("zero-quantity lines are ignored", () => {
    const cart = priceCart([bar("pl", "Plain", 0)]);
    assert.deepEqual(cart.groups, []);
  });
});

describe("free upgrade nudge", () => {
  test("9 bon-bons should be told the tenth is free", () => {
    assert.deepEqual(findFreeUpgrade(9, BONBON_TIERS), {
      extraUnits: 1,
      newQuantity: 10,
    });
  });

  test("19 bon-bons should be told the twentieth is free", () => {
    assert.deepEqual(findFreeUpgrade(19, BONBON_TIERS), {
      extraUnits: 1,
      newQuantity: 20,
    });
  });

  test("a quantity already on a tier boundary gets no nudge", () => {
    assert.equal(findFreeUpgrade(10, BONBON_TIERS), null);
    assert.equal(findFreeUpgrade(3, BONBON_TIERS), null);
  });

  test("bars never have a free upgrade under 2-for-$10", () => {
    for (let q = 1; q <= 12; q++) {
      assert.equal(findFreeUpgrade(q, BAR_TIERS), null, `unexpected nudge at ${q} bars`);
    }
  });
});

describe("formatting", () => {
  test("renders integer cents as dollars", () => {
    assert.equal(formatCents(0), "$0.00");
    assert.equal(formatCents(200), "$2.00");
    assert.equal(formatCents(1500), "$15.00");
    assert.equal(formatCents(1705), "$17.05");
    assert.equal(formatCents(-400), "-$4.00");
  });
});
