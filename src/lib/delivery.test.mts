/**
 * Delivery rules engine tests.
 *
 * Config is injected, so weight tiers can be exercised here even though none
 * are configured in production yet — the engine must be correct before the
 * owner's tier table arrives, not after.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  quoteDelivery,
  deliveryPolicySummary,
  normalizeZip,
  normalizeState,
  findWeightTier,
  totalPackagedWeightOz,
} from "./delivery.ts";
import type { DeliveryConfig } from "../config/delivery.ts";

const BASE: DeliveryConfig = {
  allowedState: "NJ",
  allowedStateName: "New Jersey",
  standardCents: 599,
  // Threshold mode. Production runs alwaysFree; both are covered below.
  freeCounty: { alwaysFree: false, thresholdCents: 5000, thresholdInclusive: true },
  freeCountyName: "Hunterdon County",
  freeCountyZips: ["08822", "08809"],
  freeCountyZipsVerified: true,
  freeOver: null,
  weightTiers: [],
  excludedZips: [],
};

const quote = (
  zip: string,
  subtotalCents: number,
  overrides: Partial<DeliveryConfig> = {},
  state = "NJ",
  totalWeightOz: number | null = null,
) =>
  quoteDelivery(
    { address: { state, zip }, subtotalCents, totalWeightOz },
    { ...BASE, ...overrides },
  );

describe("the New Jersey gate", () => {
  test("refuses another state with a friendly message", () => {
    const result = quote("10001", 6000, {}, "NY");
    assert.equal(result.kind, "unavailable");
    if (result.kind !== "unavailable") return;
    assert.equal(result.reason, "out_of_state");
    assert.match(result.message, /New Jersey only/);
  });

  test("accepts lower case and padded state codes", () => {
    assert.equal(quote("08822", 6000, {}, " nj ").kind, "quoted");
  });

  test("state is checked before ZIP, so the message is the useful one", () => {
    // A Hunterdon-looking ZIP with an out-of-state code is still out of state.
    const result = quote("08822", 6000, {}, "PA");
    assert.equal(result.kind, "unavailable");
    if (result.kind !== "unavailable") return;
    assert.equal(result.reason, "out_of_state");
  });

  test("rejects a malformed ZIP", () => {
    for (const bad of ["", "123", "abcde", "0882", "088221"]) {
      const result = quote(bad, 6000);
      assert.equal(result.kind, "unavailable", `expected ${bad} to be refused`);
      if (result.kind !== "unavailable") return;
      assert.equal(result.reason, "invalid_zip");
    }
  });

  test("accepts ZIP+4 and trims whitespace", () => {
    assert.equal(normalizeZip("08822-1234"), "08822");
    assert.equal(normalizeZip("  08822  "), "08822");
    assert.equal(normalizeZip("8822"), null);
    assert.equal(normalizeState(" nj "), "NJ");
  });

  test("refuses an excluded NJ area", () => {
    const result = quote("08822", 6000, { excludedZips: ["08822"] });
    assert.equal(result.kind, "unavailable");
    if (result.kind !== "unavailable") return;
    assert.equal(result.reason, "excluded_area");
  });
});

describe("Hunterdon County free delivery", () => {
  test("free over the threshold", () => {
    const result = quote("08822", 5001);
    assert.equal(result.kind, "quoted");
    if (result.kind !== "quoted") return;
    assert.equal(result.costCents, 0);
    assert.equal(result.isFree, true);
    assert.equal(result.inFreeCounty, true);
  });

  test("standard rate under the threshold, and says how close they are", () => {
    const result = quote("08822", 4000);
    assert.equal(result.kind, "quoted");
    if (result.kind !== "quoted") return;
    assert.equal(result.costCents, 599);
    assert.equal(result.isFree, false);
    assert.equal(result.inFreeCounty, true);
    // $40.00 -> needs $10.00 more to reach $50 inclusive.
    assert.equal(result.centsToFreeDelivery, 1000);
  });

  test("the $50.00 boundary follows the inclusive flag", () => {
    // Owner-confirmed: $50.00 exactly qualifies.
    const inclusive = quote("08822", 5000);
    assert.equal(inclusive.kind, "quoted");
    if (inclusive.kind !== "quoted") return;
    assert.equal(inclusive.costCents, 0);

    // Flipped to the literal "over $50", the same order pays — and is told
    // to add a single cent, which is why the owner chose inclusive.
    const exclusive = quote("08822", 5000, {
      freeCounty: { alwaysFree: false, thresholdCents: 5000, thresholdInclusive: false },
    });
    assert.equal(exclusive.kind, "quoted");
    if (exclusive.kind !== "quoted") return;
    assert.equal(exclusive.costCents, 599);
    assert.equal(exclusive.centsToFreeDelivery, 1);
  });

  test("a cent over the threshold is free", () => {
    const result = quote("08822", 5001);
    if (result.kind !== "quoted") return assert.fail("expected a quote");
    assert.equal(result.costCents, 0);
  });
});

describe("Hunterdon County with no threshold (the configured behaviour)", () => {
  const always: Partial<DeliveryConfig> = {
    freeCounty: { alwaysFree: true, thresholdCents: 5000, thresholdInclusive: true },
  };

  test("every order in the county is free, however small", () => {
    for (const subtotal of [200, 500, 4999, 5000, 20000]) {
      const result = quote("08822", subtotal, always);
      assert.equal(result.kind, "quoted", `subtotal ${subtotal}`);
      if (result.kind !== "quoted") return;
      assert.equal(result.costCents, 0, `subtotal ${subtotal}`);
      assert.equal(result.isFree, true);
    }
  });

  test("no spend-more nudge, because there is nothing to reach", () => {
    const result = quote("08822", 200, always);
    if (result.kind !== "quoted") return assert.fail("expected a quote");
    assert.equal(result.centsToFreeDelivery, null);
  });

  test("the rest of New Jersey still pays the standard rate", () => {
    const result = quote("07030", 20000, always);
    if (result.kind !== "quoted") return assert.fail("expected a quote");
    assert.equal(result.costCents, 599);
    assert.equal(result.inFreeCounty, false);
  });

  test("free county beats weight tiers entirely", () => {
    const result = quote("08822", 500, {
      ...always,
      weightTiers: [{ maxOunces: 48, priceCents: 599 }],
    }, "NJ", 200);
    if (result.kind !== "quoted") return assert.fail("expected a quote");
    assert.equal(result.costCents, 0);
  });
});

describe("elsewhere in New Jersey", () => {
  test("standard rate regardless of subtotal", () => {
    for (const subtotal of [500, 4999, 5000, 5001, 25000]) {
      const result = quote("07030", subtotal);
      assert.equal(result.kind, "quoted");
      if (result.kind !== "quoted") return;
      assert.equal(result.costCents, 599, `subtotal ${subtotal}`);
      assert.equal(result.inFreeCounty, false);
    }
  });

  test("no free-delivery nudge outside the county, since it is unreachable", () => {
    // Telling a Newark customer to spend $10 more for free delivery they can
    // never get would be a lie.
    const result = quote("07102", 4000);
    if (result.kind !== "quoted") return assert.fail("expected a quote");
    assert.equal(result.centsToFreeDelivery, null);
  });
});

describe("weight tiers", () => {
  const tiered: Partial<DeliveryConfig> = {
    weightTiers: [
      { maxOunces: 8, priceCents: 599 },
      { maxOunces: 16, priceCents: 899 },
      { maxOunces: 32, priceCents: 1299 },
    ],
  };

  test("picks the cheapest tier that covers the weight", () => {
    const cases: [number, number][] = [
      [1, 599],
      [8, 599],
      [8.1, 899],
      [16, 899],
      [16.5, 1299],
      [32, 1299],
    ];
    for (const [oz, expected] of cases) {
      const result = quote("07030", 2000, tiered, "NJ", oz);
      assert.equal(result.kind, "quoted", `${oz} oz`);
      if (result.kind !== "quoted") return;
      assert.equal(result.costCents, expected, `${oz} oz`);
    }
  });

  test("boundaries are inclusive at the top of each tier", () => {
    assert.equal(findWeightTier(8, tiered.weightTiers!)?.priceCents, 599);
    assert.equal(findWeightTier(8.0001, tiered.weightTiers!)?.priceCents, 899);
  });

  test("over the heaviest tier asks the customer to get in touch", () => {
    const result = quote("07030", 2000, tiered, "NJ", 100);
    assert.equal(result.kind, "needs_weight");
  });

  test("unknown weight is refused rather than guessed once tiers exist", () => {
    // Quoting a flat rate here would silently undercharge on heavy orders.
    const result = quote("07030", 2000, tiered, "NJ", null);
    assert.equal(result.kind, "needs_weight");
  });

  test("free county over the threshold still wins over any tier", () => {
    const result = quote("08822", 9000, tiered, "NJ", 40);
    assert.equal(result.kind, "quoted");
    if (result.kind !== "quoted") return;
    assert.equal(result.costCents, 0);
  });

  test("with no tiers configured the flat rate applies and weight is ignored", () => {
    const result = quote("07030", 2000, {}, "NJ", null);
    assert.equal(result.kind, "quoted");
    if (result.kind !== "quoted") return;
    assert.equal(result.costCents, 599);
  });
});

describe("order weight", () => {
  test("sums packaged weights", () => {
    assert.equal(
      totalPackagedWeightOz([
        { quantity: 2, packagedWeightOz: 4 },
        { quantity: 3, packagedWeightOz: 1.5 },
      ]),
      12.5,
    );
  });

  test("returns null if ANY item has no weight, rather than a partial sum", () => {
    // A partial sum would quote a delivery price that is too low and the
    // shortfall comes out of the owner's margin.
    assert.equal(
      totalPackagedWeightOz([
        { quantity: 2, packagedWeightOz: 4 },
        { quantity: 1, packagedWeightOz: null },
      ]),
      null,
    );
  });

  test("an empty order weighs nothing", () => {
    assert.equal(totalPackagedWeightOz([]), 0);
  });
});

// ---------------------------------------------------------------------------
// Free delivery over $50, outside the free county as well as in it
// ---------------------------------------------------------------------------
// Owner-approved 2026-09-15. Before this, no order outside Hunterdon could
// reach free delivery at any size — the engine had a threshold but it was
// gated behind being in the county.

describe("free delivery over $50", () => {
  /** Production shape: Hunterdon always free, $50 floor for everyone else. */
  const LIVE: Partial<DeliveryConfig> = {
    freeCounty: { alwaysFree: true, thresholdCents: 5000, thresholdInclusive: true },
    freeOver: { thresholdCents: 5000, inclusive: true },
  };

  const HUNTERDON = "08822";
  const ELSEWHERE = "07030"; // Hoboken — in New Jersey, outside the county.

  describe("the boundary, outside the county", () => {
    test("$49.99 pays the standard rate", () => {
      const result = quote(ELSEWHERE, 4999, LIVE);
      if (result.kind !== "quoted") return assert.fail("expected a quote");
      assert.equal(result.costCents, 599);
      assert.equal(result.isFree, false);
    });

    test("$50.00 exactly is free", () => {
      // Inclusive on purpose, and the copy says "$50 or more" to match. A
      // customer who lands on exactly fifty dollars and is charged $5.99 has
      // been told one thing and billed another.
      const result = quote(ELSEWHERE, 5000, LIVE);
      if (result.kind !== "quoted") return assert.fail("expected a quote");
      assert.equal(result.costCents, 0);
      assert.equal(result.isFree, true);
    });

    test("$50.01 is free", () => {
      const result = quote(ELSEWHERE, 5001, LIVE);
      if (result.kind !== "quoted") return assert.fail("expected a quote");
      assert.equal(result.costCents, 0);
    });
  });

  describe("what the customer is shown", () => {
    test("a waived fee reports what it would have cost", () => {
      // This is what the checkout summary strikes through. Without it, "FREE"
      // is a word where a number should be.
      const result = quote(ELSEWHERE, 6000, LIVE);
      if (result.kind !== "quoted") return assert.fail("expected a quote");
      assert.equal(result.costCents, 0);
      assert.equal(result.standardCostCents, 599);
    });

    test("a paid fee reports the same figure twice, so nothing is struck through", () => {
      const result = quote(ELSEWHERE, 4999, LIVE);
      if (result.kind !== "quoted") return assert.fail("expected a quote");
      assert.equal(result.standardCostCents, result.costCents);
    });

    test("the nudge names the exact shortfall", () => {
      const result = quote(ELSEWHERE, 4250, LIVE);
      if (result.kind !== "quoted") return assert.fail("expected a quote");
      assert.equal(result.centsToFreeDelivery, 750);
    });

    test("there is no nudge once free delivery is reached", () => {
      const result = quote(ELSEWHERE, 5000, LIVE);
      if (result.kind !== "quoted") return assert.fail("expected a quote");
      assert.equal(result.centsToFreeDelivery, null);
    });

    test("there is no nudge in Hunterdon, where it is already free", () => {
      const result = quote(HUNTERDON, 200, LIVE);
      if (result.kind !== "quoted") return assert.fail("expected a quote");
      assert.equal(result.centsToFreeDelivery, null);
      assert.equal(result.costCents, 0);
    });

    test("with the rule off, no nudge outside the county at any size", () => {
      // The state before 2026-09-15. Promising free delivery that cannot be
      // reached is worse than promising nothing.
      const off: Partial<DeliveryConfig> = {
        freeCounty: { alwaysFree: true, thresholdCents: 5000, thresholdInclusive: true },
        freeOver: null,
      };
      for (const subtotal of [100, 4999, 5000, 100000]) {
        const result = quote(ELSEWHERE, subtotal, off);
        if (result.kind !== "quoted") return assert.fail("expected a quote");
        assert.equal(result.centsToFreeDelivery, null);
        assert.equal(result.costCents, 599);
      }
    });
  });

  describe("the county keeps its own promise", () => {
    test("a tiny Hunterdon order is still free", () => {
      // The $50 floor must not become a floor the county has to clear too.
      const result = quote(HUNTERDON, 1, LIVE);
      if (result.kind !== "quoted") return assert.fail("expected a quote");
      assert.equal(result.costCents, 0);
      assert.equal(result.inFreeCounty, true);
    });

    test("$49.99 in Hunterdon is free, $49.99 outside it is not", () => {
      const inside = quote(HUNTERDON, 4999, LIVE);
      const outside = quote(ELSEWHERE, 4999, LIVE);
      if (inside.kind !== "quoted" || outside.kind !== "quoted") {
        return assert.fail("expected quotes");
      }
      assert.equal(inside.costCents, 0);
      assert.equal(outside.costCents, 599);
    });
  });

  describe("an address we cannot deliver to", () => {
    test("a malformed ZIP is refused at every subtotal, free or not", () => {
      // Being over $50 must not buy a way past the address checks.
      for (const subtotal of [4999, 5000, 5001]) {
        const result = quote("123", subtotal, LIVE);
        assert.equal(result.kind, "unavailable");
        if (result.kind !== "unavailable") return;
        assert.equal(result.reason, "invalid_zip");
      }
    });

    test("out of state is refused at every subtotal", () => {
      for (const subtotal of [4999, 5000, 5001]) {
        const result = quote("10001", subtotal, LIVE, "NY");
        assert.equal(result.kind, "unavailable");
        if (result.kind !== "unavailable") return;
        assert.equal(result.reason, "out_of_state");
      }
    });

    test("an excluded area is refused even over the threshold", () => {
      const result = quote(ELSEWHERE, 9999, {
        ...LIVE,
        excludedZips: [ELSEWHERE],
      });
      assert.equal(result.kind, "unavailable");
      if (result.kind !== "unavailable") return;
      assert.equal(result.reason, "excluded_area");
    });
  });
});

// ---------------------------------------------------------------------------
// The promise the site makes, in one place
// ---------------------------------------------------------------------------
// This sentence appears in the footer, the cart, the home page, the shop and
// every product page. It is built from config so it cannot go stale in four of
// those the day a rule changes — and asserted here because it is customer
// facing copy about money, which is the kind of thing that is wrong silently.

describe("the delivery policy summary", () => {
  const LIVE: DeliveryConfig = {
    ...BASE,
    freeCounty: { alwaysFree: true, thresholdCents: 5000, thresholdInclusive: true },
    freeOver: { thresholdCents: 5000, inclusive: true },
  };

  test("names both promises and the fallback rate", () => {
    const summary = deliveryPolicySummary(LIVE);
    assert.match(summary, /Free delivery throughout Hunterdon County/);
    assert.match(summary, /\$50 or more anywhere in New Jersey/);
    assert.match(summary, /\$5\.99 otherwise/);
  });

  test("every figure keeps its dollar sign", () => {
    // Caught a real one: a bad edit to the formatter produced "orders of 50 or
    // more" and "5.99 otherwise", and every other test still passed because
    // none of them looked at the formatted string.
    const summary = deliveryPolicySummary(LIVE);
    const figures = summary.match(/\d+(\.\d{2})?/g) ?? [];
    assert.ok(figures.length >= 2, "expected some figures");
    for (const figure of figures) {
      assert.ok(
        summary.includes("$" + figure),
        `"${figure}" appears without a dollar sign in: ${summary}`,
      );
    }
  });

  test("whole amounts drop their cents, amounts with cents keep them", () => {
    const summary = deliveryPolicySummary(LIVE);
    assert.ok(summary.includes("$50 "), "expected $50, not $50.00");
    assert.ok(!summary.includes("$50.00"));
    assert.ok(summary.includes("$5.99"));
  });

  test("with the statewide rule off, it promises only the county", () => {
    const summary = deliveryPolicySummary({ ...LIVE, freeOver: null });
    assert.match(summary, /Free delivery throughout Hunterdon County\./);
    assert.ok(!summary.includes("anywhere"));
  });

  test("with a county threshold instead of always-free, it says so", () => {
    const summary = deliveryPolicySummary({
      ...LIVE,
      freeCounty: { alwaysFree: false, thresholdCents: 3500, thresholdInclusive: true },
    });
    assert.match(summary, /\$35 or more in Hunterdon County/);
  });
});
