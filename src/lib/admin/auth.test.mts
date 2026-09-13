import test from "node:test";
import assert from "node:assert/strict";

import { hashPassword, parsePasswordHash, verifyPassword } from "./password.ts";
import {
  SESSION_VERSION,
  createSessionToken,
  makeNonce,
  verifySessionToken,
} from "./session.ts";

// ---------------------------------------------------------------------------
// Password hashing
// ---------------------------------------------------------------------------

// scrypt is deliberately slow — that is the point of it — so these run with a
// cost low enough to test quickly. The production parameters are in
// DEFAULT_PARAMS and are not what is being asserted here.
const FAST = { N: 1024, r: 8, p: 1, keyLength: 32 };

test("the right password verifies", async () => {
  const hash = await hashPassword("a correct horse battery staple", FAST);
  assert.equal(await verifyPassword("a correct horse battery staple", hash), true);
});

test("a wrong password does not", async () => {
  const hash = await hashPassword("a correct horse battery staple", FAST);
  assert.equal(await verifyPassword("a correct horse battery stapler", hash), false);
  assert.equal(await verifyPassword("", hash), false);
  assert.equal(await verifyPassword("A CORRECT HORSE BATTERY STAPLE", hash), false);
});

test("the same password hashes differently every time", async () => {
  const first = await hashPassword("same password", FAST);
  const second = await hashPassword("same password", FAST);
  // Different salts. Two identical hashes would mean the salt was not random.
  assert.notEqual(first, second);
  assert.equal(await verifyPassword("same password", first), true);
  assert.equal(await verifyPassword("same password", second), true);
});

test("the hash carries its own parameters, so they can be raised later", async () => {
  const hash = await hashPassword("passphrase for parsing", FAST);
  const parsed = parsePasswordHash(hash);
  assert.ok(parsed);
  assert.equal(parsed.params.N, FAST.N);
  assert.equal(parsed.params.r, FAST.r);
  assert.equal(parsed.salt.length, 16);
  assert.equal(parsed.key.length, 32);
});

test("a broken hash means nobody gets in, rather than an exception", async () => {
  for (const bad of [
    "",
    "not-a-hash",
    "scrypt:16384:8:1:onlyfiveparts",
    "bcrypt:16384:8:1:c2FsdA:aGFzaA",
    "scrypt:0:8:1:c2FsdA:aGFzaA",
    // N must be a power of two; and an absurd N must not be attempted.
    "scrypt:12345:8:1:c2FsdA:aGFzaA",
    "scrypt:1073741824:8:1:c2FsdA:aGFzaA",
    // Not base64url. Buffer.from would silently drop these characters and
    // produce a short key rather than an error.
    "scrypt:16384:8:1:c2Fsd$A:aGFzaA",
    "scrypt:16384:8:1:c2FsdA==:aGFzaA==",
  ]) {
    assert.equal(parsePasswordHash(bad), null, `expected null for: ${bad}`);
    assert.equal(await verifyPassword("anything", bad), false);
  }
});

test("a hash survives a .env file untouched", async () => {
  // Next loads .env.local through dotenv with variable expansion, so a `$` in
  // the value is rewritten on the way in and the password silently stops
  // working. This is the regression guard for that: nothing in a hash may be
  // a character an env file treats as special.
  const hash = await hashPassword("some passphrase", FAST);
  assert.match(hash, /^[A-Za-z0-9_:-]+$/);
  assert.ok(!hash.includes("$"));
  assert.ok(!hash.includes('"'));
  assert.ok(!hash.includes("'"));
  assert.ok(!hash.includes("\\"));
});

test("unicode passwords normalise, so the same keystrokes always work", async () => {
  // "é" typed as one code point vs as e + combining accent. Both are the same
  // password to the person typing it.
  const composed = "café passphrase";
  const decomposed = "café passphrase";
  const hash = await hashPassword(composed, FAST);
  assert.equal(await verifyPassword(decomposed, hash), true);
});

// ---------------------------------------------------------------------------
// Session tokens
// ---------------------------------------------------------------------------

const SECRET = "a-test-secret-at-least-32-characters-long";
const NOW = 1_700_000_000_000;

test("a freshly signed token verifies", () => {
  const token = createSessionToken(SECRET, NOW + 60_000);
  const result = verifySessionToken(token, SECRET, NOW);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.expiresAtMs, NOW + 60_000);
});

test("a token signed with a different secret is rejected", () => {
  const token = createSessionToken(SECRET, NOW + 60_000);
  const result = verifySessionToken(token, "a-different-secret-32-characters-x", NOW);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "bad_signature");
});

test("editing the expiry in the cookie invalidates the token", () => {
  // The expiry is inside the signed payload, so extending a session by editing
  // the cookie breaks the signature rather than granting more time.
  const token = createSessionToken(SECRET, NOW + 60_000, "fixed-nonce");
  const [version, , nonce, signature] = token.split(".");
  const forged = [version, String(NOW + 999_999_999), nonce, signature].join(".");

  const result = verifySessionToken(forged, SECRET, NOW);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "bad_signature");
});

test("an expired token is rejected, at the exact moment it expires", () => {
  const token = createSessionToken(SECRET, NOW);
  const result = verifySessionToken(token, SECRET, NOW);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "expired");
});

test("a forged token is reported as a bad signature, never as expired", () => {
  // Answering "expired" for something nobody could have signed would tell an
  // attacker their guess had the right shape.
  const forged = `${SESSION_VERSION}.${NOW - 1}.${makeNonce()}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`;
  const result = verifySessionToken(forged, SECRET, NOW);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "bad_signature");
});

test("junk in the cookie is rejected without throwing", () => {
  for (const bad of [
    "",
    "garbage",
    "a.b.c",
    "a.b.c.d.e",
    `v2.${NOW + 1000}.nonce.sig`,
    `${SESSION_VERSION}.not-a-number.nonce.sig`,
    `${SESSION_VERSION}.${NOW + 1000}..sig`,
  ]) {
    const result = verifySessionToken(bad, SECRET, NOW);
    assert.equal(result.ok, false, `expected rejection for: ${bad}`);
  }
});

test("two sessions issued at the same instant are different tokens", () => {
  const a = createSessionToken(SECRET, NOW + 60_000);
  const b = createSessionToken(SECRET, NOW + 60_000);
  assert.notEqual(a, b);
  assert.equal(verifySessionToken(a, SECRET, NOW).ok, true);
  assert.equal(verifySessionToken(b, SECRET, NOW).ok, true);
});
