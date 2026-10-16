# QA checklist — Admin overhaul

Use this checklist in a staging Supabase project before production. **PASS** means it ran in this workspace; **BLOCKED / NOT RUN** means it still needs staging or a browser. Do not treat a blocked item as accepted.

## Automated checks

| Status | Check | Result / notes |
|---|---|---|
| **PASS** | Backend unit tests | `cd backend && npm test` — 11 passed, 0 failed. Covers settings role allowlists, paid/refunded revenue eligibility, server-priced toppings, delivery ranges/Haversine, promotion validation and scoped discounts. |
| **PASS** | English/Finnish key parity | `npm run check-i18n` — 235 keys found; parity passed. |
| **PASS** | React hooks dependency lint | Targeted `react-hooks/exhaustive-deps` lint across `src/**/*.{ts,tsx}` — zero warnings/errors. The repo has no committed lint config; a temporary config was used and removed. |
| **PASS** | Patch whitespace check | `git diff --check`. |
| **PASS — parser only** | SQL and PL/pgSQL syntax | `20261016000000_admin_overhaul.sql` — 54 statements; `convert_legacy_menu_variants.sql` — 7 statements; PL/pgSQL grammar parser accepted 3 new migration bodies and 11 existing-schema bodies. This does not validate schema compatibility, constraints, RLS behavior, migration ordering or database execution. |
| **PASS — smoke only** | Dev route smoke | Root app dev server started. `/`, `/menu`, `/order`, `/admin` returned HTTP 200; same-origin `/api/auth/csrf` returned HTTP 200 through Next rewrites. |
| **BLOCKED** | Backend security script | `npm run security-check` was attempted against a deliberately fake Supabase URL/key. `/api/health` returned 500 when the placeholder DB could not be reached, so catalog repricing and unknown-key checks were not reached. Repeat against a real local/staging Supabase instance. |
| **NOT RUN** | Typecheck | Intentionally not run, per instruction. |

## Manual/staging acceptance — required before release

### Database and migration

- [ ] Back up staging data; apply the full migration chain through `20261016000000_admin_overhaul.sql`.
- [ ] Confirm RLS, grants, triggers, indexes, staff-role checks, storage settings and security-definer functions behave as intended.
- [ ] For an existing seeded project, verify former Biryani/Samosa rows are archived (not deleted), keeper rows have the expected variants, old order snapshots still render, and the migration is safe to reapply.
- [ ] For a clean database, apply migrations, seed, run `supabase/scripts/convert_legacy_menu_variants.sql`, and review its result queries. Confirm Biryani (`specials-3`) contains half/full/meal/chicken variants and Samosas (`specials-6`) contains classic/vegetarian one- and two-piece variants.
- [ ] Confirm a failed/rolled-back migration leaves no partial data or permissions changes. Do not run the conversion against production until a reviewed backup exists.

### Auth, permissions, settings and catalog

- [ ] Bootstrap an owner through Supabase Auth plus `public.staff_users`; sign in at `/admin` using the staff flow.
- [ ] Test kitchen, manager and owner accounts separately. Kitchen can update order status, ready time and item availability but cannot edit prices, promotions or delivery rules. Manager can edit the allowed catalog/settings/promotions/delivery data but cannot change owner-only fields or manage staff. Owner can manage staff and all validated settings.
- [ ] Create/edit/restore/archive an item and category. Confirm API/DB persistence, customer menu refresh without a build/deploy, off-menu filtering/quick restore, and preservation of historic order rows.
- [ ] Add multi-variant prices, option groups, topping configuration, availability windows and an image. Confirm the public UI reflects the saved configuration and removing a topping prevents checkout selection.
- [ ] Save valid settings and then submit an invalid/disallowed settings change. Confirm the API rejects it, the optimistic UI rolls back, the localized failure message appears, and a later refresh shows the DB value.
- [ ] Exercise promotion create/edit/deactivate, date boundaries in Europe/Helsinki, code matching, item/category scope, max uses and concurrent use. Confirm client-supplied usage counters and out-of-scope discounts cannot affect the result.

### Delivery, checkout, orders and reports

- [ ] Configure restaurant latitude/longitude, radius and the backend geocoder; test valid, outside-radius and geocoder-unavailable addresses.
- [ ] Create distance-, weight-, subtotal- and combined-condition delivery rules with date/day/time windows, priority and stacking. Confirm the admin preview agrees with server results and changes when inputs/rules change.
- [ ] Compare customer cart preview with the final server checkout price. Attempt tampered client item prices, delivery fees, discount values and totals; confirm the server ignores/rejects them and enforces minimum subtotal.
- [ ] Complete a Stripe test-mode payment and webhook flow, then test canceled/expired payment. Confirm unpaid orders do not enter paid revenue and refunds remove revenue while preserving order history.
- [ ] Set and adjust an order ready-time estimate in Admin. Confirm DB persistence, customer countdown/note refresh, and no automatic status advancement at zero.
- [ ] Compare dashboard chart, summary and reports for paid, demo-paid, pending, refunded and refunded-paid fixtures over Helsinki day boundaries. Only non-refunded `paid`/`demo_paid` amounts should count.

### Responsive/accessibility and language

- [ ] At **360 px**, **768 px**, and **1280 px**, open the customer item modal and admin product editor. Confirm no page-level horizontal scroll, controls wrap, the action row remains reachable, and the content can scroll vertically.
- [ ] Keyboard-only: open/close dialog, Escape, focus trap/restore, tab to all controls, and screen-reader name/role for dialogs and icon buttons.
- [ ] Switch EN/FI and verify every new admin/customer label, error, status, validation hint, and price retains dot decimals (for example `12.50 €`).

## Workspace caveats

- There are no live Supabase/Stripe credentials in this checkout. A temporary Chromium package was fetched from the npm registry for viewport QA, but it could not launch because the sandbox lacks `libnspr4.so`, `libnss3.so`, and `libnssutil3.so`; therefore visual viewport/accessibility checks remain **not verified**. Database migration execution, role-authenticated CRUD and real checkout also remain blocked. The dev smoke used placeholder DB credentials only to verify that the frontend and same-origin API proxy start; it is not an end-to-end pass.
