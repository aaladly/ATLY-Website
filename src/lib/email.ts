import "server-only";

import type { StoredOrder } from "./orders/store";
import { CROSS_CONTACT_STATEMENT } from "./catalog";
import { formatCents } from "./pricing";
import { SITE_URL } from "./site";

/**
 * Order email, through Resend's REST API.
 *
 * NO SDK ON PURPOSE. Resend's whole API here is one POST with a JSON body,
 * and this project is one modest Node process on Hostinger. A dependency that
 * wraps a single fetch is a dependency to audit, update and carry for no gain.
 *
 * WHERE THIS IS CALLED FROM MATTERS -----------------------------------------
 * Inside the mark_paid branch of the Stripe webhook, and nowhere else.
 *
 * Not in the checkout action: nobody has paid at that point, and a
 * confirmation for an abandoned checkout is a lie. Not outside the branch
 * either — Stripe delivers the same event more than once, and decidePayment-
 * Success returns already_handled on the second delivery, so anything outside
 * that branch sends a customer two confirmations for one order.
 * ---------------------------------------------------------------------------
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

const env = (name: string): string | null => {
  const value = process.env[name];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
};

/**
 * All three, or nothing is sent.
 *
 * A key with no from-address cannot send, and half-configured is the state
 * where a silent failure is most likely, so it is treated as off rather than
 * as nearly on. `npm run check:launch` reports the same three together.
 */
export function isEmailConfigured(): boolean {
  return (
    env("RESEND_API_KEY") !== null &&
    env("ORDER_CONFIRMATION_FROM_EMAIL") !== null &&
    env("ORDER_NOTIFICATION_TO_EMAIL") !== null
  );
}

export type EmailResult =
  | { sent: true; ids: string[] }
  | { sent: false; reason: string };

/**
 * Send the customer their confirmation, and the kitchen its notification.
 *
 * NEVER THROWS. A webhook that fails because an email provider is having a
 * bad morning is a webhook Stripe retries, and every retry lands on an order
 * that is already paid — so the money is right, the order is right, and the
 * only thing achieved is a second email once the provider recovers. The send
 * is the least important thing happening in that handler and it is not
 * allowed to take the rest down with it.
 */
export async function sendOrderEmails(order: StoredOrder): Promise<EmailResult> {
  if (!isEmailConfigured()) {
    return { sent: false, reason: "Resend is not configured; no email sent." };
  }

  const apiKey = env("RESEND_API_KEY")!;
  const from = env("ORDER_CONFIRMATION_FROM_EMAIL")!;
  const notify = env("ORDER_NOTIFICATION_TO_EMAIL")!;

  try {
    const ids = await Promise.all([
      send(apiKey, {
        from,
        to: [order.contact.email],
        subject: `Your ATLY order ${order.reference}`,
        text: customerEmail(order),
      }),
      send(apiKey, {
        from,
        to: [notify],
        subject: `New order ${order.reference} — ${formatCents(order.totalCents)}`,
        text: kitchenEmail(order),
      }),
    ]);
    return { sent: true, ids: ids.filter((id): id is string => id !== null) };
  } catch (error) {
    // Caught, named, and handed back rather than thrown. The caller logs it
    // against the reference so a missing confirmation can be sent by hand.
    return {
      sent: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

async function send(
  apiKey: string,
  body: { from: string; to: string[]; subject: string; text: string },
): Promise<string | null> {
  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    // Resend being slow must not hold a webhook open until Stripe times out
    // and retries it.
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    // The status and Resend's own message, never the key.
    throw new Error(
      `Resend returned ${response.status}: ${(await response.text()).slice(0, 300)}`,
    );
  }

  const json = (await response.json()) as { id?: string };
  return json.id ?? null;
}

/** The order as lines of text, shared by both emails. */
function orderSummary(order: StoredOrder): string {
  const lines = order.lines.map(
    (line) =>
      `  ${line.quantity} x ${line.variantName} (${line.productName})` +
      `  ${formatCents(line.lineTotalCents)}`,
  );

  const money = [
    `  Subtotal      ${formatCents(order.subtotalCents)}`,
    order.savingsCents > 0 ? `  You saved     ${formatCents(order.savingsCents)}` : null,
    `  Delivery      ${order.deliveryCents === 0 ? "FREE" : formatCents(order.deliveryCents)}`,
    order.taxCents > 0 ? `  Sales tax     ${formatCents(order.taxCents)}` : null,
    `  Total         ${formatCents(order.totalCents)}`,
  ].filter((line): line is string => line !== null);

  return [...lines, "", ...money].join("\n");
}

const address = (order: StoredOrder): string =>
  [
    order.address.line1,
    order.address.line2 || null,
    `${order.address.city}, ${order.address.state} ${order.address.zip}`,
  ]
    .filter((part): part is string => part !== null && part !== "")
    .join("\n  ");

/**
 * The customer's confirmation.
 *
 * Plain text, deliberately. It renders identically everywhere, cannot leak
 * layout into a spam filter, and there is nothing here that needs a design.
 *
 * The allergen statement is included because this email is the record of the
 * order, and a customer who reacts to something should not have to go back to
 * the site to re-read it. It is the same string the site shows — never a
 * paraphrase of it.
 */
function customerEmail(order: StoredOrder): string {
  return [
    `Thank you, ${order.contact.name.split(" ")[0]}.`,
    "",
    `We have your order and your payment. Your reference is ${order.reference}.`,
    "",
    "WHAT YOU ORDERED",
    orderSummary(order),
    "",
    "DELIVERING TO",
    `  ${address(order)}`,
    "",
    order.giftNote ? `GIFT NOTE\n  ${order.giftNote}\n` : null,
    CROSS_CONTACT_STATEMENT ? `ALLERGENS\n  ${CROSS_CONTACT_STATEMENT}\n` : null,
    `You can see this order at any time: ${SITE_URL}/order/${order.reference}`,
    "",
    "ATLY Belgian Chocolate",
    "Small bites of happiness.",
  ]
    .filter((part): part is string => part !== null)
    .join("\n");
}

/** The kitchen's copy: everything needed to make and deliver it. */
function kitchenEmail(order: StoredOrder): string {
  return [
    `New paid order: ${order.reference}`,
    "",
    orderSummary(order),
    "",
    "DELIVER TO",
    `  ${order.contact.name}`,
    `  ${address(order)}`,
    `  ${order.contact.phone}`,
    `  ${order.contact.email}`,
    order.inFreeCounty ? "  (Free delivery area, hand-delivered.)" : "  (By carrier.)",
    "",
    order.giftNote ? `GIFT NOTE — write this on a card\n  ${order.giftNote}\n` : null,
    `${SITE_URL}/admin/orders/${order.reference}`,
  ]
    .filter((part): part is string => part !== null)
    .join("\n");
}
