import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Admin",
    template: "%s — ATLY Admin",
  },
  // Nothing under /admin belongs in a search index, and the login page is the
  // one a crawler could actually reach.
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Never prerendered, and never cached.
 *
 * Not an optimisation setting — a correctness one, twice over:
 *
 *   1. The sign-in check reads a cookie, and a prerendered admin page is the
 *      same page for everybody. Worse, the check short-circuits when no
 *      password is configured, so it can return "signed out" WITHOUT touching
 *      cookies() — and Next would then happily bake the redirect to the login
 *      page into static HTML at build time. Leaving that to fall out of the
 *      right function being called in the right order is not a guarantee.
 *   2. Orders and settings live in memory. A cached order list is yesterday's.
 */
export const dynamic = "force-dynamic";

/**
 * The admin shell. No shop header, no shop footer — see src/app/layout.tsx.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-1 flex-col">{children}</div>;
}
