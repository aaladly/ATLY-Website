import "server-only";

import type { ValidatedOrder } from "../checkout";
import type { OrderStatus } from "./status";
import { SUPABASE_CONFIGURED } from "../supabase.ts";
import { supabaseOrderStore } from "./supabaseStore.ts";

/**
 * Order persistence.
 *
 * TWO IMPLEMENTATIONS, CHOSEN BY CONFIGURATION ------------------------------
 * With a Supabase project connected, orders go to Postgres through the
 * place_order() function in migration 0003 — one transaction, so an order and
 * its line items land together or not at all.
 *
 * Without one, they are held in a module-level Map so the checkout flow can
 * still be built and exercised end to end. That stand-in loses every order
 * when the server restarts. Hosting is Hostinger, one long-running Node
 * process rather than a fleet of serverless instances, so the data survives
 * BETWEEN requests — which makes the failure quieter, not smaller. It works
 * perfectly right up until a restart, and the thing lost is a paid order with
 * an address attached.
 *
 * The selection is at the bottom of this file. `npm run check:launch` blocks
 * on the memory store, and the admin says so on every page, so nobody takes a
 * real order behind it by accident.
 * ---------------------------------------------------------------------------
 */

export type StoredOrder = ValidatedOrder & {
  status: OrderStatus;
  /** ISO timestamp. Passed in rather than read here, to keep callers testable. */
  placedAt: string;
  /** ISO timestamp of the last status change, or null if never changed. */
  statusChangedAt?: string | null;
};

export interface OrderStore {
  save(order: StoredOrder): Promise<void>;
  get(reference: string): Promise<StoredOrder | undefined>;
  /** Newest first. The admin's order list. */
  list(): Promise<StoredOrder[]>;
  /**
   * Change an order's status. Returns the updated order, or undefined when
   * there is no such reference — so a stale link fails as "not found" rather
   * than silently doing nothing and reporting success.
   */
  setStatus(
    reference: string,
    status: OrderStatus,
    changedAt: string,
  ): Promise<StoredOrder | undefined>;
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
  async list() {
    return [...memory.values()].sort((a, b) => b.placedAt.localeCompare(a.placedAt));
  },
  async setStatus(reference, status, changedAt) {
    const existing = memory.get(reference);
    if (!existing) return undefined;
    const updated: StoredOrder = { ...existing, status, statusChangedAt: changedAt };
    memory.set(reference, updated);
    return updated;
  },
};

/**
 * True when an order survives a restart. The admin banner reads this rather
 * than assuming, so the warning disappears by itself once Supabase is wired in
 * and nobody has to remember to delete it.
 */
export const ORDERS_ARE_DURABLE = SUPABASE_CONFIGURED;

/*
  Both are imported statically, which is safe because importing the Supabase
  store constructs nothing: lib/supabase.ts builds its client on first use and
  caches it, so an unconfigured project loads the module and never makes a
  client. Selecting with a dynamic import instead would make this export a
  promise and push async into every caller, for no gain.
*/
export const orderStore: OrderStore = SUPABASE_CONFIGURED
  ? supabaseOrderStore
  : inMemoryOrderStore;
