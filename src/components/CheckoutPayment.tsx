"use client";

import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { formatCents } from "@/lib/pricing";

/**
 * The card step.
 *
 * Checkout is two steps rather than one, and the reason is the amount. In a
 * single step the card field has to be told a total before the customer has
 * given an address — so the total is provisional, and keeping it in step with
 * the live quote means pushing an amount up from the form into the Elements
 * provider wrapping it. Here the PaymentIntent already exists and the client
 * secret carries its amount, so there is no second copy of the total to keep
 * honest and no window where the field says one number and the charge is
 * another.
 *
 * The publishable key is read at module scope and the promise made once.
 * loadStripe injects a script; calling it per render would add one per
 * keystroke.
 */
const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() || null;

const stripePromise = PUBLISHABLE_KEY ? loadStripe(PUBLISHABLE_KEY) : null;

/** Whether the card step can render at all. Checkout branches on this. */
export const CARD_PAYMENT_AVAILABLE = stripePromise !== null;

export function CheckoutPayment({
  clientSecret,
  reference,
  totalCents,
  onPaid,
}: {
  clientSecret: string;
  reference: string;
  totalCents: number;
  onPaid: (reference: string) => void;
}) {
  if (!stripePromise) return null;

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          // Stripe's fields sit inside an iframe and cannot inherit the page's
          // CSS, so the brand has to be handed over explicitly. These are the
          // tokens from globals.css, by value because that is the only thing
          // this API accepts.
          theme: "flat",
          variables: {
            colorPrimary: "#4e1901",
            colorBackground: "#fdf5ea",
            colorText: "#4e1901",
            colorDanger: "#8c2b12",
            fontFamily: "ui-sans-serif, system-ui, sans-serif",
            borderRadius: "2px",
            spacingUnit: "4px",
          },
        },
      }}
    >
      <PayForm reference={reference} totalCents={totalCents} onPaid={onPaid} />
    </Elements>
  );
}

function PayForm({
  reference,
  totalCents,
  onPaid,
}: {
  reference: string;
  totalCents: number;
  onPaid: (reference: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Null until Stripe.js has loaded. Pressing before then would silently do
  // nothing, which reads as a broken button.
  const ready = stripe !== null && elements !== null;

  const pay = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ready || paying) return;

    setPaying(true);
    setError(null);

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        /*
          Only used when the card needs a redirect — 3-D Secure, mostly. The
          customer comes back to the order page, where the status reflects
          whatever the webhook has recorded by then. redirect: "if_required"
          keeps every other card inline.
        */
        return_url: `${window.location.origin}/order/${reference}`,
      },
      redirect: "if_required",
    });

    if (result.error) {
      /*
        card_error and validation_error are the customer's to fix and Stripe's
        messages for them are clear and already localised. Anything else is
        ours — a misconfigured key, a network failure — and repeating Stripe's
        internal wording at a customer helps nobody.
      */
      setError(
        result.error.type === "card_error" || result.error.type === "validation_error"
          ? (result.error.message ?? "That card was declined.")
          : "Something went wrong taking the payment. You have not been charged — please try again.",
      );
      setPaying(false);
      return;
    }

    /*
      Paid. Deliberately NOT marking the order paid from here: the browser is
      not a trustworthy place to record a charge, and a customer whose phone
      dies on this line has still been charged. The webhook does it. This only
      moves them to the order page, which reads its status from the store.
    */
    onPaid(reference);
  };

  return (
    <form onSubmit={pay} noValidate>
      <PaymentElement
        options={{
          layout: "tabs",
          // The delivery address was collected and validated by the previous
          // step, against the New Jersey rules. Asking again here would let a
          // customer enter a second, unchecked address for the same order.
          fields: { billingDetails: { address: "auto" } },
        }}
      />

      {error && (
        <p
          role="alert"
          className="mt-5 border-2 border-error bg-ivory p-4 text-body-m text-error"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!ready || paying}
        className="mt-7 inline-flex min-h-11 w-full items-center justify-center bg-cocoa-deep px-8 py-4 text-label uppercase text-cream transition-colors duration-200 hover:bg-cocoa disabled:cursor-not-allowed disabled:opacity-60"
      >
        {paying ? "Taking payment…" : `Pay ${formatCents(totalCents)}`}
      </button>

      {/* aria-live so a screen reader is told the press registered. The
          disabled button above is what actually blocks a second press. */}
      <p aria-live="polite" className="sr-only">
        {paying ? "Taking payment, please wait." : ""}
      </p>

      <p className="mt-4 text-body-s text-cocoa">
        Your card details go straight to Stripe and never reach our server.
      </p>
    </form>
  );
}
