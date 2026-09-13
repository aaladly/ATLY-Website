import test from "node:test";
import assert from "node:assert/strict";

import {
  applyDeliveryOverrides,
  applyProductOverrides,
  applyTierOverrides,
  centsToDollarInput,
  defaultTierLabel,
  parseDollarsToCents,
  parseOunces,
  unweighedVariantNames,
  validateTierDrafts,
  validateWeightTierDrafts,
  validateZipList,
} from "./apply.ts";
import { EMPTY_OVERRIDES, type SettingsOverrides } from "./types.ts";
import { PRODUCTS } from "../catalog.ts";
import { TIERS_BY_KIND, priceQuantity } from "../pricing.ts";
import { DELIVERY_CONFIG } from "../../config/delivery.ts";

const overrides = (patch: Partial<SettingsOverrides>): SettingsOverrides => ({
  ...EMPTY_OVERRIDES,
  ...patch,
});

// ---------------------------------------------------------------------------
// Money parsing
// ---------------------------------------------------------------------------

test("parseDollarsToCents reads the forms a person actually types", () => {
  assert.equal(parseDollarsToCents("15"), 1500);
  assert.equal(parseDollarsToCents("15.00"), 1500);
  assert.equal(parseDollarsToCents("5.99"), 599);
  assert.equal(parseDollarsToCents("$5.99"), 599);
  assert.equal(parseDollarsToCents("  5.5  "), 550);
  assert.equal(parseDollarsToCents("1,200"), 120000);
  assert.equal(parseDollarsToCents("0"), 0);
});

test("parseDollarsToCents refuses anything that is not a price", () => {
  for (const bad of ["", "free", "5.999", "-5", "1.2.3", "5,", "1,2,3", "$", "1,20"]) {
    assert.equal(parseDollarsToCents(bad), null, `expected null for ${bad}`);
  }
});

test("money survives a round trip through the form", () => {
  for (const cents of [0, 1, 99, 200, 599, 1500, 120000]) {
    assert.equal(parseDollarsToCents(centsToDollarInput(cents)), cents);
  }
});

test("parseDollarsToCents never goes through a float", () => {
  // 0.29 * 100 is 28.999999999999996 in binary floating point. A parser that
  // multiplied would lose the cent; this one must not.
  assert.equal(parseDollarsToCents("0.29"), 29);
  assert.equal(parseDollarsToCents("1.07"), 107);
  assert.equal(parseDollarsToCents("8.13"), 813);
});

test("defaultTierLabel writes what the owner would have written", () => {
  assert.equal(defaultTierLabel(1, 200), "$2 each");
  assert.equal(defaultTierLabel(3, 500), "3 for $5");
  assert.equal(defaultTierLabel(2, 1050), "2 for $10.50");
});

// ---------------------------------------------------------------------------
// Weights
// ---------------------------------------------------------------------------

test("parseOunces treats blank as not weighed, not as zero", () => {
  assert.deepEqual(parseOunces(""), { ok: true, value: null });
  assert.deepEqual(parseOunces("   "), { ok: true, value: null });
});

test("parseOunces rounds to a kitchen scale's resolution", () => {
  assert.deepEqual(parseOunces("4"), { ok: true, value: 4 });
  assert.deepEqual(parseOunces("4.25"), { ok: true, value: 4.25 });
  assert.deepEqual(parseOunces("4.256"), { ok: true, value: 4.26 });
});

test("parseOunces refuses zero, negatives and slipped decimal points", () => {
  for (const bad of ["0", "-2", "heavy", "5000"]) {
    assert.equal(parseOunces(bad).ok, false, `expected refusal for ${bad}`);
  }
});

// ---------------------------------------------------------------------------
// Tier validation — the part that can take the site down
// ---------------------------------------------------------------------------

test("a valid tier table is accepted and sorted", () => {
  const result = validateTierDrafts(
    [
      { size: "10", price: "15", label: "" },
      { size: "1", price: "2", label: "$2 each" },
      { size: "3", price: "5", label: "3 for $5" },
    ],
    "bonbon",
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(
    result.tiers.map((t) => t.size),
    [1, 3, 10],
  );
  // The blank label was written for us.
  assert.equal(result.tiers[2].label, "10 for $15");
});

test("a tier table with no single-unit price is REFUSED", () => {
  // This is the one that matters: priceQuantity() throws without a size-1
  // tier, which would take down every page that prices this kind.
  const result = validateTierDrafts(
    [
      { size: "3", price: "5", label: "" },
      { size: "10", price: "15", label: "" },
    ],
    "bonbon",
  );

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.match(result.issues[0].message, /single one/i);
});

test("anything validateTierDrafts accepts, priceQuantity can price", () => {
  const result = validateTierDrafts(
    [
      { size: "1", price: "2", label: "" },
      { size: "4", price: "7", label: "" },
      { size: "9", price: "14", label: "" },
    ],
    "bonbon",
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;

  // The contract between the two modules: the validator's job is to make sure
  // the engine never throws on what the owner saved.
  for (let quantity = 0; quantity <= 40; quantity++) {
    assert.doesNotThrow(() => priceQuantity(quantity, result.tiers));
  }
});

test("blank rows are ignored, half-filled rows are not", () => {
  const withBlank = validateTierDrafts(
    [
      { size: "1", price: "2", label: "" },
      { size: "", price: "", label: "" },
    ],
    "bar",
  );
  assert.equal(withBlank.ok, true);
  if (withBlank.ok) assert.equal(withBlank.tiers.length, 1);

  const halfFilled = validateTierDrafts(
    [
      { size: "1", price: "2", label: "" },
      { size: "3", price: "", label: "" },
    ],
    "bar",
  );
  assert.equal(halfFilled.ok, false);
});

test("duplicate sizes are refused", () => {
  const result = validateTierDrafts(
    [
      { size: "1", price: "2", label: "" },
      { size: "3", price: "5", label: "" },
      { size: "3", price: "6", label: "" },
    ],
    "bonbon",
  );
  assert.equal(result.ok, false);
});

test("a bundle that saves nothing is refused rather than quietly ignored", () => {
  // 3 for $6 at $2 each is exactly the same money, so the engine would never
  // pick it and it would sit in the form looking like an offer.
  const result = validateTierDrafts(
    [
      { size: "1", price: "2", label: "" },
      { size: "3", price: "6", label: "" },
    ],
    "bonbon",
  );
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.match(result.issues[0].message, /ever be charged/i);
});

test("a fractional or zero quantity is refused", () => {
  for (const size of ["0", "-1", "2.5", "many"]) {
    const result = validateTierDrafts([{ size, price: "5", label: "" }], "bar");
    assert.equal(result.ok, false, `expected refusal for size ${size}`);
  }
});

// ---------------------------------------------------------------------------
// ZIP lists
// ---------------------------------------------------------------------------

test("a ZIP list can be pasted in whatever shape it arrives", () => {
  const result = validateZipList("08822, 08801\n08809  08822", "freeZips");
  assert.equal(result.ok, true);
  if (!result.ok) return;
  // Deduplicated and sorted, so the saved list is stable.
  assert.deepEqual(result.zips, ["08801", "08809", "08822"]);
});

test("an empty ZIP list is allowed", () => {
  const result = validateZipList("   ", "freeZips");
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.zips, []);
});

test("a ZIP that is not five digits is refused, and named", () => {
  const result = validateZipList("08822 0882 abcde", "freeZips");
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.match(result.issues[0].message, /0882/);
});

// ---------------------------------------------------------------------------
// Weight tiers — the guard Step 6 asked for
// ---------------------------------------------------------------------------

test("weight tiers are refused while anything is unweighed", () => {
  const result = validateWeightTierDrafts(
    [{ maxOunces: "48", price: "5.99" }],
    ["Bon-bons — Salted Caramel"],
  );
  assert.equal(result.ok, false);
  if (result.ok) return;
  // Names the thing to fix rather than saying "invalid".
  assert.match(result.issues[0].message, /Salted Caramel/);
});

test("an empty weight-tier table is fine even with unweighed items", () => {
  // This is today's state: no tiers, so nothing needs a weight.
  const result = validateWeightTierDrafts(
    [{ maxOunces: "", price: "" }],
    ["Bon-bons — Salted Caramel"],
  );
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.tiers, []);
});

test("weight tiers are accepted and sorted once everything is weighed", () => {
  const result = validateWeightTierDrafts(
    [
      { maxOunces: "96", price: "9.99" },
      { maxOunces: "48", price: "5.99" },
    ],
    [],
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.tiers, [
    { maxOunces: 48, priceCents: 599 },
    { maxOunces: 96, priceCents: 999 },
  ]);
});

// ---------------------------------------------------------------------------
// Merging
// ---------------------------------------------------------------------------

test("no overrides means the site runs on exactly what is in the code", () => {
  assert.deepEqual(applyProductOverrides(PRODUCTS, EMPTY_OVERRIDES), PRODUCTS);
  assert.deepEqual(applyTierOverrides(TIERS_BY_KIND, EMPTY_OVERRIDES), TIERS_BY_KIND);
  assert.deepEqual(
    applyDeliveryOverrides(DELIVERY_CONFIG, EMPTY_OVERRIDES),
    DELIVERY_CONFIG,
  );
});

test("marking one flavor sold out leaves everything else alone", () => {
  const result = applyProductOverrides(
    PRODUCTS,
    overrides({
      products: {
        "bon-bons": { variants: { "salted-caramel": { isAvailable: false } } },
      },
    }),
  );

  const bonbons = result.find((p) => p.slug === "bon-bons")!;
  assert.equal(bonbons.isAvailable, true);
  assert.equal(bonbons.variants.find((v) => v.slug === "salted-caramel")!.isAvailable, false);
  assert.equal(bonbons.variants.find((v) => v.slug === "peanut-butter")!.isAvailable, true);
  assert.deepEqual(result.find((p) => p.slug === "bars"), PRODUCTS.find((p) => p.slug === "bars"));
});

test("a weight can be set and can be cleared back to unweighed", () => {
  const weighed = applyProductOverrides(
    PRODUCTS,
    overrides({
      products: { bars: { variants: { plain: { packagedWeightOz: 1.5 } } } },
    }),
  );
  assert.equal(
    weighed.find((p) => p.slug === "bars")!.variants.find((v) => v.slug === "plain")!
      .packagedWeightOz,
    1.5,
  );

  // null is a real value meaning "not weighed", so ?? must not swallow it.
  const cleared = applyProductOverrides(
    weighed,
    overrides({
      products: { bars: { variants: { plain: { packagedWeightOz: null } } } },
    }),
  );
  assert.equal(
    cleared.find((p) => p.slug === "bars")!.variants.find((v) => v.slug === "plain")!
      .packagedWeightOz,
    null,
  );
});

test("overriding one kind's prices leaves the other kind's alone", () => {
  const result = applyTierOverrides(
    TIERS_BY_KIND,
    overrides({ tiers: { bar: [{ size: 1, priceCents: 800, label: "$8 each" }] } }),
  );
  assert.deepEqual(result.bar, [{ size: 1, priceCents: 800, label: "$8 each" }]);
  assert.deepEqual(result.bonbon, TIERS_BY_KIND.bonbon);
});

test("a partial delivery override keeps the rest of the config", () => {
  const result = applyDeliveryOverrides(
    DELIVERY_CONFIG,
    overrides({ delivery: { standardCents: 699 } }),
  );
  assert.equal(result.standardCents, 699);
  assert.equal(result.allowedState, DELIVERY_CONFIG.allowedState);
  assert.deepEqual(result.freeCountyZips, DELIVERY_CONFIG.freeCountyZips);
  assert.equal(result.freeCounty.alwaysFree, DELIVERY_CONFIG.freeCounty.alwaysFree);
});

test("unweighedVariantNames names everything with no packaged weight", () => {
  // Every SKU is unweighed today, which is exactly why weight tiers are off.
  const names = unweighedVariantNames(PRODUCTS);
  assert.equal(names.length, 5);
  assert.ok(names.every((name) => name.includes(" — ")));

  const oneWeighed = applyProductOverrides(
    PRODUCTS,
    overrides({
      products: { bars: { variants: { plain: { packagedWeightOz: 1.5 } } } },
    }),
  );
  assert.equal(unweighedVariantNames(oneWeighed).length, 4);
});
