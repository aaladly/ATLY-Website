"use client";

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  CONSENT_CATEGORIES,
  CONSENT_POLICY_VERSION,
  deleteAnalyticsCookies,
  type ConsentState,
} from "@/lib/consent";
import {
  getConsentSnapshot,
  getServerConsentSnapshot,
  saveConsent,
  subscribeConsent,
} from "@/lib/consentStore";
import { ANALYTICS_ENABLED, loadAnalytics, unloadAnalytics } from "@/lib/analytics";
import { useHydrated } from "./useHydrated";

/** Fired by the footer's "Cookie settings" link. */
export const OPEN_CONSENT_EVENT = "atly:open-cookie-settings";

/**
 * The cookie banner.
 *
 * Renders nothing at all when no analytics is configured, which is the state
 * of this project today. There is then exactly one cookie category — the ones
 * the shop cannot run without — and a dialog asking permission for nothing is
 * friction with no benefit and a false impression of what the site does.
 *
 * Four things here are deliberate and are the parts worth not undoing:
 *
 *   1. Analytics is never in the page before a choice. The tag is injected by
 *      lib/analytics.ts on consent, not rendered as a script tag with this
 *      banner drawn over the top. That mistake is the usual one and it
 *      protects nobody: the request went out before the dialog rendered.
 *   2. Reject is the same element, size and click count as Accept, sitting
 *      beside it. A reject styled as a faded link is a dark pattern wearing a
 *      compliance costume.
 *   3. Dismissing without choosing is not consent. There is no X that means
 *      yes, and Escape does not make the question go away.
 *   4. Whether to show the banner is DERIVED from the stored cookie rather
 *      than copied into state by an effect. A rejection therefore sticks by
 *      construction — there is no second source of truth to drift out of step
 *      and re-prompt somebody who already said no.
 */
export function CookieConsent() {
  const hydrated = useHydrated();
  const consent = useSyncExternalStore(
    subscribeConsent,
    getConsentSnapshot,
    getServerConsentSnapshot,
  );

  const [reopened, setReopened] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [analyticsDraft, setAnalyticsDraft] = useState(false);

  const barRef = useRef<HTMLDivElement>(null);
  const firstButtonRef = useRef<HTMLButtonElement>(null);
  // Where focus was before the banner took it, so it can be handed back.
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const titleId = useId();
  const descriptionId = useId();

  // Derived, not stored. Nothing to keep in sync, so nothing to get wrong.
  //
  // `current` and `analyticsAllowed` are worked out in the store at the moment
  // the cookie is read, not here: both depend on the clock, and asking the
  // clock during render is impure and makes a component's output depend on
  // when it happened to re-render.
  const needsChoice = ANALYTICS_ENABLED && hydrated && !consent.current;
  const open = ANALYTICS_ENABLED && hydrated && (needsChoice || reopened);

  /**
   * Keep the page in step with the stored choice.
   *
   * This is the only thing that may put Google in the page, and it runs off
   * the cookie — not off a button handler — so a choice restored from a
   * previous visit behaves exactly like one just made.
   */
  useEffect(() => {
    if (!ANALYTICS_ENABLED || !hydrated) return;
    if (consent.analyticsAllowed) {
      loadAnalytics();
    } else {
      unloadAnalytics();
      deleteAnalyticsCookies();
    }
  }, [consent, hydrated]);

  // ---- Reopening from the footer ----
  useEffect(() => {
    if (!ANALYTICS_ENABLED) return;
    const reopen = () => {
      returnFocusRef.current = document.activeElement as HTMLElement | null;
      setAnalyticsDraft(getConsentSnapshot().state?.analytics ?? false);
      setShowPreferences(true);
      setReopened(true);
    };
    window.addEventListener(OPEN_CONSENT_EVENT, reopen);
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, reopen);
  }, []);

  // ---- Focus in ----
  useEffect(() => {
    if (!open) return;
    if (!returnFocusRef.current) {
      returnFocusRef.current = document.activeElement as HTMLElement | null;
    }
    firstButtonRef.current?.focus();
  }, [open]);

  /**
   * Reserve the space the bar occupies.
   *
   * Without this the bar is simply laid over whatever is at the bottom of the
   * viewport, and on a phone that is routinely the thing the customer came to
   * press. Measured rather than guessed at, because the height changes when
   * the preferences panel opens and with how the text wraps.
   */
  useEffect(() => {
    const bar = barRef.current;
    if (!open || !bar) return;

    const apply = () => {
      document.body.style.paddingBottom = `${bar.offsetHeight}px`;
    };
    apply();

    const observer = new ResizeObserver(apply);
    observer.observe(bar);

    return () => {
      observer.disconnect();
      document.body.style.paddingBottom = "";
    };
  }, [open, showPreferences]);

  const close = useCallback(() => {
    setReopened(false);
    setShowPreferences(false);
    // Hand focus back where it came from. Dropping it to the top of the
    // document instead is how a keyboard user loses their place.
    returnFocusRef.current?.focus();
    returnFocusRef.current = null;
  }, []);

  const save = useCallback(
    (allowAnalytics: boolean) => {
      const state: ConsentState = {
        version: CONSENT_POLICY_VERSION,
        at: new Date().toISOString(),
        analytics: allowAnalytics,
      };
      saveConsent(state);
      setAnalyticsDraft(allowAnalytics);
      close();
    },
    [close],
  );

  // ---- Escape closes the preferences panel ----
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (showPreferences) {
        // Back to the bar, not out of the banner. Escape should not be a way
        // to make the question disappear without answering it.
        setShowPreferences(false);
        firstButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, showPreferences]);

  if (!open) return null;

  const buttonBase =
    "inline-flex min-h-11 items-center justify-center px-4 py-3 text-center text-label uppercase transition-colors duration-200 sm:px-6";

  return (
    <div
      ref={barRef}
      role="dialog"
      /*
        Not modal: it does not block the page, and a customer must be able to
        keep reading the privacy policy it links to before answering.
      */
      aria-modal="false"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      /*
        Bottom-anchored bar. It sits above the footer rather than over the
        checkout button — a consent bar covering "Place order" is how a shop
        loses an order to its own compliance furniture.
      */
      className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto border-t-2 border-cocoa-deep bg-ivory shadow-[0_-8px_24px_rgba(78,25,1,0.12)]"
    >
      <div className="mx-auto max-w-4xl px-gutter py-6">
        <h2 id={titleId} className="text-display-s">
          Cookies
        </h2>

        <p id={descriptionId} className="mt-3 max-w-2xl text-body-m">
          We use a few cookies the shop cannot run without — keeping your
          basket and securing checkout. We would also like to measure which
          pages people use, but only if you are happy with it.{" "}
          <Link href="/privacy#cookies" className="text-gold-deep">
            Read our privacy policy
          </Link>
          .
        </p>

        {showPreferences && (
          <div className="mt-6 border border-rule bg-cream p-5">
            <h3 className="label-caps">Choose what you are happy with</h3>

            <ul className="mt-4 space-y-4">
              {CONSENT_CATEGORIES.map((category) => (
                <li key={category.id}>
                  <label className="flex min-h-11 items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-5 w-5 shrink-0 accent-cocoa-deep"
                      checked={category.required ? true : analyticsDraft}
                      disabled={category.required}
                      onChange={(e) =>
                        !category.required && setAnalyticsDraft(e.target.checked)
                      }
                    />
                    <span>
                      <span className="block text-body-m">
                        {category.title}
                        {category.required && (
                          <span className="ml-2 text-body-s text-cocoa">
                            Always on
                          </span>
                        )}
                      </span>
                      <span className="mt-1 block text-body-s text-cocoa">
                        {category.description}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => save(analyticsDraft)}
              className={`${buttonBase} mt-5 w-full bg-cocoa-deep text-cream hover:bg-cocoa sm:w-auto`}
            >
              Save preferences
            </button>
          </div>
        )}

        {/*
          Accept and Reject are the same element with the same classes, side by
          side, one click each. If anyone ever "improves" this by making reject
          quieter, the improvement is the bug.
        */}
        {/*
          Accept and Reject share a grid cell width at every size — on a phone
          they sit side by side rather than stacked, which keeps them literally
          identical AND takes a whole row off the height of the bar. Preferences
          is below them because it is not a third answer to the question; it
          opens the detail.
        */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center">
          <button
            ref={firstButtonRef}
            type="button"
            onClick={() => save(true)}
            className={`${buttonBase} bg-cocoa-deep text-cream hover:bg-cocoa`}
          >
            Accept all
          </button>
          <button
            type="button"
            onClick={() => save(false)}
            className={`${buttonBase} bg-cocoa-deep text-cream hover:bg-cocoa`}
          >
            Reject all
          </button>
          <button
            type="button"
            onClick={() => setShowPreferences((current) => !current)}
            aria-expanded={showPreferences}
            className={`${buttonBase} col-span-2 border border-cocoa-deep text-cocoa-deep hover:bg-cocoa-deep hover:text-cream sm:col-span-1`}
          >
            Preferences
          </button>
        </div>
      </div>
    </div>
  );
}

/** The footer link. Lets someone change their mind, which is the whole deal. */
export function CookieSettingsLink({ className = "" }: { className?: string }) {
  const hydrated = useHydrated();

  // It reopens a dialog, so it cannot work without JavaScript. A dead link in
  // a footer is worse than no link.
  if (!ANALYTICS_ENABLED || !hydrated) return null;

  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent(OPEN_CONSENT_EVENT))}
      className={`text-cocoa hover:text-gold-deep ${className}`}
    >
      Cookie settings
    </button>
  );
}
