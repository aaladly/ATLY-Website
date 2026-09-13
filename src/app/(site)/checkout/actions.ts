"use server";

import { validateCheckout, type CheckoutRequest, type ValidationIssue } from "@/lib/checkout";
import { makeOrderReference } from "@/lib/orderReference";
import { checkoutDeps } from "@/lib/checkoutDeps";
import { orderStore } from "@/lib/orders/store";
import { isPaymentConfigured } from "@/lib/payments";

export type PlaceOrderResult =
  | { ok: true; reference: string }
  | { ok: false; issues: ValidationIssue[] };

/**
 * Place an order.
 *
 * Everything the browser sent is re-validated and every figure recomputed. The
 * browser's job was to collect input; it is not a source of truth about price,
 * delivery, tax, or whether we deliver to an address at all.
 */
export async function placeOrder(request: CheckoutRequest): Promise<PlaceOrderResult> {
  const result = validateCheckout(request, await checkoutDeps(() => makeOrderReference()));

  if (!result.ok) return result;

  /**
   * The payment gate.
   *
   * With no Stripe key configured this refuses rather than recording an order
   * nobody has paid for. An unpaid order reaching the kitchen is far worse than
   * a checkout that politely declines, and it would be much too easy to deploy
   * this file with the charge step still missing and not notice.
   */
  if (!isPaymentConfigured()) {
    return {
      ok: false,
      issues: [
        {
          field: "payment",
          message:
            "Online payment is not switched on yet, so we cannot take this order. Everything else about it checked out — please message us and we will arrange it by hand.",
        },
      ],
    };
  }

  // TODO (blocked on credentials): create and confirm a Stripe PaymentIntent
  // for result.order.totalCents here, and only persist with status "new" once
  // it succeeds. Until then an order can only ever be awaiting_payment.
  await orderStore.save({
    ...result.order,
    status: "awaiting_payment",
    placedAt: new Date().toISOString(),
  });

  // TODO (blocked on credentials): send the customer confirmation and the
  // new-order notification through Resend once RESEND_API_KEY is set.

  return { ok: true, reference: result.order.reference };
}

/**
 * Quote an order without placing it, so the checkout page shows totals computed
 * by the same code that will authorise the charge. The customer cannot be shown
 * one number and charged another.
 */
export async function quoteOrder(request: CheckoutRequest) {
  const result = validateCheckout(request, await checkoutDeps(() => "QUOTE"));
  if (!result.ok) return result;

  // Only the figures. A quote has no reference, and echoing the contact and
  // address back to the browser serves no purpose.
  const { subtotalCents, savingsCents, deliveryCents, taxCents, totalCents, inFreeCounty } =
    result.order;

  return {
    ok: true as const,
    totals: { subtotalCents, savingsCents, deliveryCents, taxCents, totalCents, inFreeCounty },
  };
}
