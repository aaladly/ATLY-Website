# ATLY Belgian Chocolate

Online ordering for ATLY Belgian Chocolate — a family-run handmade chocolate business in
New Jersey, currently selling at farmers markets.

**Online ordering is the entire point of this site.** The most common question at market
was "how do I order online?" Everything else on the site supports that one path, and the
primary customer is on a phone, standing at the market table, scanning a QR code.

Tagline: *Pure chocolate. Real ingredients. A bigger purpose.*

---

## SCOPE LOCK

This repository is self-contained. Every file read, created, or edited lives under this
root. Several unrelated projects exist elsewhere on this machine and are off-limits — they
are never opened, read from, or used as a source of patterns. See `CLAUDE.md`.

---

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16.3.5 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | Supabase (Postgres) |
| Payments | Stripe + Stripe Tax (NJ sales tax) |
| Email | Resend |
| Hosting | Vercel |

> **Next.js 16 note:** conventions in this version differ from older App Router code and
> from model training data. Read `node_modules/next/dist/docs/` before writing routing,
> caching, or request-API code. See `AGENTS.md`.

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:3100.

> The dev port is pinned to **3100** in both `package.json` and `.claude/launch.json` so
> this project never collides with another local server. If you change it, change it in
> both places.

| Script | Does |
| --- | --- |
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint (`next lint` was removed in Next 16) |
| `npm run check:contrast` | WCAG AA audit of the palette; non-zero exit on failure |

### Environment

Copy `.env.example` to `.env.local` and fill in values there. `.env.example` holds
**names only** — never real values. Secrets are never hardcoded and never committed.

```bash
cp .env.example .env.local
```

## Project layout

```
src/app/               routes (App Router)
src/components/        UI components
src/lib/               business logic and service clients
src/types/             shared TypeScript types
supabase/migrations/   SQL migrations
public/images/         logo and product photography
reference/             source material (market signage, spec documents)
```

The **pricing engine** (Step 3) and **delivery engine** (Step 6) live in `src/lib/` and
stay pure and testable: no React, no database calls, no clock reads inside the
calculators. Values are passed in.

## The product line

**Bon-bons** — hand-filled, two flavors: Salted Caramel, Peanut Butter.
Pricing: 3 for $5 · 8 for $10.

**Bars** — Plain, Hazelnut, Mixed Nuts.
Pricing: $7 each · 2 for $10.

Made with Belcolade Lait Selection 34% Milk Couverture — genuine Belgian couverture, 34%
cocoa per Belcolade's specification. Fillings are handmade from all-natural ingredients.
No preservatives, no additives. Everything is made by hand in small batches.

> **Allergens:** peanut butter, hazelnut, and mixed nuts are major allergens. Ingredient
> lists and the shared-kitchen cross-contact statement are supplied by the owner in
> Step 10 — never written from guesswork.

## Delivery

New Jersey only. No nationwide shipping yet; the site states this before checkout, never
as a surprise at the address step.

- Free delivery on orders over $50 — **Hunterdon County, NJ only**
- $5.99 on other qualifying orders
- Cost also varies by package weight (tiers approved in Step 6)

State is validated server-side at checkout. ZIP is checked against an editable Hunterdon
County list, not a hardcoded array in a component.

## Build status

Built one numbered step at a time. Each step ends with a file list, verification
instructions, and a full stop to wait for `CONTINUE`.

| Step | Scope | Status |
| --- | --- | --- |
| 1 | Scaffold and guardrails | Complete |
| 2 | Brand system + `/styleguide` | Awaiting approval |
| 3 | Catalog schema and pricing engine | Not started |
| 4 | Storefront pages | Not started |
| 5 | Cart | Not started |
| 6 | Delivery rules engine | Not started |
| 7 | Checkout and payment | Not started |
| 8 | About Us and brand story | Not started |
| 9 | Admin | Not started |
| 10 | Compliance, SEO, launch | Not started |

## Open questions

Tracked here so they are not silently guessed at.

- **Logo wordmark** — supplied logo reads "ARTISAN CHOCOLATES"; every site use must read
  "BELGIAN CHOCOLATE". Corrected file, or rebuild the lockup in SVG? (Step 2)
- **Bon-bon boxes** — fixed 3/8-piece SKUs or any quantity with bundle pricing? Can a box
  mix flavors? (Step 3)
- **Bar bundle rule** — how 2-for-$10 applies to odd counts; whether a pair may mix
  flavors. (Step 3)
- **Packaged weights** — real ounces for every SKU. (Step 3, needed by Step 6)
- **Delivery pricing** — $5.99 flat vs weight-tiered; the tier table; Hunterdon
  free-delivery threshold; hand-delivery vs carrier; any NJ no-go areas. (Step 6)
- **Warm weather** — shipping warnings and/or seasonal delivery pauses? (Step 6)
- **NJ sales tax** — New Jersey exempts food but carves candy back out, so chocolate is
  likely taxable at 6.625%. Confirm the Stripe Tax product code with an accountant.
  (Step 7)
- **Kitchen licensing** — cottage food permit or licensed commercial kitchen? This affects
  what labeling is required and, potentially, whether online sales and delivery are
  permitted at all. Confirm with the NJ Department of Health early, not at Step 10.
