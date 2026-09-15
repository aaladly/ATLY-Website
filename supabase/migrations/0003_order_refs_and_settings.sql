-- ---------------------------------------------------------------------------
-- 0003 — what the application actually needs to persist
-- ---------------------------------------------------------------------------
-- Everything here was found by writing the Supabase-backed stores rather than
-- by reading the schema: columns the code carries that 0001 has nowhere to put,
-- a home for the admin's overrides, and one transaction.

-- ---------------------------------------------------------------------------
-- 1. Columns the order actually carries
-- ---------------------------------------------------------------------------

-- The id the cart uses. order_items.variant_id is a uuid pointing at the
-- seeded variants table, but the running application does not use those uuids:
-- the catalog lives in src/lib/catalog.ts and the cart stores ids shaped
-- "bon-bons/salted-caramel", readable in devtools and in a stored cart.
--
-- Resolving that string to a uuid on every order write would make taking money
-- depend on the catalog seed being present and in step with the code — a new
-- way for checkout to fail, in exchange for a foreign key on a column the
-- schema itself calls "kept for reporting, never used to render a historical
-- order". So the string is stored as written, and variant_id stays nullable
-- for whenever the catalog does move into the database.
alter table order_items add column if not exists variant_ref text;

create index if not exists order_items_variant_ref_idx
  on order_items (variant_ref);

-- Which version of the terms the customer accepted. Not decoration: it is the
-- answer to "what did they agree to" months later, when the terms have moved
-- on and somebody is disputing a refund window.
alter table orders add column if not exists accepted_terms_version text;

-- The bundle offers that priced this order, at order level. order_items
-- already carries the per-line share; this is the summary the confirmation
-- page and the packing slip quote back.
alter table orders add column if not exists applied_bundles jsonb;

-- When the status last changed, as distinct from when the row was last
-- touched. updated_at moves for any write; this only moves when somebody
-- actually advanced the order.
alter table orders add column if not exists status_changed_at timestamptz;

-- ---------------------------------------------------------------------------
-- 2. Admin overrides
-- ---------------------------------------------------------------------------
-- The admin edits a sparse patch over the values compiled into the code: this
-- price changed, that flavor is sold out, these bundle tiers replaced. It is
-- not a copy of the catalog, and storing it as one would mean deciding on
-- every read whether a row is an intended override or a stale duplicate of a
-- value that has since changed in code.
--
-- So it is stored as what it is: one patch document, one row, replaced whole.
-- src/lib/settings/types.ts owns its shape and validates it both ways;
-- Postgres is not asked to referee a structure the application already
-- refuses to accept when malformed.
--
-- When the catalog itself moves into products/variants/pricing_rules, this
-- table stops being needed. That is the point at which to drop it.

create table if not exists settings_overrides (
  -- One row, always. The check is what makes that true rather than a
  -- convention somebody has to remember.
  id         integer primary key default 1 check (id = 1),
  overrides  jsonb not null,
  updated_at timestamptz not null default now()
);

alter table settings_overrides enable row level security;

-- No policy at all: with RLS on and nothing permissive, anon and authenticated
-- are denied by default, the same rule the orders tables follow in 0001. Only
-- the service role gets in. Prices a customer sees are rendered server-side;
-- the browser never reads this table.

-- ---------------------------------------------------------------------------
-- 3. Placing an order, atomically
-- ---------------------------------------------------------------------------
-- An order is three inserts: the customer, the order, and its lines. Sent as
-- three separate requests they can half-succeed, and the specific way they
-- half-succeed is an order row with no items — a charge with no record of what
-- was bought. That is the exact failure this whole migration exists to remove,
-- so it is one function and one transaction.
--
-- Deliberately NOT `security definer`. The service role already bypasses RLS,
-- so definer rights would buy nothing and would hand anyone who could call
-- this function a way through the policies on orders and customers.

create or replace function place_order(payload jsonb)
returns text
language plpgsql
as $function$
declare
  v_customer_id uuid;
  v_order_id    uuid;
  v_line        jsonb;
begin
  -- Same person ordering again updates their details rather than colliding on
  -- the unique email. coalesce so a later order with a blank phone does not
  -- erase a number we already had.
  insert into customers (email, name, phone)
  values (
    payload -> 'contact' ->> 'email',
    nullif(payload -> 'contact' ->> 'name', ''),
    nullif(payload -> 'contact' ->> 'phone', '')
  )
  on conflict (email) do update set
    name  = coalesce(excluded.name,  customers.name),
    phone = coalesce(excluded.phone, customers.phone)
  returning id into v_customer_id;

  insert into orders (
    reference, customer_id, status,
    subtotal_cents, savings_cents, delivery_cents, tax_cents, total_cents,
    delivery_name, delivery_line1, delivery_line2,
    delivery_city, delivery_state, delivery_zip,
    is_hunterdon, gift_note,
    accepted_terms_version, applied_bundles,
    placed_at, status_changed_at
  )
  values (
    payload ->> 'reference',
    v_customer_id,
    coalesce(payload ->> 'status', 'new'),
    (payload ->> 'subtotal_cents')::integer,
    (payload ->> 'savings_cents')::integer,
    (payload ->> 'delivery_cents')::integer,
    (payload ->> 'tax_cents')::integer,
    (payload ->> 'total_cents')::integer,
    nullif(payload -> 'address' ->> 'name', ''),
    nullif(payload -> 'address' ->> 'line1', ''),
    nullif(payload -> 'address' ->> 'line2', ''),
    nullif(payload -> 'address' ->> 'city', ''),
    payload -> 'address' ->> 'state',
    nullif(payload -> 'address' ->> 'zip', ''),
    (payload ->> 'is_hunterdon')::boolean,
    nullif(payload ->> 'gift_note', ''),
    payload ->> 'accepted_terms_version',
    payload -> 'applied_bundles',
    coalesce((payload ->> 'placed_at')::timestamptz, now()),
    null
  )
  returning id into v_order_id;

  for v_line in select * from jsonb_array_elements(payload -> 'lines')
  loop
    insert into order_items (
      order_id, variant_ref,
      product_name, variant_name, product_kind,
      quantity, line_total_cents
    )
    values (
      v_order_id,
      v_line ->> 'variant_ref',
      v_line ->> 'product_name',
      v_line ->> 'variant_name',
      v_line ->> 'product_kind',
      (v_line ->> 'quantity')::integer,
      (v_line ->> 'line_total_cents')::integer
    );
  end loop;

  return payload ->> 'reference';
end;
$function$;

-- Nothing but the service role should be able to call this. Revoked rather
-- than left to the default grant to public, which would let the anon key at
-- least attempt it.
revoke all on function place_order(jsonb) from public;
revoke all on function place_order(jsonb) from anon;
revoke all on function place_order(jsonb) from authenticated;
