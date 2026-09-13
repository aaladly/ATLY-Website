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
| `npm test` | Unit tests (Node built-in runner, no dependency) |
| `npm run admin:password` | Make an admin password hash. Never stores or prints the password |
| `npm run admin:secret` | Make an admin session secret |

### Environment

Copy `.env.example` to `.env.local` and fill in values there. `.env.example` holds
**names only** — never real values. Secrets are never hardcoded and never committed.

```bash
cp .env.example .env.local
```

## Project layout

```
src/app/(site)/        the shop — its own header, footer and chrome
src/app/admin/         the admin, behind a password — different chrome
src/components/        UI components
src/lib/               business logic and service clients
src/lib/settings/      admin-editable overrides on top of the values in code
src/types/             shared TypeScript types
supabase/migrations/   SQL migrations
public/images/         logo and product photography
reference/             source material (market signage, spec documents)
```

`(site)` and `admin` are route groups: the parentheses are not part of any URL,
so `/shop` and `/cart` are exactly where they were. The split exists so an
order-management screen does not wear the shop's navigation, which would put
"Add to cart" next to "Mark delivered".

The **pricing engine** (Step 3) and **delivery engine** (Step 6) live in `src/lib/` and
stay pure and testable: no React, no database calls, no clock reads inside the
calculators. Values are passed in.

## The product line

**Bon-bons** — hand-filled, two flavors: Salted Caramel, Peanut Butter.
Pricing (Schedule A): **$2 each · 3 for $5 · 10 for $15.** The 10-for-$15 rate is
the floor — larger orders are multiples of it, never a deeper discount, because a
hundred bon-bons is a hundred times the handwork.

**Bars** — Plain, Hazelnut, Mixed Nuts.
Pricing: **$7 each · 2 for $10.**

Either line may mix flavors freely, so bundles apply across the whole quantity of a
product kind rather than per flavor. Pricing lives in `src/lib/pricing.ts` and in the
`pricing_rules` table, editable from the admin without a deploy.

Made with Belcolade Lait Selection 34% Milk Couverture — genuine Belgian couverture, 34%
cocoa per Belcolade's specification. Fillings are handmade from all-natural ingredients.
No preservatives, no additives. Everything is made by hand in small batches.

> **Allergens:** peanut butter, hazelnut, and mixed nuts are major allergens. Ingredient
> lists and the shared-kitchen cross-contact statement are supplied by the owner in
> Step 10 — never written from guesswork.

## Delivery

New Jersey only. No nationwide shipping yet; the site states this before checkout, never
as a surprise at the address step.

- **Free delivery throughout Hunterdon County**, hand-delivered, with no minimum
- $5.99 elsewhere in New Jersey, by carrier
- Weight tiers above 48 oz are approved in shape but NOT active: no SKU has a
  packaged weight yet, and activating tiers before weights exist would make the
  engine refuse to quote every order. See `src/config/delivery.ts`.

State is validated server-side at checkout. ZIP is checked against an editable Hunterdon
County list, not a hardcoded array in a component — and since Step 9 that list is edited
from the admin rather than from the file.

## Admin

`/admin` — order list and detail, status changes, what is available, what it costs, and
the delivery rules.

**Setting it up.** Two values in `.env.local`, and with either one missing nobody can
sign in at all. There is no default password and no "unset means open" path.

```bash
npm run admin:password   # -> ADMIN_PASSWORD_HASH
npm run admin:secret     # -> ADMIN_SESSION_SECRET
```

The password is typed at a prompt, hashed with scrypt, and never stored or printed —
not by these commands and not by the application. Forgetting it means generating a new
hash, not recovering the old password. Changing `ADMIN_SESSION_SECRET` signs every
session out at once, which is the emergency exit.

**What the admin can change, and what it cannot.** Availability, packaged weights,
bundle prices, the delivery rate, the free-delivery ZIP list, excluded ZIPs, and weight
tiers. It cannot change product names, descriptions, flavors, or **allergens** — those
stay in code where a change is reviewed. An allergen list is not something to retype
into a text box.

Edits take effect immediately, everywhere: the shop, the product pages, the cart, the
live delivery estimate, and the server-side checkout that authorises the charge all read
the same effective settings. Two guards refuse a save rather than letting it through:

- **A price table must keep a price for a single one.** Without it the pricing engine
  throws and every page that prices that product goes down with it.
- **Weight tiers cannot be switched on while anything is unweighed.** The delivery
  engine refuses to quote an order it cannot weigh, so turning tiers on early would
  refuse every order on the site.

> **Not durable yet.** Changes live in the server's memory until Supabase is connected,
> so they are lost on restart and are not shared between serverless instances. The admin
> says so on every page, and the banner disappears by itself when
> `SETTINGS_ARE_DURABLE` flips in `src/lib/settings/store.ts`.

## Build status

Built one numbered step at a time. Each step ends with a file list, verification
instructions, and a full stop to wait for `CONTINUE`.

| Step | Scope | Status |
| --- | --- | --- |
| 1 | Scaffold and guardrails | Complete |
| 2 | Brand system + `/styleguide` | Awaiting approval |
| 3 | Catalog schema and pricing engine | Complete |
| 4 | Storefront pages | Complete |
| 5 | Cart | Complete |
| 6 | Delivery rules engine | Complete — weight tiers pending weights |
| 7 | Checkout and payment | Partial — blocked on Stripe, Supabase, Resend |
| 8 | About Us and brand story | Complete |
| 9 | Admin | Complete — settings are in memory until Supabase |
| 10 | Compliance, SEO, launch | Not started |

## Open questions

Tracked here so they are not silently guessed at.

**Resolved**

- **Bon-bon pricing** — Schedule A: $2 each, 3 for $5, 10 for $15, with the 10-box rate
  as the floor. (Step 3)
- **Bar pricing** — unchanged at $7 each, 2 for $10. The $7 price already sits at ~483%
  markup on a $1.20 loaded cost, which is the 500% standard the owner cited. (Step 3)
- **Mixed flavors** — permitted in both a bon-bon box and a bar pair. Bundles therefore
  apply across a product kind, not per flavor. (Step 3)
- **8-for-$10 bon-bon tier** — replaced by 10-for-$15. Eight pieces now price as
  `2x3 + 2x1` = $14.

**Blocking Step 7**

- **Stripe keys** — `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` and
  `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in `.env.local`. Until these exist,
  checkout validates an order fully and then refuses it rather than recording
  something nobody paid for.
- **A Supabase project** — orders currently live in an in-memory Map that is lost
  on restart and is not shared between serverless instances. It is a development
  stand-in, not a launch configuration.
- **A Resend key** — no confirmation email is sent yet.

**Open**

- **Signing the founder's story** — the About page story is written in the first
  person and is currently unsigned. A signature would normally close it, but we
  will not invent a name on the most personal page of the site. Tell us whether
  to sign it, and with what. (Step 8)

- **Labor time per unit** — hands-on minutes for a bon-bon and for a bar. Not needed to
  build, but it determines whether Schedule A is profitable. At an assumed 5 minutes a
  bon-bon, $2 a piece returns about $14 per labor hour before overhead; a bar returns
  about $174. If the real figure is 2 minutes, Schedule A looks very different.
- **Packaging cost basis** — is $0.10 per package per *box* or per *piece*? Costed as
  per box.
- **Is the 500% standard on ingredients only, or fully loaded including labor?**
- **Packaged weights** — shipping ounces for a filled 3-box, a filled 10-box, and a
  wrapped bar. Chocolate weight is known (9g a bon-bon, ~27.5g a bar); packaged weight
  is not. Blocks Step 6. **No longer needs a code change:** weigh each one on a kitchen
  scale and enter the ounces on `/admin/products`. Weight-based delivery rates unlock
  once every flavor has one.
- **Logo wordmark** — the supplied logo reads "ARTISAN CHOCOLATES"; every site use must
  read "BELGIAN CHOCOLATE". Corrected file, or rebuild the lockup in SVG? Rebuilding
  needs the original artwork in hand. (Step 2, blocks Step 4)
- **Assets** — `public/images/` and `reference/` are still empty. Step 4 is
  photography-led and cannot start without them.
- **Delivery rates above 48 oz** — the flat $5.99 covers up to 3 lb. Rates for
  heavier orders are still needed, along with packaged weights to measure against.
  (Step 6)
- **Excluded NJ areas** — whether any exist at all. Currently none. (Step 6)
- **Hunterdon ZIP list** — an UNVERIFIED draft that decides who gets free delivery.
  Check it against USPS before launch. Editable at `/admin/delivery`; the copy in
  `src/config/delivery.ts` is the fallback when nothing has been changed.
- **Warm weather** — shipping warnings and/or seasonal delivery pauses? (Step 6)
- **NJ sales tax** — New Jersey exempts food but carves candy back out, so chocolate is
  likely taxable at 6.625%. Confirm the Stripe Tax product code with an accountant.
  (Step 7)
- **Kitchen licensing** — cottage food permit or licensed commercial kitchen? This
  affects required labelling and, potentially, whether online sales and delivery are
  permitted at all. Confirm with the NJ Department of Health early, not at Step 10.
- **Ingredient lists and cross-contact statement** — must come from the owner. Allergen
  tags are currently seeded only from stated facts: the couverture is a milk chocolate,
  and the nut products are named for their nuts. (Step 10)
