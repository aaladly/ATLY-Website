-- ATLY Belgian Chocolate — catalog, pricing rules, and orders.
--
-- Money is stored as integer cents everywhere. Never numeric, never float.
-- Weights are deliberately nullable: the owner has not weighed the packaged
-- SKUs yet, and Step 6's delivery tiers must not be built on a guess.

-- ---------------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------------

create table products (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  name           text not null,
  kind           text not null check (kind in ('bonbon', 'bar')),
  -- Short customer-facing blurb. Long-form copy lives in the page, not the DB.
  tagline        text,
  -- The size-1 price. Bundle tiers live in pricing_rules.
  base_price_cents integer not null check (base_price_cents > 0),
  is_available   boolean not null default true,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- A variant is a flavor. Bundles apply across variants of the same kind,
-- because the owner confirmed a box or a pair may mix flavors freely.
create table variants (
  id                 uuid primary key default gen_random_uuid(),
  product_id         uuid not null references products(id) on delete cascade,
  slug               text not null,
  name               text not null,

  -- Chocolate/filling weight, supplied by the owner for costing.
  unit_weight_grams  numeric(6, 2),
  -- TODO: packaged shipping weight. Required by Step 6's delivery tiers.
  --       The owner needs to weigh a filled box and a wrapped bar.
  packaged_weight_oz numeric(6, 2),

  -- Allergen tags drive the labelling in Step 10.
  -- Seeded only from facts already stated: the couverture is Belcolade Lait
  -- Selection, a MILK chocolate, so every item contains milk; the nut products
  -- are named for their nuts.
  -- TODO: the owner must supply full ingredient lists and the shared-kitchen
  --       cross-contact statement. Do not write these from guesswork.
  contains_allergens text[] not null default '{}',

  is_available       boolean not null default true,
  sort_order         integer not null default 0,
  created_at         timestamptz not null default now(),
  unique (product_id, slug)
);

-- ---------------------------------------------------------------------------
-- Pricing rules — Schedule A
-- ---------------------------------------------------------------------------
-- Editable from the admin (Step 9) without a deploy. The engine in
-- src/lib/pricing.ts reads tiers in this shape and finds the cheapest exact
-- combination, so adding or removing a tier here changes prices safely.
--
-- The 10-for-$15 bon-bon tier is the FLOOR by decision, not by accident:
-- a hundred bon-bons is a hundred times the handwork, so there is no deeper
-- volume discount to give.

create table pricing_rules (
  id                 uuid primary key default gen_random_uuid(),
  product_kind       text not null check (product_kind in ('bonbon', 'bar')),
  bundle_size        integer not null check (bundle_size > 0),
  bundle_price_cents integer not null check (bundle_price_cents > 0),
  -- Customer-facing, e.g. "3 for $5".
  label              text not null,
  is_active          boolean not null default true,
  updated_at         timestamptz not null default now(),
  unique (product_kind, bundle_size)
);

-- Note: every kind MUST keep an active size-1 tier, or quantities that no
-- bundle can express become unpriceable and the "you save" figure has nothing
-- to compare against. priceQuantity() throws in that case. A unique constraint
-- cannot enforce that a row exists, so the admin UI (Step 9) must refuse to
-- deactivate the last unit tier. Enforced there, not here.

-- ---------------------------------------------------------------------------
-- Customers and orders
-- ---------------------------------------------------------------------------

create table customers (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  name       text,
  phone      text,
  -- Set when someone outside NJ asks to be told when delivery expands.
  notify_when_expanded boolean not null default false,
  created_at timestamptz not null default now()
);

create table orders (
  id          uuid primary key default gen_random_uuid(),
  -- Human-facing, quoted on the confirmation page and in email.
  reference   text not null unique,
  customer_id uuid references customers(id) on delete set null,

  status text not null default 'new'
    check (status in ('new', 'in_production', 'out_for_delivery', 'delivered', 'cancelled')),

  -- Totals, all integer cents. Recomputed server-side before charging;
  -- a total that arrives from the browser is never trusted.
  subtotal_cents integer not null check (subtotal_cents >= 0),
  savings_cents  integer not null default 0 check (savings_cents >= 0),
  delivery_cents integer not null default 0 check (delivery_cents >= 0),
  tax_cents      integer not null default 0 check (tax_cents >= 0),
  total_cents    integer not null check (total_cents >= 0),

  -- Delivery. New Jersey only — enforced here as well as in the application,
  -- so a bug upstream cannot write an out-of-state order.
  delivery_name  text,
  delivery_line1 text,
  delivery_line2 text,
  delivery_city  text,
  delivery_state text check (delivery_state = 'NJ'),
  delivery_zip   text,
  -- Whether the ZIP fell inside the Hunterdon County free-delivery list.
  -- Recorded as it was at order time; the list is editable and will drift.
  is_hunterdon   boolean,

  gift_note      text,
  internal_notes text,

  placed_at  timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_status_idx on orders (status, placed_at desc);
create index orders_customer_idx on orders (customer_id);

create table order_items (
  id       uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  -- Kept for reporting, but never used to render a historical order.
  variant_id uuid references variants(id) on delete set null,

  -- Snapshots. Prices and names change; a placed order must not.
  product_name text not null,
  variant_name text not null,
  product_kind text not null check (product_kind in ('bonbon', 'bar')),

  quantity          integer not null check (quantity > 0),
  -- This line's share of its bundle group total, allocated by largest
  -- remainder so the item rows sum exactly to the order subtotal.
  line_total_cents  integer not null check (line_total_cents >= 0),

  -- Which bundle tiers priced this group, for the packing slip and for
  -- answering "why was I charged this?" months later.
  applied_bundles jsonb,

  created_at timestamptz not null default now()
);

create index order_items_order_idx on order_items (order_id);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
-- The catalog is public to read. Everything about an order is server-only:
-- reads and writes go through the service role, never the anon key.

alter table products      enable row level security;
alter table variants      enable row level security;
alter table pricing_rules enable row level security;
alter table customers     enable row level security;
alter table orders        enable row level security;
alter table order_items   enable row level security;

create policy "products are publicly readable"
  on products for select using (true);

create policy "variants are publicly readable"
  on variants for select using (true);

create policy "active pricing rules are publicly readable"
  on pricing_rules for select using (is_active);

-- No policies on customers, orders, or order_items: with RLS enabled and no
-- permissive policy, the anon and authenticated roles are denied by default.
-- The service role bypasses RLS and is the only way in.

-- ---------------------------------------------------------------------------
-- Seed — the launch lineup
-- ---------------------------------------------------------------------------

insert into products (slug, name, kind, tagline, base_price_cents, sort_order) values
  ('bon-bons', 'Bon-bons', 'bonbon',
   'Hand-filled, made in small batches from all-natural ingredients.', 200, 1),
  ('bars', 'Bars', 'bar',
   'Belcolade Lait Selection 34% Belgian couverture, moulded by hand.', 700, 2);

insert into variants (product_id, slug, name, unit_weight_grams, contains_allergens, sort_order)
select id, 'salted-caramel', 'Salted Caramel', 9.00, array['milk'], 1
from products where slug = 'bon-bons';

insert into variants (product_id, slug, name, unit_weight_grams, contains_allergens, sort_order)
select id, 'peanut-butter', 'Peanut Butter', 9.00, array['milk', 'peanuts'], 2
from products where slug = 'bon-bons';

insert into variants (product_id, slug, name, unit_weight_grams, contains_allergens, sort_order)
select id, 'plain', 'Plain', 27.50, array['milk'], 1
from products where slug = 'bars';

insert into variants (product_id, slug, name, unit_weight_grams, contains_allergens, sort_order)
select id, 'hazelnut', 'Hazelnut', 27.50, array['milk', 'tree_nuts'], 2
from products where slug = 'bars';

insert into variants (product_id, slug, name, unit_weight_grams, contains_allergens, sort_order)
select id, 'mixed-nuts', 'Mixed Nuts', 27.50, array['milk', 'tree_nuts'], 3
from products where slug = 'bars';

-- Schedule A
insert into pricing_rules (product_kind, bundle_size, bundle_price_cents, label) values
  ('bonbon',  1,  200, '$2 each'),
  ('bonbon',  3,  500, '3 for $5'),
  ('bonbon', 10, 1500, '10 for $15'),
  ('bar',     1,  700, '$7 each'),
  ('bar',     2, 1000, '2 for $10');
