"use client";

import {
  hasAnalyticsConsent,
  isConsentCurrent,
  readConsentCookie,
  writeConsentCookie,
  type ConsentState,
} from "./consent";

/**
 * The consent cookie as an external store, for useSyncExternalStore.
 *
 * Same shape as cartStore.ts, and for the same reason: a cookie is state that
 * lives outside React. Reading it in an effect and calling setState is both a
 * cascading render and a lint error; subscribing to it is what the hook is
 * for.
 *
 * The snapshot carries the ANSWERS, not just the stored value — whether the
 * choice still stands, and whether analytics may load. That is deliberate:
 * both depend on the current time, and asking the clock in a component body
 * is impure and flagged. Asking it here, once, when the cookie is actually
 * read, is both legal and sufficient. Nothing needs to notice a consent
 * expiring in the same tab it was granted in; the window is a year.
 *
 * getSnapshot MUST return a stable reference or React re-renders forever, so
 * the whole object is cached against the raw cookie string and rebuilt only
 * when that string changes.
 */

export type ConsentSnapshot = {
  state: ConsentState | null;
  /** Whether a choice has been made that still stands. */
  current: boolean;
  /** Whether analytics may load. The only gate the loader consults. */
  analyticsAllowed: boolean;
};

/**
 * Server and hydration: nothing is known.
 *
 * Frozen and shared so the reference is stable. Guessing anything else here
 * would mean rendering no banner for someone who has never been asked.
 */
const NOTHING_KNOWN: ConsentSnapshot = Object.freeze({
  state: null,
  current: false,
  analyticsAllowed: false,
});

let lastRaw: string | null = null;
let lastSnapshot: ConsentSnapshot = NOTHING_KNOWN;

const listeners = new Set<() => void>();

export function getConsentSnapshot(): ConsentSnapshot {
  if (typeof document === "undefined") return NOTHING_KNOWN;

  const raw = document.cookie;
  if (raw !== lastRaw) {
    lastRaw = raw;
    const state = readConsentCookie();
    const now = Date.now();
    lastSnapshot = {
      state,
      current: isConsentCurrent(state, now),
      analyticsAllowed: hasAnalyticsConsent(state, now),
    };
  }
  return lastSnapshot;
}

export const getServerConsentSnapshot = (): ConsentSnapshot => NOTHING_KNOWN;

export function subscribeConsent(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Write a choice and tell every subscriber. */
export function saveConsent(state: ConsentState): void {
  writeConsentCookie(state);

  // Rebuilt from the state just written rather than by re-reading the cookie:
  // a browser does not always reflect a fresh write in document.cookie
  // synchronously, and a stale snapshot here would leave the banner up after
  // the customer had already answered it.
  const now = Date.now();
  lastRaw = null;
  lastSnapshot = {
    state,
    current: isConsentCurrent(state, now),
    analyticsAllowed: hasAnalyticsConsent(state, now),
  };

  for (const listener of listeners) listener();
}
