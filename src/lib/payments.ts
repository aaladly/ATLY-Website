import "server-only";

/**
 * Stripe configuration gate.
 *
 * Payment is not wired. This module exists so that fact is expressed in one
 * place and enforced, rather than being a comment somebody forgets.
 *
 * TO ENABLE PAYMENT:
 *   1. Put the keys in .env.local — never in a file that is committed:
 *        STRIPE_SECRET_KEY=sk_...
 *        STRIPE_WEBHOOK_SECRET=whsec_...
 *        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
 *   2. Install the SDK.
 *   3. Create and confirm a PaymentIntent inside placeOrder, before the order
 *      is persisted with status "new".
 *
 * Until step 1 is done, placeOrder refuses. That is deliberate: a checkout that
 * records orders nobody paid for is worse than one that declines politely, and
 * a missing charge step is an easy thing to ship without noticing.
 */

/**
 * Whether live payment can be taken.
 *
 * Only checks that the secret exists. It does NOT check that the key is valid,
 * that it is the right mode, or that the account can accept charges — only
 * Stripe can tell us that, at the point of charging.
 */
export function isPaymentConfigured(): boolean {
  const key = process.env.STRIPE_SECRET_KEY;
  return typeof key === "string" && key.trim().length > 0;
}

/**
 * The publishable key for the browser, or null.
 *
 * Publishable keys are safe to expose — that is their purpose. The secret key
 * must never be read from a client component, which is why this module is
 * server-only and hands out just this one value.
 */
export function publishableKey(): string | null {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  return typeof key === "string" && key.trim().length > 0 ? key : null;
}
