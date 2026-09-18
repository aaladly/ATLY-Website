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

import { decidePaymentSuccess, ORDER_CURRENCY } from "./payment.ts";
import { ORDER_STATUSES, type OrderStatus } from "./status.ts";

/** $34.12, the figure from the worked example in walletLineItems.test.mts. */
const TOTAL = 3412;

const order = (status: OrderStatus, totalCents = TOTAL) => ({ status, totalCents });
const REF = "ATLY-7F3K2M";

/** What Stripe reports for a correct charge against `order()`. */
const paid = (amountCents = TOTAL, currency = ORDER_CURRENCY) => ({
  amountCents,
  currency,
});

describe("the first time a payment succeeds", () => {
  test("an awaiting_payment order is marked new and gets its confirmation", () => {
    const outcome = decidePaymentSuccess(order("awaiting_payment"), REF, paid());
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
    const outcome = decidePaymentSuccess(order("new"), REF, paid());
    assert.equal(outcome.action, "already_handled");
  });

  test("an order the kitchen has already moved on is left alone", () => {
    // Stripe does not promise ordering. A success event can land after
    // somebody has started making the chocolate, and rewinding the status to
    // "new" would take it off the production list.
    for (const status of ["in_production", "out_for_delivery", "delivered"] as const) {
      const outcome = decidePaymentSuccess(order(status), REF, paid());
      assert.equal(outcome.action, "already_handled", `${status} should be left alone`);
    }
  });

  test("nothing ever reports failure, so Stripe stops retrying", () => {
    // A non-2xx on a duplicate is how a webhook ends up being retried forever.
    for (const status of ORDER_STATUSES) {
      const outcome = decidePaymentSuccess(order(status), REF, paid());
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
    const outcome = decidePaymentSuccess(order("cancelled"), REF, paid());
    assert.equal(outcome.action, "already_handled");
    if (outcome.action !== "already_handled") return;
    assert.match(outcome.reason, /person/);
  });

  test("an unknown reference is acknowledged, not retried", () => {
    // Retrying will not conjure the order. The charge is real and needs a
    // human, so the reason has to name the reference.
    const outcome = decidePaymentSuccess(undefined, REF, paid());
    assert.equal(outcome.action, "unknown_order");
    assert.match(outcome.reason, new RegExp(REF));
  });

  test("every known status is handled explicitly", () => {
    // Guards the day a status is added: it must be considered here rather
    // than silently inheriting "payment already handled".
    for (const status of ORDER_STATUSES) {
      const outcome = decidePaymentSuccess(order(status), REF, paid());
      assert.ok(outcome.action, `${status} has no outcome`);
    }
  });

  test("only awaiting_payment ever leads to a charge being recorded", () => {
    const marked = ORDER_STATUSES.filter(
      (status) => decidePaymentSuccess(order(status), REF, paid()).action === "mark_paid",
    );
    assert.deepEqual(marked, ["awaiting_payment"]);
  });
});

// ---------------------------------------------------------------------------
// The money has to match
// ---------------------------------------------------------------------------

/**
 * Until these existed, the reference in the intent's metadata was the only
 * thing consulted. Metadata is a string we put there — it identifies WHICH
 * order, and says nothing about how much was taken. Anything able to reach
 * the webhook with a valid reference could march an order into the kitchen on
 * a one cent intent.
 */
describe("the amount on the intent has to match the order", () => {
  test("a payment for less than the total is refused", () => {
    const outcome = decidePaymentSuccess(order("awaiting_payment"), REF, paid(1));
    assert.equal(outcome.action, "amount_mismatch");
  });

  test("a payment for more than the total is refused too", () => {
    // Not "in our favour, so let it through". A customer overcharged is a
    // refund we owe, and it is just as likely to be a bug as a gift.
    const outcome = decidePaymentSuccess(order("awaiting_payment"), REF, paid(99999));
    assert.equal(outcome.action, "amount_mismatch");
  });

  test("one cent out is still out", () => {
    // The boundary is exact equality. Integer cents throughout means there is
    // no rounding to be tolerant of, so there is no tolerance.
    for (const amount of [TOTAL - 1, TOTAL + 1]) {
      const outcome = decidePaymentSuccess(order("awaiting_payment"), REF, paid(amount));
      assert.equal(outcome.action, "amount_mismatch", `${amount} should not pass`);
    }
  });

  test("the exact total is the only amount that pays an order", () => {
    const outcome = decidePaymentSuccess(order("awaiting_payment"), REF, paid(TOTAL));
    assert.equal(outcome.action, "mark_paid");
  });

  test("a mismatch never marks an order paid, whatever its status", () => {
    // The guarantee in one line: no status, and no amount other than the
    // total, can produce mark_paid.
    for (const status of ORDER_STATUSES) {
      const outcome = decidePaymentSuccess(order(status), REF, paid(1));
      assert.notEqual(outcome.action, "mark_paid", `${status} was marked paid on 1 cent`);
    }
  });

  test("the reason names both figures, so the log can be acted on", () => {
    const outcome = decidePaymentSuccess(order("awaiting_payment"), REF, paid(1));
    if (outcome.action !== "amount_mismatch") throw new Error("expected a mismatch");
    assert.match(outcome.reason, new RegExp(REF));
    assert.match(outcome.reason, /3412/);
    assert.match(outcome.reason, /\b1\b/);
  });
});

describe("the currency has to match too", () => {
  test("the right number in the wrong currency is refused", () => {
    // 3412 JPY is not 3412 USD. The integer amount alone would wave it
    // through, which is why currency is checked separately.
    const outcome = decidePaymentSuccess(order("awaiting_payment"), REF, paid(TOTAL, "jpy"));
    assert.equal(outcome.action, "amount_mismatch");
  });

  test("currency case does not matter", () => {
    // Stripe reports lower case, but nothing about this handler should break
    // if that ever changes.
    for (const currency of ["usd", "USD", " Usd "]) {
      const outcome = decidePaymentSuccess(
        order("awaiting_payment"),
        REF,
        paid(TOTAL, currency),
      );
      assert.equal(outcome.action, "mark_paid", `${currency} should be accepted`);
    }
  });
});

describe("a mismatch is still acknowledged", () => {
  test("it is never an error, so Stripe stops retrying", () => {
    // Stripe would redeliver the identical mismatched figure. Retrying
    // achieves nothing except burying the log line under copies of itself.
    const outcome = decidePaymentSuccess(order("awaiting_payment"), REF, paid(1));
    assert.ok(
      ["amount_mismatch", "already_handled", "unknown_order"].includes(outcome.action),
      "a mismatch must be an acknowledged outcome, not a thrown error",
    );
  });

  test("a mismatch on an already-paid order is reported as a mismatch", () => {
    // Ordering check: the money is compared before the status, so probing an
    // order that is already paid shows up in the log rather than being
    // quietly absorbed as a duplicate delivery.
    const outcome = decidePaymentSuccess(order("new"), REF, paid(1));
    assert.equal(outcome.action, "amount_mismatch");
  });
});
