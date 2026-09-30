# Kuopio Bites Backend — REST Contract

Base URL: `API_BASE_URL` (frontend env). All responses use one shape:
success `{"data": …}` · failure `{"error": "code"}` (HTTP status carries the class).

Auth: `Authorization: Bearer <jwt>`. Two scopes, never interchangeable:
- **customer** (7d expiry) — register/login; can order, view own orders, manage own profile.
- **staff** (12h expiry, role claim `owner|manager|kitchen`) — admin endpoints only.
A customer token on any staff endpoint → `403 auth.staffRequired`.

Role matrix (enforced server-side, never by hiding UI):
| capability | kitchen | manager | owner |
|---|---|---|---|
| GET /api/orders, GET/PATCH reservations, PATCH order status | ✔ | ✔ | ✔ |
| menu/category/topping/translation/promotion CRUD, PUT settings, refunds | ✘ | ✔ | ✔ |
| GET/DELETE customers (GDPR), full analytics | ✘ | ✘ | ✔ |

## Public reads
- `GET /api/health`
- `GET /api/categories` → `[{id,title,en}]`
- `GET /api/items[?cat=]` → `MenuItem[]` (server applies admin overrides)
- `GET /api/items/:id`
- `GET /api/settings` → Settings (audit excluded)
- `GET /api/translations` → `{en:{…},fi:{…}}`
- `GET /api/todays-special` → `{special, todaysSpecials}`
- `GET /api/promotions` → live + scheduled offers

## Auth
- `POST /api/auth/register {name,email,pass,phone?}` → `{token,user}` (bcrypt-hashed; rate-limited 10/min)
- `POST /api/auth/login {email,pass}` → `{token,user}`
- `POST /api/auth/admin-login {username,password}` → `{token,role}` (demo seed: admin|manager|kitchen / `kuopio2026` — change in production)
- `POST /api/auth/logout` → stateless JWT; client discards token

## Pricing (the price authority)
- `POST /api/cart/price {lines,type,lang?,code?}` → `{lines(repriced),subtotal,deliveryFee,discount,total,vat}`.
  Frontend displays ONLY backend-computed totals; `POST /api/orders` re-validates and returns
  `400 order.priceChanged` if the submitted total differs by > €0.02.

## Orders (customer token required; rate-limited 30/15min)
- `POST /api/orders` — server recalculates every line (pizza builder & topping rules live here),
  re-checks availability + pre-order window + paused state + min-order, then persists.
- `GET /api/orders/:id` — owner customer or any staff; status progression computed server-side.
- `GET /api/orders` — staff. `PATCH /api/orders/:id/status {status}` — kitchen+.
- `POST /api/orders/:id/refund` — manager+ (audit-logged).

## Reservations (rate-limited 20/15min)
- `POST /api/reservations` — validates date/time/party, blocked dates & slots server-side.
- `GET /api/reservations` staff · `PATCH /api/reservations/:id {status}` · `DELETE /api/reservations/:id` — kitchen+.

## Account / GDPR
- `PUT /api/account` — update profile + marketing consent (consent stored as data, respected in exports).
- `GET /api/account/export` — full personal data export. `DELETE /api/account` — erasure.
- `GET /api/customers` manager+ · `DELETE /api/customers/:id` owner+ (GDPR erase, audit-logged).

## Admin CRUD (menu)
- `GET/POST /api/categories` · `PUT/DELETE /api/categories/:id` — manager+
- `GET/POST /api/items` · `PUT/DELETE /api/items/:id` — manager+ (full MenuItem JSON, zod-validated)
- Toppings live in Settings: `PUT /api/settings` — manager+ (audit-logged)

## Admin misc
- `PUT /api/todays-special` — manager+
- `POST/PUT/DELETE /api/promotions[/:id]` — manager+
- `PUT /api/translations {lang,key,value}` — manager+
- `GET /api/analytics/summary` — manager+ (orders, revenue, refunds, top items, pending reservations)
- `GET /api/admin/activity` — manager+ (who/when/what for every mutating admin action)

## Storage
SQLite (`better-sqlite3`) at `DB_FILE`. Tables: categories, items, settings, overrides, users,
staff, orders, reservations, translations, activity. Flexible documents (MenuItem, Settings,
Order) are stored as validated JSON rows; relational columns carry ids/fks/indexes. The access
layer is isolated in `src/db.ts` — swapping to PostgreSQL is a one-file change.

## Security notes
CORS allowlist = `CORS_ORIGINS` (no `*`). Rate limits on auth/orders/reservations. All bodies
zod-validated before business logic. Secrets only in `/backend/.env` (JWT_SECRET, DB_FILE,
STRIPE_SECRET_KEY, IMAGEGEN_API_KEY) — never in the frontend bundle. Payments intended as hosted
checkout (raw card data never touches either server). HTTPS + short-lived scoped JWTs in
production; consider same-domain httpOnly cookies when front and back share a domain.
