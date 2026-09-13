/**
 * Human-facing order references, e.g. "ATLY-7Q4K2P".
 *
 * These get read aloud on the phone, written on a packing slip, and typed back
 * in by someone chasing an order — so the alphabet excludes every character
 * pair that is ambiguous when handwritten or spoken: 0/O, 1/I/L, 2/Z, 5/S,
 * 8/B. What is left is unambiguous in both directions.
 *
 * This is NOT a security token. It is a label. Uniqueness is enforced by the
 * unique constraint on orders.reference; a collision means generate again.
 */

/** 26 characters: digits and letters with the confusable ones removed. */
export const REFERENCE_ALPHABET = "34679ACDEFGHJKMNPQRTUVWXY";

export const REFERENCE_PREFIX = "ATLY";
export const REFERENCE_LENGTH = 6;

/**
 * @param randomInt Injected so tests are deterministic. Must return an integer
 *                  in [0, max). Defaults to crypto-backed randomness.
 */
export function makeOrderReference(
  randomInt: (max: number) => number = cryptoRandomInt,
): string {
  let body = "";
  for (let i = 0; i < REFERENCE_LENGTH; i++) {
    body += REFERENCE_ALPHABET[randomInt(REFERENCE_ALPHABET.length)];
  }
  return `${REFERENCE_PREFIX}-${body}`;
}

/**
 * Uniform integer in [0, max), rejecting the biased tail.
 *
 * Math.random() % max skews toward low values when max does not divide the
 * range evenly. It would not matter much for a label, but rejection sampling
 * is three extra lines and removes the question entirely.
 */
function cryptoRandomInt(max: number): number {
  const limit = Math.floor(256 / max) * max;
  const buffer = new Uint8Array(1);
  for (;;) {
    crypto.getRandomValues(buffer);
    if (buffer[0] < limit) return buffer[0] % max;
  }
}

const REFERENCE_SHAPE = new RegExp(
  `^${REFERENCE_PREFIX}-[${REFERENCE_ALPHABET}]{${REFERENCE_LENGTH}}$`,
);

/** Whether a string looks like one of ours. Used to validate a URL segment. */
export const isValidReference = (value: string): boolean =>
  REFERENCE_SHAPE.test(value.trim().toUpperCase());

/** Normalise user input: "atly 7q4k2p" and "7Q4K2P" both become the real thing. */
export function normalizeReference(value: string): string | null {
  const compact = value.trim().toUpperCase().replace(/[\s_]+/g, "-");
  const withPrefix = compact.startsWith(`${REFERENCE_PREFIX}-`)
    ? compact
    : `${REFERENCE_PREFIX}-${compact.replace(/^-+/, "")}`;
  return isValidReference(withPrefix) ? withPrefix : null;
}
