/**
 * Rate limiting, in memory.
 *
 * No `server-only` marker here, deliberately: it holds nothing but counters,
 * and the marker throws outside a bundler, which would make this module
 * untestable. The part that does touch a request lives in clientIp.ts and
 * carries the marker there.
 *
 * WHY IN MEMORY ------------------------------------------------------------
 * Hostinger runs this as one long-running Node process. A module-level Map is
 * therefore the whole picture rather than one instance's guess at it, which is
 * the usual reason to reach for Redis. There is no Redis here and adding one
 * would be a service to run, pay for and monitor in order to count to ten.
 *
 * The cost is that counters reset when the process restarts. For checkout
 * throttling that is acceptable: an attacker cannot make the process restart,
 * and a restart clearing a few minutes of counting is not the failure anyone
 * is worried about. The admin login counter is the exception and says so
 * where it lives.
 *
 * If this ever moves to more than one instance, every limit below silently
 * multiplies by the instance count. That is the thing to remember.
 * ---------------------------------------------------------------------------
 */

type Window = { count: number; resetAt: number };

const globalForLimits = globalThis as unknown as {
  __atlyRateLimits?: Map<string, Window>;
};

const limits: Map<string, Window> =
  globalForLimits.__atlyRateLimits ?? new Map<string, Window>();
globalForLimits.__atlyRateLimits = limits;

/**
 * Drop expired windows so the Map cannot grow without bound.
 *
 * An unbounded Map keyed by client IP is itself a memory exhaustion attack:
 * enough distinct source addresses and the limiter is the thing that takes
 * the site down. Swept on write rather than on a timer, so an idle process
 * does no work.
 */
function sweep(now: number): void {
  if (limits.size < 1000) return;
  for (const [key, window] of limits) {
    if (window.resetAt <= now) limits.delete(key);
  }
}

export type RateVerdict = {
  allowed: boolean;
  /** How long until this key is allowed again. Zero when allowed. */
  retryAfterMs: number;
  /** Attempts used in the current window, including this one. */
  used: number;
};

/**
 * Count one attempt against a key, and say whether it is allowed.
 *
 * A fixed window rather than a sliding one: it is a few lines instead of a
 * sorted list per key, and the worst case — twice the limit across a window
 * boundary — does not matter for any of the things being limited here.
 *
 * @param bucket   Namespace, so an IP's checkout count and its order-lookup
 *                 count never share a counter.
 * @param key      Usually an IP or a session id.
 * @param limit    Attempts permitted per window.
 * @param windowMs Length of the window.
 * @param now      Injected for tests.
 */
export function checkRate(
  bucket: string,
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): RateVerdict {
  sweep(now);

  const id = `${bucket}:${key}`;
  const existing = limits.get(id);

  if (!existing || existing.resetAt <= now) {
    limits.set(id, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0, used: 1 };
  }

  existing.count += 1;

  if (existing.count > limit) {
    return {
      allowed: false,
      retryAfterMs: Math.max(0, existing.resetAt - now),
      used: existing.count,
    };
  }

  return { allowed: true, retryAfterMs: 0, used: existing.count };
}

/** Forget a key entirely. Used after a successful admin sign-in. */
export function clearRate(bucket: string, key: string): void {
  limits.delete(`${bucket}:${key}`);
}

/** Read a key's current state without counting against it. */
export function peekRate(
  bucket: string,
  key: string,
  now: number = Date.now(),
): { used: number; retryAfterMs: number } {
  const existing = limits.get(`${bucket}:${key}`);
  if (!existing || existing.resetAt <= now) return { used: 0, retryAfterMs: 0 };
  return { used: existing.count, retryAfterMs: Math.max(0, existing.resetAt - now) };
}

/** Test seam. Not exported anywhere a request can reach. */
export function __resetAllRateLimits(): void {
  limits.clear();
}
