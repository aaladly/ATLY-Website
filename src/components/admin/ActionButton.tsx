"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/admin/actions";

const EMPTY: ActionState = {};

/**
 * A button that runs a Server Action with no form fields behind it.
 *
 * `note` is a line of warning text shown above the button, for the ones whose
 * effect is not obvious from the label alone.
 */
export function ActionButton({
  action,
  label,
  pendingLabel = "Working…",
  note,
  tone = "quiet",
}: {
  action: () => Promise<ActionState>;
  label: string;
  pendingLabel?: string;
  note?: string;
  tone?: "quiet" | "danger";
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async () => action(),
    EMPTY,
  );

  const className =
    tone === "danger"
      ? "inline-flex items-center border border-error px-6 py-3 text-label uppercase text-error transition-colors duration-200 hover:bg-error hover:text-cream disabled:cursor-not-allowed disabled:opacity-40"
      : "inline-flex items-center border border-cocoa-deep px-6 py-3 text-label uppercase text-cocoa-deep transition-colors duration-200 hover:bg-cocoa-deep hover:text-cream disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <form action={formAction}>
      {note && <p className="mb-3 text-body-s text-cocoa">{note}</p>}
      <button type="submit" disabled={pending} className={className}>
        {pending ? pendingLabel : label}
      </button>
      <p role="status" aria-live="polite" className="mt-3 text-body-s">
        {state.ok && state.message && (
          <span className="text-gold-deep">{state.message}</span>
        )}
        {state.issues?.[0] && (
          <span className="text-error">{state.issues[0].message}</span>
        )}
      </p>
    </form>
  );
}
