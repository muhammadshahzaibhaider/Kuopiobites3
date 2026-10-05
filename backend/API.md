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
- `GET /api/translations`
- `GET /api/todays-special`
- `GET /api/promotions`

## Authentication

- `GET /api/auth/csrf` → a non-secret CSRF token and sets the CSRF cookie.
- `GET /api/auth/session` → current customer session; send `X-Session-Scope: staff` to inspect the staff session.
- `POST /api/auth/register {name,email,pass,phone?}` → an unverified account and `needsConfirmation: true`. Passwords must be at least 12 characters. Email confirmation is required before login; SMTP is required in production.
- `POST /api/auth/confirm-email {token}` → consumes a single-use, 24-hour confirmation token.
- `POST /api/auth/login {email,pass}` → customer session cookie. Failed attempts are rate-limited, audited without raw identifiers, and temporarily locked after the configured threshold.
- `POST /api/auth/admin-login {username,password}` → staff session cookie. Staff remain email/password-only; roles are `owner`, `manager`, and `kitchen`.
- `POST /api/auth/logout` → clears both session cookies.

The seeded local staff password is only for the local demo. It must be replaced/removed before deployment; no provider credential is supplied by this workspace.

## Pricing and orders

- `POST /api/cart/price {lines,type,lang?,code?}` returns repriced lines, subtotal, delivery fee, discount, total, and VAT.
- `POST /api/checkout/session` validates the complete order again and creates a server-priced Stripe Checkout Session when `STRIPE_SECRET_KEY` is configured. It returns a hosted URL; raw card data never reaches this API or the browser application.
- `POST /api/webhooks/stripe` accepts Stripe's raw body, verifies the `Stripe-Signature` HMAC and a five-minute timestamp tolerance, is idempotent by event ID, and re-checks the server total/currency before marking an order paid.
- `POST /api/orders` is available only when `ALLOW_DEMO_PAYMENTS=true` in non-production local development. Production must use the hosted checkout route; there is no fake `pi_...` payment ID.
- `GET /api/orders/:id` is limited to the owning customer or staff. Customer account order lists are filtered by the authenticated user ID.
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

Admin JSON bodies use strict Zod schemas and reject unknown keys. IDs are bounded, option selections are resolved against the server menu, and settings/promotions/images are bounded and type-checked.

`POST /api/uploads` is manager+ and accepts only PNG/JPEG/WebP bytes, checks magic bytes, enforces `MAX_UPLOAD_BYTES` (5 MiB by default), assigns a random server filename, and serves it as an inline immutable media key. Original filenames and paths are never used. The checked-in UI also rejects other MIME types; the backend remains the authority.

## Storage and operations

SQLite (`DB_FILE`) is the current local implementation. The active app is not yet Supabase-backed; the migration/RLS/Auth guide is `/home/user/SUPABASE-SETUP.md`. Provider values and dashboards must be configured by the operator before production.

Tables include `auth_attempts`, `email_tokens`, `stripe_events`, and `newsletter_subscribers` in addition to catalog, user, order, reservation, translation, activity, and settings data. Activity rows are append-only from the application surface.
