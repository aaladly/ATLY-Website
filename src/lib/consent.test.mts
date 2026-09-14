import test, { describe } from "node:test";
import assert from "node:assert/strict";

import {
  CONSENT_CATEGORIES,
  CONSENT_MAX_AGE_MS,
  CONSENT_POLICY_VERSION,
  hasAnalyticsConsent,
  isConsentCurrent,
  parseConsent,
  serializeConsent,
  type ConsentState,
} from "./consent.ts";

const NOW = Date.parse("2026-09-14T12:00:00.000Z");
const iso = (ms: number) => new Date(ms).toISOString();

const state = (patch: Partial<ConsentState> = {}): ConsentState => ({
  version: CONSENT_POLICY_VERSION,
  at: iso(NOW),
  analytics: false,
  ...patch,
});

describe("storing a choice", () => {
  test("a choice survives a round trip through a cookie value", () => {
    const original = state({ analytics: true });
    assert.deepEqual(parseConsent(serializeConsent(original)), original);
  });

  test("the serialized form is safe to put in a cookie", () => {
    // A raw JSON cookie value containing ; or , would be truncated by the
    // browser at the first separator and come back unparseable.
    const encoded = serializeConsent(state({ analytics: true }));
    assert.ok(!encoded.includes(";"));
    assert.ok(!encoded.includes(","));
    assert.ok(!encoded.includes(" "));
  });
});

describe("reading a choice back", () => {
  test("nothing stored means nothing was chosen", () => {
    assert.equal(parseConsent(null), null);
    assert.equal(parseConsent(undefined), null);
    assert.equal(parseConsent(""), null);
  });

  test("junk is rejected rather than half-read", () => {
    for (const bad of [
      "not json",
      "%%%",
      "null",
      "[]",
      '"a string"',
      "42",
      encodeURIComponent(JSON.stringify({ version: 1, at: iso(NOW) })),
      encodeURIComponent(JSON.stringify({ version: 1, analytics: true })),
      encodeURIComponent(JSON.stringify({ at: iso(NOW), analytics: true })),
      encodeURIComponent(
        JSON.stringify({ version: 1.5, at: iso(NOW), analytics: true }),
      ),
      encodeURIComponent(
        JSON.stringify({ version: 1, at: "not a date", analytics: true }),
      ),
    ]) {
      assert.equal(parseConsent(bad), null, `expected null for: ${bad}`);
    }
  });

  test("analytics must be a real boolean", () => {
    // This is the whole ballgame. A cookie saying analytics:"false" that got
    // read as truthy would turn a rejection into an acceptance, silently, for
    // everyone who rejected.
    for (const value of ["true", "false", 1, 0, null, "yes", {}, []]) {
      const raw = encodeURIComponent(
        JSON.stringify({ version: 1, at: iso(NOW), analytics: value }),
      );
      assert.equal(parseConsent(raw), null, `expected null for analytics=${JSON.stringify(value)}`);
    }
  });
});

describe("when a choice still stands", () => {
  test("a fresh choice stands", () => {
    assert.equal(isConsentCurrent(state(), NOW), true);
  });

  test("no choice never stands", () => {
    assert.equal(isConsentCurrent(null, NOW), false);
  });

  test("a choice made against different categories does not stand", () => {
    // Bumping the version is how everyone gets asked again. An old yes was a
    // yes to a different question.
    assert.equal(
      isConsentCurrent(state({ version: CONSENT_POLICY_VERSION + 1 }), NOW),
      false,
    );
  });

  test("a choice expires", () => {
    const old = state({ at: iso(NOW - CONSENT_MAX_AGE_MS - 1) });
    assert.equal(isConsentCurrent(old, NOW), false);

    const justInside = state({ at: iso(NOW - CONSENT_MAX_AGE_MS + 1000) });
    assert.equal(isConsentCurrent(justInside, NOW), true);
  });

  test("a choice from the future does not stand", () => {
    // A clock wound back would otherwise pin a consent in place well past the
    // point it should have been asked again.
    assert.equal(isConsentCurrent(state({ at: iso(NOW + 60_000) }), NOW), false);
  });
});

describe("the analytics gate", () => {
  test("only a current, affirmative choice opens it", () => {
    assert.equal(hasAnalyticsConsent(state({ analytics: true }), NOW), true);
  });

  test("everything else keeps it shut", () => {
    // Each of these is a way analytics could have leaked past the gate.
    assert.equal(hasAnalyticsConsent(null, NOW), false, "never asked");
    assert.equal(
      hasAnalyticsConsent(state({ analytics: false }), NOW),
      false,
      "rejected",
    );
    assert.equal(
      hasAnalyticsConsent(
        state({ analytics: true, at: iso(NOW - CONSENT_MAX_AGE_MS - 1) }),
        NOW,
      ),
      false,
      "accepted, but too long ago",
    );
    assert.equal(
      hasAnalyticsConsent(
        state({ analytics: true, version: CONSENT_POLICY_VERSION + 1 }),
        NOW,
      ),
      false,
      "accepted against different categories",
    );
  });

  test("a rejection keeps standing, so nobody is re-prompted", () => {
    // Rejecting has to stick. A no that expires tomorrow is just a slower yes.
    const rejected = state({ analytics: false });
    for (const days of [1, 30, 200, 364]) {
      const later = NOW + days * 24 * 60 * 60 * 1000;
      assert.equal(isConsentCurrent(rejected, later), true, `day ${days}`);
      assert.equal(hasAnalyticsConsent(rejected, later), false, `day ${days}`);
    }
  });
});

describe("the categories", () => {
  test("strictly necessary is required and cannot be switched off", () => {
    const necessary = CONSENT_CATEGORIES.find((c) => c.id === "necessary");
    assert.ok(necessary);
    assert.equal(necessary.required, true);
  });

  test("analytics is optional and defaults to off", () => {
    const analytics = CONSENT_CATEGORIES.find((c) => c.id === "analytics");
    assert.ok(analytics);
    assert.equal(analytics.required, false);
    assert.equal(state().analytics, false);
  });

  test("there is no marketing category", () => {
    // ATLY runs no advertising pixels. A toggle for a category that does
    // nothing is a question with no honest answer.
    assert.equal(
      CONSENT_CATEGORIES.some((c) => c.id === ("marketing" as never)),
      false,
    );
  });

  test("every category explains itself", () => {
    for (const category of CONSENT_CATEGORIES) {
      assert.ok(category.title.length > 0, `${category.id} has no title`);
      assert.ok(category.description.length > 20, `${category.id} has no description`);
    }
  });
});
