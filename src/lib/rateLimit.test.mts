/**
 * Rate limiter tests.
 *
 * Run: npm test
 *
 * The clock is injected, so none of these sleep. A limiter tested with real
 * timers is a slow test suite that people stop running.
 */

import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { checkRate, clearRate, peekRate, __resetAllRateLimits } from "./rateLimit.ts";

beforeEach(() => __resetAllRateLimits());

const T0 = 1_000_000;

describe("counting within a window", () => {
  test("attempts up to the limit are allowed", () => {
    for (let i = 1; i <= 5; i++) {
      const verdict = checkRate("test", "1.2.3.4", 5, 60_000, T0);
      assert.equal(verdict.allowed, true, `attempt ${i} should be allowed`);
      assert.equal(verdict.used, i);
    }
  });

  test("the attempt after the limit is refused", () => {
    for (let i = 0; i < 5; i++) checkRate("test", "1.2.3.4", 5, 60_000, T0);
    const verdict = checkRate("test", "1.2.3.4", 5, 60_000, T0);
    assert.equal(verdict.allowed, false);
    assert.ok(verdict.retryAfterMs > 0, "a refusal must say how long to wait");
  });

  test("retryAfterMs counts down as the window elapses", () => {
    for (let i = 0; i < 6; i++) checkRate("test", "1.2.3.4", 5, 60_000, T0);
    const early = checkRate("test", "1.2.3.4", 5, 60_000, T0 + 10_000);
    const late = checkRate("test", "1.2.3.4", 5, 60_000, T0 + 50_000);
    assert.ok(late.retryAfterMs < early.retryAfterMs);
  });
});

describe("the window expiring", () => {
  test("the count starts again in a fresh window", () => {
    for (let i = 0; i < 6; i++) checkRate("test", "1.2.3.4", 5, 60_000, T0);
    assert.equal(checkRate("test", "1.2.3.4", 5, 60_000, T0).allowed, false);

    const afterWindow = checkRate("test", "1.2.3.4", 5, 60_000, T0 + 60_001);
    assert.equal(afterWindow.allowed, true);
    assert.equal(afterWindow.used, 1);
  });
});

describe("keys and buckets do not bleed into each other", () => {
  test("two addresses are counted separately", () => {
    for (let i = 0; i < 6; i++) checkRate("test", "1.1.1.1", 5, 60_000, T0);
    assert.equal(checkRate("test", "1.1.1.1", 5, 60_000, T0).allowed, false);
    // One address exhausting its allowance must never lock out another. This
    // is the whole reason the admin throttle moved to per-IP counting.
    assert.equal(checkRate("test", "2.2.2.2", 5, 60_000, T0).allowed, true);
  });

  test("the same address in two buckets is counted separately", () => {
    for (let i = 0; i < 6; i++) checkRate("checkout", "1.1.1.1", 5, 60_000, T0);
    assert.equal(checkRate("checkout", "1.1.1.1", 5, 60_000, T0).allowed, false);
    // Hammering checkout must not also lock somebody out of looking up an
    // order they have already paid for.
    assert.equal(checkRate("order", "1.1.1.1", 5, 60_000, T0).allowed, true);
  });
});

describe("clearing and peeking", () => {
  test("clearRate forgets a key completely", () => {
    for (let i = 0; i < 6; i++) checkRate("test", "1.1.1.1", 5, 60_000, T0);
    clearRate("test", "1.1.1.1");
    assert.equal(checkRate("test", "1.1.1.1", 5, 60_000, T0).allowed, true);
  });

  test("peekRate does not count as an attempt", () => {
    checkRate("test", "1.1.1.1", 5, 60_000, T0);
    assert.equal(peekRate("test", "1.1.1.1", T0).used, 1);
    assert.equal(peekRate("test", "1.1.1.1", T0).used, 1);
    // Still 1 after two peeks, so a page that displays remaining attempts
    // cannot exhaust them by rendering.
    assert.equal(checkRate("test", "1.1.1.1", 5, 60_000, T0).used, 2);
  });

  test("peeking an unknown key is zero rather than an error", () => {
    assert.deepEqual(peekRate("test", "nobody", T0), { used: 0, retryAfterMs: 0 });
  });
});

describe("the map does not grow without bound", () => {
  test("expired windows are swept once there are enough of them", () => {
    // An unbounded map keyed by client IP is itself a memory exhaustion
    // attack: enough distinct source addresses and the limiter is what takes
    // the site down.
    for (let i = 0; i < 1200; i++) {
      checkRate("test", `10.0.${Math.floor(i / 256)}.${i % 256}`, 5, 1_000, T0);
    }
    // Long after every one of those windows has expired, one more write
    // triggers the sweep.
    checkRate("test", "fresh", 5, 1_000, T0 + 10_000);
    for (let i = 0; i < 1200; i++) {
      const key = `10.0.${Math.floor(i / 256)}.${i % 256}`;
      assert.equal(
        peekRate("test", key, T0 + 10_000).used,
        0,
        `${key} should have been swept`,
      );
    }
  });
});
