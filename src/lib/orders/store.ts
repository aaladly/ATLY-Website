import "server-only";

import type { ValidatedOrder } from "../checkout";

/**
 * Order persistence.
 *
 * !! THE DEFAULT IMPLEMENTATION IS A DEVELOPMENT STAND-IN !! -----------------
 * There is no Supabase project connected yet, so orders are held in a module
 * level Map. That means:
 *   - every order is lost when the server restarts
 *   - nothing is shared between serverless instances, so on Vercel an order
 *     written by one instance is invisible to the next request
 *
 * It exists so the checkout flow can be built and exercised end to end. It is
 * NOT a launch configuration. Replace it with the Supabase implementation
 * against the orders / order_items tables in migration 0001 before anything
 * real is taken. The interface is deliberately tiny so that swap is small.
 * ---------------------------------------------------------------------------
 */

export type OrderStatus =
  | "awaiting_payment"
  | "new"
  | "in_production"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export type StoredOrder = ValidatedOrder & {
  status: OrderStatus;
  /** ISO timestamp. Passed in rather than read here, to keep callers testable. */
  placedAt: string;
};

export interface OrderStore {
  save(order: StoredOrder): Promise<void>;
  get(reference: string): Promise<StoredOrder | undefined>;
}

/**
 * Survives hot reloads in development by hanging off globalThis. Without this
 * every edit clears the orders you just placed while testing.
 */
const globalForOrders = globalThis as unknown as {
  __atlyOrders?: Map<string, StoredOrder>;
};

const memory: Map<string, StoredOrder> =
  globalForOrders.__atlyOrders ?? new Map<string, StoredOrder>();
globalForOrders.__atlyOrders = memory;

export const inMemoryOrderStore: OrderStore = {
  async save(order) {
    memory.set(order.reference, order);
  },
  async get(reference) {
    return memory.get(reference);
  },
};

export const orderStore: OrderStore = inMemoryOrderStore;
