-- Favorites move from the legacy `customers.favorites text[]` column into their
-- own table. Some databases never received the column migration at all, which
-- produced 500s ("column customers.favorites does not exist") on every profile
-- load — including the login/session path. This migration only ADDS a table, so
-- it is safe to apply everywhere (idempotent), and it copies any legacy data we
-- still find.
create table if not exists public.customer_favorites (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid not null references public.customers(id) on delete cascade,
  menu_item_id text not null references public.menu_items(id) on delete cascade,
  created_at   timestamptz not null default now(),

  constraint customer_favorites_unique unique (customer_id, menu_item_id)
);
comment on table public.customer_favorites is 'One saved menu item per row per customer; unique pair prevents duplicates and makes ownership explicit';

create index if not exists customer_favorites_customer_idx
  on public.customer_favorites (customer_id);

alter table public.customer_favorites enable row level security;

drop policy if exists "customer_favorites: read own" on public.customer_favorites;
create policy "customer_favorites: read own"
  on public.customer_favorites for select
  to authenticated
  using (auth.uid() = customer_id);

drop policy if exists "customer_favorites: add own" on public.customer_favorites;
create policy "customer_favorites: add own"
  on public.customer_favorites for insert
  to authenticated
  with check (auth.uid() = customer_id);

drop policy if exists "customer_favorites: remove own" on public.customer_favorites;
create policy "customer_favorites: remove own"
  on public.customer_favorites for delete
  to authenticated
  using (auth.uid() = customer_id);

-- Move any rows still stored in the legacy array column (only where that column
-- exists). Rows pointing at removed menu items are skipped instead of failing.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'customers' and column_name = 'favorites'
  ) then
    insert into public.customer_favorites (customer_id, menu_item_id)
    select c.id, f.item_id
    from public.customers c
    cross join lateral unnest(c.favorites) as f(item_id)
    join public.menu_items m on m.id = f.item_id
    on conflict (customer_id, menu_item_id) do nothing;
  end if;
end $$;

notify pgrst, 'reload schema';
