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

## 5. FINAL ADMIN WIRING (post-sweep)
- `AuditTab` (inside Admin view) now reads `GET /api/admin/activity` — verified live: 14 rows
  ("staff login", "settings updated", …). Client can no longer fabricate or bypass the log.
- Menu item translation inputs prefill from item `nameFi/descFi` (backend-owned); saves go through
  `PUT /api/items/:id`.
- Customers view hydrates from `GET /api/customers` (verified: registered test customer shown).
- Customer order history/tracking via new `GET /api/account/orders` (owner-scoped).
- Full admin sweep (all nav groups + leaves) ran with **zero page errors**.

## 6. Post-verification round (coverage panel + full UI order e2e)

- **Coverage "3 missing" explained & fixed.** The panel fetches `/menu/index.json` (a build-time list) —
  it still held 138 entries after the 3 drinks webps were added to `public/menu/drinks/`.
  Re-ran `node scripts/list-images.mjs` in `frontend/` → index now 141 entries.
  Live check (shots33.mjs, Admin → Localization → Coverage): **MENU PHOTOS MISSING | 0**, zero pageerrors.
- **Bug found & fixed — infinite reprice loop.** `store.priceCart` replaced the cart array on every
  response (new identity even when prices unchanged) while the order page effect depends on `[cart]`
  → refetch loop, `networkidle` never settled. Fix: `setCart` returns `prev` unless a `unitPrice`
  actually changed (frontend/src/lib/store.tsx). Rebuilt, restarted, loop gone.
- **Full UI order e2e executed (shots32.mjs):** login → kebab menu "+" ×2 → `/order` → server-priced
  total **€26.00** → delivery rules correctly blocked pay at €13 (minOrder 15) → filled address/phone
  → **KB-OGGBIH placed**, customer `/api/account/orders` and admin `/api/orders` both show
  `KB-OGGBIH €26.00 · 2× kebab-68 · vat 0.04 · paymentId pi_…`.
- Note: store hydrates `user` from `kb_user` (written by real UI login); API-only flows must set both
  `kb_token` and `kb_user`. Admin session token is in-memory (not localStorage) by design.
- Test orders left in demo DB: KB-O856V5, KB-OGGBIH.

## 7. Supabase guide round (SUPABASE-SETUP.md) + defects found while mapping the data model

- **SUPABASE-SETUP.md rewritten against the real backend model** (not the generic spec): text ids
  kept (`kebab-68`, `KB-…`), real order/reservation statuses (`placed…completed`,
  `pending|accepted|declined`), real variant sets (46 Med|Perhe, 90 single, 39 other), `shop_settings`
  table added (hours, pause, delivery rules, VAT), 2026 Supabase changes covered (publishable/secret
  keys, **explicit GRANTs required for new tables since 30 May 2026**, supabase-js needs Node 22+).
  Security fixes vs the first draft: no client INSERT on orders/reservations (would bypass repricing
  and rate limits), kitchen limited to `status` updates, managers can't edit `staff_users`
  (self-promotion), GDPR functions not callable by clients (IDOR), audit log append-only + trigger
  for direct writes, `create_order()` makes order + lines + promo redemption atomic.
- **Verified:** `scripts/supabase-guide-check/run-checks.mjs` extracts every non-✋ SQL block from the
  guide and runs it on PostgreSQL 17 with Supabase stand-ins and no default grants, loads
  `supabase/seed.sql` generated by the new `backend/scripts/export-supabase-seed.ts` from live SQLite
  (30 categories, 175 items, 26 toppings, 1196 item_toppings, 3 specials, 1 promotion, 215 strings),
  then tests the access matrix role by role → **82 passed, 0 failed**. `npm run ts` in the same folder
  type-checks all 16 TS/TSX snippets (supabase-js 2.117, Express 4, React 18) → exit 0.
- **Bug fixed — VAT amount was ~100× too small (split regression).** `backend/src/logic.ts` divided the
  fractional `vatRate` by 100 again (`total / (1 + 0.14/100)`), so every receipt showed VAT €0.03–0.04
  (KB-O856V5, KB-OGGBIH). Now `total × r / (1 + r)`; €26.00 → €3.09.
- **Rate updated 14 % → 13.5 %** (Finnish reduced rate for restaurant/takeaway food since 1.1.2026):
  backend + frontend defaults, live settings via `PUT /api/settings` as manager (audit row
  "settings updated"). Display uses new `vatPct()` (`Math.round(0.135*100)` would have printed "14%").
  Order page now shows **"incl. VAT 13.5% · €3.09"** (shots34/35).
- **Bug fixed — priced lines had no `name`.** The order zod schema strips client `name`, so stored
  lines were nameless and admin/analytics "top items" grouped under `undefined`. `priceCart` now sets
  `name` from the server-side menu.
- **Bug fixed — hydration errors on every page with a saved cart (pre-existing, also in legacy).**
  The cart was read from localStorage during the first render → React #418/#423, whole root
  re-rendered client-side. Cart now loads after hydration (`cartReady` guard so the empty initial
  state never overwrites the saved cart). shots35: 0 pageerrors across /, /menu, /order, /dining with a
  saved cart; cart persists. Admin sweep (shots30) still 0 pageerrors; audit leaf (shots31) 25 rows.
- **`.gitignore` gap closed:** `.env`/`.env.*` were not ignored anywhere (the guide claimed they were).
  Added `backend/.gitignore` (also ignores `data/*.db*` — contains personal data), `frontend/.gitignore`,
  root entries; checked with `git status --ignored`.
- **Gap closed — opening hours enforced server-side.** `POST /api/orders` checked the pause switch but
  not the hours (only the order page UI did). Now `!scheduled && !openInfo(hours).open → 400 order.closed`
  (same rule as `canPay`). Verified at 09:24 Helsinki (opens 10:00): crafted order → `order.closed`, no
  order created. Readable EN/FI toasts added for `order.closed` and `order.minOrder`.
