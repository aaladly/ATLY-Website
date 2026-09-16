import "server-only";

import Stripe from "stripe";

/**
 * Stripe.
 *
 * TO ENABLE PAYMENT, put the keys in .env.local — never in a committed file:
 *
 *   STRIPE_SECRET_KEY=sk_test_...              charges; server only
 *   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...   mounts the card field
 *   STRIPE_WEBHOOK_SECRET=whsec_...            verifies the webhook
 *
 * With none of them set, the site behaves exactly as it did before payment
 * existed: checkout validates an order completely and then declines it. That
 * is deliberate. A checkout that records orders nobody paid for is worse than
 * one that politely refuses, and a missing charge step is an easy thing to
 * ship without noticing.
 *
 * WHAT IS NOT HERE ----------------------------------------------------------
 * Nothing in this file decides an amount. Every figure a customer is charged
 * comes from validateCheckout(), which recomputes the cart, the bundle
 * pricing, the delivery fee and the tax from the item IDs and the address.
 * CheckoutRequest carries no prices at all, so "never trust the client" is a
 * property of the shape rather than a check somebody has to remember to write.
 * ---------------------------------------------------------------------------
 */

/**
 * Whether a charge can be attempted.
 *
 * Only checks that the secret exists. It does NOT check that the key is
 * valid, that it is the right mode, or that the account can accept charges —
 * only Stripe can say that, at the point of charging.
 */
export function isPaymentConfigured(): boolean {
  const key = process.env.STRIPE_SECRET_KEY;
  return typeof key === "string" && key.trim().length > 0;
}

/** Whether inbound webhooks can be verified. Separate key, separate failure. */
export function isWebhookConfigured(): boolean {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  return typeof secret === "string" && secret.trim().length > 0;
}

/**
 * The publishable key for the browser, or null.
 *
 * Publishable keys are meant to be public — that is their purpose. The secret
 * key must never reach a client component, which is why this module is
 * server-only and hands out just this one value.
 */
export function publishableKey(): string | null {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  return typeof key === "string" && key.trim().length > 0 ? key : null;
}

let client: Stripe | null = null;

/**
 * The Stripe client, or null when no secret is configured.
 *
 * Null rather than throwing on import: "payment is not switched on" is a
 * supported state of this codebase, and a module that threw would take down
 * every page rather than the one action that needs it.
 *
 * The API version is pinned. Left unpinned, Stripe's default moves when the
 * library is updated and the shape of a webhook event can change underneath a
 * handler that was working yesterday.
 */
export function stripe(): Stripe | null {
  if (!isPaymentConfigured()) return null;
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY!.trim(), {
    apiVersion: "2026-08-26.dahlia",
    // Shows up in the Stripe dashboard's logs, which is worth having when
    // working out which deployment made a charge.
    appInfo: { name: "ATLY Belgian Chocolate" },
  });
  return client;
}

export function requireStripe(): Stripe {
  const s = stripe();
  if (s === null) {
    throw new Error("Stripe is not configured: set STRIPE_SECRET_KEY in .env.local.");
  }
  return s;
}

export function webhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (typeof secret !== "string" || secret.trim() === "") {
    throw new Error(
      "Stripe webhooks are not configured: set STRIPE_WEBHOOK_SECRET in .env.local.",
    );
  }
  return secret.trim();
}

/**
 * The metadata key carrying our order reference on a PaymentIntent.
 *
 * This is the only link between a Stripe charge and an ATLY order. The
 * webhook has nothing else to go on, so if this string changes, every
 * in-flight payment becomes a charge nobody can match to an order.
 */
export const ORDER_REFERENCE_KEY = "atly_order_reference";

/**
 * Which payment methods checkout offers, as a Stripe configuration id.
 *
 * WHY THIS EXISTS, because it is not obvious: a Stripe account ships with a
 * default configuration that has Klarna, Link, Amazon Pay, Cash App and
 * Affirm switched ON, and the Payment Element displays THAT rather than the
 * payment_method_types on the intent. Restricting the intent alone produced a
 * checkout offering Klarna and a bank tab that could not actually have been
 * charged — the display and the capability disagreed.
 *
 * So a configuration of our own, with card, Apple Pay and Google Pay on and
 * everything else off. Owner decision, and a sound one for this shop: Klarna
 * is buy-now-pay-later on a ten dollar box of chocolates, and bank debit can
 * fail days AFTER it looks successful, on perishable goods already
 * hand-delivered.
 *
 * Not secret — an id, not a key — so it is NEXT_PUBLIC and the browser reads
 * the same value, which is what keeps the deferred Elements instance and the
 * intent in agreement.
 *
 * Null falls back to the account default, i.e. everything. If this ever reads
 * null in production, checkout quietly starts offering Klarna again.
 */
export function paymentMethodConfiguration(): string | null {
  const id = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_METHOD_CONFIGURATION;
  return typeof id === "string" && id.trim() !== "" ? id.trim() : null;
}
