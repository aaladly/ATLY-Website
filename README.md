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
| Hosting | Hostinger |

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
| `npm run check:launch` | Is this ready to take money from a stranger? Non-zero exit while not |
| `npm run build:images` | Optimise `assets/source/` into `public/images/`; non-zero exit if a source is missing or a derivative is over budget |
| `npm test` | Unit tests (Node built-in runner, no dependency) |
| `npm run admin:password` | Make an admin password hash. Never stores or prints the password |
| `npm run admin:secret` | Make an admin session secret |

`scripts/audit-page.js` is not an npm script — paste it into the browser console on
any page and call `__audit()`. It checks heading structure, accessible names, form
labels, duplicate ids, landmarks, tap-target size and horizontal overflow. Worth running
at a phone width as well as a desktop one; that is where tap targets and overflow
actually misbehave.

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
assets/source/         full-resolution originals — NEVER served, see its README
public/images/         the optimised derivatives the site actually loads
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

> **Allergens:** milk, peanuts and tree nuts. The shared-kitchen statement is supplied;
> the per-flavor ingredient lists are still outstanding and block launch — see
> [Allergens](#allergens) below.

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

## Allergens

Made in one family kitchen that handles peanuts, hazelnuts and mixed nuts.

The **shared-kitchen cross-contact statement** is supplied and live. The **ingredient
lists** do not exist yet and are `null` in `src/lib/catalog.ts`.

Tree nuts are named individually rather than left as a category, because "tree nuts" is
useless to someone who reacts to one nut and not another. Where they came from, since
the two sources disagreed:

- **Hazelnut** — there is a Hazelnut bar in the catalog. Direct evidence.
- **Pistachio** — supplied by the owner.
- **The Mixed Nuts bar** — still unnamed, and shown as an open question. "Mixed" is not
  an allergen statement.

The owner's list named only pistachio. Dropping hazelnut to match it would have removed
a warning about a nut that is a product name on this site, so the site states the union
of both.

Three more are unconfirmed and render as visible markers: **soy** (soy lecithin is
common in couverture), **eggs** and **wheat**.

Nothing fills that gap with a plausible guess. `/allergens` and every product page say,
in plain words, that we are not claiming the chocolate is safe for someone with a nut
allergy and that they should ask first. Silence would have been the dangerous option —
an allergen section with no cross-contact warning reads as "we checked, there is no
risk".

`npm run check:launch` fails while either is missing.

> **Never write an ingredient list or an allergen statement from guesswork.** Someone
> reads it and decides whether to eat. The owner writes these, from the actual recipes
> and the actual labels in their kitchen.

## Database

Two implementations behind one tiny interface, chosen by configuration. Set
`NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` and orders and admin
settings go to Postgres. Leave either unset and they are held in memory and
lost on restart. There is no third state.

```
src/lib/supabase.ts              client, or null when unconfigured
src/lib/orders/rows.ts           row <-> domain mapping, pure and tested
src/lib/orders/supabaseStore.ts  orders in Postgres
src/lib/settings/supabaseStore.ts  admin overrides, one jsonb row
```

### Connecting a project

1. Create a project at supabase.com. Any region; pick one near New Jersey.
2. **SQL Editor -> New query**, and run the files in `supabase/migrations/`
   **in order**: `0001`, then `0002`, then `0003`. Each is idempotent enough
   to re-run, but the order matters — 0003 alters tables 0001 creates.
3. **Project Settings -> API**: copy the Project URL and the `service_role`
   key into `.env.local`.
4. Restart the dev server. `npm run check:launch` stops reporting "No
   database", and the red banner in the admin goes away by itself.

### Why an order is written by a database function

`place_order()` in migration 0003 inserts the customer, the order and its line
items in one transaction. Sent as three separate requests they can
half-succeed, and the specific way they half-succeed is an order row with no
items — a charge with no record of what was bought or where it goes.

### The service role key

It bypasses row level security completely: every table holding customer data
has RLS on with no permissive policy, so this key is the only way in, and
anything holding it can read every order and address in the business.
`src/lib/supabase.ts` carries `import "server-only"`, which makes importing it
from a client component a build error rather than a leak. Never rename it to
anything starting `NEXT_PUBLIC_`.

## Payment

Stripe PaymentIntents with the Payment Element. Not hosted Checkout: the
delivery rules, bundle pricing and New Jersey validation all live in this
codebase, and hosted Checkout would need them duplicated in Stripe.

```
src/lib/payments.ts                    keys, client, the gate
src/app/(site)/checkout/actions.ts     validate -> save -> create the intent
src/app/api/stripe/webhook/route.ts    the only thing that marks an order paid
src/lib/orders/payment.ts              what a success event should do (pure)
src/components/CheckoutPayment.tsx     the card step
```

With no keys set, checkout validates an order completely and then declines it.
That is the shipped state today and it is deliberate.

### The flow

1. The customer fills in the form. Totals come from `quoteOrder`, which calls
   the same `validateCheckout` that will authorise the charge.
2. **Continue to payment** runs `placeOrder`: validate, save the order as
   `awaiting_payment`, create a PaymentIntent for the recomputed total with
   the order reference in its metadata.
3. The card step mounts the Payment Element against that intent's client
   secret and confirms it.
4. `payment_intent.succeeded` arrives at the webhook, which moves the order to
   `new` and (once Resend is configured) sends the confirmation.

The order is written **before** the charge because the webhook arrives with
nothing but an intent id and its metadata, and an order does not fit in
metadata. The cost is a row per abandoned checkout, which is what the
`awaiting_payment` status is for.

### Why the browser never marks an order paid

A customer whose phone dies between confirming and the redirect has still been
charged. Only the webhook records payment, so the order is right either way.

### Testing locally

```
stripe listen --forward-to localhost:3100/api/stripe/webhook
```

That prints a `whsec_...` — put it in `.env.local`. It is NOT the same value
as the signing secret of a dashboard endpoint. Card `4242 4242 4242 4242`
succeeds, `4000 0000 0000 0002` is declined, `4000 0027 6000 3184` forces
3-D Secure.

## Photography

Originals go in `assets/source/` and are never served. `npm run build:images`
turns them into the derivatives in `public/images/` that the site loads, and
rewrites `src/lib/images.generated.ts` with what it produced — so a photograph
appears on the site the moment its file exists, with no flag to remember.

Until then, each slot renders a "Photograph pending" panel naming the file it is
waiting for. Deliberately obvious: this is a photography-led site, and a missing
photo should never reach a customer looking like a finished panel.

What the pipeline does per photograph: AVIF (q55), WebP (q75) and JPEG (q82) at
400, 800 and 1200 wide, 4:5 throughout, EXIF stripped. It **fails the build** if
an 800px derivative lands over 150 KB, because the customer this shop was built
for is on a phone at a market table on cellular data.

The pages render a hand-written `<picture>` rather than `next/image`. The
derivatives are already generated, and Hostinger is one modest Node process —
next/image would re-encode the same images inside the process that is meant to
be serving the shop. Static files off disk cost it nothing.

Sizes and formats live in `src/lib/images.ts`, which both the script and the
components read. They are the same file on purpose: if the widths lived in two
places they would drift, and a 404 on a product photograph still lays out
perfectly, so nobody would notice.

## Going live

```bash
npm run check:launch
```

Lists everything still outstanding, separated into blockers and things merely worth
knowing, and exits non-zero while any blocker stands. Run it before every deploy.

**Deployment checklist**

1. **Environment.** Set every name in `.env.example` in the Hostinger environment. `NEXT_PUBLIC_SITE_URL` must be the real address — until it
   is, the site emits localhost canonicals and tells crawlers not to index it.
   Values are read with variable expansion, so a `$` in a value is rewritten on the way
   in; `npm run admin:password` and `npm run admin:secret` emit values that avoid it.
2. **Database.** Run `supabase/migrations/` in order. Neither migration has ever been
   executed — orders and admin settings are still in memory.
3. **Stripe.** Live keys, and a webhook pointed at the deployment. Confirm the Stripe
   Tax product code for candy with an accountant first; New Jersey exempts food but
   carves candy back out.
4. **DNS.** Point the domain at Hostinger, add `www` as a redirect to the apex (or the
   reverse — pick one and make the other redirect, so there is a single canonical
   host). Wait for the certificate before announcing anything.
5. **Verify the live site.** `robots.txt` should now allow crawling; check
   `/sitemap.xml` lists the real domain; paste a product URL into a link-preview
   checker and confirm the card renders.
6. **Search Console.** Add the property, submit the sitemap.
7. **Place a real order** with a real card, then refund it. This is the only test that
   exercises Stripe, Resend, the database and the admin at once.

**Not installed, on purpose**

No analytics of any kind, no advertising pixels, and no third-party requests at all —
`next/font` self-hosts the fonts, so visiting the site does not tell anyone else that you
did. Verified on a running page: `document.cookie` is empty for a customer, and there are
zero third-party origins in the network log.

**There is also no cookie banner, and that is correct.** A customer receives no cookies.
The only cookie in the project is the owner's admin session (`src/lib/admin/auth.ts`);
the cart lives in `localStorage`. With nothing to consent to, a banner is friction for
no benefit, and `/privacy` says so in a section a visitor can actually find.

> **Adding analytics is not a one-line change.** The moment a script measures a visitor,
> the privacy page becomes false and a consent banner becomes necessary — non-essential
> scripts blocked until the visitor chooses, loaded dynamically rather than as static
> tags, "Reject all" exactly as prominent and as few clicks as "Accept all", nothing
> pre-ticked, a rejection that sticks without re-prompting, and a way to withdraw consent
> later from the footer. Budget for all of that, or pick a tool that needs none of it.

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
| 10 | Compliance, SEO, launch | Complete — launch blocked on the owner, see `npm run check:launch` |

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
- **Assets** — `assets/source/` is still empty, so every photograph on the site is a
  "Photograph pending" placeholder naming the file it wants. The pipeline is built and
  tested; it needs the five originals. See `assets/source/README.md`.
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
- **Ingredient lists** — must come from the owner, per flavor. The cross-contact
  statement is now supplied. **Blocks launch.** (Step 10)
- **Which nuts are in the Mixed Nuts bar**, and whether the chocolate or fillings
  contain **soy, eggs or wheat**. All four render on `/terms` and `/allergens` as
  visible markers. **Blocks launch.**
- **Order cutoff and delivery windows** — "9am–5pm, every day except Sunday" is recorded
  as when orders are taken and made. The cutoff (after which an order is made the next
  working day) and the time of day a delivery arrives are still open.
- **Venue county** for disputes, and **ATLY's registered legal form** — LLC, sole
  proprietorship, or other. The terms have to say who a customer is contracting with.
- **The real domain** — `NEXT_PUBLIC_SITE_URL`. Everything absolute the site emits is
  built from it, and it is a placeholder today. **Blocks launch.** (Step 10)
- **A business address, or not** — an Organization record is published in the structured
  data without one. A LocalBusiness record with a real address would get a map listing,
  but the kitchen is a family home and nobody has said whether that address should be
  public. (Step 10)
- **The commercial terms** — how long a return can be asked for, whether an order can be
  cancelled after it is placed, which state's law governs, delivery times, and what
  happens in hot weather. Each is marked on the page it belongs to rather than invented.
  **Blocks launch** until the pages are reviewed and `LEGAL_REVIEWED` is flipped in
  `src/lib/site.ts`. (Step 10)
- **Analytics** — none is installed, and the privacy page says so. If any is wanted, a
  privacy-respecting option that needs no cookie banner is the one to pick, and the
  privacy page changes in the same commit. (Step 10)
