@AGENTS.md

# ATLY Belgian Chocolate — working agreement

## SCOPE LOCK (non-negotiable)

Work **only** inside this repository. Its root is the directory containing this file
(`C:\Users\aalad\Desktop\atly`).

- Every file you read, create, or edit must live under this root. Nothing outside it is
  in scope — not to read, not to edit, not to import from, not to copy patterns out of,
  not to reason about.
- Several unrelated projects exist elsewhere on this machine. They are off-limits for the
  entire session. As far as this session is concerned, they do not exist.
- If you think you need a file outside this root, **stop and ask** instead of going to
  find it.

## What ATLY is

ATLY Belgian Chocolate — a family-run handmade chocolate business in New Jersey, currently
selling at farmers markets. **Online ordering is the entire point of this site**;
everything else supports it. The most common question at market was "how do I order
online?"

Positioning: artisanal luxury, on the model of a high-end Belgian chocolate boutique —
restrained, elegant, generous whitespace, photography-led. Not cute, not craft-fair, not
busy.

Taglines: "Pure chocolate. Real ingredients. A bigger purpose." and "Small bites of
happiness." About-page headline: "A Sweet Story of Strength."

The founder's story is the emotional heart of the brand. Handle it with restraint and
dignity — it reads as a personal letter, not a sales page. Never embellish it, never
rewrite it into marketing voice, and never add health claims about chocolate.

## How this project is built

Ten numbered steps (see `README.md`), one step at a time. At the end of every step: list
the files you changed, show me how to verify it, print

    --- STEP N COMPLETE. Type CONTINUE to proceed. ---

then stop and wait for `CONTINUE` or `OKAY`. Never batch steps. Never skip ahead. `REDO`
means revise the current step, not advance to the next one.

- Ask when a requirement is ambiguous rather than guessing — especially on pricing,
  weights, delivery tiers, and ingredients.
- Keep changes surgical. Don't refactor an earlier approved step without saying why first.
- No lorem ipsum in anything a customer would see. Mark unknowns as `TODO:`.
- **Never invent an ingredient, an allergen statement, a weight, or a price.** Ask.
- Never hardcode a key or secret. Secrets go in `.env.local`; `.env.example` gets names
  only, never values.

## Stack (approved in Step 1)

Next.js (App Router) + TypeScript · Tailwind CSS · Supabase Postgres · Stripe with Stripe
Tax · Resend · Vercel.

Read `node_modules/next/dist/docs/` before writing routing, caching, or request-API code.
This Next.js version's conventions differ from training data — see `AGENTS.md`.

## Conventions

- `src/app/` routes · `src/components/` UI · `src/lib/` logic and clients ·
  `src/types/` shared types · `supabase/migrations/` SQL.
- The pricing engine (Step 3) and delivery engine (Step 6) live in `src/lib/` and stay
  **pure and testable** — no React, no DB calls, no clock reads inside the calculators.
  Values are passed in.
- Delivery configuration (Hunterdon County ZIP list, weight tiers) is editable data, not
  values hardcoded in a component.
- Server-only env vars must never be imported into a client component.

## Hard constraints

- **New Jersey only.** No nationwide shipping yet. The site says so clearly before
  checkout, never as a surprise at the address step. Validate state server-side — never
  trust the client.
- Free delivery on orders over $50, Hunterdon County NJ only. $5.99 otherwise, with
  weight affecting cost (exact tiers to be approved in Step 6).
- Re-validate the entire cart total server-side before charging.
- Nuts are a launch-lineup allergen (peanut butter, hazelnut, mixed nuts). Affected
  products need allergen labeling plus a shared-kitchen cross-contact statement.
- WCAG AA contrast on every text pairing. Visible focus states, real keyboard navigation,
  alt text on every product photo. Mobile-first — the primary customer is scanning a QR
  code at the market table.
