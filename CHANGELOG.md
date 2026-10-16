# Changelog

## Unreleased — admin, catalog and checkout overhaul

- Replaced the active root app's local-only admin data path with authenticated same-origin API calls backed by Supabase; added server-side role checks, strict schemas, audit events, and manager/kitchen settings-field allowlists.
- Added DB-backed product/category editing, variants, option groups, topping links, availability, item archive/restore, and a dedicated off-menu workflow. Added bilingual promotion CRUD and DB-backed delivery rules with server-side geocoding, distance evaluation, and sample preview.
- Added server-priced cart preview and checkout, live-catalog promotion scope, server-side minimum-order validation, and paid/non-refunded dashboard revenue filtering.
- Added preparation ready-time persistence and customer tracking countdown; dashboard pause/resume feedback now waits for the settings save.
- Added additive Supabase schema migration and an idempotent legacy conversion for Biryani and Samosa variants. Source catalog rows are archived rather than physically removed; order snapshots remain unchanged.
- Improved item dialog keyboard/focus behavior, mobile padding, horizontal overflow handling and sticky actions; added bilingual close text. Added root and backend environment examples plus the admin guide and QA checklist.
- Added backend tests for pricing/toppings, promotion validation/scope, delivery rules/distance, settings role allowlists and revenue eligibility.

## Validation

- Backend unit suite: **11 passed**.
- EN/FI key parity: **235 keys; passed**.
- React `exhaustive-deps` lint: **passed with no warnings** using a temporary, no-save ESLint configuration.
- `git diff --check`: **passed**.
- SQL parser: migration **54 statements** and legacy conversion script **7 statements** parsed; PL/pgSQL grammar parser accepted the **3 new migration bodies** and **11 existing-schema bodies**. No database execution/schema-compatibility validation was possible.
- Dev smoke: `/`, `/menu`, `/order`, `/admin` returned HTTP 200; same-origin `/api/auth/csrf` returned HTTP 200 through the Next rewrite.
- Not verified: applying migrations to Supabase, role/CRUD/pricing/order e2e against a real DB, live Stripe checkout, or visual viewport checks at 360/768/1280 px. No Supabase/Stripe credentials were available, and temporary Chromium could not launch because NSS/NSPR shared libraries are missing from the sandbox. See `QA_CHECKLIST.md` for blockers and run steps.
