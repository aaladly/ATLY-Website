import "server-only";

import { EMPTY_OVERRIDES, type SettingsOverrides } from "./types";

/**
 * Where admin overrides live.
 *
 * !! THE DEFAULT IMPLEMENTATION IS A DEVELOPMENT STAND-IN !! -----------------
 * The same caveat as src/lib/orders/store.ts, and for the same reason: there
 * is no Supabase project connected yet. Overrides are held in a module-level
 * object, which means:
 *   - every change is lost when the server restarts
 *   - a redeploy loses everything taken since the last one, and nobody is
 *     watching for that
 *
 * Hosting is Hostinger, i.e. one long-running Node process rather than a fleet
 * of serverless instances, so the data at least survives BETWEEN requests. That
 * makes the failure quieter, not smaller: it works perfectly right up until a
 * restart, which is the worst way for a data store to be wrong.
 *
 * The admin UI says so on every page, in as many words, so nobody changes a
 * price and believes it stuck. Replace this with Supabase against the
 * products / variants / pricing_rules tables in migration 0001 and the
 * delivery_settings table in 0002 before launch. The interface is deliberately
 * tiny so that swap is small.
 * ---------------------------------------------------------------------------
 */

export interface SettingsStore {
  read(): Promise<SettingsOverrides>;
  write(next: SettingsOverrides): Promise<void>;
}

/**
 * True when overrides survive a restart. The admin banner reads this rather
 * than assuming, so the warning disappears by itself once Supabase is wired
 * in and nobody has to remember to delete it.
 */
export const SETTINGS_ARE_DURABLE = false;

/** Survives hot reloads in development by hanging off globalThis. */
const globalForSettings = globalThis as unknown as {
  __atlySettings?: SettingsOverrides;
};

globalForSettings.__atlySettings ??= { ...EMPTY_OVERRIDES };

export const inMemorySettingsStore: SettingsStore = {
  async read() {
    return globalForSettings.__atlySettings ?? EMPTY_OVERRIDES;
  },
  async write(next) {
    globalForSettings.__atlySettings = next;
  },
};

export const settingsStore: SettingsStore = inMemorySettingsStore;
