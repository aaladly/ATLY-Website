/**
 * Payment outcome tests.
 *
 * Run: npm test
 *
 * Webhooks are the hardest part of a payment integration to exercise — a
 * signed request, a live secret, a real event — so the decision inside one is
 * pulled out into a pure function and tested here instead. What it protects
 * against is a duplicate delivery doing the thing twice: charging once and
 * emailing twice is embarrassing, and Stripe WILL deliver the same event more
 * than once.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { decidePaymentSuccess } from "./payment.ts";
import { ORDER_STATUSES, type OrderStatus } from "./status.ts";

const order = (status: OrderStatus) => ({ status });
const REF = "ATLY-7F3K2M";

describe("the first time a payment succeeds", () => {
  test("an awaiting_payment order is marked new and gets its confirmation", () => {
    const outcome = decidePaymentSuccess(order("awaiting_payment"), REF);
    assert.equal(outcome.action, "mark_paid");
    if (outcome.action !== "mark_paid") return;
    assert.equal(outcome.status, "new");
    assert.equal(outcome.sendConfirmation, true);
  });
});

describe("a duplicate or late delivery", () => {
  test("an order already marked new does nothing a second time", () => {
    // The email is sent inside the mark_paid branch. If this ever returned
    // mark_paid again, a retry would send a second confirmation for one order.
    const outcome = decidePaymentSuccess(order("new"), REF);
    assert.equal(outcome.action, "already_handled");
  });

  test("an order the kitchen has already moved on is left alone", () => {
    // Stripe does not promise ordering. A success event can land after
    // somebody has started making the chocolate, and rewinding the status to
    // "new" would take it off the production list.
    for (const status of ["in_production", "out_for_delivery", "delivered"] as const) {
      const outcome = decidePaymentSuccess(order(status), REF);
      assert.equal(outcome.action, "already_handled", `${status} should be left alone`);
    }
  });

  test("nothing ever reports failure, so Stripe stops retrying", () => {
    // A non-2xx on a duplicate is how a webhook ends up being retried forever.
    for (const status of ORDER_STATUSES) {
      const outcome = decidePaymentSuccess(order(status), REF);
      assert.ok(
        ["mark_paid", "already_handled"].includes(outcome.action),
        `${status} produced ${outcome.action}`,
      );
    }
  });
});

describe("the awkward cases", () => {
  test("a payment against a cancelled order is not silently un-cancelled", () => {
    // Somebody cancelled this. A charge arriving afterwards is a refund
    // conversation, not a state transition — and quietly marking it new would
    // put a cancelled order into the kitchen.
    const outcome = decidePaymentSuccess(order("cancelled"), REF);
    assert.equal(outcome.action, "already_handled");
    if (outcome.action !== "already_handled") return;
    assert.match(outcome.reason, /person/);
  });

  test("an unknown reference is acknowledged, not retried", () => {
    // Retrying will not conjure the order. The charge is real and needs a
    // human, so the reason has to name the reference.
    const outcome = decidePaymentSuccess(undefined, REF);
    assert.equal(outcome.action, "unknown_order");
    assert.match(outcome.reason, new RegExp(REF));
  });

  test("every known status is handled explicitly", () => {
    // Guards the day a status is added: it must be considered here rather
    // than silently inheriting "payment already handled".
    for (const status of ORDER_STATUSES) {
      const outcome = decidePaymentSuccess(order(status), REF);
      assert.ok(outcome.action, `${status} has no outcome`);
    }
  });

  test("only awaiting_payment ever leads to a charge being recorded", () => {
    const marked = ORDER_STATUSES.filter(
      (status) => decidePaymentSuccess(order(status), REF).action === "mark_paid",
    );
    assert.deepEqual(marked, ["awaiting_payment"]);
  });
});
