# Admin operations guide / Hallinnan käyttöohje

This guide covers the database-backed admin features in the root Next.js app. The browser uses the same-origin `/api` proxy; the Express backend and Supabase are authoritative for catalog data, permissions, prices, settings, offers, delivery fees and orders.

## Deployment and first-time setup / Käyttöönotto

1. Back up the Supabase project and apply the repository migrations in timestamp order, including `supabase/migrations/20261016000000_admin_overhaul.sql`. Do not apply the migration to a production project without reviewing its SQL and the data changes first.
2. For an existing seeded database, the migration converts the legacy Biryani and Samosa rows and archives the former rows instead of deleting them. For a new/empty database, apply migrations, load `supabase/seed.sql`, then run `supabase/scripts/convert_legacy_menu_variants.sql` once. That script is safe to re-run; inspect its final review queries before opening the public menu.
3. Copy root `.env.example` to `.env.local` and `backend/.env.example` to `backend/.env`. Set the real `SUPABASE_URL` and server-only `SUPABASE_SERVICE_ROLE_KEY`; set exact `CORS_ORIGINS`, `PUBLIC_WEB_URL`, and `PUBLIC_API_URL`. Never put a Supabase service key in a `NEXT_PUBLIC_*` variable or in the browser.
4. In production, set `COOKIE_SECURE=true`, use HTTPS origins, configure Stripe keys and webhook URL if taking live payments, and set an appropriate server-side delivery geocoder endpoint/user-agent. Configure Supabase Auth email/SMTP in Supabase, not in the application env file. `ALLOW_DEMO_PAYMENTS` is for local development only and is rejected in production.
5. Bootstrap the first owner in Supabase Auth, then add the matching Auth user ID to `public.staff_users` with an owner role (SQL Editor example below). After that, owners can invite/manage staff from Admin → Staff. Do not use the legacy SQLite `backend/src/seed.ts` for Supabase production data.

```sql
-- Replace the email, username, and display name with the verified owner account.
insert into public.staff_users (id, username, name, role, active)
select id, 'owner', 'Restaurant Owner', 'owner', true
from auth.users
where lower(email) = lower('owner@example.com')
on conflict (id) do update
set username = excluded.username, name = excluded.name, role = 'owner', active = true;
```

## Roles / Käyttäjäroolit

- **Kitchen**: view orders/reservations, update order status and preparation estimate, and toggle item availability/off-menu status. Kitchen settings writes are restricted to availability fields.
- **Manager**: kitchen permissions plus catalog/category editing, promotions, delivery rules and preview, reports, refunds, and the allowlisted operational settings. Manager requests cannot change owner-only settings.
- **Owner**: all manager permissions plus staff administration, customer deletion, and unrestricted validated settings.

The backend reads the current role from `staff_users` on every protected request. The UI is not the security boundary; role checks and schema validation happen on the API. Deactivate staff to remove access, and keep at least one active owner.

## Everyday admin flows / Päivittäiset toiminnot

### Menu, variants, options and archive

- Admin → Menu lists active and archived items. Search, category/availability filters, sorting and pagination work against the API-loaded catalog.
- Create/edit products with English and Finnish names, descriptions, labels, variants, option groups, weights, topping selections, availability windows and images. The public menu consumes the saved catalog without a code deploy.
- Variant internal keys must be unique for multi-variant products. Option-group exact/min/max rules are checked by the backend; checkout reprices every selected option from the current database configuration.
- Use **Archive** to remove an item/category from the public menu while retaining its row and historical order snapshots. **Restore** reactivates it. Prefer archive/deactivate over physical deletion.
- Off-menu/availability changes are API-backed. Use the Off-menu view to find unavailable items, filter them, and restore them quickly.
- The Biryani keeper is `specials-3`; the Samosa keeper is `specials-6`. Former IDs remain archived, so old orders remain readable. Do not reuse the legacy source IDs for unrelated products.

### Promotions

- Enter bilingual titles and configure a percent/fixed/free-delivery offer, optional item/category scope, date window, code, priority and use limit.
- The API rejects invalid values, reversed dates, missing targets, unsupported scope combinations and client-supplied usage counters. Usage counts are kept by the database and are not reset when another settings field is saved.
- Discount eligibility is calculated against the live database catalog. The server caps fixed discounts to the eligible scoped lines; the browser's estimate is informational only.

### Delivery rules and pricing preview

- Configure the restaurant's delivery origin and existing radius in Settings, and configure the backend geocoder. A customer delivery address is geocoded server-side and distance is calculated server-side; an address outside the configured radius is rejected.
- In Delivery rules, set distance, item-subtotal and/or order-weight ranges, outcome, active days/date/time, priority and whether lower-priority rules may stack. Rule writes require manager/owner permission and are validated by the API.
- Use **Server-side preview** with sample distance, weight and subtotal to see the server-evaluated rule and fee. It is not a substitute for checkout verification against a geocoded address.
- The customer checkout first requests a debounced server price preview and then submits to the checkout endpoint. Checkout reloads the current catalog/settings and recalculates item prices, discounts, delivery fee and total; client totals are never authoritative. Minimum-order checks are applied to the repriced item subtotal.

### Orders, preparation estimates and reports

- Kitchen staff can advance paid/demo-paid order status and set or adjust a ready-time estimate. The estimated timestamp and optional customer note are persisted in the database; the customer tracking page refreshes status and displays a live countdown until the order is ready/completed.
- Dashboard revenue and reports count only `paid` and `demo_paid` orders and exclude refunded orders. Pending/unpaid orders remain visible in the operational queue but do not contribute to revenue.
- Refunds require manager/owner permission. Keep order snapshots intact; archive catalog rows instead of deleting them.

## Support checklist / Tukilista

- If a save fails, confirm the staff role, API health, Supabase connectivity and required database migration. The UI rolls back an optimistic settings change and displays a failure message instead of showing a false success.
- If catalog edits save but are not visible publicly, check that the item/category is active and not archived or off-menu, then refresh the catalog. No frontend rebuild is needed for DB-backed changes.
- If delivery pricing cannot be previewed, check restaurant coordinates, the geocoder environment values, delivery radius and active rules. The checkout deliberately fails closed when required delivery distance cannot be verified.
- For deployment acceptance tests, follow `QA_CHECKLIST.md`. Database migration execution and real checkout must be tested in a non-production Supabase/Stripe environment before release.

---

## Suomenkielinen yhteenveto

### Käyttöönotto

- Ota varmuuskopio ennen migraatioita ja suorita Supabase-migraatiot aikajärjestyksessä. Tyhjään tietokantaan lisätään ensin migraatiot ja `supabase/seed.sql`; sen jälkeen suoritetaan `supabase/scripts/convert_legacy_menu_variants.sql`. Olemassa olevassa tietokannassa migraatio arkistoi vanhat Biryani- ja Samosa-tuoterivit poistamatta niitä.
- Kopioi `.env.example` tiedostoon `.env.local` ja `backend/.env.example` tiedostoon `backend/.env`. Lisää oikeat Supabase-osoite ja palvelinavain sekä tarkat verkkotunnukset. Palvelinavainta ei saa lisätä selaimelle näkyvään `NEXT_PUBLIC_*`-muuttujaan.
- Luo ensimmäinen omistaja Supabase Authissa ja lisää sama käyttäjätunnus `public.staff_users`-tauluun yllä olevalla SQL-esimerkillä. Omistaja voi tämän jälkeen lisätä henkilöstön Hallinta → Henkilöstö -näkymässä.

### Roolit ja käyttö

- **Keittiö** käsittelee tilauksia, valmistumisaikoja ja tuotteiden saatavuutta.
- **Päällikkö** hallitsee tuotteita, kategorioita, tarjouksia, toimitussääntöjä ja raportteja.
- **Omistaja** hallitsee lisäksi henkilöstöä ja kaikkia asetuksia. Palvelin tarkistaa roolin ja syötteet jokaisessa kirjoituspyynnössä.
- Tallenna tuotteille nimet ja vaihtoehdot molemmilla kielillä. Käytä arkistointia fyysisen poistamisen sijaan, jotta tilaushistoria säilyy.
- Tarjousten, toimitusmaksujen, alennusten ja tilausten loppusummien lähde on palvelin ja tietokanta. Esikatselu on informatiivinen; kassa laskee hinnan uudelleen.
- Hallintaraporttien liikevaihto sisältää vain maksetut (`paid` ja `demo_paid`) tilaukset ja jättää hyvitetyt tilaukset pois.
- Ennen julkaisua käy läpi `QA_CHECKLIST.md` ja testaa migraatiot sekä Stripe-osto testiympäristössä.
