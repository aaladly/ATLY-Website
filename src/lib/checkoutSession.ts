import "server-only";

import { cookies } from "next/headers";

/**
 * A per-browser id, used only for rate limiting checkout.
 *
 * WHAT THIS IS NOT ----------------------------------------------------------
 * Not a login, not a customer identifier, and not linked to an order. It is a
 * random value in a cookie whose entire job is to be a second thing to count
 * against, so that rotating x-forwarded-for does not reset somebody's
 * checkout allowance.
 *
 * Nothing is stored against it and it is never written to an order, so it
 * carries no personal data and there is nothing to disclose about it beyond
 * the strictly-necessary cookie the privacy page already describes.
 * ---------------------------------------------------------------------------
 *
 * httpOnly so no script can read or forge it, sameSite lax so it survives a
 * normal navigation into checkout, and secure in production.
 */
export const CHECKOUT_SESSION_COOKIE = "atly_cs";

/** A day. Long enough to cover an interrupted checkout, short enough to expire. */
const MAX_AGE_SECONDS = 24 * 60 * 60;

/**
 * Read this browser's id, minting one if it has none.
 *
 * Callable only from a Server Action or Route Handler, because setting a
 * cookie is not possible once a response has started streaming.
 *
 * A caller that cannot set the cookie still gets a usable value: the id is
 * returned either way, and the worst case is that a browser which refuses
 * cookies is counted as a fresh session each time. Such a browser is still
 * covered by the per-IP limit, which is why this one is the second counter
 * and not the only one.
 */
export async function checkoutSessionId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(CHECKOUT_SESSION_COOKIE)?.value;

  if (existing && /^[0-9a-f]{32}$/.test(existing)) return existing;

  const minted = crypto.randomUUID().replace(/-/g, "");

  try {
    jar.set(CHECKOUT_SESSION_COOKIE, minted, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: MAX_AGE_SECONDS,
    });
  } catch {
    // Read-only cookie context. The id still works for this request; it just
    // will not persist, and the per-IP limit covers that case.
  }

  return minted;
}
