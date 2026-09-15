import "server-only";

import { EMPTY_OVERRIDES, type SettingsOverrides } from "./types";
import { SUPABASE_CONFIGURED } from "../supabase.ts";
import { supabaseSettingsStore } from "./supabaseStore.ts";

/**
 * Where admin overrides live.
 *
 * TWO IMPLEMENTATIONS, CHOSEN BY CONFIGURATION ------------------------------
 * With a Supabase project connected, the overrides are one row in the
 * settings_overrides table from migration 0003.
 *
 * Without one, they are held in a module-level object and every change is lost
 * when the server restarts. Less costly than losing an order — nobody is out
 * of pocket, the owner re-enters a price — but it fails the same quiet way:
 * perfectly, right up until a restart.
 *
 * The admin says so on every page, so nobody changes a price and believes it
 * stuck.
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
export const SETTINGS_ARE_DURABLE = SUPABASE_CONFIGURED;

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

export const settingsStore: SettingsStore = SUPABASE_CONFIGURED
  ? supabaseSettingsStore
  : inMemorySettingsStore;
