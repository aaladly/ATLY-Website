/**
 * Order row mapping tests.
 *
 * Run: npm test
 *
 * The Supabase store itself needs a network and a project. This does not: the
 * part that can be wrong in an interesting way is the translation, and the
 * interesting wrongness is quiet. A savings figure written to the tax column
 * still saves, still reads back, still renders a number — and the order is
 * wrong by exactly that amount, forever, with no error anywhere.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  toPlaceOrderPayload,
  fromRows,
  ORDER_SELECT,
  type OrderRow,
  type OrderItemRow,
} from "./rows.ts";
import type { StoredOrder } from "./store.ts";

const order: StoredOrder = {
  reference: "ATLY-7F3K2M",
  status: "new",
  contact: { email: "sam@example.com", name: "Sam Rivera", phone: "555 0100" },
  address: {
    line1: "12 Mill Lane",
    line2: "Apt 3",
    city: "Flemington",
    state: "NJ",
    zip: "08822",
  },
  lines: [
    {
      variantId: "bon-bons/salted-caramel",
      productName: "Bon-bons",
      variantName: "Salted Caramel",
      kind: "bonbon",
      quantity: 6,
      lineTotalCents: 1100,
    },
    {
      variantId: "bars/hazelnut",
      productName: "Bars",
      variantName: "Hazelnut",
      kind: "bar",
      quantity: 2,
      lineTotalCents: 1300,
    },
  ],
  appliedBundles: [{ kind: "bonbon", label: "6 pieces", count: 1 }],
  // Deliberately all different, so a swapped pair cannot pass.
  subtotalCents: 2400,
  savingsCents: 100,
  deliveryCents: 599,
  taxCents: 199,
  totalCents: 3198,
  inFreeCounty: false,
  giftNote: "Happy birthday",
  acceptedTermsVersion: "2026-09-14",
  placedAt: "2026-09-15T10:00:00.000Z",
  statusChangedAt: null,
};

/** What Postgres would hand back for the payload above. */
function asRow(o: StoredOrder): { row: OrderRow; items: OrderItemRow[] } {
  const p = toPlaceOrderPayload(o);
  return {
    row: {
      reference: p.reference,
      status: p.status,
      subtotal_cents: p.subtotal_cents,
      savings_cents: p.savings_cents,
      delivery_cents: p.delivery_cents,
      tax_cents: p.tax_cents,
      total_cents: p.total_cents,
      delivery_name: p.address.name,
      delivery_line1: p.address.line1,
      delivery_line2: p.address.line2,
      delivery_city: p.address.city,
      delivery_state: p.address.state,
      delivery_zip: p.address.zip,
      is_hunterdon: p.is_hunterdon,
      gift_note: p.gift_note,
      accepted_terms_version: p.accepted_terms_version,
      applied_bundles: p.applied_bundles,
      placed_at: p.placed_at,
      status_changed_at: null,
      customers: {
        email: p.contact.email,
        name: p.contact.name,
        phone: p.contact.phone,
      },
    },
    items: p.lines.map((l) => ({
      variant_ref: l.variant_ref,
      product_name: l.product_name,
      variant_name: l.variant_name,
      product_kind: l.product_kind,
      quantity: l.quantity,
      line_total_cents: l.line_total_cents,
    })),
  };
}

describe("writing an order", () => {
  test("every money field lands in its own column", () => {
    const p = toPlaceOrderPayload(order);
    assert.equal(p.subtotal_cents, 2400);
    assert.equal(p.savings_cents, 100);
    assert.equal(p.delivery_cents, 599);
    assert.equal(p.tax_cents, 199);
    assert.equal(p.total_cents, 3198);
  });

  test("the line carries the catalog id the cart uses", () => {
    // Not a uuid. If this ever becomes one, a stored cart and a placed order
    // stop referring to the same thing.
    const p = toPlaceOrderPayload(order);
    assert.equal(p.lines[0].variant_ref, "bon-bons/salted-caramel");
    assert.equal(p.lines[1].variant_ref, "bars/hazelnut");
  });

  test("the terms version is carried, not dropped", () => {
    // It is the answer to "what did they agree to" long after the terms move
    // on, which is exactly when somebody asks.
    assert.equal(toPlaceOrderPayload(order).accepted_terms_version, "2026-09-14");
  });

  test("the delivery name is the customer's name", () => {
    assert.equal(toPlaceOrderPayload(order).address.name, "Sam Rivera");
  });
});

describe("reading an order back", () => {
  test("a round trip through the database shape changes nothing", () => {
    const { row, items } = asRow(order);
    assert.deepEqual(fromRows(row, items), order);
  });

  test("a round trip survives a free-county order", () => {
    const free: StoredOrder = { ...order, inFreeCounty: true, deliveryCents: 0 };
    const { row, items } = asRow(free);
    assert.deepEqual(fromRows(row, items), free);
  });

  test("nulls become empty strings, never the word null", () => {
    // Every one of these is nullable in Postgres and non-optional in
    // TypeScript. "null" rendered into an address label reaches a customer.
    const { row, items } = asRow(order);
    const sparse: OrderRow = {
      ...row,
      delivery_line2: null,
      gift_note: null,
      accepted_terms_version: null,
      customers: { email: null, name: null, phone: null },
      delivery_name: null,
    };
    const read = fromRows(sparse, items);
    assert.equal(read.address.line2, "");
    assert.equal(read.giftNote, "");
    assert.equal(read.acceptedTermsVersion, "");
    assert.equal(read.contact.email, "");
    assert.equal(read.contact.name, "");
  });

  test("the delivery name stands in when there is no customer row", () => {
    const { row, items } = asRow(order);
    const orphan: OrderRow = { ...row, customers: null };
    assert.equal(fromRows(orphan, items).contact.name, "Sam Rivera");
  });

  test("a malformed applied_bundles reads as none, not a crash", () => {
    // jsonb comes back as unknown. A hand edit in the table editor should not
    // take down the order page.
    const { row, items } = asRow(order);
    for (const junk of [null, "nope", 42, { not: "an array" }]) {
      const read = fromRows({ ...row, applied_bundles: junk }, items);
      assert.deepEqual(read.appliedBundles, []);
    }
  });

  test("is_hunterdon null is false, not undefined", () => {
    const { row, items } = asRow(order);
    assert.equal(fromRows({ ...row, is_hunterdon: null }, items).inFreeCounty, false);
  });

  test("an order with no items reads as empty rather than throwing", () => {
    // It should never happen — place_order() is one transaction. But the admin
    // list rendering a blank order beats the admin list not rendering.
    const { row } = asRow(order);
    assert.deepEqual(fromRows(row, []).lines, []);
  });
});

describe("the select list", () => {
  test("asks for every column fromRows reads", () => {
    const needed = [
      "reference", "status", "subtotal_cents", "savings_cents",
      "delivery_cents", "tax_cents", "total_cents", "delivery_line1",
      "delivery_line2", "delivery_city", "delivery_state", "delivery_zip",
      "is_hunterdon", "gift_note", "accepted_terms_version", "applied_bundles",
      "placed_at", "status_changed_at", "variant_ref",
    ];
    for (const column of needed) {
      assert.ok(ORDER_SELECT.includes(column), `select is missing ${column}`);
    }
  });

  test("joins the customer and the items", () => {
    // Without these the contact is blank and the order has no lines — and
    // neither failure raises an error, which is why it is asserted here.
    assert.ok(ORDER_SELECT.includes("customers"));
    assert.ok(ORDER_SELECT.includes("order_items"));
  });
});
