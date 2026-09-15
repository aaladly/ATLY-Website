import "server-only";

import { requireSupabase } from "../supabase.ts";
import { EMPTY_OVERRIDES, type SettingsOverrides } from "./types.ts";
import type { SettingsStore } from "./store.ts";

/**
 * Admin overrides in Postgres.
 *
 * One row, replaced whole, in the settings_overrides table from migration
 * 0003. The overrides are a sparse patch over the values compiled into the
 * code, not a copy of the catalog, so they are stored as the one document they
 * are rather than spread across normalised tables where every read would have
 * to decide whether a row is an intended override or a stale duplicate.
 */

/**
 * Anything could be in that jsonb column.
 *
 * This application wrote it, but "we wrote it" is not "it is still the shape
 * we wrote": a hand edit in the Supabase table editor, a restored backup, or
 * an older version of this code could each have left something else. The
 * failure mode of trusting it is the entire shop rendering wrong prices or
 * throwing on every page.
 *
 * So an unrecognised document is treated as no overrides at all, which falls
 * back to the values in the code. That direction is recoverable — the owner
 * re-enters a price — and the other one is not.
 */
function parseOverrides(value: unknown): SettingsOverrides {
  if (typeof value !== "object" || value === null) return { ...EMPTY_OVERRIDES };
  const candidate = value as Partial<SettingsOverrides>;
  if (candidate.version !== 1) return { ...EMPTY_OVERRIDES };
  return {
    version: 1,
    products: candidate.products ?? {},
    tiers: candidate.tiers ?? {},
    delivery: candidate.delivery ?? {},
    updatedAt: candidate.updatedAt ?? null,
  };
}

export const supabaseSettingsStore: SettingsStore = {
  async read() {
    const db = requireSupabase();
    const { data, error } = await db
      .from("settings_overrides")
      .select("overrides")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      throw new Error(`Reading settings failed: ${error.message}`);
    }
    // No row yet is the normal state of a fresh project, not an error: nobody
    // has changed anything, so the compiled values stand.
    if (!data) return { ...EMPTY_OVERRIDES };

    return parseOverrides((data as { overrides: unknown }).overrides);
  },

  async write(next) {
    const db = requireSupabase();
    const { error } = await db.from("settings_overrides").upsert(
      {
        id: 1,
        overrides: next,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

    if (error) {
      throw new Error(`Saving settings failed: ${error.message}`);
    }
  },
};
