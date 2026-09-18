import "server-only";

import { headers } from "next/headers";

/**
 * The client's address, as well as it can be known.
 *
 * Separate from rateLimit.ts on purpose: this is the one part that needs
 * next/headers, and keeping it out of that module is what lets the counting
 * logic be a plain unit test rather than something needing a request context.
 * Same reason the pricing and delivery engines take their configuration as
 * arguments.
 *
 * Hostinger puts a proxy in front of this, so the socket address is the
 * proxy's and x-forwarded-for carries the real one. The FIRST entry is the
 * client; everything after it was appended by intermediaries.
 *
 * TRUST NOTE ----------------------------------------------------------------
 * x-forwarded-for is client-supplied and trivially spoofed. A determined
 * attacker rotates it and defeats every per-IP limit built on it. That is
 * understood and accepted: these limits exist to stop casual scripted abuse
 * and accidental hammering, which is nearly all of it in practice.
 *
 * The defences that do NOT depend on this are the ones carrying the real
 * weight: scrypt on the admin password, the amount check on the webhook, and
 * server-side recalculation of every figure at checkout. It is also why the
 * admin throttle keeps a global cap behind the per-IP one rather than
 * replacing it.
 * ---------------------------------------------------------------------------
 */
export async function clientIp(): Promise<string> {
  const h = await headers();

  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  return h.get("x-real-ip")?.trim() || "unknown";
}
