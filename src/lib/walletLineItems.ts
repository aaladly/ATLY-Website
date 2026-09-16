/**
 * The breakdown shown inside the Apple Pay / Google Pay sheet.
 *
 * Pure, and tested, because the wallet sheet is the one screen in this
 * checkout that cannot be inspected after the fact. It is drawn by the
 * operating system, it closes the instant the customer authorises, and if its
 * lines do not add up to the amount being charged there is no page left to
 * look at — only a bank statement that disagrees with what somebody remembers
 * seeing.
 *
 * Stripe totals the sheet by SUMMING these line items. It does not take a
 * total. So a line that is wrong, or missing, is not a cosmetic problem: it is
 * the number the customer authorises.
 */

export type WalletLineItem = { name: string; amount: number };

export type WalletTotals = {
  subtotalCents: number;
  deliveryCents: number;
  taxCents: number;
  totalCents: number;
};

/**
 * Delivery reads "Delivery (FREE)" rather than "Delivery — $0.00".
 *
 * A zero next to a line the customer expected to pay for looks like a bug in
 * the sheet. Saying FREE is the difference between a customer trusting the
 * figure and re-reading it.
 */
export const DELIVERY_LABEL = "Delivery";
export const DELIVERY_FREE_LABEL = "Delivery (FREE)";

export function walletLineItems(totals: WalletTotals): WalletLineItem[] {
  const items: WalletLineItem[] = [
    // Already net of bundle pricing — the engine discounts into the subtotal
    // rather than carrying a separate savings line, so adding one here would
    // subtract the same money twice.
    { name: "Chocolates", amount: totals.subtotalCents },
    {
      name: totals.deliveryCents === 0 ? DELIVERY_FREE_LABEL : DELIVERY_LABEL,
      amount: totals.deliveryCents,
    },
  ];

  // Some wallets render a zero line as an empty row. Tax is only ever zero if
  // something has gone wrong upstream, but there is no reason to show it.
  if (totals.taxCents > 0) {
    items.push({ name: "Sales tax", amount: totals.taxCents });
  }

  return items;
}

/**
 * Whether the sheet would show the amount that is actually charged.
 *
 * Called before the sheet is handed these items, not as a test-only helper.
 * A mismatch here means the customer is about to authorise one figure and be
 * charged another, and the right response is to refuse to open the sheet.
 */
export function lineItemsMatchTotal(
  items: readonly WalletLineItem[],
  totalCents: number,
): boolean {
  return items.reduce((sum, item) => sum + item.amount, 0) === totalCents;
}
