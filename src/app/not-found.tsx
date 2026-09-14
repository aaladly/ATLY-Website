import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { NotFoundContent } from "@/components/NotFound";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

/**
 * A URL that matches nothing at all.
 *
 * This renders inside the root layout, which is only the HTML shell — the
 * shop's header and footer live in (site)/layout.tsx and are not in the tree
 * here. So it carries its own wordmark rather than dropping someone onto an
 * unbranded page with no way back.
 */
export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col">
      <div className="border-b border-rule">
        <div className="mx-auto max-w-6xl px-gutter py-6">
          <Link href="/" className="no-underline" aria-label="ATLY Belgian Chocolate — home">
            <Wordmark size="sm" />
          </Link>
        </div>
      </div>
      <div className="flex flex-1 items-center">
        <NotFoundContent />
      </div>
    </main>
  );
}
