import type { Metadata } from "next";
import { contrastRatio, aaVerdict } from "@/lib/contrast";
import { PALETTE, ORNAMENT, SURFACES, TYPE_SCALE } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Styleguide — ATLY Belgian Chocolate",
  description: "Internal design token reference.",
  robots: { index: false, follow: false },
};

const SURFACE_LABEL: Record<string, string> = {
  cream: "on Cream",
  ivory: "on Ivory",
  cocoaDeep: "on Cocoa Deep",
};

function Section({
  n,
  title,
  note,
  children,
}: {
  n: string;
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-section">
      <div className="mb-8 border-t border-rule-strong pt-5">
        <p className="label-caps">{n}</p>
        <h2 className="mt-2 text-display-m">{title}</h2>
        {note ? (
          <p className="mt-3 max-w-2xl text-body-m text-cocoa">{note}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function SwatchCard({
  token,
  hex,
  name,
  usage,
  on,
  textSize = "body",
  origin,
}: (typeof PALETTE)[number]) {
  return (
    <div className="overflow-hidden rounded-sm border border-rule bg-ivory">
      <div className="h-24 w-full" style={{ backgroundColor: hex }} />
      <div className="p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-display-s">{name}</h3>
          <code className="text-body-s text-cocoa">{hex}</code>
        </div>
        <p className="mt-1 text-body-s text-cocoa">
          <code>--color-{token}</code>
        </p>
        <p className="mt-3 text-body-s">{usage}</p>
        <p className="mt-3">
          <span className="label-caps">{origin}</span>
        </p>
        {on.length > 0 && (
          <ul className="mt-3 space-y-1">
            {on.map((s) => {
              const bg = SURFACES[s as keyof typeof SURFACES];
              const r = contrastRatio(hex, bg);
              const v = aaVerdict(r, textSize);
              return (
                <li key={s} className="text-body-s">
                  <span className="text-cocoa">{SURFACE_LABEL[s]}</span>{" "}
                  <strong>{r.toFixed(2)}:1</strong>{" "}
                  <span className={v === "fail" ? "text-error" : "text-gold-deep"}>{v}</span>
                  {textSize === "large" ? (
                    <span className="text-cocoa"> &middot; large text only</span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

const btnBase =
  "inline-flex items-center justify-center px-7 py-3 text-label uppercase transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40";

export default function Styleguide() {
  return (
    <main className="mx-auto max-w-5xl px-gutter py-section">
      <header className="mb-section">
        <p className="label-caps">ATLY Belgian Chocolate</p>
        <h1 className="mt-3 text-display-xl">Styleguide</h1>
        <p className="mt-5 max-w-2xl text-body-l text-cocoa">
          Every design token in the system, with measured contrast. The palette is sampled
          from the logo; the scale and ornament are derived from it. Nothing here is
          applied to the storefront until it is approved.
        </p>
        <p className="mt-4 max-w-2xl text-body-s text-cocoa">
          Contrast figures are computed live from the same values the tokens use. Run{" "}
          <code>npm run check:contrast</code> for the full audit.
        </p>
      </header>

      <Section
        n="01"
        title="Color"
        note="Two golds, because one cannot do both jobs at AA. Antique Gold reads as gold but only clears 2.99:1 on cream — fine as ornament, never as text. Gold Deep is the functional one on light surfaces."
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PALETTE.map((s) => (
            <SwatchCard key={s.token} {...s} />
          ))}
        </div>

        <h3 className="mt-12 mb-5 text-display-s">Ornament</h3>
        <p className="mb-5 max-w-2xl text-body-m text-cocoa">
          Decorative only. These carry no information, so WCAG 1.4.11 does not apply — but
          they are listed rather than quietly omitted.
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          {ORNAMENT.map((s) => (
            <div key={s.token} className="rounded-sm border border-rule bg-ivory p-4">
              <div className="flex items-baseline justify-between gap-3">
                <h4 className="text-display-s">{s.name}</h4>
                <code className="text-body-s text-cocoa">{s.hex}</code>
              </div>
              <div className="my-4 h-px w-full" style={{ backgroundColor: s.hex }} />
              <p className="text-body-s">{s.usage}</p>
              <p className="mt-2 text-body-s text-cocoa">
                {contrastRatio(s.hex, SURFACES.cream).toFixed(2)}:1 on cream &middot;
                decorative, exempt
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        n="02"
        title="Typography"
        note="Cormorant Garamond for display, matching the classical serif in the logo. Work Sans for body — a humanist sans with enough contrast against the serif to keep the two clearly distinct."
      >
        <div className="space-y-8">
          {TYPE_SCALE.map((t) => (
            <div
              key={t.token}
              className="border-t border-rule pt-5 sm:flex sm:items-baseline sm:gap-8"
            >
              <div className="mb-3 shrink-0 sm:mb-0 sm:w-48">
                <code className="text-body-s text-cocoa">text-{t.token}</code>
                <p className="text-body-s text-cocoa">
                  {t.px} &middot; {t.family}
                </p>
                <p className="text-body-s text-cocoa">{t.role}</p>
              </div>
              <p className={t.className}>Small bites of happiness</p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        n="03"
        title="Buttons"
        note="Hover and focus are live — tab through these. Every focus ring is 2px Gold Deep at 5.04:1 on cream, past the 3:1 floor for non-text UI."
      >
        <div className="flex flex-wrap items-center gap-4">
          <button type="button" className={`${btnBase} bg-cocoa-deep text-cream hover:bg-cocoa`}>
            Add to cart
          </button>
          <button
            type="button"
            className={`${btnBase} border border-cocoa-deep text-cocoa-deep hover:bg-cocoa-deep hover:text-cream`}
          >
            View the shop
          </button>
          <button
            type="button"
            className={`${btnBase} text-gold-deep underline underline-offset-4 hover:text-cocoa-deep`}
          >
            Read our story
          </button>
          <button type="button" disabled className={`${btnBase} bg-cocoa-deep text-cream`}>
            Sold out
          </button>
        </div>
        <p className="mt-5 text-body-s text-cocoa">
          Primary label 11.39:1 &middot; secondary label 11.39:1 &middot; tertiary 5.04:1.
          The disabled control is dimmed and carries the <code>disabled</code> attribute —
          never colour alone.
        </p>
      </Section>

      <Section
        n="04"
        title="Form elements"
        note="Every control has a visible label bound with htmlFor. Errors are carried by wording and a border-weight change, not by colour alone."
      >
        <div className="grid max-w-2xl gap-7">
          <div>
            <label htmlFor="sg-name" className="label-caps mb-2 block">
              Full name
            </label>
            <input
              id="sg-name"
              type="text"
              placeholder="Jane Doe"
              className="w-full rounded-sm border border-cocoa bg-ivory px-4 py-3 text-body-m"
            />
          </div>

          <div>
            <label htmlFor="sg-zip" className="label-caps mb-2 block">
              Delivery ZIP
            </label>
            <input
              id="sg-zip"
              type="text"
              defaultValue="10001"
              aria-invalid="true"
              aria-describedby="sg-zip-error"
              className="w-full rounded-sm border-2 border-error bg-ivory px-4 py-3 text-body-m"
            />
            <p id="sg-zip-error" className="mt-2 text-body-s text-error">
              We deliver within New Jersey only. This ZIP is outside our delivery area.
            </p>
          </div>

          <div>
            <label htmlFor="sg-note" className="label-caps mb-2 block">
              Gift note
            </label>
            <textarea
              id="sg-note"
              rows={3}
              className="w-full rounded-sm border border-cocoa bg-ivory px-4 py-3 text-body-m"
            />
            <p className="mt-2 text-body-s text-cocoa">
              Handwritten on a card and tucked into the box.
            </p>
          </div>

          <div>
            <label htmlFor="sg-flavor" className="label-caps mb-2 block">
              Flavor
            </label>
            <select
              id="sg-flavor"
              className="w-full rounded-sm border border-cocoa bg-ivory px-4 py-3 text-body-m"
            >
              <option>Salted Caramel</option>
              <option>Peanut Butter</option>
            </select>
          </div>

          <fieldset className="border border-rule p-5">
            <legend className="label-caps px-2">Box size</legend>
            <div className="space-y-3">
              {["3 pieces — $5", "8 pieces — $10"].map((o, i) => (
                <div key={o} className="flex items-center gap-3">
                  <input
                    type="radio"
                    id={`sg-box-${i}`}
                    name="sg-box"
                    defaultChecked={i === 0}
                    className="h-4 w-4 accent-cocoa-deep"
                  />
                  <label htmlFor={`sg-box-${i}`} className="text-body-m">
                    {o}
                  </label>
                </div>
              ))}
            </div>
          </fieldset>

          <div className="flex items-start gap-3">
            <input type="checkbox" id="sg-ack" className="mt-1 h-4 w-4 accent-cocoa-deep" />
            <label htmlFor="sg-ack" className="text-body-m">
              I understand these are made in a kitchen that handles peanuts and tree nuts.
            </label>
          </div>
        </div>
      </Section>

      <Section
        n="05"
        title="Dark surface"
        note="On Cocoa Deep the functional gold disappears — Gold Deep sits at 2.26:1 there. Antique Gold carries 3.81:1, so it may accent large display text only; body copy and focus rings switch to Cream."
      >
        <div className="on-dark rounded-sm bg-cocoa-deep px-8 py-12 text-cream">
          <p className="text-label uppercase tracking-[0.18em] text-gold">
            Belcolade Lait Selection 34%
          </p>
          <h3 className="mt-4 text-display-l">A Sweet Story of Strength</h3>
          <p className="mt-5 max-w-xl text-body-l">
            Pure chocolate. Real ingredients. A bigger purpose.
          </p>
          <button
            type="button"
            className={`${btnBase} mt-8 border border-cream text-cream hover:bg-cream hover:text-cocoa-deep`}
          >
            Tab to me
          </button>
          <p className="mt-6 text-body-s">
            Cream on Cocoa Deep 11.39:1 &middot; Antique Gold 3.81:1, large text only
          </p>
        </div>
      </Section>

      <Section
        n="06"
        title="Rhythm"
        note="Luxury reads as restraint. Section spacing is deliberately large; when in doubt, add space and remove an element."
      >
        <dl className="grid gap-4 sm:grid-cols-3">
          {[
            ["--spacing-section", "6rem / 96px", "Between major sections"],
            ["--spacing-section-lg", "9rem / 144px", "Around hero and story"],
            ["--spacing-gutter", "1.5rem / 24px", "Page edge on mobile"],
          ].map(([t, v, r]) => (
            <div key={t} className="rounded-sm border border-rule bg-ivory p-4">
              <dt>
                <code className="text-body-s">{t}</code>
              </dt>
              <dd className="mt-2 text-body-m">{v}</dd>
              <dd className="mt-1 text-body-s text-cocoa">{r}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <footer className="border-t border-rule-strong pt-6 text-body-s text-cocoa">
        Internal reference. Not linked from the storefront, and marked noindex.
      </footer>
    </main>
  );
}
