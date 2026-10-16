-- Kuopio Bites admin/custom product/delivery/timer additions.
-- Additive only: historic menu and order records are retained and legacy products
-- are archived rather than physically deleted. Back up the Supabase project before
-- applying this migration to production (see ADMIN_GUIDE.md).

alter table public.categories
  add column if not exists archived_at timestamptz;

alter table public.menu_items
  add column if not exists weight_kg numeric(8,3) not null default 0 check (weight_kg >= 0),
  add column if not exists featured boolean not null default false,
  add column if not exists is_special boolean not null default false,
  add column if not exists toppings_enabled boolean not null default false,
  add column if not exists included_toppings text[] not null default '{}',
  add column if not exists archived_at timestamptz;

alter table public.item_toppings
  add column if not exists included boolean not null default false,
  add column if not exists price_overrides jsonb not null default '{}'
    check (jsonb_typeof(price_overrides) = 'object');

-- Normalized product configuration tables. Existing price_variants/mods JSON stays
-- the API compatibility format; the backend dual-writes these tables and this
-- backfill preserves existing catalog data for reporting/admin tooling.
create table if not exists public.menu_item_variants (
  id text primary key,
  item_id text not null references public.menu_items(id) on delete cascade,
  label text not null,
  label_en text,
  label_fi text,
  name_en text,
  name_fi text,
  description_en text,
  description_fi text,
  price numeric(10,2) not null check (price >= 0),
  weight_kg numeric(8,3) check (weight_kg >= 0),
  image_url text,
  is_default boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (item_id, label)
);
create index if not exists menu_item_variants_item_order_idx on public.menu_item_variants(item_id, sort_order);
drop trigger if exists menu_item_variants_set_updated_at on public.menu_item_variants;
create trigger menu_item_variants_set_updated_at before update on public.menu_item_variants
  for each row execute function private.set_updated_at();

create table if not exists public.menu_option_groups (
  id text primary key,
  item_id text not null references public.menu_items(id) on delete cascade,
  name_en text not null,
  name_fi text,
  selection_type text not null check (selection_type in ('single','multi')),
  required boolean not null default false,
  min_selections integer not null default 0 check (min_selections >= 0),
  max_selections integer check (max_selections is null or max_selections >= min_selections),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists menu_option_groups_item_order_idx on public.menu_option_groups(item_id, sort_order);
drop trigger if exists menu_option_groups_set_updated_at on public.menu_option_groups;
create trigger menu_option_groups_set_updated_at before update on public.menu_option_groups
  for each row execute function private.set_updated_at();

create table if not exists public.menu_option_choices (
  id text primary key,
  group_id text not null references public.menu_option_groups(id) on delete cascade,
  label_en text not null,
  label_fi text,
  topping_id text references public.toppings(id) on delete set null,
  price numeric(10,2) not null default 0 check (price >= 0),
  price_by_variant jsonb not null default '[]' check (jsonb_typeof(price_by_variant) = 'array'),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists menu_option_choices_group_order_idx on public.menu_option_choices(group_id, sort_order);
drop trigger if exists menu_option_choices_set_updated_at on public.menu_option_choices;
create trigger menu_option_choices_set_updated_at before update on public.menu_option_choices
  for each row execute function private.set_updated_at();

-- Delivery conditions are JSON ranges so distance, weight, subtotal, and combined
-- conditions can evolve without another schema deployment.
create table if not exists public.delivery_rules (
  id text primary key,
  name_en text not null,
  name_fi text not null,
  condition_type text not null check (condition_type in ('distance','weight','subtotal','combined')),
  conditions jsonb not null check (jsonb_typeof(conditions) = 'object'),
  outcome text not null check (outcome in ('free_delivery','fixed_fee','percent_fee','fixed_discount','no_delivery')),
  value numeric(10,2) check (value is null or value >= 0),
  active boolean not null default true,
  active_days smallint[] check (active_days is null or active_days <@ '{0,1,2,3,4,5,6}'),
  start_time text check (start_time is null or start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  end_time text check (end_time is null or end_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  start_date date,
  end_date date,
  priority integer not null default 0,
  stackable boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_date is null or end_date is null or start_date <= end_date)
);
create index if not exists delivery_rules_active_priority_idx on public.delivery_rules(active, priority desc);
drop trigger if exists delivery_rules_set_updated_at on public.delivery_rules;
create trigger delivery_rules_set_updated_at before update on public.delivery_rules
  for each row execute function private.set_updated_at();

-- Server-only address geocoding cache. Raw input is normalized before storage;
-- customer addresses are never returned from this table or exposed to browsers.
create table if not exists public.delivery_geocode_cache (
  address_hash text primary key check (address_hash ~ '^[a-f0-9]{64}$'),
  latitude numeric(10,7) not null check (latitude between -90 and 90),
  longitude numeric(10,7) not null check (longitude between -180 and 180),
  updated_at timestamptz not null default now()
);
drop trigger if exists delivery_geocode_cache_set_updated_at on public.delivery_geocode_cache;
create trigger delivery_geocode_cache_set_updated_at before update on public.delivery_geocode_cache
  for each row execute function private.set_updated_at();

alter table public.cart_items
  add column if not exists selections jsonb not null default '[]' check (jsonb_typeof(selections) = 'array');

alter table public.order_items
  add column if not exists selected_options jsonb not null default '[]' check (jsonb_typeof(selected_options) = 'array');

alter table public.orders
  add column if not exists ready_at timestamptz,
  add column if not exists ready_note text,
  add column if not exists delivery_rule_id text references public.delivery_rules(id) on delete set null,
  add column if not exists delivery_offer_en text,
  add column if not exists delivery_offer_fi text,
  add column if not exists distance_km numeric(8,3) check (distance_km is null or distance_km >= 0),
  add column if not exists order_weight_kg numeric(8,3) not null default 0 check (order_weight_kg >= 0);
create index if not exists orders_ready_at_idx on public.orders(ready_at) where ready_at is not null;

-- Backfill normalized variants from the current JSON representation. Single-price
-- items get a base variant row; JSON remains unchanged until edited in admin.
insert into public.menu_item_variants
  (id, item_id, label, label_en, label_fi, name_en, name_fi, description_en, description_fi, price, weight_kg, image_url, is_default, sort_order)
select
  mi.id || '-v' || v.ordinality::text,
  mi.id,
  coalesce(nullif(v.variant ->> 'label', ''), 'Default'),
  coalesce(v.variant ->> 'labelEn', v.variant ->> 'label'),
  coalesce(v.variant ->> 'labelFi', v.variant ->> 'label'),
  coalesce(v.variant ->> 'nameEn', mi.name_en, mi.name_fi),
  coalesce(v.variant ->> 'nameFi', mi.name_fi, mi.name_en),
  coalesce(v.variant ->> 'descEn', mi.description_en),
  coalesce(v.variant ->> 'descFi', mi.description_fi),
  coalesce((v.variant ->> 'value')::numeric, mi.price_med),
  coalesce((v.variant ->> 'weightKg')::numeric, mi.weight_kg),
  coalesce(v.variant ->> 'imageUrl', mi.photo_url),
  v.ordinality = 1,
  v.ordinality::integer - 1
from public.menu_items mi
cross join lateral jsonb_array_elements(coalesce(mi.price_variants, '[]'::jsonb)) with ordinality as v(variant, ordinality)
on conflict (id) do nothing;
insert into public.menu_item_variants
  (id, item_id, label, label_en, label_fi, name_en, name_fi, description_en, description_fi, price, weight_kg, image_url, is_default, sort_order)
select mi.id || '-v1', mi.id, 'Default', 'Default', 'Oletus', coalesce(mi.name_en, mi.name_fi), coalesce(mi.name_fi, mi.name_en),
       mi.description_en, mi.description_fi, mi.price_med, mi.weight_kg, mi.photo_url, true, 0
from public.menu_items mi
where mi.price_variants is null or jsonb_array_length(mi.price_variants) = 0
on conflict (id) do nothing;

-- Normalize option groups and choices from the established mods JSON.
insert into public.menu_option_groups
  (id, item_id, name_en, name_fi, selection_type, required, min_selections, max_selections, sort_order)
select mi.id || ':' || coalesce(g.group_json ->> 'id', g.ordinality::text), mi.id,
       coalesce(g.group_json ->> 'name', 'Options'), coalesce(g.group_json ->> 'nameFi', g.group_json ->> 'name', 'Valinnat'),
       coalesce(g.group_json ->> 'type', 'multi'), coalesce((g.group_json ->> 'required')::boolean, false),
       coalesce((g.group_json ->> 'exact')::integer, (g.group_json ->> 'min')::integer, case when coalesce((g.group_json ->> 'required')::boolean, false) then 1 else 0 end),
       coalesce((g.group_json ->> 'exact')::integer, (g.group_json ->> 'max')::integer, case when g.group_json ->> 'type' = 'single' then 1 else null end), g.ordinality::integer - 1
from public.menu_items mi
cross join lateral jsonb_array_elements(coalesce(mi.mods, '[]'::jsonb)) with ordinality as g(group_json, ordinality)
on conflict (id) do nothing;
insert into public.menu_option_choices (id, group_id, label_en, label_fi, topping_id, price, price_by_variant, sort_order)
select mi.id || ':' || coalesce(g.group_json ->> 'id', g.ordinality::text) || ':c' || c.ordinality::text,
       mi.id || ':' || coalesce(g.group_json ->> 'id', g.ordinality::text),
       coalesce(c.choice ->> 'labelEn', c.choice ->> 'label', 'Option'),
       coalesce(c.choice ->> 'labelFi', c.choice ->> 'label', 'Vaihtoehto'),
       case when exists (select 1 from public.toppings topping where topping.id = c.choice ->> 'toppingId') then c.choice ->> 'toppingId' else null end,
       coalesce((c.choice ->> 'price')::numeric, 0),
       coalesce(c.choice -> 'priceByVariant', g.group_json -> 'perVariantExtra', '[]'::jsonb), c.ordinality::integer - 1
from public.menu_items mi
cross join lateral jsonb_array_elements(coalesce(mi.mods, '[]'::jsonb)) with ordinality as g(group_json, ordinality)
cross join lateral jsonb_array_elements(coalesce(g.group_json -> 'options', '[]'::jsonb)) with ordinality as c(choice, ordinality)
on conflict (id) do nothing;

alter table public.menu_item_variants enable row level security;
alter table public.menu_option_groups enable row level security;
alter table public.menu_option_choices enable row level security;
alter table public.delivery_rules enable row level security;
alter table public.delivery_geocode_cache enable row level security;

grant select on public.menu_item_variants, public.menu_option_groups, public.menu_option_choices, public.delivery_rules to anon, authenticated;
-- Direct Data API writes are intentionally denied; all admin mutations pass
-- through the backend's authenticated, role-checked, validated API.
revoke insert, update, delete on public.menu_item_variants, public.menu_option_groups, public.menu_option_choices, public.delivery_rules from anon, authenticated;
grant all on public.menu_item_variants, public.menu_option_groups, public.menu_option_choices, public.delivery_rules, public.delivery_geocode_cache to service_role;
revoke all on public.delivery_geocode_cache from public, anon, authenticated;

create policy "menu_item_variants: anyone can read"
  on public.menu_item_variants for select to anon, authenticated using (true);
create policy "menu_option_groups: anyone can read"
  on public.menu_option_groups for select to anon, authenticated using (true);
create policy "menu_option_choices: anyone can read"
  on public.menu_option_choices for select to anon, authenticated using (true);
create policy "menu_item_variants: owner/manager can write"
  on public.menu_item_variants for all to authenticated
  using ((select private.staff_role()) in ('owner','manager'))
  with check ((select private.staff_role()) in ('owner','manager'));
create policy "menu_option_groups: owner/manager can write"
  on public.menu_option_groups for all to authenticated
  using ((select private.staff_role()) in ('owner','manager'))
  with check ((select private.staff_role()) in ('owner','manager'));
create policy "menu_option_choices: owner/manager can write"
  on public.menu_option_choices for all to authenticated
  using ((select private.staff_role()) in ('owner','manager'))
  with check ((select private.staff_role()) in ('owner','manager'));
create policy "delivery_rules: active read"
  on public.delivery_rules for select to anon, authenticated using (active);
create policy "delivery_rules: owner/manager can write"
  on public.delivery_rules for all to authenticated
  using ((select private.staff_role()) in ('owner','manager'))
  with check ((select private.staff_role()) in ('owner','manager'));

-- Existing seeded rows on a production database are collapsed using stable
-- keeper IDs. The companion script calls the same idempotent conversion after a
-- clean seed (where migrations initially ran against an empty catalog).
create or replace function public.convert_kuopio_bites_legacy_variants()
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_biryani jsonb;
  v_samosa jsonb;
begin
  select price_variants into v_biryani from public.menu_items
   where id = 'specials-3'
     and price_variants @> '[{"label":"half"},{"label":"full"},{"label":"meal"},{"label":"chicken"}]'::jsonb;
  if v_biryani is null then
  select jsonb_agg(jsonb_build_object(
    'label', v.label, 'labelEn', v.label_en, 'labelFi', v.label_fi, 'value', v.price,
    'nameEn', v.name_en, 'nameFi', v.name_fi,
    'descEn', v.description_en, 'descFi', v.description_fi,
    'imageUrl', v.image_url, 'weightKg', v.weight_kg
  ) order by v.sort_order) into v_biryani
  from (
    select 0 as sort_order, 'half'::text as label, 'Half Platter'::text as label_en, 'Puolikas annos'::text as label_fi,
           name_en, name_fi, description_en, description_fi, price_med as price, weight_kg,
           coalesce(photo_url, '/menu/specials/biryani-half.webp') as image_url
      from public.menu_items where id = 'specials-5'
    union all
    select 1, 'full', 'Full Platter', 'Täysi annos', name_en, name_fi, description_en, description_fi,
           price_med, weight_kg, coalesce(photo_url, '/menu/specials/karachi-biryani.webp')
      from public.menu_items where id = 'specials-3'
    union all
    select 2, 'meal', 'Biryani Meal', 'Biryani-ateria', name_en, name_fi, description_en, description_fi,
           price_med, weight_kg, coalesce(photo_url, '/menu/specials/biryani-meal.webp')
      from public.menu_items where id = 'specials-4'
    union all
    select 3, 'chicken', 'Chicken Biryani', 'Kanabiryani', name_en, name_fi, description_en, description_fi,
           price_med, weight_kg, coalesce(photo_url, '/menu/rice/chicken-biryani.webp')
      from public.menu_items where id = 'rice-144'
  ) v;
  end if;

  select price_variants into v_samosa from public.menu_items
   where id = 'specials-6'
     and price_variants @> '[{"label":"classic-1"},{"label":"classic-2"},{"label":"vegetarian-1"},{"label":"vegetarian-2"}]'::jsonb;
  if v_samosa is null then
  select jsonb_agg(jsonb_build_object(
    'label', v.label, 'labelEn', v.label_en, 'labelFi', v.label_fi, 'value', v.price,
    'nameEn', v.name_en, 'nameFi', v.name_fi,
    'descEn', v.description_en, 'descFi', v.description_fi,
    'imageUrl', v.image_url, 'weightKg', v.weight_kg
  ) order by v.sort_order) into v_samosa
  from (
    select 0 as sort_order, 'classic-1'::text as label, 'Classic · 1 pc'::text as label_en, 'Klassinen · 1 kpl'::text as label_fi,
           'Classic Samosa · 1 pc'::text as name_en, 'Klassinen samosa · 1 kpl'::text as name_fi,
           description_en, description_fi, price_med as price, weight_kg,
           coalesce(photo_url, '/menu/specials/samosa.webp') as image_url
      from public.menu_items where id = 'specials-6'
    union all
    select 1, 'classic-2', 'Classic · 2 pcs', 'Klassinen · 2 kpl',
           'Classic Samosa · 2 pcs', 'Klassinen samosa · 2 kpl', description_en, description_fi,
           price_med, weight_kg, coalesce(photo_url, '/menu/specials/samosa.webp')
      from public.menu_items where id = 'specials-7'
    union all
    select 2 + (p.ordinality::integer - 1),
           case when lower(coalesce(p.variant ->> 'label', '')) like '%1%' then 'vegetarian-1' else 'vegetarian-2' end,
           case when lower(coalesce(p.variant ->> 'label', '')) like '%1%' then 'Vegetarian · 1 pc' else 'Vegetarian · 2 pcs' end,
           case when lower(coalesce(p.variant ->> 'label', '')) like '%1%' then 'Kasvis · 1 kpl' else 'Kasvis · 2 kpl' end,
           case when lower(coalesce(p.variant ->> 'label', '')) like '%1%' then 'Vegetarian Samosa · 1 pc' else 'Vegetarian Samosa · 2 pcs' end,
           case when lower(coalesce(p.variant ->> 'label', '')) like '%1%' then 'Kasvissamosa · 1 kpl' else 'Kasvissamosa · 2 kpl' end,
           description_en, description_fi,
           coalesce((p.variant ->> 'value')::numeric, price_med), weight_kg,
           coalesce(p.variant ->> 'imageUrl', photo_url, '/menu/sides/vegetarian-samosa.webp')
      from public.menu_items i
      cross join lateral jsonb_array_elements(coalesce(i.price_variants, '[]'::jsonb)) with ordinality as p(variant, ordinality)
     where i.id = 'sides-156'
  ) v;
  end if;

  if v_biryani is not null and exists (select 1 from public.menu_items where id = 'specials-3') then
    update public.menu_items set
      name_en = 'Biryani', name_fi = 'Biryani', description_en = null, description_fi = null,
      price_med = (select min((value ->> 'value')::numeric) from jsonb_array_elements(v_biryani) value),
      price_perhe = null, price_variants = v_biryani,
      photo_url = coalesce(photo_url, '/menu/specials/karachi-biryani.webp'),
      featured = true, archived_at = null
    where id = 'specials-3';
    update public.menu_items set available = false, archived_at = coalesce(archived_at, now())
      where id in ('specials-4','specials-5','rice-144');
    delete from public.menu_item_variants where item_id = 'specials-3';
    insert into public.menu_item_variants
      (id,item_id,label,label_en,label_fi,name_en,name_fi,description_en,description_fi,price,weight_kg,image_url,is_default,sort_order)
    select 'specials-3-v' || (v.ordinality::integer), 'specials-3', v.value ->> 'label', v.value ->> 'labelEn', v.value ->> 'labelFi',
           v.value ->> 'nameEn', v.value ->> 'nameFi', v.value ->> 'descEn', v.value ->> 'descFi',
           (v.value ->> 'value')::numeric, coalesce((v.value ->> 'weightKg')::numeric, 0), v.value ->> 'imageUrl', v.ordinality = 1, v.ordinality::integer - 1
      from jsonb_array_elements(v_biryani) with ordinality as v(value, ordinality)
    on conflict (id) do update set label = excluded.label, label_en = excluded.label_en, label_fi = excluded.label_fi,
      name_en = excluded.name_en, name_fi = excluded.name_fi,
      description_en = excluded.description_en, description_fi = excluded.description_fi,
      price = excluded.price, weight_kg = excluded.weight_kg, image_url = excluded.image_url, sort_order = excluded.sort_order;
  end if;

  if v_samosa is not null and exists (select 1 from public.menu_items where id = 'specials-6') then
    update public.menu_items set
      name_en = 'Samosas', name_fi = 'Samosat', description_en = null, description_fi = null,
      price_med = (select min((value ->> 'value')::numeric) from jsonb_array_elements(v_samosa) value),
      price_perhe = null, price_variants = v_samosa,
      photo_url = coalesce(photo_url, '/menu/specials/samosa.webp'),
      archived_at = null
    where id = 'specials-6';
    update public.menu_items set available = false, archived_at = coalesce(archived_at, now())
      where id in ('specials-7','sides-156');
    delete from public.menu_item_variants where item_id = 'specials-6';
    insert into public.menu_item_variants
      (id,item_id,label,label_en,label_fi,name_en,name_fi,description_en,description_fi,price,weight_kg,image_url,is_default,sort_order)
    select 'specials-6-v' || (v.ordinality::integer), 'specials-6', v.value ->> 'label', v.value ->> 'labelEn', v.value ->> 'labelFi',
           v.value ->> 'nameEn', v.value ->> 'nameFi', v.value ->> 'descEn', v.value ->> 'descFi',
           (v.value ->> 'value')::numeric, coalesce((v.value ->> 'weightKg')::numeric, 0), v.value ->> 'imageUrl', v.ordinality = 1, v.ordinality::integer - 1
      from jsonb_array_elements(v_samosa) with ordinality as v(value, ordinality)
    on conflict (id) do update set label = excluded.label, label_en = excluded.label_en, label_fi = excluded.label_fi,
      name_en = excluded.name_en, name_fi = excluded.name_fi,
      description_en = excluded.description_en, description_fi = excluded.description_fi,
      price = excluded.price, weight_kg = excluded.weight_kg, image_url = excluded.image_url, sort_order = excluded.sort_order;
  end if;
end $$;
revoke all on function public.convert_kuopio_bites_legacy_variants() from public, anon, authenticated;
grant execute on function public.convert_kuopio_bites_legacy_variants() to service_role;

do $$
begin
  perform public.convert_kuopio_bites_legacy_variants();
end $$;

-- Ensure privileged changes cannot bypass the authenticated API, validation,
-- audit logging, and server-side price calculations via direct PostgREST writes.
revoke insert, update, delete on public.categories, public.menu_items, public.toppings,
  public.item_toppings, public.todays_special, public.translation_strings,
  public.promotions, public.menu_item_variants, public.menu_option_groups,
  public.menu_option_choices, public.delivery_rules from anon, authenticated;
revoke update on public.shop_settings, public.orders, public.reservations from authenticated;

-- Preserve structured option selections separately from the human-readable
-- snapshot strings so checkout can be repriced by stable group/choice IDs.
create or replace function public.create_order(p_order jsonb, p_items jsonb)
returns public.orders
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders;
begin
  insert into public.orders (id, customer_id, type, subtotal, delivery_fee, discount, discount_title,
                             offer_id, vat, total, payment_status, payment_ref, contact_name,
                             contact_phone, contact_email, address, note, scheduled_for)
  select id, customer_id, type, subtotal, coalesce(delivery_fee, 0), coalesce(discount, 0),
         discount_title, offer_id, vat, total, coalesce(payment_status, 'paid'), payment_ref,
         contact_name, contact_phone, contact_email, address, note, scheduled_for
    from jsonb_populate_record(null::public.orders, p_order)
  returning * into v_order;

  insert into public.order_items (order_id, menu_item_id, item_name_snapshot, variant_label,
                                  selected_toppings, selected_options, options, is_preorder, quantity, unit_price,
                                  line_price, note)
  select v_order.id, menu_item_id, item_name_snapshot, coalesce(variant_label, ''),
         selected_toppings, coalesce(selected_options, '[]'::jsonb), coalesce(options, '{}'), coalesce(is_preorder, false),
         quantity, unit_price, line_price, note
    from jsonb_populate_recordset(null::public.order_items, p_items);

  if v_order.offer_id is not null then
    update public.promotions
       set used_count = used_count + 1
     where id = v_order.offer_id and active
       and (usage_limit is null or used_count < usage_limit)
       and (starts_at is null or (starts_at at time zone 'Europe/Helsinki')::date <= (now() at time zone 'Europe/Helsinki')::date)
       and (expires_at is null or (expires_at at time zone 'Europe/Helsinki')::date >= (now() at time zone 'Europe/Helsinki')::date);
    if not found then raise exception 'order.promoUnavailable'; end if;
  end if;
  return v_order;
end $$;

