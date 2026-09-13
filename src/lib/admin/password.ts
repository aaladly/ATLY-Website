/**
 * Admin password hashing.
 *
 * The password itself is never stored, never committed, and never seen by this
 * codebase. `ADMIN_PASSWORD_HASH` in .env.local holds a scrypt hash that the
 * owner generates for themselves with `npm run admin:password`.
 *
 * scrypt rather than a bare SHA: a plain hash of a human-chosen password is
 * guessable at billions of tries a second, and this one password is the only
 * thing between the internet and every customer's name, address and phone
 * number. scrypt is deliberately slow and memory-hard, and it ships in Node,
 * so this needs no dependency.
 *
 * Kept free of `server-only` so the unit tests can import it. Nothing in
 * src/components imports it, and it would fail loudly in a browser bundle
 * anyway, since node:crypto is not there.
 */

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

export type ScryptParams = {
  /** CPU/memory cost. Must be a power of two. */
  N: number;
  /** Block size. */
  r: number;
  /** Parallelisation. */
  p: number;
  keyLength: number;
};

/**
 * ~100ms and 16MB per attempt on a typical machine. Slow enough to make an
 * offline guessing attack expensive, fast enough that a login does not feel
 * broken.
 */
export const DEFAULT_PARAMS: ScryptParams = { N: 16384, r: 8, p: 1, keyLength: 32 };

const derive = (
  password: string,
  salt: Buffer,
  params: ScryptParams,
): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scrypt(
      password.normalize("NFKC"),
      salt,
      params.keyLength,
      // 128 * N * r is scrypt's working set; maxmem must exceed it or Node
      // refuses with a memory-limit error rather than a wrong answer.
      { N: params.N, r: params.r, p: params.p, maxmem: 256 * params.N * params.r },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });

/**
 * Self-describing, so the cost parameters can be raised later without
 * invalidating hashes that already exist.
 *
 *   scrypt:N:r:p:<salt base64url>:<key base64url>
 *
 * The encoding is chosen to survive a .env file untouched, and that is not a
 * cosmetic decision. Next loads .env.local through dotenv WITH VARIABLE
 * EXPANSION, so a value containing `$` is rewritten on the way in: the
 * obvious `scrypt$16384$8$1$...` format arrives as `scrypt6384...`, with the
 * parameters eaten as undefined variables. Nothing errors — the owner pastes
 * the hash the tool gave them, and the password simply never works again.
 *
 * So: `:` rather than `$` between the fields, and base64url rather than
 * base64, which also avoids the `+`, `/` and `=` that invite quoting mistakes.
 * Do not "tidy" this back to the conventional `$` form.
 */
const BASE64URL = /^[A-Za-z0-9_-]+$/;

export async function hashPassword(
  password: string,
  params: ScryptParams = DEFAULT_PARAMS,
): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, params);
  return [
    "scrypt",
    params.N,
    params.r,
    params.p,
    salt.toString("base64url"),
    key.toString("base64url"),
  ].join(":");
}

export type ParsedHash = { params: ScryptParams; salt: Buffer; key: Buffer };

export function parsePasswordHash(encoded: string): ParsedHash | null {
  const parts = encoded.trim().split(":");
  if (parts.length !== 6 || parts[0] !== "scrypt") return null;

  const [, nRaw, rRaw, pRaw, saltRaw, keyRaw] = parts;
  const N = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);
  if (![N, r, p].every((value) => Number.isInteger(value) && value > 0)) return null;
  // N must be a power of two, and refusing an absurd one here stops a
  // malformed env var from trying to allocate the machine.
  if ((N & (N - 1)) !== 0 || N > 1 << 20) return null;

  // Checked with a regex before decoding: Buffer.from does not throw on
  // rubbish, it quietly drops whatever it does not recognise. Without this, a
  // mangled hash would decode to a short buffer and be reported as a wrong
  // password rather than as a broken hash.
  if (!BASE64URL.test(saltRaw) || !BASE64URL.test(keyRaw)) return null;

  const salt = Buffer.from(saltRaw, "base64url");
  const key = Buffer.from(keyRaw, "base64url");
  if (salt.length === 0 || key.length === 0) return null;

  return { params: { N, r, p, keyLength: key.length }, salt, key };
}

/**
 * Constant-time comparison against a stored hash.
 *
 * Returns false rather than throwing on a malformed hash: a broken env var
 * should mean "nobody can log in", never "an exception leaks the reason".
 */
export async function verifyPassword(
  password: string,
  encoded: string,
): Promise<boolean> {
  const parsed = parsePasswordHash(encoded);
  if (!parsed) return false;

  try {
    const candidate = await derive(password, parsed.salt, parsed.params);
    if (candidate.length !== parsed.key.length) return false;
    return timingSafeEqual(candidate, parsed.key);
  } catch {
    return false;
  }
}
