-- ATLY Belgian Chocolate — Step 9: what the admin edits.
--
-- Nothing here is executed yet: there is no Supabase project connected, and
-- the admin currently writes to an in-memory store (src/lib/settings/store.ts)
-- that is lost on restart. This migration is the shape that store swaps to.
--
-- Money is integer cents everywhere. Never numeric, never float.

-- ---------------------------------------------------------------------------
-- Fix: orders.status was missing a value the application can produce
-- ---------------------------------------------------------------------------
-- 0001's check constraint allowed new / in_production / out_for_delivery /
-- delivered / cancelled. Step 7 then added 'awaiting_payment' in the
-- application, which is the status EVERY order gets until Stripe is wired in,
-- so the very first insert against 0001 as written would have been rejected.
--
-- 'awaiting_payment' is not a default: an order should only ever sit there
-- because payment has not completed, and the admin shows it in red.

alter table orders drop constraint if exists orders_status_check;

alter table orders add constraint orders_status_check
  check (status in (
    'awaiting_payment',
    'new',
    'in_production',
    'out_for_delivery',
    'delivered',
    'cancelled'
  ));

-- When the status last changed, so the admin can show "moved to Being made
-- two hours ago" rather than only the order date.
alter table orders add column if not exists status_changed_at timestamptz;

-- ---------------------------------------------------------------------------
-- Delivery settings
-- ---------------------------------------------------------------------------
-- A single row. The ZIP lists and rate live in the database rather than in
-- src/config/delivery.ts so the owner can correct the Hunterdon list without
-- anyone touching code — that list decides who gets free delivery, and it is
-- still unverified.
--
-- singleton is a one-value column with a unique constraint: the cheapest way
-- to make "there is exactly one row of settings" a rule the database enforces
-- rather than a convention the application remembers.

create table delivery_settings (
  singleton boolean primary key default true check (singleton),

  -- Two-letter state code. Everything else is refused, in the application AND
  -- by the check constraint on orders.delivery_state.
  allowed_state  text not null default 'NJ',

  -- The flat rate outside the free-delivery county.
  standard_cents integer not null default 599 check (standard_cents >= 0),

  -- Free delivery in the home county. always_free wins; threshold_cents is
  -- kept so a minimum can be reintroduced without a code change, and is
  -- ignored entirely while always_free is true.
  free_county_name     text not null default 'Hunterdon County',
  always_free          boolean not null default true,
  threshold_cents      integer not null default 5000 check (threshold_cents >= 0),
  threshold_inclusive  boolean not null default true,

  updated_at timestamptz not null default now()
);

insert into delivery_settings (singleton) values (true);

-- ZIP lists as rows rather than an array column, so a single ZIP can be added
-- or removed without rewriting the whole list, and so the five-digit rule is
-- the database's rule too.
create table delivery_zips (
  zip  text primary key check (zip ~ '^[0-9]{5}$'),
  -- 'free'     — inside the hand-delivered free-delivery area
  -- 'excluded' — not delivered to at all
  kind text not null check (kind in ('free', 'excluded')),
  -- Free text: "Flemington", "too far for a hand delivery".
  note text,
  updated_at timestamptz not null default now()
);

-- A ZIP cannot be both free and excluded; the primary key on zip already
-- guarantees that, which is why kind is not part of the key.

-- Delivery priced by total packaged weight.
--
-- EMPTY ON PURPOSE, and it must stay empty until every variant has a
-- packaged_weight_oz. The delivery engine refuses to quote an order it cannot
-- weigh, so a tier inserted here before the weights exist would refuse every
-- order on the site. The admin enforces this (src/lib/settings/apply.ts,
-- validateWeightTierDrafts) and will not save a tier while anything is
-- unweighed.
create table delivery_weight_tiers (
  id          uuid primary key default gen_random_uuid(),
  -- Inclusive upper bound. An order is charged the cheapest tier it fits in.
  max_ounces  numeric(7, 2) not null check (max_ounces > 0),
  price_cents integer not null check (price_cents >= 0),
  updated_at  timestamptz not null default now(),
  unique (max_ounces)
);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
-- Delivery rules are readable by anyone: the cart quotes delivery in the
-- browser, so the rates and the ZIP lists are already public information.
-- Writes go through the service role only — the admin is server-side.

alter table delivery_settings     enable row level security;
alter table delivery_zips         enable row level security;
alter table delivery_weight_tiers enable row level security;

create policy "delivery settings are publicly readable"
  on delivery_settings for select using (true);

create policy "delivery zips are publicly readable"
  on delivery_zips for select using (true);

create policy "delivery weight tiers are publicly readable"
  on delivery_weight_tiers for select using (true);

-- No insert/update/delete policies anywhere here. With RLS on and no
-- permissive policy, anon and authenticated are denied by default; the service
-- role bypasses RLS and is the only way to write.

-- ---------------------------------------------------------------------------
-- Seed — the current configuration
-- ---------------------------------------------------------------------------
-- !! UNVERIFIED !! ----------------------------------------------------------
-- A best-effort draft of Hunterdon County ZIP codes, carried over from
-- src/config/delivery.ts. It has NOT been checked against USPS, and it decides
-- who gets free delivery, so it is a money question.
--
-- The engine fails SAFE: a ZIP missing from this list is charged the standard
-- rate rather than given free delivery. An incomplete list under-grants, it
-- never over-grants. That is the recoverable direction of error, but it is
-- still wrong, and the owner must check it before launch. The admin's Delivery
-- page exists so they can, without a deploy.
-- ---------------------------------------------------------------------------

insert into delivery_zips (zip, kind, note) values
  ('07830', 'free', 'Califon'),
  ('08801', 'free', 'Annandale'),
  ('08802', 'free', 'Asbury'),
  ('08803', 'free', 'Baptistown'),
  ('08804', 'free', 'Bloomsbury'),
  ('08809', 'free', 'Clinton'),
  ('08822', 'free', 'Flemington'),
  ('08825', 'free', 'Frenchtown'),
  ('08826', 'free', 'Glen Gardner'),
  ('08827', 'free', 'Hampton'),
  ('08829', 'free', 'High Bridge'),
  ('08833', 'free', 'Lebanon'),
  ('08834', 'free', 'Little York'),
  ('08848', 'free', 'Milford'),
  ('08551', 'free', 'Ringoes'),
  ('08553', 'free', 'Rocky Hill area'),
  ('08556', 'free', 'Rosemont'),
  ('08557', 'free', 'Sergeantsville'),
  ('08558', 'free', 'Skillman area'),
  ('08559', 'free', 'Stockton'),
  ('08530', 'free', 'Lambertville'),
  ('08867', 'free', 'Pittstown'),
  ('08868', 'free', 'Quakertown'),
  ('08885', 'free', 'Stanton'),
  ('08887', 'free', 'Three Bridges'),
  ('08889', 'free', 'Whitehouse Station'),
  ('08858', 'free', 'Oldwick');
