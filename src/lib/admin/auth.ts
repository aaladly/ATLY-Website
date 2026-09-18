import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyPassword } from "./password";
import {
  SESSION_DURATION_MS,
  createSessionToken,
  verifySessionToken,
} from "./session";
import { checkRate, clearRate, peekRate } from "../rateLimit";
import { clientIp } from "../clientIp";
import {
  GLOBAL_BUCKET,
  GLOBAL_KEY,
  IP_BUCKET,
  MAX_FAILURES_GLOBAL,
  MAX_FAILURES_PER_IP,
  WINDOW_MS,
  progressiveDelayMs,
} from "./throttle";

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
 * The numbers, and the reasoning behind the three layers, live in throttle.ts
 * — separated so they can be unit tested without a request context. What is
 * left here is the part that needs one.
 */

/**
 * Milliseconds until login is allowed again, or 0 if it is allowed now.
 *
 * Peeks rather than counts, so rendering the login page never spends an
 * attempt.
 */
export function lockoutRemainingMs(ip: string, nowMs: number = Date.now()): number {
  const perIp = peekRate(IP_BUCKET, ip, nowMs);
  if (perIp.used >= MAX_FAILURES_PER_IP) return perIp.retryAfterMs;

  const global = peekRate(GLOBAL_BUCKET, GLOBAL_KEY, nowMs);
  if (global.used >= MAX_FAILURES_GLOBAL) return global.retryAfterMs;

  return 0;
}

/** Failures recorded for this address in the current window. */
const failuresFor = (ip: string, nowMs: number): number =>
  peekRate(IP_BUCKET, ip, nowMs).used;

function recordFailure(ip: string, nowMs: number): void {
  checkRate(IP_BUCKET, ip, MAX_FAILURES_PER_IP, WINDOW_MS, nowMs);
  checkRate(GLOBAL_BUCKET, GLOBAL_KEY, MAX_FAILURES_GLOBAL, WINDOW_MS, nowMs);
}

/**
 * Forget this address's failures after a correct password.
 *
 * The GLOBAL counter is deliberately NOT cleared. One correct sign-in says
 * something about this address; it says nothing about the hundred failures
 * arriving from elsewhere, and clearing it would hand an attacker a reset
 * button in the form of the owner logging in.
 */
function clearFailures(ip: string): void {
  clearRate(IP_BUCKET, ip);
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
  const ip = await clientIp();

  const locked = lockoutRemainingMs(ip, now);
  if (locked > 0) {
    const minutes = Math.ceil(locked / 60000);
    return {
      ok: false,
      message: `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    };
  }

  /*
    The progressive delay, paid BEFORE the password is checked.

    Before, so it costs the same whether the guess was close or nowhere near:
    a delay applied only to failures is a timing oracle that says "that one
    was different". Ahead of verifyPassword it is simply the price of an
    attempt from an address that has been getting them wrong.
  */
  const delay = progressiveDelayMs(failuresFor(ip, now));
  if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));

  if (password === "" || !(await verifyPassword(password, config.hash))) {
    recordFailure(ip, now);
    // Deliberately vague. "Wrong password" and "no such user" are the same
    // sentence here anyway, but there is also nothing to gain from confirming
    // that the password was the part that was wrong.
    return { ok: false, message: "That did not work. Check the password and try again." };
  }

  clearFailures(ip);

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
