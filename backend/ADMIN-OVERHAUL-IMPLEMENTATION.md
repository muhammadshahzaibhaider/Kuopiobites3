# Admin overhaul: implementation, QA and release checklist

Status: **feature work is not merge-ready**. The owner-reported real-Supabase settings-save failure is still not reproduced; the automated settings save/re-fetch test uses the local Supabase mock. No database migration has been applied, no Vercel preview readiness has been confirmed, and responsive visual QA/full browser E2E remain outstanding.

## What changed

- **Admin editing and reporting:** manager item editor now covers bilingual names/descriptions, prices/variants, weight, per-item modifier groups, availability, images, and archive/restore/permanent delete for custom items. Category management, delivery rules, promotion scopes, server-backed customer metrics, and date-range analytics are available in admin. Settings changes use explicit drafts where typing used to fire overlapping full-snapshot saves.
- **Delivery fees/offers:** delivery rules can match driving-distance and/or total cart weight; promotion scopes can limit eligibility by delivery mode, distance, and weight. The server resolves addresses and reprices all options/offers/fees. Without the optional distance key, distance-qualified rules/offers do not apply and flat/weight pricing remains available.
- **Menu/availability:** archived items are omitted from public menu reads and retained in manager reads; the Off-menu navigation opens with the sold-out filter applied. Biryani and Samosa variants are consolidated under stable item IDs, with old rows retained but archived.
- **Customer ordering:** the server stores the configured/per-order ready estimate and tracking displays it. Samosa quantity uses exact `1pc`/`2pc` variant labels. Modifier display names support Finnish/English while `CartLine.options` remains an array of unique canonical raw labels; notes stay in `CartLine.note`. The item modal retains a scrollable content region without visible scrollbars and a safe-area-aware sticky footer.

## Changed files

### Backend

- `backend/.env.example` — optional backend-only `DELIVERY_DISTANCE_API_KEY` documentation.
- `backend/API.md` — API, data contract, and migration/operations notes.
- `backend/ADMIN-OVERHAUL-IMPLEMENTATION.md` — this QA and owner-action record.
- `backend/migrations/20261017000000_admin_overhaul.sql` — additive columns/index, menu-row consolidation/archive, and `create_order` ETA support.
- `backend/scripts/mock-supabase.mjs` — local PostgREST test-double defaults for the new archive/weight columns.
- `backend/src/analytics.ts` — paid-order reporting by Helsinki day/hour and stable item ID.
- `backend/src/delivery.ts` — optional driving-distance lookup/cache, cart weight, delivery-rule selection.
- `backend/src/lib/hours.ts`, `backend/src/lib/menu.ts`, `backend/src/lib/types.ts`, `backend/src/lib/v3.ts` — defaults, consolidated seed data, types and promotion logic.
- `backend/src/logic.ts`, `backend/src/schemas.ts`, `backend/src/server.ts` — server repricing/validation, API routes and role checks, archive, analytics, delivery, settings diagnostics and order-ready estimates.
- `backend/src/supabase-menu.ts`, `backend/src/supabase-orders.ts`, `backend/src/supabase-settings.ts` — Supabase item/order/settings persistence and mapping.

### Frontend

- `frontend/ADMIN-OVERHAUL-AUDIT.md` — read-only pre-change view-by-view load/save audit; records that the real settings failure had not been reproduced.
- `frontend/src/admin/ui.tsx`, `frontend/src/admin/views-menu.tsx`, `frontend/src/admin/views-delivery.tsx`, `frontend/src/admin/views-misc.tsx`, `frontend/src/admin/views-orders.tsx` — admin item/category/offer/delivery/report/settings/order workflows.
- `frontend/src/app/admin/page.tsx`, `frontend/src/app/admin/v3tabs.tsx` — navigation, category/topping/availability/preorder/specials panels.
- `frontend/src/app/order/page.tsx` — server-backed delivery quote and translated option display.
- `frontend/src/components/CartDrawer.tsx`, `frontend/src/components/ItemModal.tsx`, `frontend/src/components/PizzaSheet.tsx`, `frontend/src/components/TrackView.tsx` — cart labels, item/pizza ordering and customer ETA display.
- `frontend/src/lib/api.ts`, `frontend/src/lib/hours.ts`, `frontend/src/lib/i18n.tsx`, `frontend/src/lib/menu.ts`, `frontend/src/lib/store.tsx`, `frontend/src/lib/types.ts`, `frontend/src/lib/v3.ts` — API/store/types, bilingual copy, seed data, repricing and localized option display.

## QA performed

- `npm ci` completed successfully in both `frontend/` and `backend/`; temporary lint-only dependencies were removed again with `npm ci` after the final lint run.
- `npx tsc --noEmit` passed in both projects.
- `npm run check-i18n` passed with **231 matched EN/FI keys**.
- `npm run build` passed for the frontend production bundle. Next emitted its existing warning that React 18 support is deprecated in Next.js 16.
- Exhaustive-deps lint passed for all changed frontend TypeScript files. The standalone flat config reported one existing `noInlineConfig` warning for an inline Next image-rule directive in `frontend/src/app/admin/page.tsx`; there were no exhaustive-deps errors.
- Local mock-Supabase API smoke test passed **10 groups**: CSRF/manager auth; health; settings save/re-fetch; category CRUD and item weight/modifier persistence; server repricing and weight fee; invalid topping rejection; weight offer plus graceful no-key distance fallback; exact variant and per-item option pricing; archive/restore/public exclusion/category-delete guard; ready-time persistence and paid analytics.
- The repository backend `security-check` passed against the local mock for health, server repricing, and unknown-key rejection. Its cross-customer ownership/IDOR check was skipped because no `SECURITY_CHECK_ORDER_ID` was provided; no real customer order was available.
- Frontend/backend seed-menu checks passed for stable Biryani and Samosa IDs/labels. A focused analytics test passed Helsinki-day filtering and stable item-ID grouping, including unique report keys for same-named distinct IDs.
- `pglast` accepted all 12 top-level SQL statements in the migration. This is a syntax parse only; the SQL has **not** been executed against PostgreSQL/Supabase.

## Not yet verified

- The original settings-save error has **not** been reproduced against the real Supabase project; the mock succeeds. The API now reports stable `settings.loadFailed` / `settings.persistFailed` codes and logs the failed operation name, but this does not establish the original cause.
- No full UI browser E2E, responsive visual inspection, keyboard/screen-reader pass, or physical mobile check has run. The item-modal responsive layout was code-reviewed and type/build checked only.
- The migration has not been applied to a preview or production database. The Supabase schema/function behavior has not been live-validated.
- No frontend or API deployment preview has been confirmed Ready; preview `/api/health` and the public site were not checked. A successful build is not a deployment health check.
- Distance lookups were not exercised against Google; the mock test verified no-key fallback and weight rules only.

## Migration and backup steps

1. Confirm the target Supabase project/environment and take a database backup. Verify the backup is usable before proceeding; do not treat a successful SQL parse as a backup or execution test.
2. Confirm the current base schema under `supabase/migrations/` is already applied. Do not move the feature migration into that root directory; the approved feature boundary places it at `backend/migrations/20261017000000_admin_overhaul.sql`.
3. Apply the additive migration through the owner-controlled Supabase SQL Editor or approved migration process. It runs in a transaction, adds columns/indexes, updates the stable Biryani/Samosa rows, archives duplicate catalog rows without deleting them, and replaces the existing `create_order` function while preserving its service-role-only grant.
4. Verify `menu_items.weight_kg`, `menu_items.is_archived`, `orders.estimated_ready_at`, the new index, the archived legacy rows, the primary variant arrays, and `create_order` grants/function definition before deploying the matching API/frontend code.
5. If any statement fails, stop and investigate using the verified backup; do not hand-edit production rows to bypass the migration.

## USER ACTION REQUIRED BEFORE MERGE

- **Do not merge yet.** First reproduce the reported settings-save failure against the real preview Supabase project (or document that it cannot be reproduced), save a harmless settings change, reload/re-fetch it, and capture the returned operation code if a failure occurs. The local mock pass is not a substitute.
- Create and verify a database backup, apply the migration above to the intended preview database, and validate the feature-specific schema/function behavior before preview deployment.
- Ensure both the API preview and frontend preview reach **Ready**. Verify preview `GET /api/health` returns `{"data":{"status":"ok",...}}`, exercise the actual frontend against that API, and complete all ten requested feature flows plus responsive/keyboard/mobile checks. Do not use Vercel CLI or change project settings/domains.
- `DELIVERY_DISTANCE_API_KEY` is optional. If distance pricing/offers are required for launch, add it only to the backend deployment secret manager; never put it in frontend environment variables or a `NEXT_PUBLIC_*` variable. Without it, flat/weight delivery pricing works but distance-qualified rules/offers do not.
- Keep Stripe settings/domains unchanged and production demo payments disabled. No Stripe credentials or other secrets belong in Git.
- After merge, verify live API health and the public site. If production returns HTTP 500, have the owner promote the previous deployment and continue the fix in a new PR.
