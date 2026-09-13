/**
 * Admin session tokens.
 *
 * A signed, self-contained token rather than a random id in a session table:
 * there is no database yet, and an in-memory session table would log the owner
 * out on every deploy and every restart.
 *
 *   v1.<expires at, ms>.<nonce>.<HMAC-SHA256 of everything before it>
 *
 * The signature is what makes it safe. The expiry is inside the signed part,
 * so editing the cookie to extend a session invalidates it. The nonce means
 * two sessions issued in the same millisecond are still different strings.
 *
 * What this does NOT do is server-side revocation: there is nowhere to keep a
 * revocation list. Changing ADMIN_SESSION_SECRET invalidates every session at
 * once, which is the emergency exit.
 *
 * Pure apart from node:crypto, so the tests can drive it with a fixed clock.
 */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const SESSION_VERSION = "v1";

/** Eight hours: a working day, then log in again. */
export const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

const base64url = (buffer: Buffer): string => buffer.toString("base64url");

const sign = (payload: string, secret: string): string =>
  base64url(createHmac("sha256", secret).update(payload).digest());

export function makeNonce(): string {
  return base64url(randomBytes(12));
}

export function createSessionToken(
  secret: string,
  expiresAtMs: number,
  nonce: string = makeNonce(),
): string {
  const payload = `${SESSION_VERSION}.${expiresAtMs}.${nonce}`;
  return `${payload}.${sign(payload, secret)}`;
}

export type SessionVerification =
  | { ok: true; expiresAtMs: number }
  | { ok: false; reason: "malformed" | "bad_signature" | "expired" };

export function verifySessionToken(
  token: string,
  secret: string,
  nowMs: number,
): SessionVerification {
  const parts = token.split(".");
  if (parts.length !== 4) return { ok: false, reason: "malformed" };

  const [version, expiresRaw, nonce, signature] = parts;
  if (version !== SESSION_VERSION || nonce === "") {
    return { ok: false, reason: "malformed" };
  }

  const expiresAtMs = Number(expiresRaw);
  if (!Number.isSafeInteger(expiresAtMs) || expiresAtMs <= 0) {
    return { ok: false, reason: "malformed" };
  }

  // Signature first, then expiry. Checking expiry first would answer
  // "expired" for a token nobody had the secret to forge, which tells an
  // attacker their guess had the right shape.
  const expected = sign(`${version}.${expiresRaw}.${nonce}`, secret);
  const given = Buffer.from(signature);
  const want = Buffer.from(expected);
  if (given.length !== want.length || !timingSafeEqual(given, want)) {
    return { ok: false, reason: "bad_signature" };
  }

  if (nowMs >= expiresAtMs) return { ok: false, reason: "expired" };

  return { ok: true, expiresAtMs };
}
