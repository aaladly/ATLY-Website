import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * The Supabase client, or null when nobody has connected a project yet.
 *
 * Null rather than throwing, because "no database" is a real and supported
 * state of this codebase: the stores fall back to memory and the admin says so
 * on every page. A module that threw on import would take the whole site down
 * the moment an env var was missing, which is the opposite of useful.
 *
 * !! SERVICE ROLE — SERVER ONLY !! ------------------------------------------
 * This key bypasses row level security completely. Every table in 0001 and
 * 0003 that holds customer data has RLS on and no permissive policy, which
 * means this key is the ONLY way into them — and equally, that anything
 * holding it can read every order and every address in the business.
 *
 * `import "server-only"` at the top is what enforces that: importing this file
 * from a client component is a build error, not a runtime surprise. Do not
 * remove it, and never move this key to a NEXT_PUBLIC_ name.
 * ---------------------------------------------------------------------------
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || null;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null;

/** True when a project is connected and the stores should use it. */
export const SUPABASE_CONFIGURED = url !== null && serviceRoleKey !== null;

let cached: SupabaseClient | null = null;

export function supabase(): SupabaseClient | null {
  if (!SUPABASE_CONFIGURED) return null;
  cached ??= createClient(url as string, serviceRoleKey as string, {
    auth: {
      // There are no end-user sessions here. Every request is the server
      // acting as itself, so there is nothing to persist or refresh, and
      // asking for either leaks state between requests.
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return cached;
}

/**
 * Fail loudly rather than silently doing nothing.
 *
 * Callers reach this only after SUPABASE_CONFIGURED has already chosen the
 * Supabase store, so a null here means the configuration changed underneath a
 * running process. Returning a no-op would look exactly like a successful
 * write that saved nothing, which is the failure this whole change exists to
 * remove.
 */
export function requireSupabase(): SupabaseClient {
  const client = supabase();
  if (client === null) {
    throw new Error(
      "Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and " +
        "SUPABASE_SERVICE_ROLE_KEY in .env.local.",
    );
  }
  return client;
}
