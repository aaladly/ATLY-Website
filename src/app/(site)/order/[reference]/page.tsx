import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { orderStore } from "@/lib/orders/store";
import { normalizeReference } from "@/lib/orderReference";
import { formatCents } from "@/lib/pricing";
import { BRAND } from "@/lib/catalog";
import { isPaymentConfigured } from "@/lib/payments";
import { checkRate } from "@/lib/rateLimit";
import { clientIp } from "@/lib/clientIp";

/**
 * Whether the shop can take a card at all.
 *
 * Decides which of the two "not paid" explanations a customer gets: the card
 * was declined, or the shop has not switched payment on. Telling somebody
 * whose card bounced that the shop is not ready leaves them with nothing they
 * can do about it.
 */
const PAYMENT_LIVE = isPaymentConfigured();

export const metadata: Metadata = {
  title: "Your order",
  robots: { index: false, follow: false },
};

/**
 * How often one address may look up an order.
 *
 * WHY THIS PAGE NEEDS A LIMIT ----------------------------------------------
 * The URL is the only thing protecting it, and the reference behind it is 25
 * characters to the power of 6 — 244 million, or 27.9 bits. That is a label
 * chosen to be unambiguous when read down a phone, not a secret, and the
 * alphabet deliberately drops confusable characters, which is exactly what
 * costs it entropy.
 *
 * Unthrottled, a few hundred thousand requests finds a live order, and what
 * is behind it is a name, a full delivery address, a phone number and an
 * email. With this, the same search takes years.
 *
 * Generous enough that a real person refreshing, or a household behind one
 * address checking two orders, never notices.
 * ---------------------------------------------------------------------------
 */
const ORDER_LOOKUP = { limit: 30, windowMs: 10 * 60 * 1000 } as const;

// Next 16: params is async.
export default async function OrderPage({ params }: PageProps<"/order/[reference]">) {
  const { reference } = await params;
  const normalized = normalizeReference(reference);
  if (!normalized) notFound();

  /*
    Counted AFTER the shape check and BEFORE the lookup.

    After, so a typo in a reference a customer read off their own confirmation
    does not spend their allowance. Before, so a scan for valid references
    never reaches the store.
  */
  const lookups = checkRate(
    "order-lookup",
    await clientIp(),
    ORDER_LOOKUP.limit,
    ORDER_LOOKUP.windowMs,
  );

  if (!lookups.allowed) {
    /*
      notFound(), not a "slow down" page.

      A distinct rate-limit response is itself an oracle: it tells a scanner
      its requests are being counted, which is the cue to spread them out or
      rotate address. An attacker learns nothing from this that they did not
      already have, and a real person hitting it sees the same page as a
      mistyped reference.
    */
    console.warn(`Order lookup rate limited: ${lookups.used} attempts.`);
    notFound();
  }

  const order = await orderStore.get(normalized);
  if (!order) notFound();

  /*
    An unpaid order is not a confirmed one.

    This page used to say "Order confirmed / Thank you" for every order it
    could find, which was true enough when payment did not exist and every
    order was arranged by hand. Now that a card can be declined, an order
    sitting in awaiting_payment would be telling the customer their chocolate
    is on the way when nobody has taken any money — and the red panel further
    down contradicting it does not undo the headline.
  */
  const paid = order.status !== "awaiting_payment";

  return (
    <main className="mx-auto max-w-3xl px-gutter py-section">
      <p className="label-caps">{paid ? "Order confirmed" : "Payment not completed"}</p>
      <h1 className="mt-3 text-display-xl">
        {paid ? "Thank you" : "Almost there"}
      </h1>
      <p className="mt-6 text-body-l text-cocoa">
        {paid ? (
          <>
            We have your order, {order.contact.name.split(" ")[0]}. Your
            reference is below — quote it if you need to reach us about this
            order.
          </>
        ) : (
          <>
            We have saved your order, {order.contact.name.split(" ")[0]}, but it
            has not been paid for yet. Nothing has been charged.
          </>
        )}
      </p>

      <p className="mt-8 border border-rule-strong bg-ivory px-6 py-5 text-center font-display text-display-m tracking-[0.1em]">
        {order.reference}
      </p>

      {/*
        Two reasons an order sits here, and they need different things said.
        The copy used to cover only the second, from before payment existed —
        a customer whose card was declined was told the shop had not switched
        payment on, which is both wrong and unfixable from their side.
      */}
      {!paid && (
        <div className="mt-6 border-2 border-error bg-ivory p-5">
          {PAYMENT_LIVE ? (
            <>
              <p className="text-body-m text-error">
                We could not take the payment for this order, so nothing has
                been charged.
              </p>
              <p className="mt-3 text-body-m">
                Your basket is still as you left it —{" "}
                <Link href="/checkout" className="text-cocoa-deep">
                  try again
                </Link>
                , or message us and we will sort it out by hand.
              </p>
            </>
          ) : (
            <p className="text-body-m text-error">
              This order has not been paid for. Online payment is not switched
              on yet — we will be in touch to arrange it.
            </p>
          )}
        </div>
      )}

      <section className="mt-section">
        <h2 className="label-caps">What you ordered</h2>
        <ul className="mt-4 divide-y divide-rule border-y border-rule">
          {order.lines.map((line) => (
            <li
              key={line.variantId}
              className="flex items-baseline justify-between gap-4 py-4"
            >
              <span className="text-body-m">
                {line.quantity} &times; {line.variantName}
                <span className="block text-body-s text-cocoa">{line.productName}</span>
              </span>
              <span className="text-body-m tabular-nums">
                {formatCents(line.lineTotalCents)}
              </span>
            </li>
          ))}
        </ul>

        {order.appliedBundles.length > 0 && (
          <p className="mt-4 text-body-s text-gold-deep">
            {order.appliedBundles
              .map((b) => `${b.count > 1 ? `${b.count}× ` : ""}${b.label}`)
              .join(" + ")}{" "}
            — you saved {formatCents(order.savingsCents)}
          </p>
        )}

        <dl className="mt-8 space-y-3 border-t border-rule pt-6">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-body-m">Subtotal</dt>
            <dd className="text-body-m tabular-nums">{formatCents(order.subtotalCents)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-body-m">Delivery</dt>
            <dd className="text-body-m tabular-nums">
              {order.deliveryCents === 0 ? "Free" : formatCents(order.deliveryCents)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-body-m">Sales tax</dt>
            <dd className="text-body-m tabular-nums">{formatCents(order.taxCents)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-t border-rule pt-3">
            <dt className="text-body-m">Total</dt>
            <dd className="text-display-s tabular-nums">{formatCents(order.totalCents)}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-section">
        <h2 className="label-caps">Delivering to</h2>
        <address className="mt-4 text-body-m not-italic">
          {order.address.line1}
          {order.address.line2 && <><br />{order.address.line2}</>}
          <br />
          {order.address.city}, {order.address.state} {order.address.zip}
        </address>
        {order.inFreeCounty && (
          <p className="mt-3 text-body-s text-gold-deep">
            Hand-delivered in {BRAND.delivery.freeCounty}.
          </p>
        )}
      </section>

      <p className="mt-section text-body-s text-cocoa">
        A confirmation email is on its way.{" "}
        {/* TODO: true once Resend is configured. Do not remove this note
            before the email actually sends. */}
        <Link href="/shop" className="text-cocoa-deep">
          Back to the shop
        </Link>
      </p>
    </main>
  );
}
