import type Stripe from "stripe";
import {
  ORDER_REFERENCE_KEY,
  isWebhookConfigured,
  requireStripe,
  webhookSecret,
} from "@/lib/payments";
import { orderStore } from "@/lib/orders/store";
import { decidePaymentSuccess, ORDER_CURRENCY } from "@/lib/orders/payment";

/**
 * Stripe webhook.
 *
 * This is where an order actually becomes paid. Not the browser: a customer
 * whose phone dies between confirming and the redirect has still been charged,
 * and an order that only becomes real if the browser comes back is an order
 * that sometimes does not.
 *
 * THE SIGNATURE IS THE ONLY THING MAKING THIS SAFE --------------------------
 * The URL is public and unauthenticated. Without verification, anybody who
 * guessed an order reference could POST a fabricated success event and march
 * an unpaid order into the kitchen. constructEvent throws on a bad signature,
 * a missing one, or a body that has been altered by so much as a byte.
 *
 * Which is why the RAW body is read with request.text() and handed to Stripe
 * untouched. Parsing the JSON first and re-serialising it changes whitespace
 * and key order, the signature no longer matches, and every real event starts
 * failing. Do not "tidy" this into request.json().
 * ---------------------------------------------------------------------------
 */

// Signatures are computed over the exact bytes sent, so this route can never
// be cached or statically analysed into something clever.
export const dynamic = "force-dynamic";

/** Stripe treats any 2xx as delivered and stops retrying. */
const ok = (body: Record<string, unknown>) =>
  Response.json({ received: true, ...body }, { status: 200 });

export async function POST(request: Request): Promise<Response> {
  if (!isWebhookConfigured()) {
    // 500, not 200: this is our misconfiguration, and Stripe retrying while
    // somebody notices and sets the secret is exactly the behaviour wanted.
    console.error("Stripe webhook received but STRIPE_WEBHOOK_SECRET is not set.");
    return Response.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "Missing signature" }, { status: 400 });
  }

  const raw = await request.text();

  let event: Stripe.Event;
  try {
    event = requireStripe().webhooks.constructEvent(raw, signature, webhookSecret());
  } catch (error) {
    // 400 and no retry. A signature that does not verify will not verify on
    // the second attempt either, and this is what an attacker gets.
    console.error("Stripe webhook signature verification failed:", error);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "payment_intent.succeeded":
      return handleSucceeded(event.data.object);

    case "payment_intent.payment_failed":
      /*
        Deliberately nothing beyond a log. The order stays awaiting_payment,
        which is true — and a failed payment is usually a customer about to
        try again with another card, not an order to tear down underneath
        them. The admin shows awaiting_payment as its own state.
      */
      console.warn(
        `Payment failed for ${event.data.object.metadata?.[ORDER_REFERENCE_KEY] ?? "an unknown order"}:`,
        event.data.object.last_payment_error?.message,
      );
      return ok({ handled: "payment_failed" });

    default:
      // Acknowledged rather than refused. Anything switched on in the Stripe
      // dashboard later arrives here, and a 400 would make it look broken.
      return ok({ ignored: event.type });
  }
}

async function handleSucceeded(intent: Stripe.PaymentIntent): Promise<Response> {
  const reference = intent.metadata?.[ORDER_REFERENCE_KEY];

  if (!reference) {
    // A charge with no order attached. Acknowledged, because retrying will
    // not attach one, but loud — somebody has been charged and there is
    // nothing here saying what for.
    console.error(
      `payment_intent.succeeded with no ${ORDER_REFERENCE_KEY} in metadata: ${intent.id}`,
    );
    return ok({ handled: "no_reference" });
  }

  const existing = await orderStore.get(reference);
  const outcome = decidePaymentSuccess(existing, reference, {
    // What Stripe says was actually taken, checked against what we calculated.
    // The reference in metadata says WHICH order; it says nothing about how
    // much, and those had been treated as the same claim.
    amountCents: intent.amount,
    currency: intent.currency,
  });

  if (outcome.action === "amount_mismatch") {
    /*
      Loud, and with both ids, because this is the one outcome here that
      somebody has to act on by hand. Either a customer has been charged an
      amount that is not their order total — a refund — or a forged intent is
      being pushed at this endpoint, which is a different conversation again.

      Still a 2xx. Stripe would redeliver the identical mismatched figure, so
      retrying achieves nothing except burying the log line under copies of
      itself.
    */
    console.error(
      `PAYMENT AMOUNT MISMATCH. Order ${reference}, intent ${intent.id}: ` +
        `Stripe says ${intent.amount} ${intent.currency}, the order totals ` +
        `${existing?.totalCents ?? "unknown"} ${ORDER_CURRENCY}. NOT marked paid.`,
    );
    return ok({ handled: "amount_mismatch", reference });
  }

  if (outcome.action !== "mark_paid") {
    // Duplicate delivery, a late event, or an order that has moved on. All of
    // them are acknowledged: an error here just makes Stripe retry forever.
    console.info(`Stripe webhook, no action: ${outcome.reason}`);
    return ok({ handled: outcome.action });
  }

  const updated = await orderStore.setStatus(
    reference,
    outcome.status,
    new Date().toISOString(),
  );

  if (!updated) {
    // It was there a moment ago. Worth a shout rather than a silent success.
    console.error(`Order ${reference} vanished between read and status update.`);
    return ok({ handled: "lost_order" });
  }

  // TODO (blocked on credentials): send the customer confirmation and the
  // new-order notification through Resend once RESEND_API_KEY is set. It
  // belongs here rather than in the checkout action, because here is the
  // first moment anybody has actually paid — and it must stay inside the
  // mark_paid branch so a duplicate event does not send a second email.
  console.info(`Order ${reference} paid (${intent.id}).`);

  return ok({ handled: "marked_paid", reference });
}
