"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "./useCart";
import { placeOrder, quoteOrder } from "@/app/(site)/checkout/actions";
import type { CheckoutRequest, ValidationIssue } from "@/lib/checkout";
import { formatCents } from "@/lib/pricing";
import { BRAND } from "@/lib/catalog";

type Totals = {
  subtotalCents: number;
  savingsCents: number;
  deliveryCents: number;
  taxCents: number;
  totalCents: number;
  inFreeCounty: boolean;
  /** What delivery would have cost. Equal to deliveryCents when nothing was waived. */
  deliveryStandardCents: number;
  /** How much more would earn free delivery, or null when there is nothing to reach. */
  centsToFreeDelivery: number | null;
};

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "NJ",
  zip: "",
  giftNote: "",
};

export function CheckoutForm() {
  const { cart, hydrated, itemCount } = useCart();
  const router = useRouter();
  const [form, setForm] = useState(EMPTY_FORM);
  // Kept out of `form` because it is not a text field and, unlike the rest of
  // the form, it is a record of something the customer did rather than
  // something they typed.
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  /**
   * The last answer from the server, and which request it was an answer to.
   *
   * A refused quote keeps its reason rather than being thrown away. The server
   * knows the moment a ZIP is typed that a flavor has sold out or that an
   * address is out of state; making the customer fill in the rest of the form
   * and press Place order to be told is a small cruelty the code was doing for
   * no reason.
   */
  const [quoted, setQuoted] = useState<
    | { key: string; totals: Totals }
    | { key: string; issues: ValidationIssue[] }
    | null
  >(null);
  const [pending, startTransition] = useTransition();

  const field = (name: keyof typeof EMPTY_FORM) => ({
    id: `checkout-${name}`,
    value: form[name],
    onChange: (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => setForm((current) => ({ ...current, [name]: e.target.value })),
  });

  const errorFor = (path: string) => issues.find((i) => i.field === path)?.message;

  const request = useMemo<CheckoutRequest>(
    () => ({
      contact: { name: form.name, email: form.email, phone: form.phone },
      address: {
        line1: form.line1,
        line2: form.line2,
        city: form.city,
        state: form.state,
        zip: form.zip,
      },
      items: cart.lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
      giftNote: form.giftNote,
      acceptedTerms,
    }),
    [form, cart.lines, acceptedTerms],
  );

  /**
   * Totals come from the server, not from recomputing here.
   *
   * The same function that will authorise the charge produces the number the
   * customer is shown, so the two cannot drift apart.
   *
   * Keyed on ZIP, state and cart only. Depending on the whole request would
   * re-quote on every keystroke of a name or email, which changes nothing
   * about the total. The key is also stored alongside the result so a stale
   * answer for a previous ZIP is never displayed against a new one.
   */
  const quoteKey = useMemo(
    () =>
      JSON.stringify({
        zip: form.zip.trim(),
        state: form.state.trim().toUpperCase(),
        lines: cart.lines,
      }),
    [form.zip, form.state, cart.lines],
  );

  const shouldQuote = hydrated && itemCount > 0 && form.zip.trim().length >= 5;

  useEffect(() => {
    if (!shouldQuote) return;
    let cancelled = false;
    const key = quoteKey;
    const { zip, state, lines } = JSON.parse(key) as {
      zip: string;
      state: string;
      lines: { variantId: string; quantity: number }[];
    };

    quoteOrder({
      // A quote needs only the address; placeholders keep contact validation
      // from rejecting it before the totals are computed.
      contact: { name: "quote", email: "quote@example.com", phone: "0" },
      address: { line1: "quote", line2: "", city: "quote", state, zip },
      items: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
      giftNote: "",
      // A quote is not an order, so agreeing to the terms is not part of it.
      // Passing true here keeps an unticked box from hiding the totals the
      // customer needs in order to decide; the box is enforced where it
      // matters, on the way to a charge.
      acceptedTerms: true,
    }).then((result) => {
      if (cancelled) return;
      setQuoted(
        result.ok ? { key, totals: result.totals } : { key, issues: result.issues },
      );
    });

    return () => {
      cancelled = true;
    };
  }, [shouldQuote, quoteKey]);

  // Derived, not stored: clearing the ZIP hides the totals without an effect.
  // A result for a previous ZIP is never shown against a new one.
  const current = shouldQuote && quoted?.key === quoteKey ? quoted : null;
  const totals = current && "totals" in current ? current.totals : null;
  const quoteIssues = current && "issues" in current ? current.issues : [];

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setIssues([]);
    startTransition(async () => {
      const result = await placeOrder(request);
      if (result.ok) {
        router.push(`/order/${result.reference}`);
      } else {
        setIssues(result.issues);
        // Move the customer to the first thing that needs fixing. Handles both
        // dotted paths ("contact.email") and flat ones ("acceptedTerms") —
        // before, a flat field was silently skipped and the page just sat
        // there looking like nothing had happened.
        const first = result.issues[0];
        if (first) {
          const field = first.field.includes(".")
            ? first.field.split(".")[1]
            : first.field;
          document.getElementById(`checkout-${field}`)?.focus();
        }
      }
    });
  };

  if (!hydrated) {
    return (
      <p className="label-caps" aria-busy="true">
        Loading your order…
      </p>
    );
  }

  if (itemCount === 0) {
    return (
      <div>
        <h1 className="text-display-l">Nothing to check out</h1>
        <p className="mt-5 text-body-l text-cocoa">Your cart is empty.</p>
        <Link
          href="/shop"
          className="mt-8 inline-flex items-center bg-cocoa-deep px-8 py-4 text-label uppercase text-cream no-underline"
        >
          Browse the shop
        </Link>
      </div>
    );
  }

  const paymentIssue = errorFor("payment");
  const itemsIssue = errorFor("items");

  return (
    <form onSubmit={submit} noValidate>
      <h1 className="text-display-xl">Checkout</h1>

      {/* Errors that belong to no single field. role=alert so they are
          announced the moment they appear. */}
      {(paymentIssue || itemsIssue) && (
        <div role="alert" className="mt-8 border-2 border-error bg-ivory p-5">
          <p className="text-body-m text-error">{paymentIssue ?? itemsIssue}</p>
          {paymentIssue && (
            <p className="mt-3 text-body-s text-cocoa">
              Message us on{" "}
              <a
                href={BRAND.social.instagram}
                className="text-gold-deep"
                target="_blank"
                rel="noopener noreferrer"
              >
                Instagram
              </a>{" "}
              and we will take care of it.
            </p>
          )}
        </div>
      )}

      <section className="mt-12">
        <h2 className="label-caps">Your details</h2>
        <div className="mt-5 grid gap-6 sm:grid-cols-2">
          <Field label="Full name" error={errorFor("contact.name")} {...field("name")} autoComplete="name" />
          <Field label="Email" type="email" error={errorFor("contact.email")} {...field("email")} autoComplete="email" />
          <Field label="Phone" type="tel" error={errorFor("contact.phone")} {...field("phone")} autoComplete="tel" />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="label-caps">Delivery address</h2>
        <p className="mt-2 text-body-s text-cocoa">
          We deliver within {BRAND.delivery.stateOnly} only.
        </p>
        <div className="mt-5 grid gap-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Street address" error={errorFor("address.line1")} {...field("line1")} autoComplete="address-line1" />
          </div>
          <div className="sm:col-span-2">
            <Field label="Apartment, suite (optional)" error={errorFor("address.line2")} {...field("line2")} autoComplete="address-line2" />
          </div>
          <Field label="Town or city" error={errorFor("address.city")} {...field("city")} autoComplete="address-level2" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="State" error={errorFor("address.state")} {...field("state")} autoComplete="address-level1" maxLength={2} />
            <Field label="ZIP" error={errorFor("address.zip")} {...field("zip")} autoComplete="postal-code" inputMode="numeric" maxLength={10} />
          </div>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="label-caps">Gift note (optional)</h2>
        <label htmlFor="checkout-giftNote" className="sr-only">
          Gift note
        </label>
        <textarea
          id="checkout-giftNote"
          rows={3}
          value={form.giftNote}
          onChange={(e) => setForm((c) => ({ ...c, giftNote: e.target.value }))}
          maxLength={500}
          className="mt-4 w-full rounded-sm border border-cocoa bg-ivory px-4 py-3 text-body-m"
        />
        <p className="mt-2 text-body-s text-cocoa">
          Handwritten on a card and tucked into the box.
        </p>
      </section>

      {/* Totals, straight from the server. aria-live so they are announced
          as the ZIP changes them. */}
      <section className="mt-12 border-t border-rule-strong pt-6" aria-live="polite">
        <h2 className="label-caps">Order total</h2>
        {totals ? (
          <dl className="mt-4 space-y-3">
            <Row label="Subtotal" value={formatCents(totals.subtotalCents)} />
            {totals.savingsCents > 0 && (
              <Row label="Bundle savings" value={`−${formatCents(totals.savingsCents)}`} accent />
            )}
            <DeliveryRow totals={totals} />
            <Row label="Sales tax" value={formatCents(totals.taxCents)} />
            <div className="flex items-baseline justify-between gap-4 border-t border-rule pt-3">
              <dt className="text-body-m">Total</dt>
              <dd className="text-display-s tabular-nums">{formatCents(totals.totalCents)}</dd>
            </div>

            {/* The nudge, after the total so it reads as "and here is how to
                do better" rather than interrupting the arithmetic. Only ever
                shown when free delivery is genuinely reachable — the server
                sends null when it is not, and telling somebody to spend more
                for a discount they cannot get is a lie with a price on it. */}
            {totals.centsToFreeDelivery !== null && (
              <p className="pt-1 text-body-s text-gold-deep">
                Add {formatCents(totals.centsToFreeDelivery)} more for free delivery.
              </p>
            )}
          </dl>
        ) : quoteIssues.length > 0 ? (
          /* The server has already refused this order. Saying so here, while
             they are still looking at the ZIP field, beats letting them fill
             in the rest and press the button to find out. Inside the
             aria-live=polite section on purpose: this can change on a
             keystroke, and role=alert would interrupt on every one. */
          <div className="mt-4 border-2 border-error bg-ivory p-5">
            {quoteIssues.map((problem, index) => (
              <p
                key={`${problem.field}-${index}`}
                className={index === 0 ? "text-body-m text-error" : "mt-2 text-body-m text-error"}
              >
                {problem.message}
              </p>
            ))}
            <p className="mt-3 text-body-s text-cocoa">
              <Link href="/cart" className="text-cocoa-deep">
                Back to your cart
              </Link>{" "}
              to change it.
            </p>
          </div>
        ) : (
          <p className="mt-4 text-body-s text-cocoa">
            Enter your ZIP code to see delivery and tax.
          </p>
        )}
      </section>

      {/* ---- Terms and allergens ----
          Last thing before the button, because it is the thing being agreed
          to. The button is NOT disabled while the box is unticked: a dead
          button with no explanation is a worse experience than a button that
          says exactly what is missing when you press it. */}
      <section className="mt-12 border-t border-rule-strong pt-6">
        <label
          htmlFor="checkout-acceptedTerms"
          className="flex min-h-11 items-start gap-3 text-body-m"
        >
          <input
            id="checkout-acceptedTerms"
            name="acceptedTerms"
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            aria-invalid={errorFor("acceptedTerms") ? true : undefined}
            aria-describedby={
              errorFor("acceptedTerms") ? "checkout-acceptedTerms-error" : undefined
            }
            className="mt-1 h-5 w-5 shrink-0 accent-cocoa-deep"
          />
          <span>
            I agree to the{" "}
            <Link href="/terms" className="text-gold-deep">
              Terms &amp; Conditions
            </Link>{" "}
            and have reviewed the{" "}
            <Link href="/allergens" className="text-gold-deep">
              allergen information
            </Link>
            .
          </span>
        </label>

        <p className="mt-3 text-body-s text-cocoa">
          Our chocolate contains milk, peanuts and tree nuts, and is made in a
          shared kitchen.
        </p>

        {errorFor("acceptedTerms") && (
          <p
            id="checkout-acceptedTerms-error"
            role="alert"
            className="mt-3 text-body-s text-error"
          >
            {errorFor("acceptedTerms")}
          </p>
        )}
      </section>

      <button
        type="submit"
        disabled={pending}
        className="mt-8 inline-flex w-full items-center justify-center bg-cocoa-deep px-8 py-4 text-label uppercase text-cream transition-colors duration-200 hover:bg-cocoa disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? "Placing your order…" : "Place order"}
      </button>

      {/* Belt and braces with the checkbox above: the tick is the record that
          they were shown the allergen notice, and this is the plain statement
          of what pressing the button means. */}
      <p className="mt-4 text-body-s text-cocoa">
        By placing your order you agree to our{" "}
        <Link href="/terms" className="text-cocoa-deep">
          Terms &amp; Conditions
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="text-cocoa-deep">
          Privacy Policy
        </Link>
        .
      </p>

      <p className="mt-4 text-body-s text-cocoa">
        <Link href="/cart" className="text-cocoa-deep">
          Back to cart
        </Link>
      </p>
    </form>
  );
}

/**
 * The delivery line.
 *
 * Free delivery is worth something, so it is shown as something: the word FREE
 * with the price it replaced struck through beside it, and the saving spelled
 * out underneath. "Free" on its own is a word where a number should be, and it
 * asks the customer to remember what they were avoiding.
 *
 * The struck-through figure is only rendered when it is genuinely higher than
 * what they are paying. A Hunterdon order whose weight cannot be priced comes
 * back free with a standard cost of zero, and striking through nothing to
 * claim a saving of nothing would be theatre.
 */
function DeliveryRow({ totals }: { totals: Totals }) {
  const free = totals.deliveryCents === 0;
  const saved = totals.deliveryStandardCents - totals.deliveryCents;

  if (!free) {
    return <Row label="Delivery" value={formatCents(totals.deliveryCents)} />;
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <dt className="text-body-m">Delivery</dt>
        <dd className="tabular-nums text-body-m">
          {saved > 0 && (
            <span className="mr-2 text-cocoa line-through">
              {/* Read out as well as seen: a screen reader gets "was $5.99"
                  rather than a bare number next to the word free. */}
              <span className="sr-only">was </span>
              {formatCents(totals.deliveryStandardCents)}
            </span>
          )}
          <strong className="uppercase text-gold-deep">Free</strong>
        </dd>
      </div>
      {saved > 0 && (
        <p className="mt-1 text-body-s text-gold-deep">
          You saved {formatCents(saved)} on delivery.
        </p>
      )}
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={accent ? "text-body-s text-gold-deep" : "text-body-m"}>{label}</dt>
      <dd className={`tabular-nums ${accent ? "text-body-s text-gold-deep" : "text-body-m"}`}>
        {value}
      </dd>
    </div>
  );
}

function Field({
  label,
  error,
  id,
  ...props
}: {
  label: string;
  error?: string;
  id: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-body-s text-cocoa">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`h-11 w-full rounded-sm bg-ivory px-4 text-body-m ${
          error ? "border-2 border-error" : "border border-cocoa"
        }`}
        {...props}
      />
      {error && (
        <p id={`${id}-error`} className="mt-2 text-body-s text-error">
          {error}
        </p>
      )}
    </div>
  );
}
