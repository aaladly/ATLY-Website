import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyPassword } from "./password";
import {
  SESSION_DURATION_MS,
  createSessionToken,
  verifySessionToken,
} from "./session";

/**
 * The admin's front door.
 *
 * The real check happens here, in a Server Component and in every Server
 * Action — not in proxy.ts. Next's own guidance is that proxy is for
 * optimistic redirects, not authorisation, and an authorisation check that
 * lives only in a redirect is one routing change away from being bypassed.
 */

export const ADMIN_COOKIE = "atly_admin";
export const LOGIN_PATH = "/admin/login";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Both secrets, or the admin refuses to let anyone in.
 *
 * There is deliberately no default password and no "unset means open" path. An
 * admin that quietly works with no configuration is an admin that ships to
 * production wide open.
 */
export function adminConfig(): { hash: string; secret: string } | null {
  const hash = process.env.ADMIN_PASSWORD_HASH?.trim();
  const secret = process.env.ADMIN_SESSION_SECRET?.trim();
  if (!hash || !secret) return null;
  // A short secret is not a secret. 32 characters is 192 bits of base64.
  if (secret.length < 32) return null;
  return { hash, secret };
}

export function isAdminConfigured(): boolean {
  return adminConfig() !== null;
}

/** Which piece is missing, for the setup message on the login page. */
export function missingAdminConfig(): string[] {
  const missing: string[] = [];
  const hash = process.env.ADMIN_PASSWORD_HASH?.trim();
  const secret = process.env.ADMIN_SESSION_SECRET?.trim();
  if (!hash) missing.push("ADMIN_PASSWORD_HASH");
  if (!secret) missing.push("ADMIN_SESSION_SECRET");
  else if (secret.length < 32) missing.push("ADMIN_SESSION_SECRET (at least 32 characters)");
  return missing;
}

// ---------------------------------------------------------------------------
// Brute-force throttle
// ---------------------------------------------------------------------------

/**
 * One password, no username, and a public URL: an online guessing attack is
 * the obvious threat, so failures are counted.
 *
 * Counted globally rather than per IP on purpose. There is only one account,
 * and a per-IP counter is bypassed by rotating IPs, which is the easy part of
 * an attack. The cost is that someone can lock the owner out for a few
 * minutes by failing on purpose — an annoyance, against a real defence.
 *
 * In memory, so it resets on restart, and on Vercel each instance counts
 * separately. scrypt is the other half of the defence and does not reset.
 */
const MAX_FAILURES = 10;
const WINDOW_MS = 15 * 60 * 1000;

type Throttle = { failures: number; firstFailureAt: number };

const globalForThrottle = globalThis as unknown as { __atlyAdminThrottle?: Throttle };

const throttle = (): Throttle => {
  globalForThrottle.__atlyAdminThrottle ??= { failures: 0, firstFailureAt: 0 };
  return globalForThrottle.__atlyAdminThrottle;
};

/** Milliseconds until login is allowed again, or 0 if it is allowed now. */
export function lockoutRemainingMs(nowMs: number = Date.now()): number {
  const state = throttle();
  if (state.failures < MAX_FAILURES) return 0;
  const remaining = state.firstFailureAt + WINDOW_MS - nowMs;
  if (remaining <= 0) {
    state.failures = 0;
    state.firstFailureAt = 0;
    return 0;
  }
  return remaining;
}

function recordFailure(nowMs: number): void {
  const state = throttle();
  if (state.failures === 0 || nowMs - state.firstFailureAt > WINDOW_MS) {
    state.failures = 1;
    state.firstFailureAt = nowMs;
    return;
  }
  state.failures += 1;
}

function clearFailures(): void {
  const state = throttle();
  state.failures = 0;
  state.firstFailureAt = 0;
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export async function isSignedIn(): Promise<boolean> {
  const config = adminConfig();
  if (!config) return false;

  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return false;

  return verifySessionToken(token, config.secret, Date.now()).ok;
}

/**
 * Guard for admin pages and every admin Server Action.
 *
 * Called in the layout AND in each action. The layout guard is what a person
 * hits; the per-action guard is what matters, because a Server Action is a
 * public endpoint that can be invoked without ever rendering the page it was
 * defined on.
 */
export async function requireAdmin(): Promise<void> {
  if (!(await isSignedIn())) redirect(LOGIN_PATH);
}

export type LoginOutcome =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Check a password and start a session.
 *
 * Only callable from a Server Action or Route Handler, because it sets a
 * cookie and HTTP cannot set one once the response has started streaming.
 */
export async function signIn(password: string): Promise<LoginOutcome> {
  const config = adminConfig();
  if (!config) {
    return {
      ok: false,
      message: "The admin is not set up on this server yet.",
    };
  }

  const now = Date.now();
  const locked = lockoutRemainingMs(now);
  if (locked > 0) {
    const minutes = Math.ceil(locked / 60000);
    return {
      ok: false,
      message: `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    };
  }

  if (password === "" || !(await verifyPassword(password, config.hash))) {
    recordFailure(now);
    // Deliberately vague. "Wrong password" and "no such user" are the same
    // sentence here anyway, but there is also nothing to gain from confirming
    // that the password was the part that was wrong.
    return { ok: false, message: "That did not work. Check the password and try again." };
  }

  clearFailures();

  const expiresAtMs = now + SESSION_DURATION_MS;
  (await cookies()).set(ADMIN_COOKIE, createSessionToken(config.secret, expiresAtMs), {
    httpOnly: true,
    sameSite: "lax",
    // Lax rather than strict so following a link straight into /admin keeps
    // the session; the cookie is not a bearer token for any cross-site form.
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAtMs),
  });

  return { ok: true };
}

export async function signOut(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
}
