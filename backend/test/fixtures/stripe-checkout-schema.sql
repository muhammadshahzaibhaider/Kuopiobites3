-- Minimal disposable Postgres schema matching the columns/constraints used by this transaction.
-- Never load into a hosted project. The test runner requires an explicit local-only reset flag.
drop schema public cascade;
create schema public;
do $$ begin
 if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
 if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end $$;
grant usage on schema public to anon,authenticated,service_role;
create table public.promotions (
 id text primary key, used_count integer not null default 0 check(used_count>=0),
 active boolean not null default true, starts_at timestamptz, expires_at timestamptz,
 usage_limit integer check(usage_limit>0), check(usage_limit is null or used_count<=usage_limit)
);
create table public.orders (
 id text primary key, customer_id uuid, type text not null default 'pickup' check(type in('pickup','delivery')),
 status text not null default 'placed' check(status in('placed','accepted','preparing','ready','completed','cancelled')),
 subtotal numeric(10,2) not null default 10 check(subtotal>=0), delivery_fee numeric(10,2) not null default 0 check(delivery_fee>=0),
 discount numeric(10,2) not null default 0 check(discount>=0), discount_title text,
 offer_id text references public.promotions(id) on delete set null, vat numeric(10,2) not null default 0 check(vat>=0),
 total numeric(10,2) not null default 10,
 payment_status text not null default 'pending' check(payment_status in('pending','paid','refunded')),
 payment_ref text, contact_name text not null default 'Local test',contact_phone text,contact_email text,
 address text,note text,scheduled_for timestamptz,estimated_ready_at timestamptz,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check(total=greatest(0,subtotal-discount+delivery_fee)),check(type='delivery' or delivery_fee=0)
);
create table public.order_items (
 id uuid primary key default gen_random_uuid(),order_id text references public.orders(id) on delete cascade,
 menu_item_id text,item_name_snapshot text,variant_label text,selected_toppings jsonb,options text[],is_preorder boolean not null default false,note text,
 quantity integer not null default 1, unit_price numeric(10,2) not null default 10, line_price numeric(10,2) not null default 10,
 check(quantity between 1 and 99), check(unit_price>=0), check(line_price=quantity*unit_price)
);
create table public.shop_settings (id boolean primary key default true check(id),extra jsonb not null default '{}');
create table public.cart_items (
 id uuid primary key default gen_random_uuid(),customer_id uuid not null,line_key text not null,
 qty integer not null check(qty between 1 and 99),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 item_id text,name_snap text,variant_label text,options jsonb, note text,pizza jsonb,preorder jsonb,img text,unit_price numeric,
 unique(customer_id,line_key)
);
create table public.stripe_events (event_id text primary key,received_at timestamptz not null default now());
create table public.menu_items(id text primary key);
create table public.customers(id uuid primary key);
create table public.customer_favorites(id uuid primary key default gen_random_uuid());
create table public.reservations(id text primary key,customer_id uuid,date date,time time,status text,party_size integer);
grant select on public.shop_settings to anon,authenticated;
grant all on all tables in schema public to service_role;
alter table public.orders enable row level security;
alter table public.cart_items enable row level security;
alter table public.stripe_events enable row level security;
insert into public.shop_settings(id,extra) values(true,'{"orderStreak":{"enabled":true,"target":7}}');
insert into public.orders(id,payment_status,payment_ref) values
 ('legacy-paid','paid','pi_legacy'),('legacy-pending','pending','cs_legacy');
insert into public.stripe_events(event_id) values('evt_legacy_unfinished');
