/**
 * Checkout validation tests.
 *
 * The point of this module is that the browser is not trusted, so most of
 * these tests are adversarial: they send the sort of request a tampered client
 * would send and assert that the server recomputes rather than believes.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { validateCheckout, type CheckoutDeps, type CheckoutRequest, type VariantRecord } from "./checkout.ts";
import { calculateTax, NJ_TAX } from "./tax.ts";
import { makeOrderReference, isValidReference, normalizeReference, REFERENCE_ALPHABET } from "./orderReference.ts";
import type { DeliveryConfig } from "../config/delivery.ts";

const VARIANTS: Record<string, VariantRecord> = {
  "bon-bons/salted-caramel": {
    variantId: "bon-bons/salted-caramel",
    productName: "Bon-bons",
    variantName: "Salted Caramel",
    kind: "bonbon",
    packagedWeightOz: null,
    isAvailable: true,
  },
  "bon-bons/peanut-butter": {
    variantId: "bon-bons/peanut-butter",
    productName: "Bon-bons",
    variantName: "Peanut Butter",
    kind: "bonbon",
    packagedWeightOz: null,
    isAvailable: true,
  },
  "bars/plain": {
    variantId: "bars/plain",
    productName: "Bars",
    variantName: "Plain",
    kind: "bar",
    packagedWeightOz: null,
    isAvailable: true,
  },
  "bars/sold-out": {
    variantId: "bars/sold-out",
    productName: "Bars",
    variantName: "Sold Out Bar",
    kind: "bar",
    packagedWeightOz: null,
    isAvailable: false,
  },
};

const DELIVERY: DeliveryConfig = {
  allowedState: "NJ",
  allowedStateName: "New Jersey",
  standardCents: 599,
  freeCounty: { alwaysFree: true, thresholdCents: 5000, thresholdInclusive: true },
  freeCountyName: "Hunterdon County",
  freeCountyZips: ["08822"],
  freeCountyZipsVerified: true,
  weightTiers: [],
  excludedZips: [],
};

const DEPS: CheckoutDeps = {
  lookupVariant: (id) => VARIANTS[id],
  deliveryConfig: DELIVERY,
  taxConfig: NJ_TAX,
  makeReference: () => "ATLY-TEST01",
  maxLineQuantity: 99,
};

const request = (overrides: Partial<CheckoutRequest> = {}): CheckoutRequest => ({
  contact: { name: "Jane Doe", email: "jane@example.com", phone: "609-555-0100" },
  address: { line1: "12 Main St", line2: "", city: "Hoboken", state: "NJ", zip: "07030" },
  items: [{ variantId: "bars/plain", quantity: 2 }],
  giftNote: "",
  ...overrides,
});

const issueFields = (result: ReturnType<typeof validateCheckout>): string[] =>
  result.ok ? [] : result.issues.map((i) => i.field);

describe("contact and address validation", () => {
  test("accepts a complete, valid request", () => {
    const result = validateCheckout(request(), DEPS);
    assert.equal(result.ok, true);
  });

  test("requires name, email and phone", () => {
    const result = validateCheckout(
      request({ contact: { name: "", email: "", phone: "" } }),
      DEPS,
    );
    assert.deepEqual(issueFields(result).sort(), [
      "contact.email",
      "contact.name",
      "contact.phone",
    ]);
  });

  test("rejects a malformed email but accepts unusual real ones", () => {
    assert.ok(!validateCheckout(request({ contact: { name: "A", email: "nope", phone: "1" } }), DEPS).ok);
    assert.ok(
      validateCheckout(
        request({ contact: { name: "A", email: "first+tag@sub.example.co.uk", phone: "1" } }),
        DEPS,
      ).ok,
    );
  });

  test("trims and lowercases the email", () => {
    const result = validateCheckout(
      request({ contact: { name: "A", email: "  JANE@Example.COM ", phone: "1" } }),
      DEPS,
    );
    assert.ok(result.ok);
    if (!result.ok) return;
    assert.equal(result.order.contact.email, "jane@example.com");
  });

  test("requires a street address and a town", () => {
    const result = validateCheckout(
      request({ address: { line1: "", line2: "", city: "", state: "NJ", zip: "07030" } }),
      DEPS,
    );
    assert.deepEqual(issueFields(result).sort(), ["address.city", "address.line1"]);
  });

  test("truncates an over-long gift note rather than rejecting the order", () => {
    const result = validateCheckout(request({ giftNote: "x".repeat(900) }), DEPS);
    assert.ok(result.ok);
    if (!result.ok) return;
    assert.equal(result.order.giftNote.length, 500);
  });
});

describe("the state gate, server side", () => {
  test("refuses an out-of-state address even though the browser allowed it", () => {
    const result = validateCheckout(
      request({
        address: { line1: "1 Broadway", line2: "", city: "New York", state: "NY", zip: "10001" },
      }),
      DEPS,
    );
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.issues[0].field, "address.state");
    assert.match(result.issues[0].message, /New Jersey only/);
  });

  test("refuses a malformed ZIP", () => {
    const result = validateCheckout(
      request({
        address: { line1: "12 Main St", line2: "", city: "Hoboken", state: "NJ", zip: "7030" },
      }),
      DEPS,
    );
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.issues[0].field, "address.zip");
  });

  test("a lowercase state code still passes", () => {
    assert.ok(
      validateCheckout(
        request({ address: { line1: "12 Main St", line2: "", city: "Hoboken", state: "nj", zip: "07030" } }),
        DEPS,
      ).ok,
    );
  });
});

describe("the cart is rebuilt, never believed", () => {
  test("an unknown variant is refused", () => {
    const result = validateCheckout(
      request({ items: [{ variantId: "bars/does-not-exist", quantity: 1 }] }),
      DEPS,
    );
    assert.equal(result.ok, false);
    assert.deepEqual(issueFields(result), ["items"]);
  });

  test("a sold-out variant is refused by name", () => {
    const result = validateCheckout(
      request({ items: [{ variantId: "bars/sold-out", quantity: 1 }] }),
      DEPS,
    );
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.issues[0].message, /Sold Out Bar has sold out/);
  });

  test("an empty cart is refused", () => {
    assert.equal(validateCheckout(request({ items: [] }), DEPS).ok, false);
  });

  test("a quantity beyond the cap is refused, not silently clamped", () => {
    const result = validateCheckout(
      request({ items: [{ variantId: "bars/plain", quantity: 5000 }] }),
      DEPS,
    );
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.issues[0].message, /only take 99/);
  });

  test("zero and negative quantities are refused", () => {
    for (const quantity of [0, -3]) {
      assert.equal(
        validateCheckout(request({ items: [{ variantId: "bars/plain", quantity }] }), DEPS).ok,
        false,
        `quantity ${quantity}`,
      );
    }
  });

  test("duplicate lines for one variant are merged before pricing", () => {
    // Two lines of one bar must price as a $10 pair, not two $7 singles.
    const result = validateCheckout(
      request({
        items: [
          { variantId: "bars/plain", quantity: 1 },
          { variantId: "bars/plain", quantity: 1 },
        ],
      }),
      DEPS,
    );
    assert.ok(result.ok);
    if (!result.ok) return;
    assert.equal(result.order.subtotalCents, 1000);
    assert.equal(result.order.lines.length, 1);
    assert.equal(result.order.lines[0].quantity, 2);
  });

  test("prices come from the engine, not from anything the client sent", () => {
    // A tampered client sending its own totals has nowhere to put them: the
    // request type carries no prices at all. This asserts the recomputation.
    const result = validateCheckout(
      request({ items: [{ variantId: "bon-bons/salted-caramel", quantity: 10 }] }),
      DEPS,
    );
    assert.ok(result.ok);
    if (!result.ok) return;
    assert.equal(result.order.subtotalCents, 1500); // 10 for $15, not 10 x $2
    assert.equal(result.order.savingsCents, 500);
  });

  test("line totals sum exactly to the subtotal", () => {
    const result = validateCheckout(
      request({
        items: [
          { variantId: "bon-bons/salted-caramel", quantity: 7 },
          { variantId: "bon-bons/peanut-butter", quantity: 6 },
          { variantId: "bars/plain", quantity: 3 },
        ],
      }),
      DEPS,
    );
    assert.ok(result.ok);
    if (!result.ok) return;
    const summed = result.order.lines.reduce((s, l) => s + l.lineTotalCents, 0);
    assert.equal(summed, result.order.subtotalCents);
  });
});

describe("totals", () => {
  test("Hunterdon: free delivery, tax on goods only", () => {
    const result = validateCheckout(
      request({
        address: { line1: "1 Church St", line2: "", city: "Flemington", state: "NJ", zip: "08822" },
        items: [{ variantId: "bars/plain", quantity: 2 }],
      }),
      DEPS,
    );
    assert.ok(result.ok);
    if (!result.ok) return;
    const o = result.order;
    assert.equal(o.subtotalCents, 1000);
    assert.equal(o.deliveryCents, 0);
    assert.equal(o.inFreeCounty, true);
    // 6.625% of $10.00 = 66.25c -> 66c
    assert.equal(o.taxCents, 66);
    assert.equal(o.totalCents, 1066);
  });

  test("elsewhere in NJ: delivery charged and taxed alongside the goods", () => {
    const result = validateCheckout(request(), DEPS); // 2 bars to Hoboken
    assert.ok(result.ok);
    if (!result.ok) return;
    const o = result.order;
    assert.equal(o.subtotalCents, 1000);
    assert.equal(o.deliveryCents, 599);
    // 6.625% of $15.99 = 105.93c -> 106c
    assert.equal(o.taxCents, 106);
    assert.equal(o.totalCents, 1000 + 599 + 106);
  });

  test("the total is always subtotal + delivery + tax", () => {
    for (const zip of ["08822", "07030"]) {
      for (const quantity of [1, 3, 9, 10, 13]) {
        const result = validateCheckout(
          request({
            address: { line1: "1 St", line2: "", city: "T", state: "NJ", zip },
            items: [{ variantId: "bon-bons/salted-caramel", quantity }],
          }),
          DEPS,
        );
        assert.ok(result.ok);
        if (!result.ok) return;
        const o = result.order;
        assert.equal(
          o.totalCents,
          o.subtotalCents + o.deliveryCents + o.taxCents,
          `${zip} x${quantity}`,
        );
      }
    }
  });

  test("records which bundles were applied, for the packing slip", () => {
    const result = validateCheckout(
      request({ items: [{ variantId: "bon-bons/salted-caramel", quantity: 10 }] }),
      DEPS,
    );
    assert.ok(result.ok);
    if (!result.ok) return;
    assert.deepEqual(result.order.appliedBundles, [
      { kind: "bonbon", label: "10 for $15", count: 1 },
    ]);
  });
});

describe("sales tax", () => {
  test("applies the New Jersey rate", () => {
    assert.equal(calculateTax({ taxableGoodsCents: 10000, deliveryCents: 0 }, NJ_TAX).taxCents, 663);
    assert.equal(calculateTax({ taxableGoodsCents: 1000, deliveryCents: 0 }, NJ_TAX).taxCents, 66);
  });

  test("includes delivery in the taxable base when configured to", () => {
    const taxed = calculateTax({ taxableGoodsCents: 1000, deliveryCents: 599 }, NJ_TAX);
    assert.equal(taxed.taxableBaseCents, 1599);

    const untaxed = calculateTax(
      { taxableGoodsCents: 1000, deliveryCents: 599 },
      { ...NJ_TAX, taxDelivery: false },
    );
    assert.equal(untaxed.taxableBaseCents, 1000);
  });

  test("a zero order is zero tax", () => {
    assert.equal(calculateTax({ taxableGoodsCents: 0, deliveryCents: 0 }, NJ_TAX).taxCents, 0);
  });

  test("rejects non-integer money", () => {
    assert.throws(() => calculateTax({ taxableGoodsCents: 10.5, deliveryCents: 0 }, NJ_TAX), RangeError);
    assert.throws(() => calculateTax({ taxableGoodsCents: -1, deliveryCents: 0 }, NJ_TAX), RangeError);
  });
});

describe("order references", () => {
  test("has the expected shape", () => {
    const reference = makeOrderReference(() => 0);
    assert.equal(reference, "ATLY-333333");
    assert.ok(isValidReference(reference));
  });

  test("excludes characters that are confusable when read aloud", () => {
    for (const confusable of ["0", "O", "1", "I", "L", "2", "Z", "5", "S", "8", "B"]) {
      assert.ok(
        !REFERENCE_ALPHABET.includes(confusable),
        `${confusable} should not be in the alphabet`,
      );
    }
  });

  test("generates varied references", () => {
    const seen = new Set(Array.from({ length: 200 }, () => makeOrderReference()));
    assert.ok(seen.size > 190, `expected variety, got ${seen.size} distinct of 200`);
  });

  test("normalises what a customer might type back", () => {
    assert.equal(normalizeReference("atly-7q4k3j"), "ATLY-7Q4K3J");
    assert.equal(normalizeReference("  7Q4K3J "), "ATLY-7Q4K3J");
    assert.equal(normalizeReference("ATLY 7Q4K3J"), "ATLY-7Q4K3J");
    assert.equal(normalizeReference("nonsense"), null);
    // Contains an excluded character, so it is not one of ours.
    assert.equal(normalizeReference("ATLY-0OIL15"), null);
  });
});
