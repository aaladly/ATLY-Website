"use client";

import { useActionState } from "react";
import {
  setOrderStatusAction,
  type ActionState,
} from "@/app/admin/actions";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_NOTE,
  type OrderStatus,
} from "@/lib/orders/status";

const EMPTY: ActionState = {};

/**
 * Change an order's status.
 *
 * A select plus a save button rather than a row of one-click buttons. An
 * order's status is not a straight line — something can be cancelled from any
 * point, and a mis-tap on a single-click "Delivered" would be a lie told to
 * the customer. Choosing, then confirming, is one more click and far harder to
 * do by accident.
 */
export function OrderStatusForm({
  reference,
  current,
}: {
  reference: string;
  current: OrderStatus;
}) {
  const [state, formAction, pending] = useActionState(setOrderStatusAction, EMPTY);
  const error = state.issues?.[0]?.message;

  return (
    <form action={formAction}>
      <input type="hidden" name="reference" value={reference} />

      <label htmlFor="order-status" className="mb-2 block text-body-s text-cocoa">
        Status
      </label>
      <div className="flex flex-wrap items-center gap-4">
        <select
          id="order-status"
          name="status"
          defaultValue={current}
          className="h-11 rounded-sm border border-cocoa bg-ivory px-3 text-body-m"
        >
          {ORDER_STATUSES.map((status) => (
            <option key={status} value={status}>
              {ORDER_STATUS_LABEL[status]}
            </option>
          ))}
        </select>

        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center bg-cocoa-deep px-6 py-3 text-label uppercase text-cream transition-colors duration-200 hover:bg-cocoa disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "Saving…" : "Save status"}
        </button>
      </div>

      {/* Describes the SAVED status, not whatever is selected in the box —
          so it stays true until a save actually lands. */}
      <p className="mt-3 text-body-s text-cocoa">
        Right now: {ORDER_STATUS_NOTE[current].toLowerCase()}
      </p>

      <p role="status" aria-live="polite" className="mt-2 text-body-s">
        {state.ok && state.message && (
          <span className="text-gold-deep">{state.message}</span>
        )}
        {error && (
          <span role="alert" className="text-error">
            {error}
          </span>
        )}
      </p>
    </form>
  );
}
