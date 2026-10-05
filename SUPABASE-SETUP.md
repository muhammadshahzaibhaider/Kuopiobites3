# SUPABASE-SETUP.md — Kuopio Bites

A step-by-step guide to running the Kuopio Bites database on **Supabase** (Postgres + Auth +
Storage + Realtime). It is written for **this project** — Jalkasenkatu 7, 70820 Kuopio — and
every table, policy and snippet uses the entities the site already runs on: the 30 menu
categories and 175 items, pizza toppings, orders, table reservations, customer accounts,
staff roles (Owner / Manager / Kitchen), FI/EN translations, Today's Special, promotions and
the activity log.

**Who it's for:** the project owner or a developer joining the project. Follow it top to
bottom and you end up with a working, secured database that the existing backend can talk to.

**Where the project stands today:** `backend/` (Express, port 4000) stores everything in SQLite
(`backend/data/kuopio.db`, created by `backend/src/db.ts`) and signs its own JWTs
(`backend/src/auth.ts`). `frontend/` (Next.js) talks only to that backend through one API
client (`frontend/src/lib/http.ts`). This guide is the migration target; the API contract in
`backend/API.md` stays the same, so the frontend barely notices.

**How to read the code blocks**

- Every SQL block **without** a ✋ marker is part of the schema migration. Paste them, in the
  order they appear, into one migration file (Section 11) — or run them one by one in the
  dashboard SQL Editor for a first try.
- SQL blocks that start with `-- ✋ run by hand` are one-off commands or checks. Do **not** put
  them in the migration.
- The SQL was executed end-to-end on PostgreSQL 17 (the version Supabase runs) and the access
  rules were tested role by role — see the Appendix for exactly what was and wasn't verified.

> **Three 2025–26 Supabase changes that older tutorials get wrong**
>
> 1. **API keys were renamed.** New projects get a **publishable key** (`sb_publishable_…`,
>    replaces the old `anon` key) and **secret keys** (`sb_secret_…`, replace `service_role`).
>    The legacy `anon`/`service_role` JWT keys are being retired by the end of 2026. This guide
>    keeps the variable names `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
>    (they describe the *role* the key acts as) and you paste the new key values into them.
> 2. **Tables are no longer exposed automatically.** Projects created after 30 May 2026 (and all
>    existing projects from 30 Oct 2026) give `anon`, `authenticated` and `service_role` **no**
>    access to new tables until you `GRANT` it. Without grants even the backend gets
>    `permission denied for table …`. Section 4.2 contains the exact grants.
> 3. **supabase-js needs Node.js 22+.** The backend currently runs on Node 20 (end-of-life since
>    April 2026) — upgrade it to Node 22 LTS before installing the client (Section 8.1).

---

## Contents

1. What Supabase Is Doing in This Project
1a. Supabase as the Security Hub
2. Creating the Supabase Project
3. Database Schema — Tables for Kuopio Bites
4. Row Level Security (RLS) — Critical Section
5. Authentication Setup
   5.1 Customer accounts
   5.1.1 Google Cloud setup
   5.1.2 Enable Google in Supabase
   5.1.3 Frontend sign-in, callback and session bridge
   5.1.4 Customer provisioning and identity linking
   5.1.5 OAuth-specific security checks
   5.2 Staff and admin accounts
6. Storage Setup (Images)
7. Real-Time Features (Optional but Recommended)
8. Connecting the Backend to Supabase
9. Connecting the Frontend (Direct Public Reads — Optional)
10. Environment Variables
11. Migrations & Local Development
12. Backups & GDPR Considerations
13. Quick Reference Checklist
- Appendix — How this guide was verified

---

## 1. What Supabase Is Doing in This Project

Supabase is a hosted Postgres database with a few services bolted on. Kuopio Bites uses four
of them:

| Supabase service | What it does for Kuopio Bites | What it replaces today |
|---|---|---|
| **Postgres database** | Stores the menu, toppings, orders, reservations, customers, staff, translations, Today's Special, promotions, shop settings and the activity log. | `backend/data/kuopio.db` (SQLite, mostly JSON blobs) |
| **Auth** | Customer accounts (ordering requires an account) and staff logins with roles Owner / Manager / Kitchen. Handles password hashing, sessions, email confirmation and password reset. | The bcrypt + `jsonwebtoken` code in `backend/src/auth.ts` |
| **Storage** | Photos uploaded from the admin Media library: menu item photos, category photos and Today's Special overrides, in the unbranded "Havainnollistava tuotekuva" style. | Images saved as data URLs inside the settings JSON |
| **Realtime** *(optional)* | Pushes new orders into the admin **Live Order Queue** instantly, with the new-order chime and badge. | Reloading `GET /api/orders` |

**The architecture rule does not change.** The **backend is the only thing that writes
business data**: it re-prices every order from the server-side menu, enforces the €15 delivery
minimum and 70xxx postal codes, applies Halwa Puri pre-order rules and promo limits, rate-limits
login/order/reservation, checks staff roles and writes the audit log. Supabase is the storage
layer underneath it — not a replacement for those rules.

```
 Browser (Next.js, port 3000)
   │  HTTPS — the one typed API client, NEXT_PUBLIC_API_BASE_URL
   ▼
 Backend API (Express, port 4000) ── secret key (service_role) ──▶ Supabase
   validates · re-prices · checks roles · audits                    Postgres · Auth · Storage
   ▲
   ├─ publishable key only: customer Supabase Auth / Google OAuth (Section 5)
   └─ optional, read-only: admin Live Queue via Realtime or public menu reads (Sections 7/9)
```

The frontend never receives a secret key and never writes business data to Supabase. The
publishable key is also used for the customer Auth flow in Section 5: it starts Google OAuth and
holds the customer's Supabase session, but it cannot insert orders, change prices or bypass RLS.
The other optional browser-to-Supabase connections are the read-only Live Queue subscription
(Section 7) and, if you ever want it, public menu reads (Section 9). Business-data writes still
go through the backend.

---

## 1a. Supabase as the Security Hub

Supabase is not merely the database connection underneath the Express API. In this project it
is the central **security hub**: one identity system, one authorization boundary and one
append-only trail for security-relevant activity. The browser may hold a publishable key, but it
never gets the backend's secret and it never becomes the business-rule authority.

### Identity — one Auth user for every actor

Every person who can act on the system authenticates through **Supabase Auth**: a customer uses
email/password or Google OAuth, while an Owner, Manager or Kitchen staff member uses the
controlled email/password staff path. There is no second identity database in the frontend or
backend. The `customers.id` and `staff_users.id` values are the corresponding `auth.users.id`
values, so orders, reservations, roles and GDPR requests all point to one durable identity.
The Google provider is enabled for the customer-facing flow only; the v1 staff policy is
email/password-only (Section 5.2).

### Authorization — RLS plus the server role matrix

Supabase Auth answers **who is this?** The database answers **what may this identity touch?**
RLS is enabled on all 14 public tables and every grant/policy in Section 4 uses the authenticated
user id or the active `staff_users.role`. A customer sees only their own profile, orders and
reservations; Kitchen can move queue statuses but cannot read customer data; Manager can manage
menu/settings and read the audit log; Owner can manage staff. The backend applies the same role
matrix before its routes run. Hiding a button is never an authorization control.

### Secrets — a hard three-way boundary

- `SUPABASE_SERVICE_ROLE_KEY` (or the new `sb_secret_…` value) lives only in `backend/.env` and
  the backend host's secret store. It bypasses RLS and never reaches a response or the browser.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` holds only the publishable/legacy anon value. It may be in the
  browser for Auth, Realtime or public reads, and is harmless only because grants and RLS are
  correct.
- The **Google OAuth Client Secret is held by Supabase Auth's Google provider configuration**.
  It is not a backend variable, not a frontend variable and not a `NEXT_PUBLIC_*` value. The
  app knows only the provider name and its Supabase publishable key.

### Auditability — one answer to "who did what, when?"

Staff logins, price/availability/menu changes, status changes, refunds, customer export/erase
requests and the first Google identity created for a customer all land in the same
`public.activity_log`. Staff writes are captured by the database trigger and backend context;
Google identity creation is captured by the `auth.identities` trigger in Section 5.1.4. The log
is append-only, readable only by Owner/Manager and contains no customer contact data. This gives
one review point for both human operations and authentication events.

### Boundary — security is not business logic

Supabase decides identity and authorization; the **backend remains the business-rule source of
truth**. Express still re-prices every cart, validates delivery/postcodes and opening hours,
enforces Halwa Puri/pre-order rules, applies promotions and rate limits, talks to the hosted
checkout and chooses when to call the GDPR functions. A valid Supabase token proves who the
caller is; it does not make client-supplied totals, discounts or delivery decisions trustworthy.

---

## 2. Creating the Supabase Project

1. Go to <https://supabase.com>, click **Start your project** and sign up (GitHub login is
   quickest). Create an **organization** named `Kuopio Bites`.
2. Click **New project** and fill in:
   - **Name:** `kuopio-bites` (create a second project `kuopio-bites-staging` later for testing).
   - **Database password:** use **Generate a password**, then store it in your password manager.
     You need it for the CLI and for direct connections. It never goes in the repo.
   - **Region: choose an EU region — North EU (Stockholm) is the closest to Kuopio; Central EU
     (Frankfurt) is a good second choice.** *Why this matters:* the business is in Finland, the
     customers are Finnish and **GDPR applies**. An EU region keeps personal data in the EU (no
     third-country transfer for the database, which keeps the privacy notice simple) and keeps
     latency low. **The region cannot be changed later** without moving the whole project.
   - **Security options** (if the form shows them): keep the **Data API** enabled, leave
     **"Automatically expose new tables"** *unchecked* (the migration grants exactly what each
     role needs), and keep automatic RLS **on**.
3. **Plan.** *Free* is fine while you build and test. Move to **Pro (from $25/month)** before
   real customers order: Free projects have **no automatic backups** and are **paused after a
   week of inactivity** — neither is acceptable for a live ordering site (more in Section 12).
4. When the project is ready, collect three values:
   - **Project URL**, e.g. `https://abcdefghijklmnopqrst.supabase.co` — shown by the **Connect**
     button and under *Project Settings → Data API*. The 20-letter part is your **project ref**.
   - **Publishable key** (`sb_publishable_…`) — *Project Settings → API Keys*. Older projects
     show a legacy **anon** key instead; it does the same job.
   - **Secret key** (`sb_secret_…`) — *Project Settings → API Keys → Secret keys*. Create one
     named `backend`. Older projects show a legacy **service_role** key instead.

**Which key goes where — memorize this table:**

| Key | Acts as Postgres role | Where it may live | Never |
|---|---|---|---|
| Publishable (`sb_publishable_…`) / legacy `anon` | `anon`, or `authenticated` once a user is signed in | Browser-safe. In this project only `frontend/.env.local`, for customer Auth and optionally Sections 7 or 9 | — |
| Secret (`sb_secret_…`) / legacy `service_role` | `service_role` — **bypasses RLS** | `backend/.env` and your hosting provider's secret settings | in the frontend, in any `NEXT_PUBLIC_*` variable, in git, in screenshots or chat |

The publishable key is harmless on its own: it can only do what the grants and RLS policies
below allow. The secret key can read and change **everything**, including customer personal
data. If it ever leaks, revoke it under *API Keys* and create a new one — the new key format
lets you do that without logging every user out.

---

## 3. Database Schema — Tables for Kuopio Bites

### 3.0 Design decisions (read once)

- **Text ids where the site already has ids.** Categories (`kebab`), menu items (`kebab-68`),
  orders (`KB-OGGBIH`), reservations (`R-…`), promotions (`off-wings`) and specials (`ts-1`)
  keep their current ids. Carts saved in browsers, the photo paths
  `/menu/<category>/<key>.webp`, order tracking links and `backend/API.md` all depend on them,
  and it makes moving the data a straight copy. Customers and staff use **uuid** ids because
  they *are* Supabase Auth users.
- **Prices are euros in `numeric(10,2)`**, never floating point. All prices include VAT.
- **The spec columns plus what the real data needs.** Each table has the columns from the
  project spec; extra columns exist only where today's data has information that would
  otherwise be lost (e.g. the `Pelkkä | Ateria` and drink-size variants, item option groups,
  alt texts for WCAG AA).
- **Role names:** the spec calls the third role "kitchen staff"; the existing role matrix in
  `backend/src/auth.ts` uses the string `kitchen`, so the database does too.
- Helper functions live in a schema called `private`, which the Data API does not expose.

**Where today's data goes**

| Today (SQLite / settings JSON) | Supabase table |
|---|---|
| `categories` + `settings.catMeta` / `catOrder` | `categories` |
| `items.data` + `overrides` + `settings.offItems` | `menu_items` |
| `settings.toppings` + `toppingMeta` + `offOptions.topping` | `toppings`, `item_toppings` |
| `users` | Auth users + `customers` |
| `orders.data` (lines inside) | `orders` + `order_items` |
| `reservations.data` | `reservations` |
| `settings.todaysSpecials` | `todays_special` |
| `settings.offers` | `promotions` |
| `staff` | Auth users + `staff_users` |
| `translations` (lang, key, value) | `translation_strings` (one row per key) |
| `activity` | `activity_log` |
| `settings` (hours, pause, delivery fee, minimum, VAT, pre-order rules) | `shop_settings` |

### 3.1 Housekeeping: helper schema and the `updated_at` trigger

```sql
-- Helper functions live here; the Data API only exposes "public", so these can't be called over HTTP.
create schema if not exists private;

-- Keeps updated_at honest on every UPDATE (attached to the tables in 3.9)
create or replace function private.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;
```

### 3.2 Categories and menu items

```sql
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
```

*Why it looks like this:* `price_med` / `price_perhe` cover the 46 pizzas (Med | Perhe) and the
90 single-price items. The 39 items with other size sets (Pelkkä | Ateria, 0.33 L | 0.5 L | 1.5 L,
3 pc | 6 pc …) keep their full list in `price_variants`, with `price_med` holding the lowest
price for "from €X" labels and sorting. `topping_tier_included` is the number of toppings in
the base price — 3 for the `pizza3` category, 2 for *Fantasia Pizza 2 Täytettä*; extra toppings
add the surcharges from `toppings`. `available_days` uses the same 0 = Sunday numbering as the
existing code (`Date.getDay()`).

### 3.3 Toppings and which items offer them

```sql
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
```

### 3.4 Customers (linked to Supabase Auth)

```sql
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
```

### 3.5 Promotions

```sql
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
```

### 3.6 Orders and order items (normalized)

The order row is the receipt; every cart line becomes an `order_items` row. Normalizing the
lines (instead of one JSON blob, as today) is what lets the Analytics tab answer "top sellers
this week" with plain SQL.

```sql
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
```

*Why the checks:* the backend computes every total (Section 8.4). The two `check` constraints
make Postgres refuse an order whose numbers don't add up, so a bug in the pricing code fails
loudly instead of storing a wrong receipt. Refunds are tracked in `payment_status`, matching
today's `refunded` flag.

### 3.7 Reservations (guest bookings allowed)

```sql
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
```

`POST /api/reservations` is public today (no account needed). Once on Supabase, the backend
should set `customer_id` when the caller *is* signed in, so the booking appears in their account
and in their GDPR export.

### 3.8 Today's Special

```sql
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
```

### 3.9 Staff, translations, activity log, shop settings

```sql
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
```

`shop_settings` isn't in the original table list, but the live open/closed badge, the pause
toggle and the delivery rules can't work without it.

### 3.10 Timestamps and the consent trail

```sql
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
```

### 3.11 Creating an order in one transaction

supabase-js sends every call as a separate HTTP request — there is no `BEGIN … COMMIT` across
calls. Anything that must happen all-or-nothing therefore goes into one Postgres function.
Creating an order is the important case: order row + line rows + promo redemption must succeed
or fail together, otherwise a failed request could leave a half order or burn a promo use.

```sql
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
```

---

## 4. Row Level Security (RLS) — Critical Section

### 4.1 Two locks on every door

Every request that reaches Postgres through Supabase runs as one of three roles: **`anon`**
(publishable key, nobody signed in), **`authenticated`** (publishable key + a signed-in user's
token) or **`service_role`** (secret key — our backend). Two independent layers decide what
each role may do:

1. **GRANTs — which tables and columns a role can touch at all.** Missing grant → instant
   `permission denied`. Since May 2026 new projects start with *no* grants on new tables, so the
   migration must say exactly what each role gets.
2. **RLS policies — which rows.** Once RLS is enabled on a table, a role sees and changes
   **nothing** there unless a policy allows it. That is what makes the publishable key harmless.

`service_role` bypasses RLS entirely — the backend is trusted to apply the business rules,
which is exactly why the secret key must never leave the backend.

**RLS must be enabled on every table before the project goes live.** The migration below
does it; Section 4.10 shows how to check.

### 4.2 Grants

```sql
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
```

The spec says customers "read/write their own rows". For **profiles** that is exactly what
happens (a customer may update their own `customers` row directly). For **orders and
reservations** a customer's "write" is `POST /api/orders` / `POST /api/reservations`: if
customers could insert order rows directly, a hand-crafted request could store any price it
likes and skip the rate limits. Kitchen staff may change an order's `status` and nothing else —
refunds involve the payment provider and go through the backend (manager+).

### 4.3 Turn RLS on for every table

```sql
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
```

### 4.4 Helper: "what staff role does this user have?"

Policies need to ask "is the caller a manager?" on many tables. A small `security definer`
function answers it (it may read `staff_users` even when the caller may not):

```sql
create or replace function private.staff_role()
returns text
language sql stable security definer set search_path = '' as $$
  select role from public.staff_users where id = auth.uid() and active
$$;

revoke all on function private.staff_role() from public;
grant usage on schema private to authenticated;
grant execute on function private.staff_role() to authenticated;
```

It returns `'owner'`, `'manager'` or `'kitchen'` for active staff and `null` for customers.
In the policies it is written as `(select private.staff_role())` — the `select` wrapper makes
Postgres evaluate it once per query instead of once per row (Supabase's standard performance
advice; the same goes for `(select auth.uid())`).

### 4.5 Pattern A — public read, staff write (menu content)

For `menu_items`, `categories`, `toppings`, `item_toppings`, `todays_special` and
`translation_strings`: anonymous visitors can read (the site must show the menu); only
Owner/Manager can change.

```sql
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
```

The same four policies for the other menu tables, plus the settings row and the staff-only
promotions table:

```sql
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
```

### 4.6 Pattern B — customers see only their own rows, staff see all

For `customers`, `orders`, `order_items` and `reservations`, rows are matched to the signed-in
user with `auth.uid()` (the uuid from their token).

```sql
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
```

### 4.7 Pattern C — role-tiered access (staff list, audit log)

```sql
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
```

### 4.8 Making the audit log unbypassable

Two guarantees, enforced by Postgres itself:

1. **Every staff change is logged, whichever way it arrives.** Backend actions are logged by
   the backend (Section 8.5, with the business context). If a staff member ever changes data
   *directly* with their own token — possible for the writes granted in 4.2 — this trigger
   writes the audit row in the same transaction. The backend's secret key carries no user id,
   so its writes are skipped here instead of being logged twice. Authentication events that are
   not table writes, such as a customer's first Google identity, use the Auth trigger in
   Section 5.1.4 and append to the same table.
2. **The log can't be edited or deleted** — not by staff, not even with the secret key.

```sql
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
```

Because staff can only change an order's `status` directly (4.2), customer personal data never
ends up in these audit rows. A consequence of the append-only log: a staff member who has audit
rows can't be deleted. Offboard people by setting `staff_users.active = false` and banning their
login (*Authentication → Users → … → Ban user*).

### 4.9 Who can do what (the tested matrix)

| Action | Visitor (anon) | Customer | Kitchen | Manager | Owner | Backend (secret key) |
|---|---|---|---|---|---|---|
| Read menu, toppings, specials, translations, shop settings | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit menu, specials, translations, settings | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Read / edit promotions | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Read orders | ❌ | own only | all | all | all | all |
| Insert orders | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ via `create_order()` |
| Change order status | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Change totals / refund | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ (refund route is manager+) |
| Read customers | ❌ | own only | ❌ | all | all | all |
| Update a customer profile | ❌ | own only | ❌ | ❌ | ❌ | ✅ |
| Read reservations / change their status | ❌ | read own | ✅ | ✅ | ✅ | ✅ |
| Read staff list | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Change staff | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Read audit log | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Record first Google customer identity | Auth trigger | Auth trigger | n/a (staff policy) | review | review | Auth trigger |
| Edit / delete audit log | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ (append-only) |
| Upload menu photos | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| GDPR export / erase functions | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ (route is owner / the customer themself) |

### 4.10 Checking your policies

```sql
-- ✋ run by hand: every table in public must show rowsecurity = true
select tablename, rowsecurity from pg_tables where schemaname = 'public' order by tablename;
```

```sql
-- ✋ run by hand: impersonate a signed-in user for one transaction, then roll back
begin;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000000', 'role', 'authenticated')::text, true);
set local role authenticated;
select count(*) from public.orders;      -- a customer sees only their own orders
select count(*) from public.customers;   -- 1 (their own row)
rollback;
```

Replace the zero uuid with a real user id from *Authentication → Users*. (The SQL Editor's
role selector does the same thing.) The dashboard's **Security Advisor** also flags tables
without RLS — it should show nothing for `public`.

---

## 5. Authentication Setup

### 5.1 Customer accounts

1. *Authentication → Sign In / Providers → Email*: enabled by default. Keep **Confirm email ON**
   for production (fewer fake accounts). Turn it off only on a staging project for demos.
2. *Authentication → URL Configuration*: **Site URL** `https://kuopiobites.fi`; add
   `http://localhost:3000` to the redirect URLs for local development.
3. **Custom SMTP before launch** (*Authentication → Emails → SMTP Settings*). Supabase's built-in
   mailer is for testing only — very low hourly limits and it only delivers to your own team's
   addresses, so real customers would never get their confirmation email. Use any transactional
   provider (Resend, Postmark, SendGrid, Amazon SES) with a `kuopiobites.fi` sender and SPF/DKIM
   records.
4. Google customer sign-in is configured in 5.1.1–5.1.5 below; it does not replace the email/password form.
5. Create the profile row automatically whenever someone signs up:

```sql
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
```

#### 5.1.1 Google Cloud setup (Web application)

Use one Google OAuth client for the hosted Supabase project. Google is the identity provider;
Supabase Auth is still the token issuer that the Kuopio Bites backend trusts.

1. Open <https://console.cloud.google.com/> and either select the business's Google Cloud
   project or click **New project**. Keep the project name recognisable, for example
   `kuopio-bites-auth`.
2. In **Google Auth Platform → Branding / OAuth consent screen**, choose **External** — the
   site's customers are the public, not members of the restaurant's Workspace. Enter the app
   name `Kuopio Bites`, a support email and a developer contact email. If Google shows an
   **Audience / Test users** page, add the owner and testers while the app is in testing; publish
   the app before inviting real customers. Use the business privacy-policy and terms URLs when
   Google asks for them.
3. In the consent-screen **Scopes** step request only the identity scopes needed here:
   `openid`, `email` and `profile`. `openid` is the protocol scope; `email` and `profile` are
   the only Google data this site needs. Do **not** add Drive, Calendar, Gmail, Contacts or any
   other API scope. The app never asks for a Google access token to call a Google API.
4. Go to **Google Auth Platform → Clients → Create client**, choose **Web application**, and
   give it a name such as `Kuopio Bites Supabase production`.
5. In **Authorized JavaScript origins**, add the browser origins (origins have no path):
   `https://kuopiobites.fi` and `https://www.kuopiobites.fi` only if both are real production
   hosts, plus `http://localhost:3000` for the existing Next.js local development server. Do not
   add a wildcard.
6. In **Authorized redirect URIs**, add this exact Supabase callback and nothing with the
   frontend callback path:

   `https://<project-ref>.supabase.co/auth/v1/callback`

   Replace `<project-ref>` with the 20-character ref from the Supabase Project URL. Google
   redirects to Supabase first; Supabase then redirects to `/auth/callback` on Kuopio Bites.
   If you run a completely local Supabase Auth stack, use a separate local OAuth client (or
   add the local callback shown by the local provider page, normally
   `http://127.0.0.1:54321/auth/v1/callback`) rather than replacing the hosted URI.
7. Click **Create**. In **Google Auth Platform → Clients**, open the new web client to copy the
   **Client ID** and **Client Secret**. The secret is shown there and may be rotated there.
   Paste both into Supabase in the next subsection. **Do not put either value in
   `backend/.env`, `frontend/.env.local`, a GitHub secret used by the app, or any
   `NEXT_PUBLIC_*` variable.** Supabase stores and uses them.

#### 5.1.2 Enable Google in Supabase and allow the post-login redirect

1. In the Supabase dashboard open **Authentication → Sign In / Providers → Google** (the UI may
   label this **Authentication → Providers**), switch **Enable Sign in with Google** on, paste
   the Google **Client ID** and **Client Secret**, and click **Save**. The callback URL displayed
   on this provider page must match the Google redirect URI above exactly.
2. Open **Authentication → URL Configuration**. Set **Site URL** to the production origin,
   `https://kuopiobites.fi`, and add these exact **Redirect URLs**:
   `https://kuopiobites.fi/auth/callback` and `http://localhost:3000/auth/callback`. Add
   `https://www.kuopiobites.fi/auth/callback` only if the www host is actually served. The
   `redirectTo` value in the frontend code must be one of this allowlist; otherwise Google can
   grant access successfully and Supabase will still reject the final redirect.
3. The Site URL / allowlist is for the **application callback**. It is different from Google's
   **Authorized redirect URI**, which is the Supabase `/auth/v1/callback` URL. Keep both lists
   exact and HTTPS in production.

#### 5.1.3 Frontend sign-in, callback and session bridge

Install the browser client once; it is used for Auth only, not for menu/order writes:

```bash
cd frontend
npm install @supabase/supabase-js
```

The existing `frontend/src/lib/http.ts` already has `getToken`, `setToken` and one `api<T>()`
function. Add the refresh-token helpers beside them, then add this browser Auth module. The
publishable key is the only Supabase credential in this code.

```ts
// frontend/src/lib/http.ts — add beside getToken/setToken; the existing api<T>() is unchanged
export const getRefreshToken = () =>
  typeof window === "undefined" ? null : localStorage.getItem("kb_refresh_token");
export const setRefreshToken = (t: string | null) => {
  if (typeof window === "undefined") return;
  if (t) localStorage.setItem("kb_refresh_token", t);
  else localStorage.removeItem("kb_refresh_token");
};
```

```ts
// frontend/src/lib/supabaseAuth.ts — the browser Auth client; no business-data queries
"use client";
import { createClient, type Session } from "@supabase/supabase-js";
import { setRefreshToken, setToken } from "./http";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error("Supabase Auth env vars are missing");

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // the callback page performs the PKCE exchange explicitly
    flowType: "pkce",
  },
});

/** Keep the existing backend token key in sync with Supabase's current session. */
export function storeSupabaseSession(session: Session | null): void {
  setToken(session?.access_token ?? null);
  setRefreshToken(session?.refresh_token ?? null);
}

/** Mount once inside the existing ShopProvider. Password login has no Supabase session,
 * so an empty Supabase store must not clear the existing email/password kb_token. */
export function startAuthBridge(): () => void {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session) storeSupabaseSession(session);
    else if (_event === "SIGNED_OUT") storeSupabaseSession(null);
  });
  void supabase.auth.getSession().then(({ data }) => {
    if (data.session) storeSupabaseSession(data.session);
  });
  return () => subscription.unsubscribe();
}

export async function signInWithGoogle(next = "/account"): Promise<void> {
  if (typeof window === "undefined") throw new Error("Google sign-in needs a browser");
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/account";
  const callback = new URL("/auth/callback", window.location.origin);
  callback.searchParams.set("next", safeNext);
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callback.toString(),
      scopes: "openid email profile", // no Drive/Calendar/Gmail scope
    },
  });
  if (error) throw error;
  // In a browser Supabase performs the redirect; there is no Google token to send to Express.
}

export async function linkGoogleIdentity(): Promise<void> {
  const callback = new URL("/auth/callback", window.location.origin);
  callback.searchParams.set("next", "/account");
  const { error } = await supabase.auth.linkIdentity({
    provider: "google",
    options: { redirectTo: callback.toString(), scopes: "openid email profile" },
  });
  if (error) throw error;
}
```

The OAuth button sits **beside** the existing email/password form; it does not replace it:

```tsx
// frontend/src/components/GoogleSignInButton.tsx
"use client";
import { useState } from "react";
import { signInWithGoogle } from "@/lib/supabaseAuth";

export default function GoogleSignInButton({ next = "/account" }: { next?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="mt-4">
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          setBusy(true); setError(null);
          void signInWithGoogle(next).catch((e: unknown) => {
            setBusy(false); setError(e instanceof Error ? e.message : "Google sign-in failed");
          });
        }}
        className="min-h-[48px] w-full rounded-full border-2 border-cherry bg-cream font-black text-cherry disabled:opacity-60"
      >
        {busy ? "Opening Google…" : "Continue with Google"}
      </button>
      {error && <p className="mt-2 text-sm font-bold text-cherry-bright">{error}</p>}
    </div>
  );
}
```

In the existing `frontend/src/components/AuthForm.tsx`, render
`<GoogleSignInButton next="/account" />` immediately after the password form (and before the
account-required help text). Keep the existing `login()` and `register()` calls unchanged. Mount
this small bridge once in the client part of the existing `ShopProvider`/layout:

```tsx
// frontend/src/components/AuthSessionBridge.tsx
"use client";
import { useEffect } from "react";
import { startAuthBridge } from "@/lib/supabaseAuth";

export default function AuthSessionBridge() {
  useEffect(() => startAuthBridge(), []);
  return null;
}
```

The callback page explicitly exchanges the one-use PKCE code, stores the resulting **Supabase
access token** under the same `kb_token` key as password login, and asks the backend for the
canonical customer profile. It never accepts a Google ID token at the Express boundary:

```tsx
// frontend/src/app/auth/callback/page.tsx
"use client";
import { useEffect, useState } from "react";
import { api } from "../../../lib/http";
import { storeSupabaseSession, supabase } from "../../../lib/supabaseAuth";

type CustomerSession = {
  id: string; name: string; email: string; phone: string | null;
  addresses: string[]; marketing: boolean; lang: "fi" | "en"; createdAt: number;
};

const safeNext = (value: string | null): string =>
  value && value.startsWith("/") && !value.startsWith("//") ? value : "/account";

export default function AuthCallbackPage() {
  const [message, setMessage] = useState("Completing Google sign-in…");
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const query = new URLSearchParams(window.location.search);
      const code = query.get("code");
      const next = safeNext(query.get("next"));
      if (!code) { setMessage("Google sign-in did not return a code."); return; }
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error || !data.session) { setMessage(error?.message ?? "Google sign-in failed."); return; }
      storeSupabaseSession(data.session);
      try {
        const profile = await api<CustomerSession>("/api/account");
        if (!cancelled) localStorage.setItem("kb_user", JSON.stringify(profile));
      } catch {
        if (!cancelled) { setMessage("Signed in, but the customer profile could not be loaded."); return; }
      }
      if (!cancelled) window.location.replace(next);
    })();
    return () => { cancelled = true; };
  }, []);
  return <main className="grid min-h-screen place-items-center p-8"><p>{message}</p></main>;
}
```

`GET /api/account` is a small read-only profile bootstrap route in the Supabase version of the
backend (it is protected by `requireCustomer`; it is not a second identity system):

```ts
// backend/src/server.ts — GET /api/account, used by the OAuth callback to hydrate the existing UI
app.get("/api/account", requireCustomer, wrap(async (req, res) => {
  const auth = (req as any).auth as TokenPayload;
  const { data: c, error } = await db.from("customers")
    .select("id, email, name, phone, addresses, marketing_consent, lang, created_at")
    .eq("id", auth.sub).single();
  if (error || !c) return fail(res, 404, "auth.notFound");
  ok(res, {
    id: c.id, email: c.email, name: c.name, phone: c.phone,
    addresses: c.addresses as string[], marketing: c.marketing_consent,
    lang: c.lang, createdAt: Date.parse(c.created_at),
  });
}));
```

After the bridge is mounted, `frontend/src/lib/api.ts` and every existing call to `api<T>()`
continue to use `kb_token`; no menu, cart, order or reservation component needs an OAuth branch.
Supabase's `autoRefreshToken` updates that same key before expiry. On logout call
`supabase.auth.signOut()` in addition to the existing `setToken(null)` / `kb_user` cleanup. The
backend still verifies the bearer token with `db.auth.getUser()`, so a stale, forged or banned
session is rejected.

#### 5.1.4 Customer provisioning, verified email and identity linking

The trigger above covers both paths:

- **Password signup:** the existing form supplies `raw_user_meta_data.name`; with Confirm email
  on, the customer row can exist while the email is awaiting confirmation, and the existing
  password flow still requires confirmation before login.
- **Google signup:** Supabase validates Google's response and writes the provider's verified
  email to `auth.users.email`, sets `email_confirmed_at`, and includes the profile full name in
  `raw_user_meta_data.full_name` / `name`. The trigger uses that full name and the Auth email —
  never a browser-supplied email field. There is **no separate Confirm email step** for this
  path; Google has already verified the email for Supabase.
- `customers.email` is a lower-case synchronized copy for API/profile convenience. The
  authoritative value remains `auth.users.email`; the `on_auth_user_email_changed` trigger keeps
  the copy aligned after a confirmed Auth email change.

Supabase has automatic same-email identity handling and also exposes **manual linking**. Enable
**Authentication → Settings → Enable Manual Linking** in the hosted project (and
`auth.enable_manual_linking = true` in local `supabase/config.toml`). We recommend enabling it
so an already signed-in customer can deliberately attach Google to the existing account with
`linkIdentity()` instead of accidentally starting a separate account flow. The code above's
`linkGoogleIdentity()` is used from the signed-in Account page, not from the anonymous sign-in
button.

The safe customer support path for a person who already has a password account is:

1. Sign in with the existing email/password account.
2. From Account, choose **Link Google account**; complete the Google consent screen.
3. The callback exchanges the code while the original Supabase user session is still the
   account being linked. Orders, reservations, `customers.id` and GDPR export/erase therefore
   remain on one `auth.users` / customer id.

Do not create a second row by copying Google data into `customers` yourself. If a legacy project
already contains two Auth users with the same email, stop and reconcile them with a documented
support procedure before linking; do not guess which order history to move. `linkIdentity()`
will fail if the candidate Google identity belongs to another Auth user.

#### 5.1.5 OAuth-specific security checks

- **Minimum scopes are configured in code and Google Cloud:** `openid email profile` only. No
  Google API scope is present in the consent screen or `signInWithOAuth` call.
- **ID-token validation is Supabase's job.** Supabase Auth validates Google's OAuth response and
  ID token server-side before issuing its own access/refresh session. Kuopio Bites does not
  accept a raw Google ID token in Express and does not need a second Google JWKS verifier. The
  backend still calls `db.auth.getUser(<Supabase access token>)` on every protected request.
- **First-time Google identity audit:** the `auth.identities` trigger writes
  `auth.google.first_sign_in` to the append-only `activity_log` for a customer identity, with
  the provider and a boolean verification result but no Google email or avatar. A link to an
  existing password user is also an identity insert and is visible to Owner/Manager.
- **Abuse controls:** the existing `authLimiter` still protects password register/login/refresh
  and the backend API is rate-limited as before. The browser's `/auth/callback` is not an
  Express credential endpoint: it exchanges a one-use PKCE code with Supabase and has no
  password or Google secret to brute-force. Supabase Auth and Google rate-limit the provider
  authorization/consent flow. Keep the Supabase/Google provider enabled only for the expected
  origins, keep callback URLs exact, and add edge/WAF rate limiting if traffic warrants it.

Reference the current provider and identity-linking behavior when the dashboard UI changes:
<https://supabase.com/docs/guides/auth/social-login/auth-google> and
<https://supabase.com/docs/guides/auth/auth-identity-linking>.

The backend keeps its existing routes and response shapes; they now call Supabase Auth.
`signUp` sends the confirmation email using the settings above.

```ts
// backend/src/server.ts — customer register / login / refresh on Supabase Auth
import { authClient, db } from "./supabase";

app.post("/api/auth/register", authLimiter, wrap(async (req, res) => {
  const b = registerSchema.parse(req.body);                // { name, email, pass, phone? } — unchanged
  const { data, error } = await authClient().auth.signUp({
    email: b.email,
    password: b.pass,
    options: { data: { name: b.name, phone: b.phone ?? null } },  // read by handle_new_user()
  });
  if (error) return fail(res, error.code === "user_already_exists" ? 409 : 400, "auth.register");
  // With "Confirm email" on there is no session yet: the customer confirms, then logs in.
  // (Supabase then also answers an already-registered email like a new signup, so the form
  //  can't be used to find out who has an account.)
  ok(res, { token: data.session?.access_token ?? null, refreshToken: data.session?.refresh_token ?? null,
            user: { id: data.user?.id, name: b.name, email: b.email }, needsConfirmation: !data.session }, 201);
}));

app.post("/api/auth/login", authLimiter, wrap(async (req, res) => {
  const b = z.object({ email: z.string().email(), pass: z.string() }).parse(req.body);
  const { data, error } = await authClient().auth.signInWithPassword({ email: b.email, password: b.pass });
  if (error || !data.session) return fail(res, 401, "auth.badCredentials");
  const { data: profile } = await db.from("customers").select("*").eq("id", data.user.id).maybeSingle();
  if (!profile) return fail(res, 401, "auth.badCredentials");  // staff accounts can't log in as customers
  ok(res, { token: data.session.access_token, refreshToken: data.session.refresh_token,
            user: { ...profile, email: data.user.email } });
}));

// Access tokens live 1 hour (Supabase default). The API client calls this on a 401 and retries once.
app.post("/api/auth/refresh", authLimiter, wrap(async (req, res) => {
  const b = z.object({ refreshToken: z.string().min(10) }).parse(req.body);
  const { data, error } = await authClient().auth.refreshSession({ refresh_token: b.refreshToken });
  if (error || !data.session) return fail(res, 401, "auth.expired");
  ok(res, { token: data.session.access_token, refreshToken: data.session.refresh_token });
}));
```

On the frontend the only change is in the single API client (`frontend/src/lib/http.ts`):
store `refreshToken` next to `kb_token`, and on a `401` call `POST /api/auth/refresh` once and
retry. The browser still talks only to the backend.

### 5.2 Staff and admin accounts

**Implemented v1 policy: staff accounts are email/password-only; Google OAuth is for customers.**
Keep the Google provider enabled for the public Account form, but create every Owner, Manager and
Kitchen account with `create-staff.ts`, give it a password, and do not link a Google identity to
that Auth user. The admin screen continues to use `/api/auth/admin-login`, which resolves the
staff username and calls `signInWithPassword`; there is no Google button on the admin screen.
This avoids making operational access depend on a third-party consumer identity. Because a
Supabase OAuth provider is configured at the project level, this is an explicit provisioning and
route policy: if a staff Google identity is ever added by mistake, remove it, ban/revoke the
session and review the audit log before restoring access.

The same Auth user pool is still used, with the role stored in `staff_users`. The role matrix is
enforced in two places that don't trust the browser: the backend's `requireStaff()` and the RLS
policies above. The provider never supplies a role; only the active `staff_users.role` does.

*Stronger isolation* — a separate Supabase project for the admin, or SSO with enforced MFA for
staff — is a sensible later hardening step if Kuopio Bites grows to several locations or a
larger team. For one restaurant with three staff roles it adds cost and moving parts without
real benefit, because every admin action already goes through the backend.

Create staff accounts with a small backend script (it sets the `kb_staff` flag so no customer
profile is created):

```ts
// backend/scripts/create-staff.ts
// usage: npx tsx scripts/create-staff.ts <username> <owner|manager|kitchen> "<Full name>" <email>
import { randomBytes } from "node:crypto";
import { db } from "../src/supabase";

const [username, role, name, email] = process.argv.slice(2);
if (!username || !["owner", "manager", "kitchen"].includes(role ?? "") || !name || !email) {
  console.error('usage: npx tsx scripts/create-staff.ts <username> <owner|manager|kitchen> "<name>" <email>');
  process.exit(1);
}
const password = randomBytes(12).toString("base64url");     // temporary; shown once
const { data, error } = await db.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  app_metadata: { kb_staff: true },                          // only the secret key can set app_metadata
});
if (error || !data.user) throw error ?? new Error("createUser failed");
const { error: e2 } = await db.from("staff_users").insert({ id: data.user.id, username, name, role });
if (e2) throw e2;
console.log(`created ${role} "${username}" <${email}> — temporary password: ${password}`);
```

```bash
cd backend
npx tsx scripts/create-staff.ts admin   owner   "Omistaja"     owner@kuopiobites.fi
npx tsx scripts/create-staff.ts manager manager "Vuoropäällikkö" manager@kuopiobites.fi
npx tsx scripts/create-staff.ts kitchen kitchen "Keittiö"      kitchen@kuopiobites.fi
```

The demo logins (`admin` / `manager` / `kitchen`, password `kuopio2026`) are **not** carried
over — every real staff member gets their own account and changes the temporary password. Do not
use the customer Google button for a staff login; Google identities are deliberately absent from
staff accounts in this v1 policy.

If you created someone in the dashboard instead (*Authentication → Users → Add user*), the
trigger made them a customer. Convert them:

```sql
-- ✋ run by hand: turn a dashboard-created user into staff
insert into public.staff_users (id, username, name, role)
select id, 'admin', 'Omistaja', 'owner' from auth.users where email = 'owner@kuopiobites.fi';
delete from public.customers
 where id = (select id from auth.users where email = 'owner@kuopiobites.fi');
```

### 5.3 Backend: verifying the token and checking the role

The browser sends `Authorization: Bearer <access token>` exactly as today. Only the
verification inside `readAuth` changes; `requireCustomer()`, `requireStaff(min)` and the
rank table (`kitchen < manager < owner`) in `backend/src/auth.ts` stay as they are.

```ts
// backend/src/auth.ts — Supabase version of readAuth (requireCustomer / requireStaff unchanged)
import type { NextFunction, Request, Response } from "express";
import { db } from "./supabase";

export type Role = "owner" | "manager" | "kitchen";
export interface TokenPayload { sub: string; scope: "customer" | "staff"; role?: Role; name?: string }

/** Attaches req.auth when a valid Supabase access token is present (optional auth). */
export async function readAuth(req: Request, _res: Response, next: NextFunction) {
  (req as any).auth = null;
  const m = (req.headers.authorization ?? "").match(/^Bearer (.+)$/);
  if (!m) return next();
  try {
    // Checks signature and expiry with Supabase Auth and that the session wasn't revoked or banned
    const { data, error } = await db.auth.getUser(m[1]);
    if (error || !data.user) return next();
    const { data: staff } = await db
      .from("staff_users")
      .select("role, username")
      .eq("id", data.user.id)
      .eq("active", true)
      .maybeSingle();
    const auth: TokenPayload = staff
      ? { sub: data.user.id, scope: "staff", role: staff.role as Role, name: staff.username }
      : { sub: data.user.id, scope: "customer", name: String(data.user.user_metadata?.name ?? "") };
    (req as any).auth = auth;
    next();
  } catch (e) {
    next(e);
  }
}
```

```ts
// Staff login keeps the existing form (username + password): resolve the username to the Auth email
app.post("/api/auth/admin-login", authLimiter, wrap(async (req, res) => {
  const b = z.object({ username: z.string().max(40), password: z.string().max(120) }).parse(req.body);
  const { data: staff } = await db.from("staff_users").select("id, role, username, active")
    .eq("username", b.username).maybeSingle();
  if (!staff?.active) return fail(res, 401, "auth.badCredentials");
  const { data: u } = await db.auth.admin.getUserById(staff.id);
  if (!u.user?.email) return fail(res, 401, "auth.badCredentials");
  const { data, error } = await authClient().auth.signInWithPassword({ email: u.user.email, password: b.password });
  if (error || !data.session) return fail(res, 401, "auth.badCredentials");
  await audit({ sub: staff.id, scope: "staff", role: staff.role as Role, name: staff.username },
              "staff.login", "staff_users", staff.id);
  ok(res, { token: data.session.access_token, refreshToken: data.session.refresh_token, role: staff.role });
}));
```

A customer token can never pass `requireStaff()`: the scope comes from the database, not from
anything the browser sends. `getUser()` costs one network call to Supabase Auth per request; it
is the safest choice for an admin API. If you later need to save that call on hot public routes,
`db.auth.getClaims(token)` verifies the token locally against the project's asymmetric signing keys
(the default for new projects), but it can't tell that a user has logged out or been banned.

---

## 6. Storage Setup (Images)

The site ships 141 generated photos in `frontend/public/menu/<category>/<key>.webp`, all in the
unbranded "Havainnollistava tuotekuva" style. **Recommendation:** keep those bundled with the
frontend (versioned in git, served from the host's CDN) and use Supabase Storage for everything
uploaded from the admin **Media** library — new items, replacement photos, category photos and
Today's Special overrides. A `null` `photo_url` means "use the bundled photo"; a URL means
"use the uploaded one". (Prefer one place for everything? Upload the bundled photos too —
end of this section.)

### 6.1 Create the bucket and its rules

Run as part of the migration (or click *Storage → New bucket* → `menu-images`, **Public: on**,
5 MB limit, image types only):

```sql
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
```

In the default architecture the backend uploads with the secret key (RLS doesn't apply to it),
so these policies are the safety net for any direct upload. Visitors, customers and kitchen
staff can't add, replace or delete a single file.

### 6.2 The upload flow used by the admin Media library

The existing ImageUploader already crops to 1:1 and exports WebP ≤ 5 MB in the browser. It
sends the file to the backend, which checks it and stores it:

```ts
// backend/src/server.ts — POST /api/uploads/:folder/:key   (body = the raw WebP bytes)
import express from "express";

app.post(
  "/api/uploads/:folder/:key",
  requireStaff("manager"),
  express.raw({ type: ["image/webp"], limit: "5mb" }),
  wrap(async (req, res) => {
    const folder = z.enum(["items", "categories", "specials"]).parse(req.params.folder);
    const key = z.string().regex(/^[a-z0-9-]{1,80}$/).parse(req.params.key);   // e.g. 'kebab-68'
    const body = req.body as Buffer;
    const isWebp = Buffer.isBuffer(body) && body.length > 12 &&
      body.subarray(0, 4).toString("ascii") === "RIFF" && body.subarray(8, 12).toString("ascii") === "WEBP";
    if (!isWebp) return fail(res, 400, "upload.webpOnly");
    const path = `${folder}/${key}-${Date.now()}.webp`;  // new name per upload → no stale CDN copies
    const { error } = await db.storage.from("menu-images")
      .upload(path, body, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
    if (error) throw error;
    const url = db.storage.from("menu-images").getPublicUrl(path).data.publicUrl;
    await audit((req as any).auth, "media.upload", "storage.objects", path, { bytes: body.length });
    ok(res, { url, path }, 201);
  }),
);
```

```ts
// frontend/src/lib/http.ts — next to api(); still the only place that knows the backend
export async function apiUpload(path: string, file: Blob): Promise<{ url: string; path: string }> {
  const token = getStaffToken();
  const res = await fetch(apiBase() + path, {
    method: "POST",
    headers: { "content-type": file.type, ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: file,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((json as { error?: string }).error || `http ${res.status}`);
  return (json as { data: { url: string; path: string } }).data;
}
// usage in the Media library: const { url } = await apiUpload(`/api/uploads/items/${item.id}`, webpBlob);
// then save it: PUT /api/items/:id with { photo_url: url } (or the special's photo_override_url)
```

The upload is audit-logged like any other admin action. Keep new photos in the established
style: photographic, food only, **no logos, brand names or packaging marks**.

### 6.3 Optional: put the 141 bundled photos in the bucket too

```bash
cd frontend/public/menu
npx supabase --experimental storage cp -r . ss:///menu-images/bundled --linked -j 8
```

Then check *Storage → menu-images → bundled* and set each `photo_url` to the matching public
URL. The bucket is **not** included in database backups (Section 12), so keep the originals in
git either way.

---

## 7. Real-Time Features (Optional but Recommended)

The admin **Live Order Queue** promises "new orders appear instantly with a sound + badge".
Today the queue reloads `GET /api/orders`; Realtime pushes each new order to open admin screens
the moment the backend inserts it.

**Step 1 — publish the table** (part of the migration):

```sql
alter publication supabase_realtime add table public.orders;
```

**Step 2 — subscribe from the admin panel.** Realtime checks RLS for every subscriber, so only
signed-in staff receive order rows (policy "orders: own or staff can read"); a visitor who
copies the publishable key gets nothing.

```ts
// frontend/src/admin/liveQueue.ts — the ONE optional browser-side Supabase connection
import { createClient, type RealtimeChannel } from "@supabase/supabase-js";

const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export type NewOrder = { id: string; type: "pickup" | "delivery"; total: number; status: string; created_at: string };

/** Subscribe the Live Queue to new orders. Returns the unsubscribe function. */
export function watchNewOrders(staffAccessToken: string, onNew: (order: NewOrder) => void): () => void {
  void supa.realtime.setAuth(staffAccessToken);   // the staff token from the admin login
  const channel: RealtimeChannel = supa
    .channel("live-queue")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" },
        (payload) => onNew(payload.new as NewOrder))
    .subscribe();
  return () => { void supa.removeChannel(channel); };
}

/** Two-tone new-order chime — no audio file needed. */
export function chime(): void {
  const ctx = new AudioContext();
  [880, 660].forEach((hz, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = hz;
    gain.gain.value = 0.2;
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + i * 0.18);
    osc.stop(ctx.currentTime + i * 0.18 + 0.15);
  });
}
```

```tsx
// in OrdersView (frontend/src/admin/views-orders.tsx), mode === "queue"
useEffect(() => {
  const token = getStaffToken();
  if (!token) return;
  return watchNewOrders(token, () => {
    chime();                         // sound
    setUnseen((n) => n + 1);         // badge on the Live Queue nav item
    void refresh();                  // reload the full order (lines, totals) through the backend API
  });
}, []);
```

The event only signals "something new arrived"; the order details still come from the backend
API, as before. Browsers only allow sound after the first click on the page — normally the
staff login.

**Trade-off and recommendation.** This is the only place the browser opens a connection to
Supabase, and it needs `NEXT_PUBLIC_SUPABASE_URL` and the publishable key (Section 10). If you
want the rule "the browser talks only to the backend" to be absolute, poll `GET /api/orders`
every 10 seconds instead — perfectly adequate at one restaurant's volume. **Recommendation:
enable Realtime for the Live Queue only**; it is read-only and fenced by RLS. (Supabase's
"Broadcast from database" feature scales further; Postgres Changes is the simpler fit for a
handful of admin screens.)

---

## 8. Connecting the Backend to Supabase

### 8.1 Install

```bash
node --version          # must be v22 or newer — current @supabase/supabase-js requires Node 22+
cd backend
npm install @supabase/supabase-js
npm uninstall better-sqlite3 @types/better-sqlite3 jsonwebtoken @types/jsonwebtoken bcryptjs @types/bcryptjs
                        # ↑ only once every route has moved over (SQLite, own JWTs and bcrypt are no longer used)
```

### 8.2 One module that owns the connection

```ts
// backend/src/supabase.ts — replaces backend/src/db.ts
import "./config";                      // loads backend/.env (existing tiny loader)
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;  // sb_secret_… (or the legacy service_role JWT)
if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in backend/.env");

const serverAuth = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };

/** Data client: acts as service_role, bypasses RLS. NEVER call auth.signIn* on this one. */
export const db: SupabaseClient = createClient(url, key, { auth: serverAuth });

/** Fresh client for sign-in / refresh, so a user's session can never attach itself to `db`. */
export const authClient = (): SupabaseClient => createClient(url, key, { auth: serverAuth });

/** supabase-js returns { data, error } instead of throwing. Turn errors into exceptions. */
export function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  if (res.data === null) throw new Error("not found");
  return res.data;
}
```

*Why two clients:* if you sign a user in on the shared `db` client, supabase-js starts sending
**that user's** token on later queries — RLS suddenly applies to the backend and routes break
in confusing ways.

### 8.3 Reading: keep the API response shapes

The frontend expects the item shape in `backend/src/lib/types.ts` (`prices: [{label, value}]`,
`availability`, …). Map database rows back to it in one place, and the frontend doesn't change.

```ts
// backend/src/menu-repo.ts
import { db, must } from "./supabase";
import type { MenuItem, Tag } from "./lib/types";

type ItemRow = {
  id: string; category_id: string; name_fi: string; name_en: string | null;
  description_fi: string | null; description_en: string | null;
  price_med: number; price_perhe: number | null; price_variants: { label: string; value: number }[] | null;
  available_days: number[]; pre_order_only: boolean; preorder_cutoff: { day: number; time: string } | null;
  lead_time_hours: number | null; mods: MenuItem["mods"]; tags: string[];
};

export const toApiItem = (r: ItemRow): MenuItem => ({
  id: r.id,
  cat: r.category_id,
  name: r.name_en ?? r.name_fi,
  nameFi: r.name_fi,
  desc: r.description_en ?? undefined,
  descFi: r.description_fi ?? undefined,
  prices: r.price_variants ??
    (r.price_perhe !== null
      ? [{ label: "Med", value: r.price_med }, { label: "Perhe", value: r.price_perhe }]
      : [{ label: "", value: r.price_med }]),
  tags: r.tags as Tag[],
  mods: r.mods,
  availability: r.pre_order_only || r.available_days.length
    ? { days: r.available_days, mode: r.pre_order_only ? "preorder_only" : "normal",
        preorderCutoff: r.preorder_cutoff ?? undefined, leadTimeHours: r.lead_time_hours ?? undefined }
    : undefined,
});

// GET /api/items — was: db.prepare("SELECT data FROM items ORDER BY sort").all()
export async function listItems(): Promise<MenuItem[]> {
  const rows = must(await db
    .from("menu_items")
    .select("*, categories(sort_order)")
    .order("categories(sort_order)")   // parent rows ordered by the category's position
    .order("sort_order"));
  return (rows as ItemRow[]).map(toApiItem);
}
```

The pricing functions in `backend/src/logic.ts` and `backend/src/lib/v3.ts` stay pure; only
their loaders (`loadSettings`, `effectiveItems`) become async reads like `listItems()`.

### 8.4 Writing an order: reprice first, then one atomic call

```ts
// backend/src/server.ts — POST /api/orders (rate limit, customer-only and validation unchanged)
app.post("/api/orders", orderLimiter, requireCustomer, wrap(async (req, res) => {
  const b = orderSchema.parse(req.body);
  const auth = (req as any).auth as TokenPayload;
  const s = await loadSettings();
  const priced = validateOrder(s, { ...b, lines: b.lines as CartLine[] });  // THE price authority
  if (b.type === "delivery" && priced.total < s.minOrder) return fail(res, 400, "order.minOrder");

  const order = must(await db.rpc("create_order", {
    p_order: {
      id: uid("KB"), customer_id: auth.sub, type: b.type,
      subtotal: priced.subtotal, delivery_fee: priced.deliveryFee,
      discount: priced.discount?.amount ?? 0, discount_title: priced.discount?.title ?? null,
      offer_id: priced.discount?.offerId ?? null, vat: priced.vat, total: priced.total,
      payment_ref: "pi_" + Math.random().toString(36).slice(2),  // demo id as today → hosted-checkout session id
      contact_name: b.customer.name, contact_phone: b.customer.phone, contact_email: b.customer.email,
      address: b.address ?? null, note: b.note ?? null,
      scheduled_for: b.scheduled ? `${b.scheduled.date} ${b.scheduled.time} Europe/Helsinki` : null,
    },
    p_items: priced.lines.map((l) => ({
      menu_item_id: l.itemId,
      item_name_snapshot: l.name,                  // set by priceCart from the server-side menu
      variant_label: l.variantLabel,
      selected_toppings: l.pizza
        ? { included: l.pizza.included, extras: l.pizza.extras, builder: !!l.pizza.builder } : null,
      options: l.options, is_preorder: !!l.preorder,
      quantity: l.qty, unit_price: l.unitPrice,
      line_price: Math.round(l.qty * l.unitPrice * 100) / 100,
      note: l.note ?? null,
    })),
  }));
  ok(res, { ...order, status: "placed" }, 201);
}));
```

Other routes are one-liners, for example the kitchen's status button:

```ts
// PATCH /api/orders/:id/status — kitchen+
const { data, error } = await db.from("orders").update({ status: b.status })
  .eq("id", req.params.id).select().maybeSingle();
if (error) throw error;
if (!data) return fail(res, 404, "order.notFound");
await audit(auth, "order.status", "orders", req.params.id, { status: b.status });
```

### 8.5 Audit logging (replaces `logActivity`)

```ts
// backend/src/audit.ts
import { db } from "./supabase";
import type { TokenPayload } from "./auth";

export async function audit(a: TokenPayload | null, action: string, table: string | null,
                            id: string | null, details: Record<string, unknown> = {}): Promise<void> {
  const { error } = await db.from("activity_log").insert({
    staff_user_id: a?.scope === "staff" ? a.sub : null,
    actor_name: a?.name || (a ? a.sub : "system"),
    actor_role: a?.role ?? (a?.scope === "customer" ? "customer" : "system"),
    action, target_table: table, target_id: id, details,
  });
  // Fail closed: if the audit row can't be written, the request reports an error.
  if (error) throw new Error("audit.write: " + error.message);
}
// e.g. await audit(auth, "item.update", "menu_items", "kebab-68", { price_med: { from: 13, to: 13.5 } });
```

Every admin route that changes data calls `audit()`, exactly like `logActivity()` today. Direct
writes made with a staff token are caught by the trigger in 4.8, so nothing escapes the log.

### 8.6 The backend stays the source of truth

Supabase stores the data; the backend still makes every decision. Unchanged after the move:

- **every order total is recalculated on the server** (`priceCart` / `validateOrder`); client
  totals are only compared, never trusted, and the database double-checks the arithmetic;
- delivery rules: €15 minimum, 70xxx postal codes, €2.50 fee, 6 km radius (`shop_settings`);
- Halwa Puri / `pre_order_only` / `available_days` rules and pre-order slots;
- promo validity and limits (enforced again atomically in `create_order`);
- role matrix (`requireStaff`), rate limits on login / order / reservation, CORS allowlist;
- hosted checkout (Stripe-style): card details never touch our servers or the database;
- audit logging on every admin action.

### 8.7 Typed queries (recommended)

```bash
npx supabase gen types typescript --linked > backend/src/database.types.ts
```

Then `createClient<Database>(…)` gives autocompletion and type errors for misspelled columns.
Re-run after every migration.

---

## 9. Connecting the Frontend (Direct Public Reads — Optional)

**Default for this project: the frontend goes through the backend API exclusively. Skip direct
frontend-to-Supabase reads entirely.** One `NEXT_PUBLIC_API_BASE_URL`, one typed client
(`frontend/src/lib/http.ts`), no Supabase keys in the browser. That is how the code is built
today, it is the simpler and more secure setup, and nothing in Sections 3–8 requires changing it.

If you ever want the public menu to load straight from Supabase (for example a static menu page
without a backend round-trip), the publishable key is safe **only because** of Sections 4.2 and
4.5: `anon` has `SELECT` on the public menu tables and *no* privilege at all on anything else.

```ts
// frontend/src/lib/supabasePublic.ts — OPTIONAL. Reads public menu data only.
import { createClient } from "@supabase/supabase-js";

const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
  auth: { persistSession: false },
});

export async function publicMenu() {
  const { data, error } = await supa
    .from("menu_items")
    .select("id, category_id, name_fi, name_en, price_med, price_perhe, price_variants, available, sold_out_on")
    .eq("available", true)
    .order("sort_order");
  if (error) throw error;
  return data;
}
// Writes, orders, customers, promotions, staff or audit data: impossible with this key
// ("permission denied" before RLS is even consulted).
```

Even then, **prices shown in the browser are for display only** — the backend re-prices every
order at checkout.

---

## 10. Environment Variables

**Backend — `backend/.env`** (never committed; copy from `backend/.env.example`):

```bash
PORT=4000
CORS_ORIGINS=https://kuopiobites.fi,https://www.kuopiobites.fi   # exact origins, no wildcard

# Supabase
SUPABASE_URL=https://abcdefghijklmnopqrst.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxxxxxxxxxxxxxxxxxxxxxxx        # BACKEND ONLY — bypasses RLS
# Only for running migrations/dumps against the hosted DB without `supabase link`
# (Connect → Session pooler; percent-encode special characters in the password):
SUPABASE_DB_URL=postgresql://postgres.abcdefghijklmnopqrst:<db-password>@aws-0-eu-north-1.pooler.supabase.com:5432/postgres

# Payments and images (unchanged)
STRIPE_SECRET_KEY=
IMAGEGEN_API_KEY=

# No longer needed after the move: JWT_SECRET, DB_FILE
```

**Frontend — `frontend/.env.local`:**

```bash
NEXT_PUBLIC_API_BASE_URL=https://api.kuopiobites.fi          # unchanged; the backend stays the main API

# Required for customer Google OAuth (Section 5.1.3); also used only if you enable Realtime/public reads:
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnopqrst.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxxxxxx  # publishable key only — harmless behind RLS
# No GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET here: Supabase stores those in its Provider config.
```

Set the same variables in your hosting provider's settings (backend host: secret; frontend host:
public build variables). If you enable Realtime and use a Content-Security-Policy, add
`https://<ref>.supabase.co` and `wss://<ref>.supabase.co` to `connect-src`.

> ⚠️ **The secret / service_role key must never appear in any `NEXT_PUBLIC_*` variable, in
> `frontend/`, or in the browser bundle.** Next.js copies every `NEXT_PUBLIC_` value into the
> JavaScript it sends to every visitor. (New `sb_secret_` keys are also rejected when sent from a
> browser — but treat that as a seatbelt, not a plan.) Run these before every deploy — both must
> print nothing:
>
> ```bash
> grep -rnE "SERVICE_ROLE|sb_secret_" frontend --exclude-dir=node_modules --exclude-dir=.next
> grep -rlE "sb_secret_|service_role" frontend/.next/static
> ```

Both `backend/.gitignore` and `frontend/.gitignore` exclude `.env` / `.env.*` (keeping only the
`.env.example` templates), so real keys can't be committed by accident.

---

## 11. Migrations & Local Development

Schema changes belong in **version-controlled migration files**, not in ad-hoc dashboard edits:
then staging and production are guaranteed to match, every change is reviewable in git, and a
new developer can rebuild the whole database with one command.

### 11.1 One-time setup (repository root)

```bash
npm install -D supabase                 # the documented npm route (dev dependency; use via npx)
                                        # or: brew install supabase/tap/supabase · scoop install supabase
cd frontend && npm install @supabase/supabase-js && cd ..
npx supabase init                       # creates supabase/config.toml
```

Make local development behave like the hosted project (no automatic grants), so a missing
`GRANT` shows up on your machine instead of in production. In `supabase/config.toml`:

```toml
[api]
auto_expose_new_tables = false

[auth]
enable_manual_linking = true
```

### 11.2 Create the first migration

```bash
npx supabase migration new kuopio_bites_schema
# → supabase/migrations/<timestamp>_kuopio_bites_schema.sql
```

Paste **every SQL block from Sections 3, 4, 5.1, 6.1 and 7 that has no ✋ marker**, in the
order they appear in this guide, into that file. Then generate the seed data from the current
SQLite database (menu, toppings, specials, promotions, translations, shop settings):

```bash
cd backend && npx tsx scripts/export-supabase-seed.ts     # writes ../supabase/seed.sql
```

*(Last run: 30 categories, 175 items, 26 toppings, 3 specials, 1 promotion, 215 strings.)*

### 11.3 Local development (needs Docker Desktop or another Docker engine)

```bash
npx supabase start      # local Postgres + Auth + Storage + Realtime + Studio
                        # API http://127.0.0.1:54321 · DB port 54322 · Studio http://127.0.0.1:54323
npx supabase status     # prints the local URL and keys
npx supabase db reset   # wipe local DB, re-apply all migrations, then load supabase/seed.sql
```

Point the backend at the local stack while developing:

```bash
# backend/.env  (local values printed by `npx supabase status`)
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=<local secret / service_role key from `supabase status`>
```

### 11.4 Push to the hosted project

```bash
npx supabase login
npx supabase link --project-ref abcdefghijklmnopqrst     # asks for the database password
npx supabase db push --dry-run                           # shows what would be applied
npx supabase db push                                     # applies the migrations
npx supabase db push --include-seed                      # first deploy only: also loads seed.sql
```

Then create the staff accounts (Section 5.2). If real customer accounts already exist in SQLite,
copy them into Supabase Auth with their existing bcrypt password hashes, so nobody has to reset
a password:

```ts
// backend/scripts/import-customers.ts — run once: npx tsx scripts/import-customers.ts
import { db as sqlite } from "../src/db";          // the old SQLite module, still present at this point
import { db } from "../src/supabase";

type OldUser = { id: string; name: string; email: string; pass_hash: string; phone: string | null;
                 addresses: string; marketing: number };
const users = sqlite.prepare(`SELECT * FROM users`).all() as OldUser[];
for (const u of users) {
  const { data, error } = await db.auth.admin.createUser({
    email: u.email,
    password_hash: u.pass_hash,                    // bcrypt ($2a$/$2b$) hashes are accepted as-is
    email_confirm: true,
    user_metadata: { name: u.name, phone: u.phone || null, legacy_id: u.id },
  });
  if (error || !data.user) { console.error(u.email, error?.message); continue; }
  await db.from("customers")                       // the signup trigger already created the row
    .update({ addresses: JSON.parse(u.addresses), marketing_consent: u.marketing === 1 })
    .eq("id", data.user.id);
  console.log(`${u.email}: ${u.id} → ${data.user.id}`);
}
```

The two demo test orders (KB-O856V5, KB-OGGBIH) don't need to move.

### 11.5 Everyday workflow

1. `npx supabase migration new <what_changes>` — write the SQL. **A migration that creates a
   table must also contain its `GRANT`s, `enable row level security` and policies.**
2. `npx supabase db reset` — rebuild locally and test (Section 4.10).
3. Commit the migration with the code that needs it.
4. `npx supabase db push` — to staging first, then production.

Changed something in the dashboard by mistake? `npx supabase db diff --linked -f <name>` turns
the difference into a migration file so git catches up. Never run `db reset --linked` against
production — it wipes the database.

---

## 12. Backups & GDPR Considerations

### 12.1 Backups

| Plan | Automatic backups | Point-in-Time Recovery (PITR) |
|---|---|---|
| Free | **none** — export yourself | not available |
| Pro (from $25/mo) | daily, last **7 days** restorable | add-on, ≈ $100/mo for 7 days, needs at least the Small compute add-on |
| Team | daily, 14 days | add-on |

Database backups **don't include Storage files** (only their metadata) — the originals of the
bundled photos live in git, and uploaded photos should be downloaded periodically
(`npx supabase --experimental storage cp -r ss:///menu-images ./backup/menu-images --linked`).

**Recommendation for one restaurant: Pro plan + daily backups + a nightly logical dump kept
off-site.** Orders are also recorded by the payment provider, so losing at most a day of rows
is recoverable, and PITR (≈ $100+/month) is hard to justify at this size. Add PITR later if
order volume grows. Nightly dump (cron on the backend server or a scheduled CI job):

```bash
npx supabase db dump --linked -f backup/schema.sql
npx supabase db dump --linked --data-only --use-copy -f backup/data-$(date +%F).sql
# copy backup/ to storage outside Supabase (encrypted: it contains personal data); keep 30 days
```

Rehearse a restore into the staging project once — an untested backup is a hope, not a backup.

### 12.2 GDPR — where personal data lives

Kuopio Bites is an EU business and its customers are Finnish, so GDPR applies:

| Table | Personal data |
|---|---|
| `auth.users` | email, password hash, sign-in metadata, linked-provider ids |
| `auth.identities` | Google provider id and the identity profile returned by Google |
| `customers` | name, Auth-sourced email copy, phone, saved addresses, marketing consent |
| `orders` | contact name / phone / email, delivery address, notes |
| `order_items` | line notes |
| `reservations` | contact name / phone / email, notes (also guests without an account) |

Also do the paperwork: sign Supabase's **Data Processing Addendum (DPA)**, list Supabase (and
your SMTP, payment providers and **Google**) as processors in the privacy notice, and keep the database
project in the EU region. Google is an additional processor for customers who choose Google
sign-in: explain the identity data received, the purpose, retention and any transfer safeguards
in the notice. EU database hosting does not remove the need to document Google's own processing.

**Data export** — the backend's `GET /api/account/export` (customer) calls this:

```sql
create or replace function public.gdpr_export(p_customer uuid)
returns jsonb
language sql stable security definer set search_path = '' as $$
  with acct as (
    select u.id, u.email, u.created_at, u.last_sign_in_at from auth.users u where u.id = p_customer
  )
  select jsonb_build_object(
    'exported_at', now(),
    'account',     (select to_jsonb(a) from acct a),
    'auth_identities', coalesce((
        select jsonb_agg(jsonb_build_object(
          'provider', i.provider, 'provider_id', i.provider_id,
          'identity_data', i.identity_data, 'created_at', i.created_at,
          'last_sign_in_at', i.last_sign_in_at
        ) order by i.created_at)
          from auth.identities i where i.user_id = p_customer
      ), '[]'::jsonb),
    'profile',     (select to_jsonb(c) from public.customers c where c.id = p_customer),
    'orders', coalesce((
        select jsonb_agg(to_jsonb(o) || jsonb_build_object('items', (
                 select coalesce(jsonb_agg(to_jsonb(oi) - 'order_id'), '[]'::jsonb)
                   from public.order_items oi where oi.order_id = o.id))
               order by o.created_at)
          from public.orders o where o.customer_id = p_customer), '[]'::jsonb),
    'reservations', coalesce((
        select jsonb_agg(to_jsonb(r) order by r.created_at)
          from public.reservations r
         where r.customer_id = p_customer
            or (r.customer_id is null and lower(r.contact_email) = (select lower(email) from acct))
      ), '[]'::jsonb)
  )
$$;

revoke execute on function public.gdpr_export(uuid) from public, anon, authenticated;
grant  execute on function public.gdpr_export(uuid) to service_role;
```

**Erasure** — the backend's `DELETE /api/account` (the customer) and `DELETE /api/customers/:id`
(Owner) call this. Orders are bookkeeping records that Finnish accounting law
(*kirjanpitolaki*) requires you to keep for six years, so they are **anonymized**, not deleted:
amounts, VAT, items and the payment reference stay; everything that identifies the person goes.

```sql
create or replace function public.gdpr_erase(p_customer uuid)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_email  text := (select email from auth.users where id = p_customer);
  v_orders int;
  v_resv   int;
begin
  update public.order_items set note = null
   where note is not null
     and order_id in (select id from public.orders where customer_id = p_customer);

  update public.orders
     set contact_name = 'Poistettu asiakas', contact_phone = null, contact_email = null,
         address = null, note = null, customer_id = null
   where customer_id = p_customer;
  get diagnostics v_orders = row_count;

  delete from public.reservations              -- no retention duty → delete outright
   where customer_id = p_customer
      or (customer_id is null and v_email is not null and lower(contact_email) = lower(v_email));
  get diagnostics v_resv = row_count;

  delete from public.customers where id = p_customer;
  return jsonb_build_object('orders_anonymized', v_orders, 'reservations_deleted', v_resv);
end $$;

revoke execute on function public.gdpr_erase(uuid) from public, anon, authenticated;
grant  execute on function public.gdpr_erase(uuid) to service_role;
```

Neither function is callable from a browser — otherwise anyone could pass someone else's id.
The backend decides *whose* data (the signed-in customer, or the customer an Owner selected)
and calls them:

```ts
// GET /api/account/export — the signed-in customer
const data = must(await db.rpc("gdpr_export", { p_customer: auth.sub }));
await audit(auth, "customer.export", "customers", auth.sub);
ok(res, data);

// DELETE /api/account (customer) and DELETE /api/customers/:id (requireStaff("owner"))
const target = req.params.id ?? auth.sub;
const summary = must(await db.rpc("gdpr_erase", { p_customer: target }));
const { error } = await db.auth.admin.deleteUser(target);   // removes the login itself
if (error) throw error;
await audit(auth, "customer.erase", "customers", target, summary as Record<string, unknown>);
ok(res, { ok: true });
```

This erase path is provider-agnostic: `auth.admin.deleteUser(target)` deletes the one Auth user
and cascades every linked identity, including Google, just as it removes an email/password
identity. No Google API token or provider-specific delete call is needed.

For a one-off request handled by hand (e.g. an email to the restaurant), run the same functions
in the SQL Editor:

```sql
-- ✋ run by hand: GDPR request for one customer (look up the uuid by email first)
select id from auth.users where email = 'asiakas@example.com';
select public.gdpr_export('00000000-0000-0000-0000-000000000000');   -- send this JSON to the customer
select public.gdpr_erase('00000000-0000-0000-0000-000000000000');    -- then delete the login in
                                                                     -- Authentication → Users
```

**Marketing** — only ever send to customers who opted in, and log the consent changes (the
`stamp_consent` trigger records when):

```sql
-- ✋ run by hand: newsletter audience
select u.email, c.name, c.lang, c.consent_updated_at
  from public.customers c join auth.users u on u.id = c.id
 where c.marketing_consent;
```

Activity-log rows hold staff actions and ids, not customer contact data, and are kept as the
legitimate-interest audit trail. Test export and erase against a dummy account before launch.

**Google-linked dummy test (required before launch):** create a disposable customer through the
Google button, confirm that `gdpr_export` includes one `auth_identities` entry with
`provider = 'google'`, then run `gdpr_erase`. After the backend's `db.auth.admin.deleteUser(id)`
call, verify that the `customers` row and `auth.identities` row are gone, while any retained order
is anonymized exactly like a password account. `auth.admin.deleteUser` deletes the Auth user and
its linked identities; `gdpr_erase` removes the public customer data first. Never delete only the
`customers` row and leave a Google identity behind.

---

## 13. Quick Reference Checklist

- [ ] Project created in an **EU region** (North EU – Stockholm, or Central EU – Frankfurt); Pro plan before launch
- [ ] Database password, publishable key and secret key stored in a password manager
- [ ] All tables created: categories, menu_items, toppings, item_toppings, customers, promotions, orders, order_items, reservations, todays_special, staff_users, translation_strings, activity_log, shop_settings
- [ ] **Explicit GRANTs applied** (Section 4.2) — no "permission denied" from the backend
- [ ] **RLS enabled and policies applied on every table** (`rowsecurity = true` for all 14; Security Advisor clean)
- [ ] Audit trigger + append-only protection on `activity_log` installed
- [ ] Auth configured: email/password for customers, **Confirm email on**, **custom SMTP** set, `handle_new_user` trigger installed
- [ ] Google Cloud OAuth client created as a Web application with External consent screen and only `openid email profile` scopes
- [ ] Google Authorized redirect URI is exactly `https://<project-ref>.supabase.co/auth/v1/callback`; production/local JavaScript origins are correct
- [ ] Google provider enabled in Supabase with Client ID/Secret stored **only** in Authentication → Providers; Site URL and callback allowlist checked
- [ ] **Enable Manual Linking** decision made and configured; the `linkIdentity()` account path tested for an existing password customer
- [ ] Staff OAuth policy documented and enforced operationally: Owner/Manager/Kitchen remain email/password-only; no Google identity linked
- [ ] `handle_new_user`, email-sync and Google-identity audit triggers installed and re-verified by the guide harness
- [ ] Staff accounts created with `create-staff.ts`, roles set in `staff_users`, demo logins not carried over
- [ ] Storage bucket `menu-images` created: public read, Owner/Manager-only writes, 5 MB WebP/JPEG/PNG
- [ ] Backend connected with `SUPABASE_SERVICE_ROLE_KEY` (secret key) — **never exposed**; Node 22+
- [ ] Backend still enforces repricing, €15 delivery minimum, 70xxx postcodes, pre-order rules, promo limits, role matrix, rate limits, CORS allowlist, audit logging
- [ ] Frontend uses only the backend API for business data; publishable key is used for Auth and optionally Realtime/public reads
- [ ] Environment variables set correctly in each project and host; both leak-check greps print nothing
- [ ] Migrations tracked via Supabase CLI (`supabase/migrations/`), `seed.sql` generated, `auto_expose_new_tables = false` locally
- [ ] Backups: Pro daily backups on; nightly `db dump` stored off-site; restore rehearsed on staging (PITR only if volume justifies it)
- [ ] GDPR export/erase functions installed **and tested** against a dummy password customer **and a Google-linked dummy account** (including Auth identity deletion); Supabase DPA signed; privacy notice lists Supabase and Google

---

## Appendix — How this guide was verified

- **Executed:** every non-✋ SQL block in this file, extracted automatically and run in order on
  PostgreSQL 17 with stand-ins for the objects a Supabase project already has (`auth.users`, `auth.identities`,
  `auth.uid()`, the `anon` / `authenticated` / `service_role` roles, `storage.buckets` /
  `storage.objects`, the `supabase_realtime` publication) and **no** default table grants,
  matching the post-May-2026 default. `supabase/seed.sql` generated from the live SQLite data
  was loaded on top. The check script is
  `scripts/supabase-guide-check/run-checks.mjs`.
- **Tested role by role** (as PostgREST does it: `set role` + JWT claims) — **88 checks, all
  passing**: every row of the matrix in 4.9, password and Google signup
  triggers (including the verified email/full-name copy), the Google identity audit row and
  same-customer linking, the order arithmetic checks, atomic promo redemption, the audit trigger
  and append-only log, staff-offboarding protection, the storage policies, GDPR export → erase
  → Auth identity deletion for both password and Google-linked dummy customers, and the ✋ blocks.
  Re-run: `PGHOST=/tmp PGPORT=54329 node scripts/supabase-guide-check/run-checks.mjs` against any
  empty PostgreSQL 17 server.
- **TypeScript snippets** (**all 22**) were type-checked in `strict` mode against `@supabase/supabase-js` 2.117, Express 4 and React 18 types (`npm run ts` in the
  same folder), including the browser OAuth client, callback, session bridge, identity-linking
  call and the backend profile bootstrap route.
  The CLI commands were checked against Supabase CLI 2.119.
- **Not verifiable without a live project:** dashboard clicks and labels (Supabase renames
  things), email delivery, Realtime delivery over the network, Storage HTTP uploads, and
  `supabase db push` itself. Your first `npx supabase db reset` (local) and `db push --dry-run`
  are the real end-to-end test — run them before anything else.
