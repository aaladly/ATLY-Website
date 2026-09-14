type Section = { id: string; title: string };

/**
 * A numbered section and the table of contents that points at it, both driven
 * by the same array.
 *
 * The number and the heading text come from the section list rather than being
 * typed into the page, so inserting a section renumbers everything and cannot
 * leave the contents pointing at the wrong one — or at nothing.
 */
export function LegalTableOfContents({
  sections,
  heading = "Jump to a section",
}: {
  sections: readonly Section[];
  heading?: string;
}) {
  return (
    <nav aria-label={heading} className="mt-12 border-y border-rule py-6">
      <h2 className="label-caps">{heading}</h2>
      <ol className="mt-4 grid gap-x-8 gap-y-1 sm:grid-cols-2">
        {sections.map((section, index) => (
          <li key={section.id} className="text-body-s">
            <a
              href={`#${section.id}`}
              className="back-link text-cocoa-deep no-underline hover:text-gold-deep"
            >
              <span className="mr-2 text-cocoa tabular-nums">{index + 1}.</span>
              {section.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function LegalSection({
  sections,
  id,
  children,
}: {
  sections: readonly Section[];
  id: string;
  children: React.ReactNode;
}) {
  const index = sections.findIndex((section) => section.id === id);
  const section = sections[index];

  // A typo in an id would otherwise render a silent "0." with no heading.
  if (!section) {
    throw new Error(`LegalSection: no section with id "${id}"`);
  }

  return (
    // scroll-mt so a jump link does not land with the heading jammed against
    // the top edge of the window.
    <section id={id} className="scroll-mt-8">
      <h2 className="text-display-m">
        <span className="mr-3 text-cocoa tabular-nums">{index + 1}.</span>
        {section.title}
      </h2>
      <div className="mt-5 space-y-4 text-body-m">{children}</div>
    </section>
  );
}
