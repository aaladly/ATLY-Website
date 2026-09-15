import "server-only";

import { requireSupabase } from "../supabase.ts";
import type { OrderStatus } from "./status.ts";
import type { OrderStore, StoredOrder } from "./store.ts";
import {
  ORDER_SELECT,
  fromRows,
  toPlaceOrderPayload,
  type OrderItemRow,
  type OrderRow,
} from "./rows.ts";

/**
 * Orders in Postgres.
 *
 * Writes go through the place_order() function from migration 0003 rather than
 * through three separate inserts, because three separate inserts can
 * half-succeed and the interesting way they half-succeed is an order row with
 * no line items — a charge with no record of what was bought. One function,
 * one transaction, all of it or none of it.
 *
 * Reads select the order with its customer and items in a single request. The
 * shape translation lives in rows.ts, which is pure and tested; this file only
 * knows how to talk to the database.
 */

type JoinedRow = OrderRow & { order_items: OrderItemRow[] };

/**
 * Supabase returns errors rather than throwing them, which is easy to ignore
 * by accident — and an ignored error on an order write is a customer who paid
 * and has no order. Every call goes through here.
 */
function must<T>(
  result: { data: T; error: { message: string } | null },
  what: string,
): T {
  if (result.error) {
    throw new Error(`${what} failed: ${result.error.message}`);
  }
  return result.data;
}

export const supabaseOrderStore: OrderStore = {
  async save(order) {
    const db = requireSupabase();
    must(
      await db.rpc("place_order", { payload: toPlaceOrderPayload(order) }),
      `Saving order ${order.reference}`,
    );
  },

  async get(reference) {
    const db = requireSupabase();
    const { data, error } = await db
      .from("orders")
      .select(ORDER_SELECT)
      .eq("reference", reference)
      .maybeSingle();

    if (error) throw new Error(`Reading order ${reference} failed: ${error.message}`);
    if (!data) return undefined;

    const row = data as unknown as JoinedRow;
    return fromRows(row, row.order_items ?? []);
  },

  async list() {
    const db = requireSupabase();
    const { data, error } = await db
      .from("orders")
      .select(ORDER_SELECT)
      // Newest first, matching the in-memory store so the admin list does not
      // change order depending on which store is behind it.
      .order("placed_at", { ascending: false });

    if (error) throw new Error(`Listing orders failed: ${error.message}`);

    return ((data ?? []) as unknown as JoinedRow[]).map((row) =>
      fromRows(row, row.order_items ?? []),
    );
  },

  async setStatus(reference: string, status: OrderStatus, changedAt: string) {
    const db = requireSupabase();
    const { data, error } = await db
      .from("orders")
      .update({ status, status_changed_at: changedAt, updated_at: changedAt })
      .eq("reference", reference)
      // Returns nothing when no row matched, which is how a stale admin link
      // reports "not found" instead of silently claiming success.
      .select(ORDER_SELECT)
      .maybeSingle();

    if (error) {
      throw new Error(`Updating order ${reference} failed: ${error.message}`);
    }
    if (!data) return undefined;

    const row = data as unknown as JoinedRow;
    return fromRows(row, row.order_items ?? []) as StoredOrder;
  },
};
