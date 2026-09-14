/**
 * A fact nobody has supplied yet, shown rather than guessed.
 *
 * Deliberately conspicuous. On a terms page a blank or a plausible-sounding
 * default becomes a promise the business did not make and may not be able to
 * keep — so an unanswered question is left legible, in square brackets, in a
 * colour that does not blend in.
 *
 * The screen-reader text matters as much as the colour: someone who cannot see
 * the highlight still needs to know this is a gap and not the answer.
 */
export function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <mark className="mx-0.5 inline border border-error bg-ivory px-1.5 py-0.5 text-body-s text-error">
      <span className="sr-only">Still to be confirmed: </span>[{children}]
    </mark>
  );
}
