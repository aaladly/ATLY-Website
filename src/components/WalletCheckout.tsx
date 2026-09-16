"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import type {
  StripeExpressCheckoutElementClickEvent,
  StripeExpressCheckoutElementConfirmEvent,
  StripeExpressCheckoutElementReadyEvent,
  StripeExpressCheckoutElementShippingAddressChangeEvent,
} from "@stripe/stripe-js";
import { Elements, ExpressCheckoutElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { placeOrder, quoteForWallet } from "@/app/(site)/checkout/actions";
import { walletLineItems, lineItemsMatchTotal } from "@/lib/walletLineItems";

/**
 * Apple Pay and Google Pay.
 *
 * The same PaymentIntent and the same webhook as the card path — this is a
 * different way into one checkout, not a second checkout. Everything about
 * price, delivery and whether we deliver at all is still decided by
 * validateCheckout on the server; the wallet supplies an address and an
 * authorisation, nothing else.
 *
 * WHAT THE SHEET SHOWS IS WHAT IS CHARGED -----------------------------------
 * Stripe totals the wallet sheet by summing the line items handed to it. It
 * does not accept a total. So the sheet's arithmetic is ours to get right, and
 * it is checked against the server's total before the sheet is allowed to
 * open and again before it is allowed to update. A sheet is drawn by the
 * operating system and gone the moment it is authorised: there is no page left
 * to inspect if its figures were wrong.
 *
 * THE ADDRESS IS REDACTED WHILE THE SHEET IS OPEN ---------------------------
 * onShippingAddressChange gets country, state, city and postal code — no
 * street line. That is the wallets protecting the customer until they commit,
 * and it is everything the delivery engine needs anyway. The full address
 * arrives with onConfirm and is validated there, by the same function, before
 * any money moves.
 */

const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() || null;

const stripePromise = PUBLISHABLE_KEY ? loadStripe(PUBLISHABLE_KEY) : null;

export const WALLETS_POSSIBLE = stripePromise !== null;

type CartLine = { variantId: string; quantity: number };

export function WalletCheckout({
  lines,
  openingTotalCents,
  onPaid,
}: {
  lines: readonly CartLine[];
  /**
   * A total to open the sheet at, or null when no address has been entered in
   * the form yet and there is therefore no delivery fee to include.
   *
   * Only ever an opening figure. The real one arrives from the server when the
   * customer picks an address inside the sheet, and nothing can be authorised
   * before that happens.
   */
  openingTotalCents: number | null;
  onPaid: (reference: string) => void;
}) {
  if (!stripePromise || lines.length === 0) return null;

  // Stripe requires a positive amount to mount. Anything sane will do — this
  // is replaced by a server figure before the customer can authorise.
  const amount = openingTotalCents && openingTotalCents > 0 ? openingTotalCents : 100;

  return (
    <Elements
      stripe={stripePromise}
      options={{
        mode: "payment",
        amount,
        currency: "usd",
        /*
          Deliberately NOT pinning paymentMethodTypes here.

          placeOrder creates the PaymentIntent with automatic_payment_methods
          enabled, and confirmPayment refuses when the Elements instance was
          built with a payment method list that does not match the intent it
          is confirming. Leaving both on automatic keeps the two ends in
          agreement — and which wallets appear is decided by the device, not
          by this list.
        */
        appearance: { theme: "flat", variables: { borderRadius: "2px" } },
      }}
    >
      <WalletButtons lines={lines} onPaid={onPaid} />
    </Elements>
  );
}

function WalletButtons({
  lines,
  onPaid,
}: {
  lines: readonly CartLine[];
  onPaid: (reference: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();

  /**
   * Null until Stripe has told us whether this device has a wallet at all.
   *
   * Three states, not two: unknown, none available, available. The section
   * renders nothing at all in the first two — a divider reading "or pay with
   * card" above an empty space, on every desktop without a wallet, is worse
   * than no divider.
   */
  const [available, setAvailable] = useState<boolean | null>(null);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * The total as the sheet currently shows it, or null until the customer has
   * picked an address in it.
   *
   * A ref rather than state: it is read inside Stripe's callbacks, which
   * capture the render they were created in, and a stale total there is a
   * customer charged a figure the sheet never showed.
   *
   * Null is not a missing value to be defaulted away — it is the fact that
   * nothing has been priced yet, and onConfirm refuses on it.
   */
  const sheetTotal = useRef<number | null>(null);

  const onReady = useCallback((event: StripeExpressCheckoutElementReadyEvent) => {
    setAvailable((event.availablePaymentMethods ?? null) !== null);
  }, []);

  /**
   * The sheet is about to open. This is the only chance to say what it must
   * collect, and none of it is optional for us: no email means no
   * confirmation, no phone means no way to call about a doorstep, and no
   * address means nothing to deliver to.
   */
  const onClick = useCallback(
    ({ resolve }: StripeExpressCheckoutElementClickEvent) => {
      resolve({
        emailRequired: true,
        phoneNumberRequired: true,
        shippingAddressRequired: true,
        // New Jersey only is enforced server-side on every quote and again
        // before the charge. Limiting the country here just saves a customer
        // in another country picking an address we are only going to refuse.
        allowedShippingCountries: ["US"],
        // Shown at the top of the wallet sheet, above the amount.
        business: { name: "ATLY Belgian Chocolate" },
        /*
          Delivery is not a carrier rate the customer chooses between, it is a
          consequence of their ZIP. So exactly one option, priced by the
          engine, replaced whenever the address changes.
        */
        shippingRates: [
          {
            id: "atly-delivery",
            displayName: "Hand-delivered in New Jersey",
            amount: 0,
          },
        ],
      });
    },
    [],
  );

  /**
   * The customer picked or changed an address inside the sheet.
   *
   * Reject and the sheet shows the message against the address, which is the
   * only thing they can act on from in there. Resolve and the sheet redraws
   * with the new figures.
   */
  const onShippingAddressChange = useCallback(
    async (event: StripeExpressCheckoutElementShippingAddressChangeEvent) => {
      const { address } = event;
      const quote = await quoteForWallet({
        items: lines.map((line) => ({ ...line })),
        state: address.state ?? "",
        zip: address.postal_code ?? "",
        city: address.city ?? "",
      });

      if (!quote.ok) {
        // Covers out of state, a ZIP that is not New Jersey's, an excluded
        // area and a malformed ZIP — all of them already decided by the same
        // engine the card path uses.
        event.reject();
        setError(quote.message);
        return;
      }

      setError(null);

      const items = walletLineItems(quote.totals);
      if (!lineItemsMatchTotal(items, quote.totals.totalCents)) {
        // Refuse rather than show a sheet whose lines do not add up to what
        // would be charged. This should be unreachable; it is here because
        // the failure it guards is silent and expensive.
        console.error("Wallet line items do not sum to the total", items, quote.totals);
        event.reject();
        setError("We could not work out your total. Please pay by card below.");
        return;
      }

      sheetTotal.current = quote.totals.totalCents;
      // Keep the deferred intent's amount in step, or elements.submit() will
      // refuse on confirm.
      elements?.update({ amount: quote.totals.totalCents });

      event.resolve({
        lineItems: items,
        shippingRates: [
          {
            id: "atly-delivery",
            displayName:
              quote.totals.deliveryCents === 0
                ? "Hand-delivered in New Jersey — free"
                : "Hand-delivered in New Jersey",
            amount: quote.totals.deliveryCents,
          },
        ],
      });
    },
    [lines, elements],
  );

  /** The customer authorised. Everything from here is irreversible for them. */
  const onConfirm = useCallback(
    async (event: StripeExpressCheckoutElementConfirmEvent) => {
      if (!stripe || !elements || paying) return;
      setPaying(true);
      setError(null);

      const shipping = event.shippingAddress;
      const billing = event.billingDetails;

      if (!shipping?.address || !billing?.email) {
        setError("The wallet did not give us an address and email. Please pay by card below.");
        setPaying(false);
        return;
      }

      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message ?? "Something went wrong. Please try again.");
        setPaying(false);
        return;
      }

      /*
        The order and its PaymentIntent are created HERE, from the wallet's
        address, by the same action the card path uses. So a wallet order
        saves exactly the same fields — items, full address, phone, gift note,
        delivery fee, the terms version — and its amount is recomputed from
        the item ids rather than taken from anything the sheet displayed.
      */
      const placed = await placeOrder({
        contact: {
          name: shipping.name ?? billing.name ?? "",
          email: billing.email,
          phone: billing.phone ?? "",
        },
        address: {
          line1: shipping.address.line1 ?? "",
          line2: shipping.address.line2 ?? "",
          city: shipping.address.city ?? "",
          state: shipping.address.state ?? "",
          zip: shipping.address.postal_code ?? "",
        },
        items: lines.map((line) => ({ ...line })),
        giftNote: "",
        /*
          The acceptance is the notice sitting directly above these buttons,
          which names the terms and the allergens and says that paying agrees
          to them. That notice is not decoration — it is what makes this true.
          If it is ever moved away from the buttons, this has to change too.
        */
        acceptedTerms: true,
      });

      if (!placed.ok) {
        setError(
          placed.issues[0]?.message ??
            "We could not take that order. Please try the card form below.",
        );
        setPaying(false);
        return;
      }

      /*
        Last guard before the money moves. If the server's total is not what
        the sheet last showed, the customer is about to authorise one figure
        and be charged another — so the payment is abandoned instead. The
        order stays awaiting_payment and nobody is charged.
      */
      if (sheetTotal.current === null) {
        // The sheet was authorised without ever reporting an address, so
        // there is no figure the customer has actually seen and agreed to.
        // Should be unreachable with shippingAddressRequired; refusing costs
        // nothing and charging the wrong amount costs a great deal.
        console.error("Wallet confirmed with no shipping address change seen.");
        setError(
          "We did not get a delivery address from your wallet. Nothing has been charged — please use the card form below.",
        );
        setPaying(false);
        return;
      }

      if (placed.totalCents !== sheetTotal.current) {
        console.error(
          `Wallet total drifted: sheet ${sheetTotal.current}, server ${placed.totalCents}`,
        );
        setError(
          "Your total changed while the payment sheet was open. Nothing has been charged — please check your order and try again.",
        );
        setPaying(false);
        return;
      }

      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        clientSecret: placed.clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/order/${placed.reference}`,
        },
        redirect: "if_required",
      });

      if (confirmError) {
        setError(
          confirmError.type === "card_error" || confirmError.type === "validation_error"
            ? (confirmError.message ?? "That payment was declined.")
            : "Something went wrong taking the payment. You have not been charged.",
        );
        setPaying(false);
        return;
      }

      // Paid. The webhook records it; this only moves them along.
      onPaid(placed.reference);
    },
    [stripe, elements, lines, paying, onPaid],
  );

  // Nothing to show on a device with no wallet, and nothing to show before we
  // know. Either way the card form below is the whole checkout.
  if (available === false) return null;

  return (
    <section className={available === null ? "invisible h-0 overflow-hidden" : "mb-10"}>
      <h2 className="sr-only">Pay with a digital wallet</h2>

      {/*
        Above the buttons, deliberately. This is the acceptance for the wallet
        path — there is no checkbox in a wallet sheet — so it has to be
        something the customer has seen before they authorise, not something
        they could only find afterwards.
      */}
      <p className="mb-4 text-body-s text-cocoa">
        Our chocolate contains milk, peanuts and tree nuts, and is made in a
        shared kitchen. Paying here means you agree to our{" "}
        <Link href="/terms" className="text-cocoa-deep">
          Terms &amp; Conditions
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="text-cocoa-deep">
          Privacy Policy
        </Link>
        , and that you have read the{" "}
        <Link href="/allergens" className="text-cocoa-deep">
          allergen information
        </Link>
        .
      </p>

      <div aria-busy={paying}>
        <ExpressCheckoutElement
          options={{ buttonHeight: 48 }}
          onReady={onReady}
          onClick={onClick}
          onShippingAddressChange={onShippingAddressChange}
          onConfirm={onConfirm}
        />
      </div>

      {paying && (
        <p aria-live="polite" className="mt-3 text-body-s text-cocoa">
          Taking payment…
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-4 border-2 border-error bg-ivory p-4 text-body-m text-error"
        >
          {error}
        </p>
      )}

      {available && (
        <div className="mt-8 flex items-center gap-4" aria-hidden="true">
          <span className="h-px flex-1 bg-rule-strong" />
          <span className="label-caps text-cocoa">or pay with card</span>
          <span className="h-px flex-1 bg-rule-strong" />
        </div>
      )}
    </section>
  );
}
