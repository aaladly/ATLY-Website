/**
 * Google Analytics 4, loaded only on consent.
 *
 * The whole point of this file is what it does NOT do: there is no
 * <Script src="googletagmanager.com/..."> anywhere in this project. The tag is
 * injected here, at runtime, and only after someone has said yes. A banner
 * layered over a tag that has already fired is the usual way this gets built
 * and it protects nobody — the request went out before the dialog rendered.
 *
 * Verify it, do not trust it: DevTools, Network, hard reload. Nothing to
 * googletagmanager.com or google-analytics.com should appear until a button is
 * pressed. `npm run check:launch` cannot check that for you.
 */

/**
 * The measurement ID, or null when analytics is simply not set up.
 *
 * Null is the honest state of this project today, and it is load-bearing:
 * with no ID there is nothing to consent to, so the banner does not render and
 * the privacy page says analytics is not running. A consent dialog for
 * tracking that does not exist is friction for nobody's benefit.
 */
export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || null;

export const ANALYTICS_ENABLED = GA_MEASUREMENT_ID !== null;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const SCRIPT_ID = "atly-ga4";

/** Already in the page? Loading twice would double-count every visit. */
export const analyticsLoaded = (): boolean =>
  typeof document !== "undefined" && document.getElementById(SCRIPT_ID) !== null;

export function loadAnalytics(): void {
  if (!GA_MEASUREMENT_ID) return;
  if (typeof document === "undefined") return;
  if (analyticsLoaded()) return;

  // Cleared in case consent was withdrawn earlier in this same page life —
  // gtag honours this flag over everything else, so leaving it set would make
  // a fresh yes silently do nothing.
  window[`ga-disable-${GA_MEASUREMENT_ID}` as keyof Window] = false as never;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer!.push(args);
  };

  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID, {
    // The visitor agreed to analytics, not to being findable in it. Neither of
    // these costs the owner anything they would actually look at.
    anonymize_ip: true,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });

  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);
}

/**
 * Withdrawing consent.
 *
 * The script cannot be un-executed, so it is disabled at the source gtag
 * itself checks, and the cookies it set are removed. The tag is also taken out
 * of the DOM so a later reload starts clean.
 */
export function unloadAnalytics(): void {
  if (!GA_MEASUREMENT_ID) return;
  if (typeof window === "undefined") return;

  window[`ga-disable-${GA_MEASUREMENT_ID}` as keyof Window] = true as never;
  document.getElementById(SCRIPT_ID)?.remove();
}
