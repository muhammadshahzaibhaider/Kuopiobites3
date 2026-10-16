# PR: Move Kuopio Bites admin and checkout to server-authoritative data

## Summary

This change completes the admin/checkout overhaul in the existing root app while preserving the existing visual brand and EN/FI switch. Admin mutations now go through the authenticated backend, role-checked and schema-validated before persistence to Supabase. Public menu data and checkout prices are driven by the database without a frontend redeploy.

## What changed

- Added additive Supabase schema/data migration `supabase/migrations/20261016000000_admin_overhaul.sql` and idempotent post-seed conversion `supabase/scripts/convert_legacy_menu_variants.sql`.
- Converted Biryani and Samosa catalog entries into bilingual variants while archiving legacy source rows and retaining order snapshots/history.
- Added persistent catalog/category CRUD, variants, options, toppings, availability/off-menu actions, promotions, delivery rules and server preview; added kitchen/manager/owner write restrictions and settings rollback on failed saves.
- Made cart preview and checkout recalculate current catalog prices, promotion scope, minimum subtotal, distance and delivery rules on the server. Client-provided totals are not trusted.
- Added ready-time persistence/customer countdown, corrected dashboard revenue to include only non-refunded `paid`/`demo_paid` orders, and improved responsive/accessibility behavior in the product dialog.
- Added `.env.example`, `backend/.env.example`, `ADMIN_GUIDE.md`, `CHANGELOG.md`, and `QA_CHECKLIST.md`.

## Validation run

- Backend tests: **11 passed**.
- `npm run check-i18n`: **235 EN/FI keys; passed**.
- Targeted React exhaustive-deps lint: **passed with zero warnings**.
- `git diff --check`: **passed**.
- SQL parser: **54 migration statements and 7 conversion-script statements parsed**; PL/pgSQL grammar parser accepted 3 new migration bodies and 11 existing-schema bodies. Database execution remains unverified.
- Dev smoke: `/`, `/menu`, `/order`, `/admin` returned 200; `/api/auth/csrf` returned 200 via the Next rewrite.
- Typecheck was intentionally not run.

## Required before merge/release

- Apply/review the migrations in staging, seed/verify the clean-database conversion, and test role-authenticated CRUD against Supabase.
- Run backend `npm run security-check` against a reachable staging/local Supabase project. The attempt in this workspace stopped at `/api/health` because only placeholder Supabase credentials were available.
- Complete Stripe test-mode checkout/webhook, role/permission, promotion concurrency, delivery/geocoder, order timer and dashboard/report fixture checks.
- Perform actual browser/accessibility checks at 360 px, 768 px and 1280 px. Supabase/Stripe credentials were unavailable; temporary Chromium could not launch because NSS/NSPR shared libraries are missing in this sandbox. See `QA_CHECKLIST.md` for the step-by-step acceptance list.

## Migration / operational notes

- Existing seeded DBs are converted by the migration. For an empty database, apply migrations, load `supabase/seed.sql`, then execute `supabase/scripts/convert_legacy_menu_variants.sql` and review its output.
- Back up and review data before production migration. Legacy menu rows are archived, not physically deleted.
- Configure secrets only in server environment/Supabase: Supabase service key, exact origins, HTTPS cookies, geocoder and Stripe. Demo payments are development-only.
