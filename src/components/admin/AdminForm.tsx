"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/admin/actions";

const EMPTY: ActionState = {};

/**
 * The shape every admin form takes.
 *
 * One save button, one place the errors appear, and a pending state that
 * disables the button — so a slow save cannot be double-submitted, and a
 * refused save always says why rather than looking like nothing happened.
 *
 * Errors are shown as a summary rather than beside each field. The forms here
 * are short tables, one person uses them, and a summary is far less markup to
 * get wrong than threading a message into every cell.
 */
export function AdminForm({
  action,
  children,
  submitLabel = "Save",
  pendingLabel = "Saving…",
}: {
  action: (previous: ActionState, formData: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  submitLabel?: string;
  pendingLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, EMPTY);

  return (
    <form action={formAction}>
      {children}

      {/* role=alert so a refusal is announced, not only drawn. */}
      {state.issues && state.issues.length > 0 && (
        <div role="alert" className="mt-6 border-2 border-error bg-ivory p-5">
          <p className="label-caps text-error">Not saved</p>
          <ul className="mt-3 space-y-2">
            {state.issues.map((problem, index) => (
              <li key={`${problem.field}-${index}`} className="text-body-m text-error">
                {problem.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-7 flex flex-wrap items-center gap-5">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center bg-cocoa-deep px-7 py-3.5 text-label uppercase text-cream transition-colors duration-200 hover:bg-cocoa disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? pendingLabel : submitLabel}
        </button>

        <p role="status" aria-live="polite" className="text-body-s">
          {state.ok && state.message ? (
            <span className="text-gold-deep">{state.message}</span>
          ) : null}
        </p>
      </div>
    </form>
  );
}
