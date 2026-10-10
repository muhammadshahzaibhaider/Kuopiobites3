-- Server-side per-user cart. Replaces localStorage carts so a customer's cart
-- is private, tied to their auth user, and follows them across devices.
-- The server always re-prices at quote/checkout time — stored fields are a
-- display snapshot for the cart UI, never the source of truth for money.
create table if not exists public.cart_items (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid not null references public.customers(id) on delete cascade,
  line_key      text not null,                  -- client-computed identity: item+variant+options
  item_id       text not null references public.menu_items(id) on delete cascade,
  name_snap     text,                           -- item name snapshot for cart rendering
  variant_label text not null default '',
  qty           integer not null check (qty between 1 and 99),
  options       jsonb not null default '[]' check (jsonb_typeof(options) = 'array'),
  note          text,
  pizza         jsonb,                          -- pizza-builder payload (included/extras/builder)
  preorder      jsonb,                          -- scheduled pickup slot {"date":"…","time":"…"} for preorder lines
  img           text,
  unit_price    numeric(10,2),                  -- display snapshot only; server reprices on order
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint cart_items_unique unique (customer_id, line_key)
);
comment on table public.cart_items is 'Logged-in cart lines per customer; replaced by Stripe-verified order on checkout';

create index if not exists cart_items_customer_idx
  on public.cart_items (customer_id);

alter table public.cart_items enable row level security;

drop policy if exists "cart_items: read own" on public.cart_items;
create policy "cart_items: read own"
  on public.cart_items for select
  to authenticated
  using (auth.uid() = customer_id);

drop policy if exists "cart_items: add own" on public.cart_items;
create policy "cart_items: add own"
  on public.cart_items for insert
  to authenticated
  with check (auth.uid() = customer_id);

drop policy if exists "cart_items: update own" on public.cart_items;
create policy "cart_items: update own"
  on public.cart_items for update
  to authenticated
  using (auth.uid() = customer_id)
  with check (auth.uid() = customer_id);

drop policy if exists "cart_items: remove own" on public.cart_items;
create policy "cart_items: remove own"
  on public.cart_items for delete
  to authenticated
  using (auth.uid() = customer_id);

notify pgrst, 'reload schema';
