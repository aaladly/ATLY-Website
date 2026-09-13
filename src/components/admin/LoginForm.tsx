"use client";

import { useActionState } from "react";
import { loginAction, type ActionState } from "@/app/admin/actions";

const EMPTY: ActionState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, EMPTY);
  const error = state.issues?.[0]?.message;

  return (
    <form action={formAction}>
      <label htmlFor="admin-password" className="mb-2 block text-body-s text-cocoa">
        Password
      </label>
      <input
        id="admin-password"
        name="password"
        type="password"
        // The browser's password manager is the right place for this, and
        // "current-password" is what tells it so.
        autoComplete="current-password"
        required
        autoFocus
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "admin-password-error" : undefined}
        className={`h-12 w-full rounded-sm bg-ivory px-4 text-body-m ${
          error ? "border-2 border-error" : "border border-cocoa"
        }`}
      />

      {error && (
        <p
          id="admin-password-error"
          role="alert"
          className="mt-3 text-body-s text-error"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-7 inline-flex w-full items-center justify-center bg-cocoa-deep px-8 py-4 text-label uppercase text-cream transition-colors duration-200 hover:bg-cocoa disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}
