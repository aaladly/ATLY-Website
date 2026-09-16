import type { OrderStatus } from "./status.ts";

/**
 * What marking an order paid should do, decided without touching a store.
 *
 * Pure on purpose. Webhook handlers are the hardest thing in a payment
 * integration to test — they need a signed request, a live secret and a real
 * event — so the part that can actually be wrong is pulled out here where a
 * test can reach it.
 *
 * IDEMPOTENCY IS THE WHOLE POINT --------------------------------------------
 * Stripe retries a webhook until it gets a 2xx, and it can deliver the same
 * event more than once even after one. It also does not promise order: a
 * payment_intent.succeeded can arrive after somebody in the admin has already
 * moved the order on to in_production.
 *
 * So this never asks "is it new?" and sets a status. It asks what a second
 * delivery of the same event should do, and the answer is almost always
 * nothing — while still returning success, because a webhook that returns an
 * error on a duplicate is a webhook Stripe will keep retrying forever.
 * ---------------------------------------------------------------------------
 */

export type PaymentOutcome =
  /** Move the order on, and send the confirmation. */
  | { action: "mark_paid"; status: OrderStatus; sendConfirmation: true }
  /** Already handled, or moved past this point by hand. Acknowledge, do nothing. */
  | { action: "already_handled"; reason: string }
  /** No such order. Acknowledge — retrying will not conjure one. */
  | { action: "unknown_order"; reason: string };

/**
 * Statuses that mean the order has already moved past payment.
 *
 * Reaching any of these, a late or duplicate success event has nothing to add.
 * Deliberately a list rather than "anything except awaiting_payment": a new
 * status added later should have to be considered, not silently inherit the
 * meaning "payment already handled".
 */
const PAST_PAYMENT: readonly OrderStatus[] = [
  "new",
  "in_production",
  "out_for_delivery",
  "delivered",
];

export function decidePaymentSuccess(
  order: { status: OrderStatus } | undefined,
  reference: string,
): PaymentOutcome {
  if (!order) {
    return {
      action: "unknown_order",
      reason: `No order ${reference}. Acknowledged so Stripe stops retrying; the charge needs looking at by hand.`,
    };
  }

  if (order.status === "awaiting_payment") {
    // The one transition this event is for.
    return { action: "mark_paid", status: "new", sendConfirmation: true };
  }

  if (PAST_PAYMENT.includes(order.status)) {
    return {
      action: "already_handled",
      reason: `Order ${reference} is already ${order.status}.`,
    };
  }

  /*
    Cancelled, and now a payment has succeeded against it. Not a status this
    should quietly overwrite — somebody cancelled the order, and a charge
    arriving afterwards is a refund conversation, not a state machine
    transition. Acknowledged so Stripe stops retrying, and left alone.
  */
  return {
    action: "already_handled",
    reason: `Order ${reference} is ${order.status}; a successful payment against it needs a person, not a status change.`,
  };
}
