/**
 * The ATLY wordmark, set in type.
 *
 * NOT the final logo. The owner's supplied artwork reads "ATLY — ARTISAN
 * CHOCOLATES" and every use on this site must read "BELGIAN CHOCOLATE", and
 * that decision is still open: a corrected file from the owner, or a rebuilt
 * SVG lockup with the circular frame, the leaf through the A, and the cacao
 * pod motif.
 *
 * Rebuilding that lockup needs the original artwork in hand — those details
 * cannot be reproduced from a written description, and inventing them would
 * be worse than waiting. So this is a type-only lockup carrying the CORRECT
 * words, echoing the logo's structure (serif capitals, a hairline rule, a
 * letterspaced descriptor) without fabricating its illustration.
 *
 * Replacing this component is the only change needed once the logo is settled.
 */
export function Wordmark({
  className = "",
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const scale = {
    sm: { name: "text-display-s", descriptor: "text-[0.6rem]", rule: "w-8" },
    md: { name: "text-display-m", descriptor: "text-label", rule: "w-12" },
    lg: { name: "text-display-l", descriptor: "text-label", rule: "w-16" },
  }[size];

  return (
    <span className={`inline-flex flex-col items-center leading-none ${className}`}>
      <span
        className={`font-display ${scale.name} tracking-[0.22em] whitespace-nowrap`}
      >
        ATLY
      </span>
      <span
        className={`mt-2 mb-1.5 h-px ${scale.rule} bg-gold`}
        aria-hidden="true"
      />
      <span
        className={`${scale.descriptor} font-medium uppercase tracking-[0.3em] whitespace-nowrap`}
      >
        Belgian Chocolate
      </span>
    </span>
  );
}
