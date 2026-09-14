import Link from "next/link";
import { LEGAL_REVIEWED } from "@/lib/site";

/**
 * Shared chrome for the privacy, terms and refund pages.
 *
 * The draft notice is the point of this component.
 *
 * These pages were drafted from what this codebase actually does — what it
 * collects, where it sends it, what it does not do. That part is accurate and
 * checkable. What they are NOT is legal advice, and several of the commercial
 * terms are the owner's to decide: how long they will take a return on
 * something perishable, which state's law governs a dispute, what happens when
 * a delivery goes wrong.
 *
 * So while LEGAL_REVIEWED is false, every one of these pages says so at the
 * top, in the place a reader looks first. A policy that is 80% right and looks
 * finished is worse than one that admits what it is: the first gets relied on.
 */
export function LegalPage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-2xl px-gutter py-section">
      <p className="label-caps">{eyebrow}</p>
      <h1 className="mt-3 text-display-l">{title}</h1>
      <p className="mt-6 text-body-l text-cocoa">{intro}</p>

      {!LEGAL_REVIEWED && (
        <div role="note" className="mt-10 border-2 border-error bg-ivory p-6">
          <h2 className="text-display-s text-error">A draft, not a policy</h2>
          <p className="mt-3 text-body-m">
            This page has not been reviewed by anyone qualified, and parts of it
            are still marked as decisions we have not made. It is published so
            it can be read and corrected — do not rely on it yet.
          </p>
          <p className="mt-3 text-body-m text-cocoa">
            If you need an answer about any of this before we finish,{" "}
            <Link href="/allergens" className="text-gold-deep">
              get in touch
            </Link>{" "}
            and we will answer you directly.
          </p>
        </div>
      )}

      <div className="mt-12 space-y-10">{children}</div>

      <p className="mt-section text-body-s">
        <Link href="/" className="text-cocoa-deep">
          &larr; Back to the shop
        </Link>
      </p>
    </main>
  );
}

export function Section({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-display-s">{heading}</h2>
      <div className="mt-4 space-y-4 text-body-m">{children}</div>
    </section>
  );
}

/**
 * A decision the owner has not made yet, rendered so a customer reading the
 * page sees an honest gap rather than a confident sentence nobody stands
 * behind.
 */
export function Undecided({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-l-2 border-error pl-4 text-body-m text-error">
      {/* TODO: owner to decide. Replace this block with the real term. */}
      Still being decided: {children}
    </p>
  );
}
