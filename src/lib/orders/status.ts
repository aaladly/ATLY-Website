/**
 * Order statuses.
 *
 * Split out of store.ts because that module is `server-only` and the admin's
 * status picker is a client component. These are plain data — no store, no
 * database, nothing secret — so they are safe in a browser bundle.
 */

export type OrderStatus =
  | "awaiting_payment"
  | "new"
  | "in_production"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export const ORDER_STATUSES: readonly OrderStatus[] = [
  "awaiting_payment",
  "new",
  "in_production",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;

/** What the owner sees. Plain words, not enum names. */
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  awaiting_payment: "Awaiting payment",
  new: "New",
  in_production: "Being made",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/** One line of context, so a status is never ambiguous at a glance. */
export const ORDER_STATUS_NOTE: Record<OrderStatus, string> = {
  awaiting_payment: "Not paid for. Nothing should be made yet.",
  new: "Paid for and waiting to be made.",
  in_production: "In the kitchen.",
  out_for_delivery: "On its way to the customer.",
  delivered: "Finished.",
  cancelled: "Called off. Not to be made or delivered.",
};

export const isOrderStatus = (value: string): value is OrderStatus =>
  (ORDER_STATUSES as readonly string[]).includes(value);
