/**
 * Cookie consent: the decision, not the dialog.
 *
 * All of the logic lives here — what the categories are, how a choice is
 * stored, when a stored choice has gone stale — so the category list is one
 * array to edit rather than a search across components.
 *
 * Pure apart from reading and writing document.cookie, and the parsing half is
 * completely pure so it can be tested against the kind of input a cookie
 * actually contains: something a previous version wrote, something truncated,
 * something a person typed into devtools.
 *
 * THE RULE THIS FILE EXISTS TO ENFORCE: no consent, no analytics. Not "loaded
 * but idle", not "loaded with anonymise on" — not loaded. `hasAnalyticsConsent`
 * is the only thing that may cause the Google script to appear in the page.
 */

export const CONSENT_COOKIE = "atly_consent";

/**
 * Bump this when the categories change, or when what a category does changes
 * materially. Everyone is asked again — an old yes was a yes to a different
 * question.
 */
export const CONSENT_POLICY_VERSION = 1;

/** Owner-supplied: re-ask after a year. */
export const CONSENT_MAX_AGE_DAYS = 365;

export const CONSENT_MAX_AGE_MS = CONSENT_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

/**
 * The categories.
 *
 * There is deliberately no "marketing" entry. ATLY runs no advertising pixels,
 * and a toggle for a category that does nothing is a question with no honest
 * answer. Add one here if that ever changes — and bump the version.
 */
export type ConsentCategory = "necessary" | "analytics";

export const CONSENT_CATEGORIES: readonly {
  id: ConsentCategory;
  title: string;
  description: string;
  /** Required for the site to work at all, so not a choice. */
  required: boolean;
}[] = [
  {
    id: "necessary",
    title: "Strictly necessary",
    description:
      "Keeps your cart, secures the checkout, and remembers this choice. The shop cannot work without them.",
    required: true,
  },
  {
    id: "analytics",
    title: "Analytics",
    description:
      "Google Analytics, so we can see which pages people actually use. Off unless you turn it on.",
    required: false,
  },
];

export type ConsentState = {
  version: number;
  /** ISO timestamp of the choice. */
  at: string;
  analytics: boolean;
};

/**
 * Read a stored choice, treating it as hostile input.
 *
 * Anything unrecognised returns null, which means "not asked yet" and leaves
 * analytics blocked. Failing closed is the only safe direction: a parse bug
 * that returned a default of `true` would turn every visitor into a tracked
 * one without anybody ever clicking anything.
 */
export function parseConsent(raw: string | null | undefined): ConsentState | null {
  if (!raw) return null;

  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(decoded);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const value = parsed as Record<string, unknown>;

  if (typeof value.version !== "number" || !Number.isInteger(value.version)) return null;
  if (typeof value.at !== "string" || value.at === "") return null;
  if (Number.isNaN(Date.parse(value.at))) return null;
  // Strictly boolean. A string "false" is not a no, and treating it as one
  // would be the same bug as trusting a truthy check on a checkbox.
  if (typeof value.analytics !== "boolean") return null;

  return { version: value.version, at: value.at, analytics: value.analytics };
}

export function serializeConsent(state: ConsentState): string {
  return encodeURIComponent(JSON.stringify(state));
}

/**
 * Whether a stored choice still stands.
 *
 * False means ask again: either it was made against a different set of
 * categories, or it has aged out. A choice from the future is also rejected —
 * a clock that has been wound back would otherwise pin a consent in place
 * for a year past its expiry.
 */
export function isConsentCurrent(
  state: ConsentState | null,
  nowMs: number,
  policyVersion: number = CONSENT_POLICY_VERSION,
  maxAgeMs: number = CONSENT_MAX_AGE_MS,
): boolean {
  if (!state) return false;
  if (state.version !== policyVersion) return false;

  const at = Date.parse(state.at);
  if (Number.isNaN(at)) return false;
  if (at > nowMs) return false;

  return nowMs - at < maxAgeMs;
}

/** Whether analytics may load. The only gate the loader is allowed to consult. */
export function hasAnalyticsConsent(
  state: ConsentState | null,
  nowMs: number,
  policyVersion: number = CONSENT_POLICY_VERSION,
  maxAgeMs: number = CONSENT_MAX_AGE_MS,
): boolean {
  return (
    isConsentCurrent(state, nowMs, policyVersion, maxAgeMs) && state!.analytics === true
  );
}

// ---------------------------------------------------------------------------
// Browser
// ---------------------------------------------------------------------------

export const readConsentCookie = (): ConsentState | null => {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${CONSENT_COOKIE}=`));
  return parseConsent(match?.slice(CONSENT_COOKIE.length + 1));
};

/**
 * First-party, and readable by script on purpose: the banner has to check it
 * before the page paints, and an httpOnly cookie could not be read there.
 * Nothing sensitive is in it — it records a yes or a no about analytics.
 *
 * SameSite=Lax so it survives someone following a link into the shop.
 */
export function writeConsentCookie(state: ConsentState): void {
  if (typeof document === "undefined") return;
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie =
    `${CONSENT_COOKIE}=${serializeConsent(state)}` +
    `; Max-Age=${Math.floor(CONSENT_MAX_AGE_MS / 1000)}` +
    `; Path=/; SameSite=Lax${secure}`;
}

/**
 * Cookies Google Analytics sets, so withdrawing consent can actually remove
 * them rather than only stopping new ones.
 *
 * _ga is the client id; _ga_<ID> is the per-property session state. _gid and
 * _gat belong to Universal Analytics and are cleared too, in case a property
 * was migrated and the old cookies are still sitting in someone's browser.
 */
export const ANALYTICS_COOKIE_PREFIXES = ["_ga", "_gid", "_gat"] as const;

export function deleteAnalyticsCookies(): void {
  if (typeof document === "undefined") return;

  // Google sets these on the registrable domain, so clearing them at the
  // current host alone leaves the .example.com copy behind. Both are tried.
  const host = location.hostname;
  const parts = host.split(".");
  const domains = [undefined, host, parts.length > 2 ? `.${parts.slice(-2).join(".")}` : `.${host}`];

  for (const cookie of document.cookie.split("; ")) {
    const name = cookie.split("=")[0];
    if (!ANALYTICS_COOKIE_PREFIXES.some((prefix) => name.startsWith(prefix))) continue;

    for (const domain of domains) {
      document.cookie =
        `${name}=; Max-Age=0; Path=/` + (domain ? `; Domain=${domain}` : "");
    }
  }
}
