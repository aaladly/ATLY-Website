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
