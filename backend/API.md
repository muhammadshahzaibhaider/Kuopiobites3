# Kuopio Bites Backend — REST Contract

Base URL: `NEXT_PUBLIC_API_BASE_URL` in deployment configuration. The browser normally calls the same-origin Next proxy (`/api`), which forwards to this service. Responses are `{"data": ...}` on success and `{"error": "code"}` on failure.

## Session and request security

- Customer and staff sessions are short-lived JWTs in separate `HttpOnly`, `SameSite`, `Secure`-when-production cookies. JWTs are never returned to the browser and are never stored in localStorage.
- Browser state-changing requests require the double-submit `X-CSRF-Token` header and `kb_csrf` cookie. The frontend obtains the token from `GET /api/auth/csrf`.
- `Authorization: Bearer` remains accepted only for the documented Supabase/migration bridge; application responses do not issue bearer tokens.
- `CORS_ORIGINS` is an exact-origin allowlist with credentials enabled. `*` is rejected.
- Production rejects plain HTTP, has HSTS/security headers, and must run behind a TLS-terminating proxy. Request IDs are returned in `X-Request-ID`.
- Validation errors, stack traces, secrets, passwords, card data, and raw customer records are not placed in error responses or logs.

Role matrix (enforced server-side, never by hiding UI):

| Capability | kitchen | manager | owner |
|---|---:|---:|---:|
| List orders, list/update/delete reservations, update order status | yes | yes | yes |
| Menu/category/settings/promotion/translation CRUD | no | yes | yes |
| Refunds | no | yes | yes |
| List customers, analytics, activity | no | yes | yes |
| Delete customer / GDPR erase | no | no | yes |

## Public reads

- `GET /api/health`
- `GET /api/categories`
- `GET /api/items[?cat=]`, `GET /api/items/:id`
- `GET /api/settings` (audit field excluded)
- `GET /api/promotions`
- `GET /api/translations`
- `GET /api/todays-special`

## Authentication

- `GET /api/auth/csrf` → a non-secret CSRF token and sets the CSRF cookie.
- `GET /api/auth/session` → current customer session; send `X-Session-Scope: staff` to inspect the staff session.
- `POST /api/auth/register {name,email,pass,phone?}` → an unverified account and `needsConfirmation: true`. Passwords must satisfy the server's 8+ character letter-and-number policy. Email confirmation is required before login; SMTP is required in production.
- `POST /api/auth/confirm-email {token}` → consumes a single-use, 24-hour confirmation token. Also accepts `{code}` (authorization-code flow) used by email-confirmation and Google OAuth callbacks; the code is redeemed server-side for a session cookie and a `customers` row is ensured for first-time sign-ins.
- `GET /api/auth/google` → starts the Supabase Google OAuth flow and 302-redirects the browser to Google. The provider is already enabled in the Supabase dashboard. Google returns to `/auth/confirm?code=…&next=/account`, which the existing confirm-email code exchange redeems for the session cookie. No client-side Supabase key is exposed; the browser only ever holds the HttpOnly session cookie.
- `POST /api/auth/login {email,pass}` → customer session cookie. Failed attempts are rate-limited, audited without raw identifiers, and temporarily locked after the configured threshold.
- `POST /api/auth/admin-login {username,password}` → staff session cookie. Staff remain email/password-only; roles are `owner`, `manager`, and `kitchen`.
- `POST /api/auth/logout` → clears both session cookies.

The seeded local staff password is only for the local demo. It must be replaced/removed before deployment; no provider credential is supplied by this workspace.

## Pricing and orders

- `POST /api/cart/price {lines,type,lang?,code?,address?}` returns server-repriced lines, subtotal, delivery fee, eligible discount, driving distance (when configured), cart weight, total, and VAT. Distance/weight fee rules use the first active matching `deliveryRules` entry; if none matches, the configured flat fee applies. A delivery address is sent to a provider only by the backend, and only when `DELIVERY_DISTANCE_API_KEY` is set.
- `POST /api/checkout/session` validates the complete order again and creates a server-priced Stripe Checkout Session when `STRIPE_SECRET_KEY` is configured. It returns a hosted URL; raw card data never reaches this API or the browser application.
- `POST /api/webhooks/stripe` accepts Stripe's raw body, verifies the `Stripe-Signature` HMAC and a five-minute timestamp tolerance, is idempotent by event ID, and re-checks the server total/currency before marking an order paid.
- `POST /api/orders` is available only when `ALLOW_DEMO_PAYMENTS=true` in non-production local development. Production must use the hosted checkout route; there is no fake `pi_...` payment ID.
- `GET /api/orders/:id` is limited to the owning customer or staff. Customer account order lists are filtered by the authenticated user ID.
- `PATCH /api/orders/:id/ready-time {minutes:5..240|null}` is kitchen+ and changes only the stored estimated-ready timestamp. New orders receive the admin-configured default; customers see the estimate on the tracking page.
- The server ignores the submitted `total`, `unitPrice`, `name`, customer identity, and other client pricing claims. It resolves current menu/settings, options, availability, preorder rules, delivery postcode/minimum, promotions, and VAT itself. A low/tampered total cannot lower the persisted total.
- `POST /api/orders/:id/refund` is manager+ and calls Stripe with an idempotency key when the order is paid. Local demo refunds are explicitly marked demo-only.

## Reservations

`POST /api/reservations` is public but CSRF-protected and rate-limited. Date, time, party size, contact fields, blocked dates, and blocked slots are validated server-side. Staff can list/update/delete reservations.

## Account / GDPR

- `GET/PUT /api/account` reads or updates only the authenticated customer.
- `GET /api/account/orders` and `GET /api/account/export` are scoped to the authenticated customer.
- `DELETE /api/account` removes the account and auth tokens; order records retain only the denormalized information needed for operational/accounting records, as documented in the privacy behavior.
- `GET /api/customers` is manager+; `DELETE /api/customers/:id` is owner-only and audit-logged.

## Admin CRUD and uploads

Admin JSON bodies use strict Zod schemas and reject unknown keys. IDs are bounded, option selections are resolved against the server menu, and settings/promotions/images are bounded and type-checked. Item weights (`weightKg`) and archive status are stored with the item; archived rows are hidden from public menu reads but remain available through the manager-only item list. Modifier options keep a canonical raw `label` for server validation and `CartLine.options`; optional `labelFi`/`labelEn` and group `nameFi`/`nameEn` are display-only. Notes remain in `CartLine.note`, and duplicate raw option labels across a single item are rejected because cart options remain a flat raw-string list.

`POST /api/uploads` is manager+ and accepts only PNG/JPEG/WebP bytes, checks magic bytes, enforces `MAX_UPLOAD_BYTES` (5 MiB by default), assigns a random server filename, and serves it as an inline immutable media key. Original filenames and paths are never used. The checked-in UI also rejects other MIME types; the backend remains the authority. Manager-only item reads include `GET /api/admin/items?includeArchived=true`; `PATCH /api/items/:id/archive {archived}` soft-archives/restores an item without deleting order history. `POST/PUT/DELETE /api/promotions` are manager+ and validate EN/FI text, scope, delivery-only, distance, weight, date/code, and usage-limit fields. `POST /api/categories`, `PUT /api/categories/:id`, and `DELETE /api/categories/:id` are manager+; a category with any menu rows (including archived items) cannot be deleted.

## Storage and operations

The active API uses Supabase PostgREST/Auth through `SUPABASE_URL` and the server-only `SUPABASE_SERVICE_ROLE_KEY` (or the supported `SUPABASE_SECRET_KEY` alias). SQLite `DB_FILE` is retained only for legacy/export tooling. The base schema and setup guide remain under the repository root; this feature's additive SQL is in `backend/migrations/20261017000000_admin_overhaul.sql` because feature edits are scoped to `frontend/` and `backend/`.

Before applying that migration, create and verify a database backup. Apply the base schema first, then run the additive migration through an owner-controlled Supabase SQL Editor/migration process; it is intentionally not in Supabase CLI's root migration directory. The migration adds per-item weight/archive fields and a stored order-ready estimate, consolidates the existing biryani/samosa rows without deleting history, and updates the existing `create_order` function.

Distance rules require the optional backend-only `DELIVERY_DISTANCE_API_KEY` (Google Maps Distance Matrix API, driving mode). If unset or temporarily unavailable, the API gracefully falls back to the configured flat fee and weight-only rules; distance-qualified rules do not apply. The key must be set only in the backend secret manager, never `NEXT_PUBLIC_*`. Current settings and delivery rules are stored in the existing `shop_settings.extra` JSON; no new settings table is required.

`GET /api/analytics/report?days=7|14|30` is manager+ and aggregates paid orders, refunds, item revenue (grouped by stable item ID), Helsinki-day revenue, and hourly order counts from Supabase; customer lifetime metrics are also calculated on the server. Activity rows are append-only from the application surface. The backend keeps product, user, order, reservation, translation, activity, settings, and provider-integrity data in Supabase.

Settings persistence is a sequential, non-transactional multi-table operation. Failure responses are stable (`settings.loadFailed` / `settings.persistFailed`); operation labels are logged server-side without returning raw database messages. A failed settings write must be re-fetched and verified; earlier writes may have succeeded before a later step failed.
