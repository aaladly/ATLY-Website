"use server";

import { validateCheckout, type CheckoutRequest, type ValidationIssue } from "@/lib/checkout";
import { makeOrderReference } from "@/lib/orderReference";
import { checkoutDeps } from "@/lib/checkoutDeps";
import { orderStore } from "@/lib/orders/store";
import {
  ORDER_REFERENCE_KEY,
  isPaymentConfigured,
  paymentMethodConfiguration,
  requireStripe,
} from "@/lib/payments";

export type PlaceOrderResult =
  | {
      ok: true;
      reference: string;
      /**
       * What the browser hands to stripe.confirmPayment().
       *
       * The amount is baked into the PaymentIntent this secret refers to, on
       * the server, from figures the server recomputed. The browser cannot
       * change it — confirming with a tampered amount is not a thing the
       * Stripe API offers.
       */
      clientSecret: string;
      /** For showing the customer what they are about to be charged. */
      totalCents: number;
    }
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

  /*
    The order is recorded BEFORE the charge, as awaiting_payment.

    It has to be: the webhook that confirms the payment arrives with nothing
    but a PaymentIntent id and whatever metadata was attached to it, and an
    order's items, address and gift note do not fit in metadata. So the order
    exists first and the reference travels on the intent.

    The cost is a row for every abandoned checkout, which is why the status
    exists and why the admin shows it as its own state. The alternative — hold
    the order in the browser and write it when the webhook lands — means a
    customer who is charged while their laptop sleeps has paid for an order
    nobody has a record of.
  */
  const order = {
    ...result.order,
    status: "awaiting_payment" as const,
    placedAt: new Date().toISOString(),
  };
  await orderStore.save(order);

  let clientSecret: string | null = null;
  try {
    const intent = await requireStripe().paymentIntents.create(
      {
        // Recomputed on the server, from item ids and an address. Nothing the
        // browser sent contributed a figure to it.
        amount: order.totalCents,
        currency: "usd",
        /*
          Card, Apple Pay and Google Pay. Nothing else.

          NOT payment_method_types: ["card"], which was the obvious thing to
          reach for and does not work. That restricts what can be CHARGED but
          the Payment Element keeps displaying whatever the account default
          configuration has switched on — so checkout offered Klarna and a
          bank tab that would have failed on confirm. Display and capability
          have to come from the same place, and that place is the
          configuration below.
        */
        automatic_payment_methods: { enabled: true },
        ...(paymentMethodConfiguration()
          ? { payment_method_configuration: paymentMethodConfiguration()! }
          : {}),
        // The only thread between a Stripe charge and an ATLY order.
        metadata: { [ORDER_REFERENCE_KEY]: order.reference },
        description: `ATLY order ${order.reference}`,
        receipt_email: order.contact.email,
      },
      {
        /*
          Two presses of a slow button, or a retried server action, must not
          produce two PaymentIntents against one order — one of which would be
          abandoned and the other charged, with the customer seeing whichever
          came back. The reference is unique per order, so it is the key.
        */
        idempotencyKey: `pi:${order.reference}`,
      },
    );
    clientSecret = intent.client_secret;
  } catch (error) {
    // The order is already saved as awaiting_payment, which is the honest
    // record: we tried to charge and could not. Nobody is charged.
    console.error(`Stripe refused a PaymentIntent for ${order.reference}:`, error);
    return {
      ok: false,
      issues: [
        {
          field: "payment",
          message:
            "We could not start the payment. Nothing has been charged — please try again, and if it keeps happening message us and we will sort it out.",
        },
      ],
    };
  }

  if (clientSecret === null) {
    return {
      ok: false,
      issues: [
        {
          field: "payment",
          message:
            "We could not start the payment. Nothing has been charged — please try again.",
        },
      ],
    };
  }

  // The confirmation email is sent by the webhook, not here: here, nobody has
  // paid yet. See src/app/api/stripe/webhook/route.ts.

  return {
    ok: true,
    reference: order.reference,
    clientSecret,
    totalCents: order.totalCents,
  };
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
    totals: {
      subtotalCents,
      savingsCents,
      deliveryCents,
      taxCents,
      totalCents,
      inFreeCounty,
      /*
        Two presentation figures, computed by the same call that produced
        deliveryCents so they cannot disagree with it: what delivery would
        have cost, and what would still earn it free. Both come from the
        server for the same reason the totals do.
      */
      deliveryStandardCents: result.delivery.standardCostCents,
      centsToFreeDelivery: result.delivery.centsToFreeDelivery,
    },
  };
}

/**
 * Quote for a wallet sheet, from the redacted address it gives us.
 *
 * Apple Pay and Google Pay hand over only country, state, city and postal code
 * while the sheet is open — the street line is withheld until the customer
 * authorises. That is a deliberate privacy property of the wallets and not
 * something to work around: it is also everything the delivery engine needs,
 * since the fee turns on the ZIP and the state.
 *
 * So the street line is a placeholder here, exactly as it is in quoteOrder.
 * The real one arrives with the confirmation and is validated then, by the
 * same function, before any money moves.
 */
export async function quoteForWallet(input: {
  items: { variantId: string; quantity: number }[];
  state: string;
  zip: string;
  city: string;
}) {
  const result = validateCheckout(
    {
      contact: { name: "wallet", email: "wallet@example.com", phone: "0" },
      address: {
        line1: "wallet",
        line2: "",
        city: input.city || "wallet",
        state: input.state,
        zip: input.zip,
      },
      items: input.items,
      giftNote: "",
      // A quote is not an order. The acceptance that matters is enforced on
      // the way to a charge, in placeOrder.
      acceptedTerms: true,
    },
    await checkoutDeps(() => "QUOTE"),
  );

  if (!result.ok) {
    /*
      The wallet sheet has room for one short line, and it is shown against
      the address the customer just picked. An address problem is the only
      thing they can act on from inside that sheet, so anything else is
      reported as a generic refusal rather than leaking, say, a cart error
      into a box about a delivery address.
    */
    const addressIssue = result.issues.find((issue) =>
      issue.field.startsWith("address."),
    );
    return {
      ok: false as const,
      message:
        addressIssue?.message ??
        "We cannot deliver to that address. We deliver within New Jersey only.",
    };
  }

  const { subtotalCents, deliveryCents, taxCents, totalCents } = result.order;
  return {
    ok: true as const,
    totals: { subtotalCents, deliveryCents, taxCents, totalCents },
    deliveryStandardCents: result.delivery.standardCostCents,
    centsToFreeDelivery: result.delivery.centsToFreeDelivery,
  };
}
