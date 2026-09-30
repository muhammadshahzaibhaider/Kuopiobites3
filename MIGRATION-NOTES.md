# Kuopio Bites — Split Migration Notes

Living document for the frontend/backend split. Audit first, then what changed and why.

## 1. AUDIT OF THE COMBINED CODEBASE (pre-split)

### Pages / components
- Public: `/` (home), `/menu`, `/order`, `/dining`, `/reservations`, `/about`, `/account`, `/track/[id]`.
- Admin: `/admin` (single page shell + `src/admin/*` view modules) — menu CRUD, orders, reservations, settings, translations, analytics, activity log.
- Shared UI in `src/components/*` (Header, Footer, CartDrawer, PizzaSheet, ItemModal, SpecialsCarousel, ReservationFlow, AuthForm, chrome…).

### Where data lived (all client-side — no API routes existed)
- `src/lib/menu.ts` — full static menu (categories + 175 items) and category list.
- `src/lib/hours.ts` — `DEFAULT_SETTINGS` (hours, offers, toppings, special, delivery rules).
- `src/lib/i18n.tsx` — EN/FI translation dictionaries (215 keys) + provider.
- `src/lib/api.ts` — **stub layer**: fake network calls persisting to `localStorage`
  (`kb_orders`, `kb_reservations`, `kb_users`, `kb_session`, `kb_settings`, `kb_overrides`, `kb_cart`),
  each annotated with the real endpoint it must be swapped for. UI talks ONLY to this layer.
- `src/lib/store.tsx` — ShopProvider: cart, auth session, admin overrides, order/reservation flows.

### Business logic that lived in the UI layer (must move to backend)
- `src/lib/v3.ts` — pricing rules (`pizzaUnitPrice`, `builderUnitPrice`, `computeDiscount`, `offerPrice`),
  availability rules (`isItemOff`, `isCatOff`, `optionOff`), Halwa-Puri Sunday pre-order rules
  (`validatePreorder`, `nextPreorderSundays`).
- `store.tsx placeOrder()` — "server-side re-validation" of prices **running in the browser** (fake server).
- `store.tsx orderStatus()` — time-based order status progression computed client-side.
- `store.tsx effectiveMenu()/categories()` — admin overrides merged client-side.

### Secrets / security gaps flagged (priority fixes)
1. `src/app/admin/page.tsx:14` — `const ADMIN_PASS = "kuopio2026"` shipped in the client bundle.
2. Customer passwords stored **plaintext** in localStorage; login compares in the browser.
3. Order totals computed and re-validated client-side only — a modified client can submit any total.
4. Admin "authorization" = the frontend showing/hiding UI; nothing enforced server-side.
5. Activity log writable by anyone (client state).

## 2. WHAT CHANGED IN THE SPLIT

- `/backend` (new, standalone Express + SQLite service) now owns: menu/categories/toppings data,
  settings, orders, reservations, customers, staff auth (bcrypt + scoped JWTs), translations,
  promotions/offers, activity log, and ALL pricing/availability logic (the `v3.ts` functions moved
  server-side; the frontend keeps a copy only for instant UI feedback, backend re-validates).
- `/frontend` = the existing Next.js app moved verbatim; `src/lib/api.ts` stub bodies are replaced
  with real fetch calls through one typed client (`API_BASE_URL` env, never hardcoded).
- Logic that moved from page/provider components into backend endpoints:
  - admin password check → `POST /api/auth/admin-login` (bcrypt, staff-scoped JWT)
  - customer register/login → `POST /api/auth/register|login` (bcrypt hash, customer-scoped JWT)
  - price re-validation → `POST /api/cart/price` + re-check inside `POST /api/orders`
  - order status progression → computed by backend on `GET /api/orders/:id`
  - settings/overrides writes → `PUT /api/settings` + menu CRUD (admin-only, audit-logged)
- Database choice: **SQLite (better-sqlite3)** — zero external service, file-backed, safe concurrent
  reads; the data-access layer is a single module (`src/db.ts`) so swapping to PostgreSQL later is a
  one-file change. Justified for this deployment size; schema documented in `backend/API.md`.
- Secrets live only in `/backend/.env` (JWT_SECRET, DB path, CORS origins). Frontend has NONE.

## 3. FRONTEND MIGRATION (completed)

- `/frontend` = the original Next.js app moved verbatim; UI, styling, animations unchanged.
- `src/lib/http.ts` (new): single typed client; `NEXT_PUBLIC_API_BASE_URL` only (sandbox preview
  derives the sibling 4000-host from `window.location` when unset). Bearer tokens stored here.
- `src/lib/api.ts`: stub bodies REPLACED with real endpoint calls (same contract as API.md).
- `src/lib/store.tsx`: now fetches settings/items/categories/translations at boot and after every
  mutation; admin actions (patchItem/move/add/remove/cat/texts) → backend CRUD + reorder endpoint
  (`PATCH /api/items/reorder`, added to backend for drag-and-drop ordering). Cart stays local;
  totals always from `POST /api/cart/price` (order page re-prices on every cart change and submits
  the server total; backend re-validates anyway).
- `src/lib/menu.ts`: exported arrays are now live-hydrated in place (`__setLiveMenu`) so all ~14
  existing import sites see backend data with zero call-site rewrites; bundled data remains only as
  offline first-paint fallback. `lib/v3.ts` stays as a display-only mirror — every price it shows
  is re-validated/re-computed by the backend.
- `src/lib/i18n.tsx`: backend translations override the bundled dictionaries once hydrated.
- `src/app/admin/page.tsx`: **`ADMIN_PASS` deleted** — Gate now calls `POST /api/auth/admin-login`
  (bcrypt + staff-scoped JWT). No credential exists anywhere in the frontend (grep-verified).
- Old combined app remains at repo root as the pre-split legacy reference (not deployed).

## 4. POST-SPLIT VERIFICATION (executed)
- Home fires `GET /api/settings|items|categories|translations` and renders backend data
  (31 category circles; playwright request log).
- Client-side nav home→menu renders without reload (old navigation bug still fixed).
- Admin login via backend works; dashboard live-feed showed the order created by the API test
  (same order id KB-O856V5, €22.00) — admin reads backend-owned data.
- Price round-trip: manager `PUT /api/items/kebab-68` → €13.50 appeared on the public menu page,
  then restored to €13.00.
- Secret scan of `/frontend/src`: zero hits for kuopio2026 / JWT_SECRET / STRIPE_SECRET / IMAGEGEN.
- Backend battery (previous section): fake totals 400, role matrix enforced, CORS 403, GDPR 200.
