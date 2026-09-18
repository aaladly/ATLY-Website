/**
 * Server startup, and server-side error reporting.
 *
 * `register()` runs once when a Next server instance starts, and has to finish
 * before the server accepts a request — which makes it the only place that can
 * refuse to come up at all.
 */

/**
 * Refuse to start in production without a database.
 *
 * The stores fall back to an in-memory Map when Supabase is not configured.
 * That is right in development and catastrophic in production, and it fails in
 * the quietest possible way: everything works perfectly until the process
 * restarts, and what is lost is a paid order with somebody's address on it.
 * Nothing watches for that, and the customer is expecting chocolate.
 *
 * `npm run check:launch` already blocks on it and the admin warns on every
 * page, but both of those rely on somebody looking. This does not.
 *
 * NOT during the build. `next build` runs with NODE_ENV=production and
 * evaluates this file, so without the phase guard a CI machine with no
 * database credentials could never build the site — which is exactly what the
 * GitHub Actions workflow is.
 */
function requireDurableStorageInProduction(): void {
  if (process.env.NODE_ENV !== "production") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const configured =
    (process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "") !== "" &&
    (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "") !== "";

  if (configured) return;

  // Thrown rather than logged. A log scrolls past; this stops the deploy.
  throw new Error(
    "ATLY refuses to start: NEXT_PUBLIC_SUPABASE_URL and " +
      "SUPABASE_SERVICE_ROLE_KEY are not set, so orders and admin settings " +
      "would be held in memory and lost on the next restart. Set both, or " +
      "run with NODE_ENV=development if this is deliberate.",
  );
}

export async function register(): Promise<void> {
  // Guarded because register runs in every runtime, and none of this means
  // anything on the edge runtime.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  requireDurableStorageInProduction();
}

/**
 * Every server-side error, in one place.
 *
 * This is the other half of src/app/(site)/error.tsx. That component is what
 * the customer sees and deliberately shows them nothing about the error; this
 * is where the error actually goes, with the digest that ties the two
 * together — so when somebody quotes the code from the error page, there is
 * something to look it up in.
 *
 * WHAT IS DELIBERATELY NOT LOGGED -------------------------------------------
 * No request body, no cookies, no headers beyond the path. A checkout request
 * carries a name, an address and a phone number, and an error report is not a
 * place to put them. The path and the digest are enough to find the fault;
 * the customer's details are not needed to fix a bug and are a liability
 * sitting in a log file.
 * ---------------------------------------------------------------------------
 *
 * console.error is the sink on purpose. Hostinger captures stdout and stderr,
 * so these land somewhere the owner can already reach. Pointing this at a
 * hosted collector is a one-line change here and nowhere else, which is the
 * reason for routing everything through a single function.
 */
export async function onRequestError(
  error: unknown,
  request: { path: string; method: string },
): Promise<void> {
  const digest =
    typeof error === "object" && error !== null && "digest" in error
      ? String((error as { digest?: unknown }).digest)
      : undefined;

  console.error(
    `[error] ${request.method} ${request.path}` +
      (digest ? ` digest=${digest}` : "") +
      `: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`,
  );
}
