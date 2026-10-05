-- Generated from SUPABASE-SETUP.md Sections 3 through 7.
-- Hand-run diagnostics and one-off commands are intentionally excluded.

-- Helper functions live here; the Data API only exposes "public", so these can't be called over HTTP.
create schema if not exists private;

-- Keeps updated_at honest on every UPDATE (attached to the tables in 3.9)
create or replace function private.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create table public.categories (
  id            text primary key,                 -- existing ids: 'specials', 'pizza1' … 'kebab' … 'drinks'
  name_fi       text not null,                    -- 'Kebab-Annokset'
  name_en       text not null,                    -- 'Kebab Dishes'
  photo_url     text,                             -- public URL in the menu-images bucket (null = bundled photo)
  photo_alt_fi  text,
  photo_alt_en  text,
  sort_order    int  not null default 0,          -- admin drag-and-drop order
  visible       boolean not null default true,    -- false = hidden from the public menu
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.menu_items (
  id                    text primary key,         -- existing ids: 'kebab-68', 'pizza2-16', 'specials-1'
  category_id           text not null references public.categories(id)
                          on update cascade on delete restrict,  -- can't delete a category that still has items
  name_fi               text not null,
  name_en               text,
  description_fi        text,
  description_en        text,
  price_med             numeric(10,2) not null check (price_med >= 0),  -- base price; the "Med" size for pizzas
  price_perhe           numeric(10,2) check (price_perhe >= 0),         -- "Perhe" (family) size; pizzas only
  price_variants        jsonb check (price_variants is null or jsonb_typeof(price_variants) = 'array'),
                          -- other size sets, e.g. [{"label":"Pelkkä","value":12.5},{"label":"Ateria","value":15.5}]
  photo_url             text,                     -- null = the bundled photo /menu/<category>/<key>.webp
  photo_alt_fi          text,
  photo_alt_en          text,
  available             boolean not null default true,   -- admin "off" switch
  sold_out_on           date,                     -- "off today only": hidden on this Helsinki date, back tomorrow
  pre_order_only        boolean not null default false,  -- Halwa Puri Platter, Extra Puri
  available_days        smallint[] not null default '{}'
                          check (available_days <@ '{0,1,2,3,4,5,6}'),  -- 0 = Sunday … 6 = Saturday; {} = every day
  preorder_cutoff       jsonb,                    -- {"day":6,"time":"18:00"} = order by Saturday 18:00
  lead_time_hours       int check (lead_time_hours >= 0),
  topping_tier_included int not null default 0
                          check (topping_tier_included between 0 and 12), -- toppings included in the price
  mods                  jsonb not null default '[]',      -- option groups (topping picker rules, dips, spice level)
  tags                  text[] not null default '{}' check (tags <@ '{veg,spicy,popular}'),
  sort_order            int not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index menu_items_category_id_idx on public.menu_items (category_id, sort_order);

create table public.toppings (
  id               text primary key,             -- slug of the Finnish name: 'jauheliha', 'aurajuusto', 'bbq'
  name_fi          text not null,                -- the label customers see and orders store: 'aurajuusto'
  name_en          text,
  surcharge_med    numeric(10,2) not null default 1.00 check (surcharge_med >= 0),   -- extra topping on Med
  surcharge_perhe  numeric(10,2) not null default 2.00 check (surcharge_perhe >= 0), -- extra topping on Perhe
  active           boolean not null default true, -- false = out of stock, hidden in the picker
  sort_order       int not null default 0
);

-- Join table: which toppings can be added to which pizza / build-your-own item
create table public.item_toppings (
  item_id     text not null references public.menu_items(id) on delete cascade,
  topping_id  text not null references public.toppings(id) on delete cascade,
  primary key (item_id, topping_id)
);
create index item_toppings_topping_idx on public.item_toppings (topping_id);

create table public.customers (
  id                  uuid primary key references auth.users(id) on delete cascade,
                        -- the customer row IS the Auth user: same uuid
  email               text not null,                                  -- synced lower-case copy; auth.users is authoritative
  name                text not null default '',
  phone               text,
  addresses           jsonb not null default '[]'
                        check (jsonb_typeof(addresses) = 'array'),  -- saved delivery addresses (max 6)
  marketing_consent   boolean not null default false,               -- opt-in only, never pre-ticked
  consent_updated_at  timestamptz,                                  -- proof of when consent changed (GDPR)
  lang                text not null default 'fi' check (lang in ('fi','en')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create unique index customers_email_lower_key on public.customers (lower(email));

create table public.promotions (
  id              text primary key default gen_random_uuid()::text,  -- existing ids like 'off-wings' import as-is
  code            text,                         -- null = automatic offer (no code to type)
  discount_type   text not null check (discount_type in
                    ('percent','fixed','override','bundle','freeItem','freeDelivery')),
  discount_value  numeric(10,2) not null default 0 check (discount_value >= 0),
  scope           jsonb not null default '{"whole": true}',  -- {"category":"wings"} | {"itemIds":[…]} | {"whole":true}
  min_order       numeric(10,2) check (min_order >= 0),
  days            smallint[] check (days <@ '{0,1,2,3,4,5,6}'),
  starts_at       timestamptz,
  expires_at      timestamptz,
  usage_limit     int check (usage_limit > 0),  -- null = unlimited
  used_count      int not null default 0 check (used_count >= 0),
  title_fi        text not null,
  title_en        text not null,
  description_fi  text,
  description_en  text,
  badge_fi        text,
  badge_en        text,
  banner_url      text,
  priority        int not null default 0,
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (usage_limit is null or used_count <= usage_limit)
);
create unique index promotions_code_key on public.promotions (upper(code)) where code is not null;

create table public.orders (
  id              text primary key,             -- the code customers see and track: 'KB-OGGBIH'
  customer_id     uuid references public.customers(id) on delete set null,
  type            text not null check (type in ('pickup','delivery')),
  status          text not null default 'placed'
                    check (status in ('placed','accepted','preparing','ready','completed')),
  subtotal        numeric(10,2) not null check (subtotal >= 0),
  delivery_fee    numeric(10,2) not null default 0 check (delivery_fee >= 0),
  discount        numeric(10,2) not null default 0 check (discount >= 0),
  discount_title  text,
  offer_id        text references public.promotions(id) on delete set null,
  vat             numeric(10,2) not null check (vat >= 0),  -- VAT contained in total (prices include VAT)
  total           numeric(10,2) not null,
  payment_status  text not null default 'paid' check (payment_status in ('pending','paid','refunded')),
  payment_ref     text,                         -- hosted-checkout payment id; card data never touches us
  contact_name    text not null,
  contact_phone   text,
  contact_email   text,
  address         text,                         -- delivery only (70xxx validated by the backend)
  note            text,
  scheduled_for   timestamptz,                  -- pre-orders, e.g. Sunday Halwa Puri pickup
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (total = greatest(0, subtotal - discount + delivery_fee)),  -- arithmetic double-check
  check (type = 'delivery' or delivery_fee = 0)
);

create table public.order_items (
  id                  uuid primary key default gen_random_uuid(),
  order_id            text not null references public.orders(id) on delete cascade,
  menu_item_id        text references public.menu_items(id) on delete set null,  -- history survives menu edits
  item_name_snapshot  text not null,            -- name at order time, taken from the server-side menu
  variant_label       text not null default '', -- 'Med' | 'Perhe' | 'Ateria' | '0.5L' | ''
  selected_toppings   jsonb,                    -- pizza lines: {"included":[…],"extras":[{"label":"aurajuusto","count":1}],"builder":false}
  options             text[] not null default '{}',  -- other picks: dips, spice level, meal drink
  is_preorder         boolean not null default false,
  quantity            int not null check (quantity between 1 and 99),
  unit_price          numeric(10,2) not null check (unit_price >= 0),
  line_price          numeric(10,2) not null,
  note                text,
  check (line_price = quantity * unit_price)
);

create index orders_status_idx         on public.orders (status, created_at desc);
create index orders_created_at_idx     on public.orders (created_at desc);
create index orders_customer_idx       on public.orders (customer_id, created_at desc);
create index order_items_order_idx     on public.order_items (order_id);
create index order_items_menu_item_idx on public.order_items (menu_item_id);

create table public.reservations (
  id             text primary key,              -- 'R-XXXXXX', same generator as today
  customer_id    uuid references public.customers(id) on delete set null,  -- null = guest booking
  date           date not null,
  time           time not null,
  party_size     int  not null check (party_size between 1 and 30),
  contact_name   text not null,
  contact_phone  text not null,
  contact_email  text,
  note           text,
  status         text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index reservations_date_idx     on public.reservations (date, time);
create index reservations_customer_idx on public.reservations (customer_id);

create table public.todays_special (
  id                  text primary key default gen_random_uuid()::text,  -- 'ts-1' … import as-is
  menu_item_id        text not null references public.menu_items(id) on delete cascade,
  discount_type       text check (discount_type in ('percent','fixed_price')),  -- null = featured, no discount
  discount_value      numeric(10,2) check (discount_value >= 0),  -- 10 = −10 %, or the special price in €
  photo_override_url  text,
  label_fi            text,                     -- 'Päivän annos'
  label_en            text,                     -- "Today's Special"
  sort_order          int not null default 0,
  active              boolean not null default true,
  active_from         date,
  active_to           date,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check ((discount_type is null) = (discount_value is null)),
  check (discount_type is distinct from 'percent' or discount_value <= 100),
  check (active_to is null or active_from is null or active_to >= active_from)
);
create index todays_special_active_idx on public.todays_special (sort_order) where active;

-- Staff are Auth users too, distinguished by a role here (Section 5.2)
create table public.staff_users (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text not null unique,             -- what staff type on the admin login: 'admin', 'kitchen'
  name        text not null,
  role        text not null check (role in ('owner','manager','kitchen')),
  active      boolean not null default true,    -- offboarding = set false (never delete: audit rows point here)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Every UI string, FI + EN (today: 215 keys)
create table public.translation_strings (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,             -- 'order.pay', 'cart.vat', …
  value_en    text not null,
  value_fi    text,
  updated_at  timestamptz not null default now()
);

-- Audit trail. Append-only (Section 4.8). The backend writes one row per admin action.
create table public.activity_log (
  id             bigint generated always as identity primary key,
  staff_user_id  uuid references public.staff_users(id),  -- deliberately no cascade
  actor_name     text not null,                 -- 'admin', 'kitchen', 'system'
  actor_role     text not null,                 -- 'owner' | 'manager' | 'kitchen' | 'customer' | 'system'
  action         text not null,                 -- 'order.status', 'item.update', 'customer.erase', …
  target_table   text,
  target_id      text,
  details        jsonb not null default '{}',
  created_at     timestamptz not null default now()
);
create index activity_log_created_idx on public.activity_log (created_at desc);
create index activity_log_target_idx  on public.activity_log (target_table, target_id);

-- Exactly one row: opening hours, pause toggle, delivery rules, VAT, pre-order rules
create table public.shop_settings (
  id             boolean primary key default true check (id),
  paused         boolean not null default false,          -- the admin "Pause orders" toggle
  pause_message  text,
  hours          jsonb not null,                          -- {"0":{"open":"12:00","close":"21:00"}, …}; null = closed
  delivery_fee   numeric(10,2) not null default 2.50,
  min_order      numeric(10,2) not null default 15.00,    -- delivery minimum
  radius_km      numeric(4,1)  not null default 6,
  vat_rate       numeric(5,4)  not null default 0.135,    -- FI rate for restaurant & takeaway food since 1.1.2026
  preorder       jsonb not null default '{}',             -- {"enabled":true,"cutoffDay":6,"cutoffTime":"18:00","slots":[…],"capacity":40}
  blocked_dates  date[] not null default '{}',
  blocked_slots  text[] not null default '{}',            -- '2026-12-24T18:00'
  announcement   jsonb not null default '{"enabled": false, "text": ""}',
  extra          jsonb not null default '{}',             -- headerLogo, hideUnavailable, Wolt/Uber Eats links
  updated_at     timestamptz not null default now()
);

-- Current opening hours (0 = Sunday): Sun 12–21, Mon–Thu 10–21, Fri 10–22, Sat 11–22
insert into public.shop_settings (hours) values ('{
  "0": {"open": "12:00", "close": "21:00"}, "1": {"open": "10:00", "close": "21:00"},
  "2": {"open": "10:00", "close": "21:00"}, "3": {"open": "10:00", "close": "21:00"},
  "4": {"open": "10:00", "close": "21:00"}, "5": {"open": "10:00", "close": "22:00"},
  "6": {"open": "11:00", "close": "22:00"}
}');

do $$
declare t text;
begin
  foreach t in array array['categories','menu_items','customers','promotions','orders','reservations',
                           'todays_special','staff_users','translation_strings','shop_settings']
  loop
    execute format('create trigger set_updated_at before update on public.%I
                    for each row execute function private.set_updated_at()', t);
  end loop;
end $$;

-- Record WHEN marketing consent was given or withdrawn (you must be able to prove consent)
create or replace function private.stamp_consent() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.consent_updated_at := now();
  elsif new.marketing_consent is distinct from old.marketing_consent then
    new.consent_updated_at := now();
  end if;
  return new;
end $$;

create trigger stamp_consent before insert or update of marketing_consent on public.customers
  for each row execute function private.stamp_consent();

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
                                  selected_toppings, options, is_preorder, quantity, unit_price,
                                  line_price, note)
  select v_order.id, menu_item_id, item_name_snapshot, coalesce(variant_label, ''),
         selected_toppings, coalesce(options, '{}'), coalesce(is_preorder, false),
         quantity, unit_price, line_price, note
    from jsonb_populate_recordset(null::public.order_items, p_items);

  if v_order.offer_id is not null then         -- redeem the promo atomically, respecting limits
    update public.promotions
       set used_count = used_count + 1
     where id = v_order.offer_id and active
       and (usage_limit is null or used_count < usage_limit)
       and (starts_at  is null or starts_at  <= now())
       and (expires_at is null or expires_at >  now());
    if not found then
      raise exception 'order.promoUnavailable';
    end if;
  end if;

  return v_order;
end $$;

-- Only the backend may call it (anon/authenticated calling it would skip repricing)
revoke execute on function public.create_order(jsonb, jsonb) from public, anon, authenticated;
grant  execute on function public.create_order(jsonb, jsonb) to service_role;

-- The backend (secret key = service_role): full data access; RLS does not apply to it.
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Everyone, signed in or not: read the public menu and shop info.
grant select on public.categories, public.menu_items, public.toppings, public.item_toppings,
                public.todays_special, public.translation_strings, public.shop_settings
  to anon, authenticated;

-- Signed-in users: may read these tables; RLS narrows it to their own rows or their role.
grant select on public.customers, public.orders, public.order_items, public.reservations,
                public.promotions, public.staff_users, public.activity_log
  to authenticated;

-- The direct writes we allow — each one is limited further by a policy in 4.5–4.7.
grant update (name, phone, addresses, marketing_consent, lang)
  on public.customers to authenticated;                            -- email changes go through Auth, not this profile patch
grant insert, update, delete on public.categories, public.menu_items, public.toppings,
                                public.item_toppings, public.todays_special,
                                public.translation_strings, public.promotions,
                                public.staff_users
  to authenticated;                                                -- owner/manager (staff: owner only)
grant update on public.shop_settings to authenticated;             -- owner/manager
grant update (status) on public.orders       to authenticated;     -- kitchen+: move through the queue
grant update (status) on public.reservations to authenticated;     -- kitchen+: accept / decline

-- Deliberately NOT granted to anon/authenticated:
--   insert on orders / order_items  → only the backend, after server-side repricing
--   insert on reservations          → only the backend, behind the rate limiter
--   any write on activity_log       → only the backend and the audit trigger
--   delete on customers / orders    → GDPR erasure runs through the backend (Section 12)

alter table public.categories          enable row level security;
alter table public.menu_items          enable row level security;
alter table public.toppings            enable row level security;
alter table public.item_toppings       enable row level security;
alter table public.customers           enable row level security;
alter table public.promotions          enable row level security;
alter table public.orders              enable row level security;
alter table public.order_items         enable row level security;
alter table public.reservations        enable row level security;
alter table public.todays_special      enable row level security;
alter table public.staff_users         enable row level security;
alter table public.translation_strings enable row level security;
alter table public.activity_log        enable row level security;
alter table public.shop_settings       enable row level security;

create or replace function private.staff_role()
returns text
language sql stable security definer set search_path = '' as $$
  select role from public.staff_users where id = auth.uid() and active
$$;

revoke all on function private.staff_role() from public;
grant usage on schema private to authenticated;
grant execute on function private.staff_role() to authenticated;

create policy "menu_items: anyone can read"
  on public.menu_items for select
  to anon, authenticated
  using (true);

create policy "menu_items: owner/manager can insert"
  on public.menu_items for insert
  to authenticated
  with check ((select private.staff_role()) in ('owner','manager'));

create policy "menu_items: owner/manager can update"
  on public.menu_items for update
  to authenticated
  using ((select private.staff_role()) in ('owner','manager'))
  with check ((select private.staff_role()) in ('owner','manager'));

create policy "menu_items: owner/manager can delete"
  on public.menu_items for delete
  to authenticated
  using ((select private.staff_role()) in ('owner','manager'));

do $$
declare t text;
begin
  foreach t in array array['categories','toppings','item_toppings','todays_special','translation_strings']
  loop
    execute format('create policy "%1$s: anyone can read" on public.%1$I
                    for select to anon, authenticated using (true)', t);
    execute format('create policy "%1$s: owner/manager can insert" on public.%1$I
                    for insert to authenticated
                    with check ((select private.staff_role()) in (''owner'',''manager''))', t);
    execute format('create policy "%1$s: owner/manager can update" on public.%1$I
                    for update to authenticated
                    using ((select private.staff_role()) in (''owner'',''manager''))
                    with check ((select private.staff_role()) in (''owner'',''manager''))', t);
    execute format('create policy "%1$s: owner/manager can delete" on public.%1$I
                    for delete to authenticated
                    using ((select private.staff_role()) in (''owner'',''manager''))', t);
  end loop;
end $$;

-- Shop settings: everyone reads (opening hours, pause banner, delivery fee); owner/manager update
create policy "shop_settings: anyone can read"
  on public.shop_settings for select to anon, authenticated using (true);
create policy "shop_settings: owner/manager can update"
  on public.shop_settings for update to authenticated
  using ((select private.staff_role()) in ('owner','manager'))
  with check ((select private.staff_role()) in ('owner','manager'));

-- Promotions hold unpublished codes: owner/manager only. The site shows active offers via the backend.
create policy "promotions: owner/manager can read"
  on public.promotions for select to authenticated
  using ((select private.staff_role()) in ('owner','manager'));
create policy "promotions: owner/manager can insert"
  on public.promotions for insert to authenticated
  with check ((select private.staff_role()) in ('owner','manager'));
create policy "promotions: owner/manager can update"
  on public.promotions for update to authenticated
  using ((select private.staff_role()) in ('owner','manager'))
  with check ((select private.staff_role()) in ('owner','manager'));
create policy "promotions: owner/manager can delete"
  on public.promotions for delete to authenticated
  using ((select private.staff_role()) in ('owner','manager'));

-- customers: own profile; Owner/Manager can see everyone (Customers tab). Kitchen sees no customer data.
create policy "customers: read own profile, owner/manager read all"
  on public.customers for select to authenticated
  using (id = (select auth.uid()) or (select private.staff_role()) in ('owner','manager'));

create policy "customers: update own profile"
  on public.customers for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
-- No insert policy: the row is created by the signup trigger (Section 5.1).
-- No delete policy: erasure goes through the backend's GDPR function (Section 12).

-- orders: customers read their own; any active staff role reads all
create policy "orders: own or staff can read"
  on public.orders for select to authenticated
  using (customer_id = (select auth.uid()) or (select private.staff_role()) is not null);

create policy "orders: staff can update status"
  on public.orders for update to authenticated
  using ((select private.staff_role()) is not null)
  with check ((select private.staff_role()) is not null);

-- order_items: visible exactly when the parent order is visible
-- (the subquery on orders is itself filtered by the orders policy above)
create policy "order_items: follow the parent order"
  on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_items.order_id));

-- reservations: guests (no account) never read back through the API; staff handle bookings
create policy "reservations: own or staff can read"
  on public.reservations for select to authenticated
  using (customer_id = (select auth.uid()) or (select private.staff_role()) is not null);

create policy "reservations: staff can update status"
  on public.reservations for update to authenticated
  using ((select private.staff_role()) is not null)
  with check ((select private.staff_role()) is not null);

-- staff_users: Owner and Manager can see the team; only the Owner can change it
-- (if managers could update this table, a manager could promote themselves to owner)
create policy "staff_users: owner/manager can read"
  on public.staff_users for select to authenticated
  using ((select private.staff_role()) in ('owner','manager'));

create policy "staff_users: owner can insert"
  on public.staff_users for insert to authenticated
  with check ((select private.staff_role()) = 'owner');
create policy "staff_users: owner can update"
  on public.staff_users for update to authenticated
  using ((select private.staff_role()) = 'owner')
  with check ((select private.staff_role()) = 'owner');
create policy "staff_users: owner can delete"
  on public.staff_users for delete to authenticated
  using ((select private.staff_role()) = 'owner');

-- activity_log: Owner/Manager read (Admin → Audit). Nobody writes through the API —
-- no insert/update/delete grant or policy exists for anon or authenticated.
create policy "activity_log: owner/manager can read"
  on public.activity_log for select to authenticated
  using ((select private.staff_role()) in ('owner','manager'));

create or replace function private.audit_direct_write() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_uid   uuid  := auth.uid();
  v_new   jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_old   jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_diff  jsonb;
  v_staff record;
begin
  if v_uid is null then                      -- backend (secret key) or a migration: logged elsewhere
    return coalesce(new, old);
  end if;
  select id, username, role into v_staff from public.staff_users where id = v_uid;
  if tg_op = 'UPDATE' then                   -- store only what changed: {"price_med":{"from":13,"to":13.5}}
    select jsonb_object_agg(n.key, jsonb_build_object('from', o.value, 'to', n.value))
      into v_diff
      from jsonb_each(v_new) n join jsonb_each(v_old) o using (key)
     where n.value is distinct from o.value and n.key <> 'updated_at';
  end if;
  insert into public.activity_log (staff_user_id, actor_name, actor_role, action,
                                   target_table, target_id, details)
  values (v_staff.id, coalesce(v_staff.username, v_uid::text), coalesce(v_staff.role, 'unknown'),
          tg_table_name || '.' || lower(tg_op), tg_table_name,
          coalesce(v_new ->> 'id', v_old ->> 'id'),
          jsonb_build_object('via', 'direct')
            || case when v_diff is not null then jsonb_build_object('changes', v_diff) else '{}'::jsonb end
            || case tg_op when 'INSERT' then jsonb_build_object('row', v_new)
                          when 'DELETE' then jsonb_build_object('row', v_old)
                          else '{}'::jsonb end);
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['categories','menu_items','toppings','item_toppings','todays_special',
                           'translation_strings','promotions','staff_users','shop_settings',
                           'orders','reservations']
  loop
    execute format('create trigger audit_direct_write after insert or update or delete on public.%I
                    for each row execute function private.audit_direct_write()', t);
  end loop;
end $$;

-- Append-only: no UPDATE, DELETE or TRUNCATE on the log, whoever asks
create or replace function private.activity_log_append_only() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'activity_log is append-only (% blocked)', tg_op;
end $$;

create trigger activity_log_no_change before update or delete on public.activity_log
  for each row execute function private.activity_log_append_only();
create trigger activity_log_no_truncate before truncate on public.activity_log
  for each statement execute function private.activity_log_append_only();

create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := nullif(btrim(coalesce(
    new.raw_user_meta_data ->> 'full_name',  -- Google profile field
    new.raw_user_meta_data ->> 'name',       -- password form and older providers
    ''
  )), '');
begin
  -- Staff accounts are created with app_metadata.kb_staff = true (5.2). Only the secret key can
  -- set app_metadata, so a customer cannot opt out of being a customer.
  if coalesce(new.raw_app_meta_data ->> 'kb_staff', 'false') = 'true' then
    return new;
  end if;

  -- new.email is Auth's canonical email. Do not trust an email copied from browser metadata.
  -- Google users arrive with email_confirmed_at already set; password users may confirm later.
  insert into public.customers (id, email, name, phone)
  values (new.id, lower(btrim(new.email)), coalesce(v_name, ''),
          coalesce(new.raw_user_meta_data ->> 'phone', new.phone))
  on conflict (id) do update
    set email = excluded.email,
        name = case when btrim(public.customers.name) = '' then excluded.name else public.customers.name end,
        phone = coalesce(public.customers.phone, excluded.phone);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- If a customer changes their Auth email and confirms it, keep the profile copy consistent.
create or replace function private.sync_customer_email() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.customers
     set email = lower(btrim(new.email))
   where id = new.id;
  return new;
end $$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (new.email is distinct from old.email)
  execute function private.sync_customer_email();

-- Auth owns auth.identities. This trigger records the first Google identity and copies the
-- verified profile name when the identity is linked to an existing password account.
create or replace function private.sync_google_identity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_user_email text;
  v_name text := nullif(btrim(coalesce(
    new.identity_data ->> 'full_name',
    new.identity_data ->> 'name',
    ''
  )), '');
begin
  if lower(new.provider) <> 'google'
     or exists (select 1 from public.staff_users where id = new.user_id) then
    return new; -- v1 staff accounts are email/password-only
  end if;

  select lower(email) into v_user_email from auth.users where id = new.user_id;
  update public.customers
     set email = coalesce(v_user_email, email),
         name = case when btrim(name) = '' then coalesce(v_name, name) else name end
   where id = new.user_id;

  insert into public.activity_log
    (actor_name, actor_role, action, target_table, target_id, details)
  values
    ('customer:' || new.user_id::text, 'customer', 'auth.google.first_sign_in',
     'customers', new.user_id::text,
     jsonb_build_object(
       'provider', 'google',
       'email_verified', exists (select 1 from auth.users where id = new.user_id and email_confirmed_at is not null)
     ));
  return new;
end $$;

create trigger on_google_identity_created
  after insert on auth.identities
  for each row when (lower(new.provider) = 'google')
  execute function private.sync_google_identity();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('menu-images', 'menu-images', true, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Public read needs no policy: a public bucket serves files at
--   https://<ref>.supabase.co/storage/v1/object/public/menu-images/<path>
-- Listing and all writes are limited to Owner/Manager:
create policy "menu-images: owner/manager can list"
  on storage.objects for select to authenticated
  using (bucket_id = 'menu-images' and (select private.staff_role()) in ('owner','manager'));
create policy "menu-images: owner/manager can upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'menu-images' and (select private.staff_role()) in ('owner','manager'));
create policy "menu-images: owner/manager can replace"
  on storage.objects for update to authenticated
  using (bucket_id = 'menu-images' and (select private.staff_role()) in ('owner','manager'))
  with check (bucket_id = 'menu-images' and (select private.staff_role()) in ('owner','manager'));
create policy "menu-images: owner/manager can delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'menu-images' and (select private.staff_role()) in ('owner','manager'));

alter publication supabase_realtime add table public.orders;
