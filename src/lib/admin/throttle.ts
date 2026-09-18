/**
 * The admin login throttle's numbers and its one decision.
 *
 * Split out of auth.ts because that module needs cookies() and next/headers,
 * which makes it unreachable from a plain unit test. Same split as the payment
 * outcome: the part that can actually be wrong lives where a test can get at
 * it, and the part that needs a request context stays in auth.ts.
 *
 * WHY THIS SHAPE ------------------------------------------------------------
 * The throttle used to count globally and only globally. The reasoning was
 * sound as far as it went — there is one account, and a per-IP counter is
 * bypassed by rotating addresses — but what it traded away was the owner.
 * Anyone could lock them out of their own admin, from anywhere, by failing ten
 * times on purpose, while an attacker who rotates addresses was not stopped by
 * it anyway. The trade bought very little and cost the thing the admin is for.
 *
 * Three layers now:
 *
 *   1. PER-IP, and strict. The one that bites, because it is what a real
 *      attacker hits first from any single address.
 *
 *   2. A PROGRESSIVE DELAY per address, doubling to a cap. Guessing stays
 *      possible and stops being worth anyone's time, while a person who
 *      mistyped waits a second instead of being locked out.
 *
 *   3. A GLOBAL CAP, the backstop the old code was reaching for, set far
 *      enough above normal use that reaching it means something is happening
 *      across many addresses at once.
 *
 * scrypt is still the half that does not reset, and the reason none of this
 * has to be perfect.
 * ---------------------------------------------------------------------------
 */

/** Per address. Low, because somebody who knows the password needs two or three. */
export const MAX_FAILURES_PER_IP = 5;

/**
 * Across every address. The backstop, not the main defence.
 *
 * Deliberately far above MAX_FAILURES_PER_IP so only a distributed attempt
 * reaches it. The old value was 10, which one person having a bad morning
 * could hit.
 */
export const MAX_FAILURES_GLOBAL = 100;

export const WINDOW_MS = 15 * 60 * 1000;

/** Doubling from one second: 1s, 2s, 4s, 8s, then capped. */
const DELAY_BASE_MS = 1000;
const DELAY_CAP_MS = 8000;

export const IP_BUCKET = "admin-login-ip";
export const GLOBAL_BUCKET = "admin-login-global";
export const GLOBAL_KEY = "all";

/**
 * How long to stall before answering, given this address's failures so far.
 *
 * Capped, because without a cap this becomes a self-inflicted denial of
 * service: enough failures and every attempt ties up a worker for minutes.
 */
export function progressiveDelayMs(failures: number): number {
  if (failures <= 0) return 0;
  return Math.min(DELAY_CAP_MS, DELAY_BASE_MS * 2 ** (failures - 1));
}
