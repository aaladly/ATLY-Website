/**
 * Admin login throttle tests.
 *
 * Run: npm test
 *
 * signIn() itself needs cookies() and a request context, so what is tested
 * here is the part that decides: the progressive delay, and the counting that
 * sits underneath it. Same split as the payment outcome tests — the decision
 * is pulled out where a test can reach it.
 */

import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { progressiveDelayMs } from "./throttle.ts";
import { checkRate, peekRate, clearRate, __resetAllRateLimits } from "../rateLimit.ts";

beforeEach(() => __resetAllRateLimits());

const T0 = 2_000_000;
const IP_BUCKET = "admin-login-ip";
const GLOBAL_BUCKET = "admin-login-global";
const MAX_PER_IP = 5;
const MAX_GLOBAL = 100;
const WINDOW = 15 * 60 * 1000;

const fail = (ip: string, now = T0) => {
  checkRate(IP_BUCKET, ip, MAX_PER_IP, WINDOW, now);
  checkRate(GLOBAL_BUCKET, "all", MAX_GLOBAL, WINDOW, now);
};

describe("the progressive delay", () => {
  test("a first attempt is not delayed at all", () => {
    // Somebody arriving at the login page with the right password should not
    // be made to wait for anything.
    assert.equal(progressiveDelayMs(0), 0);
  });

  test("it doubles with each failure", () => {
    assert.equal(progressiveDelayMs(1), 1000);
    assert.equal(progressiveDelayMs(2), 2000);
    assert.equal(progressiveDelayMs(3), 4000);
    assert.equal(progressiveDelayMs(4), 8000);
  });

  test("it is capped, so a request cannot be held open indefinitely", () => {
    // Without a cap this is a self-inflicted denial of service: enough
    // failures and every login attempt ties up a worker for minutes.
    for (const failures of [5, 10, 50, 1000]) {
      assert.equal(progressiveDelayMs(failures), 8000, `${failures} failures`);
    }
  });

  test("a negative count is treated as none", () => {
    assert.equal(progressiveDelayMs(-1), 0);
  });
});

describe("one address cannot lock the owner out", () => {
  test("an attacker exhausting their own allowance leaves the owner alone", () => {
    /*
      This is the regression the rework exists for. The old throttle counted
      globally, so ten deliberate failures from anywhere locked the owner out
      of their own admin for fifteen minutes — while doing nothing to an
      attacker who rotates addresses.
    */
    for (let i = 0; i < MAX_PER_IP + 3; i++) fail("203.0.113.9");

    assert.ok(
      peekRate(IP_BUCKET, "203.0.113.9", T0).used > MAX_PER_IP,
      "the attacker should be over their limit",
    );
    assert.equal(
      peekRate(IP_BUCKET, "198.51.100.4", T0).used,
      0,
      "the owner's address must be untouched",
    );
  });

  test("the global backstop is far out of reach of one bad morning", () => {
    // A person who forgets their password and tries ten times must not trip
    // the global cap. The old limit was exactly 10.
    for (let i = 0; i < 10; i++) fail("198.51.100.4");
    assert.ok(
      peekRate(GLOBAL_BUCKET, "all", T0).used < MAX_GLOBAL,
      "ten failures must not approach the global cap",
    );
  });

  test("the global backstop still exists for a distributed attempt", () => {
    // Each address stays under its own limit, which is exactly the attack the
    // per-IP counter cannot see. The global counter is what catches it.
    for (let i = 0; i < 120; i++) fail(`10.0.${Math.floor(i / 256)}.${i % 256}`);
    assert.ok(
      peekRate(GLOBAL_BUCKET, "all", T0).used > MAX_GLOBAL,
      "many addresses at once should reach the global cap",
    );
  });
});

describe("a correct password clears the right counter", () => {
  test("signing in forgets that address's failures", () => {
    for (let i = 0; i < 3; i++) fail("198.51.100.4");
    clearRate(IP_BUCKET, "198.51.100.4");
    assert.equal(peekRate(IP_BUCKET, "198.51.100.4", T0).used, 0);
  });

  test("signing in does NOT clear the global counter", () => {
    /*
      Deliberate. One correct sign-in says something about this address and
      nothing about failures arriving from elsewhere — clearing the global
      counter would hand an attacker a reset button in the form of the owner
      logging in.
    */
    for (let i = 0; i < 120; i++) fail(`10.0.${Math.floor(i / 256)}.${i % 256}`);
    const before = peekRate(GLOBAL_BUCKET, "all", T0).used;

    clearRate(IP_BUCKET, "198.51.100.4");

    assert.equal(peekRate(GLOBAL_BUCKET, "all", T0).used, before);
  });
});

describe("the window expiring", () => {
  test("an address is allowed to try again in the next window", () => {
    for (let i = 0; i < MAX_PER_IP + 1; i++) fail("203.0.113.9");
    assert.ok(peekRate(IP_BUCKET, "203.0.113.9", T0).used > MAX_PER_IP);
    // Locked out for fifteen minutes, not forever.
    assert.equal(peekRate(IP_BUCKET, "203.0.113.9", T0 + WINDOW + 1).used, 0);
  });
});
