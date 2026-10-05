// Verifies SUPABASE-SETUP.md against a real PostgreSQL 17 server:
//  1. extracts every ```sql block WITHOUT the "✋ run by hand" marker, in document order (= the migration)
//  2. applies Supabase stand-ins (auth/storage/roles, no default grants) + the migration + seed.sql
//  3. tests the access matrix role by role, the way PostgREST runs requests (SET ROLE + JWT claims)
//
// usage: PGHOST=/tmp PGPORT=54329 node scripts/supabase-guide-check/run-checks.mjs
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const DOC = resolve(root, "SUPABASE-SETUP.md");
const conn = { host: process.env.PGHOST ?? "/tmp", port: +(process.env.PGPORT ?? 54329), user: "postgres" };

/* ── 1. extract SQL from the guide ─────────────────────────────────────── */
const md = readFileSync(DOC, "utf8");
const blocks = [...md.matchAll(/```sql\n([\s\S]*?)```/g)].map((m) => m[1]);
const migration = blocks.filter((b) => !b.trimStart().startsWith("-- ✋"));
const byHand = blocks.filter((b) => b.trimStart().startsWith("-- ✋"));
console.log(`guide: ${blocks.length} sql blocks → ${migration.length} migration, ${byHand.length} run-by-hand`);

/* ── 2. fresh database ─────────────────────────────────────────────────── */
const admin = new pg.Client({ ...conn, database: "postgres" });
await admin.connect();
await admin.query("drop database if exists kb_check with (force)");
for (const r of ["anon", "authenticated", "service_role", "authenticator", "supabase_auth_admin"]) {
  await admin.query(`do $$ begin if exists (select 1 from pg_roles where rolname = '${r}') then
    execute 'drop owned by ${r} cascade'; execute 'drop role ${r}'; end if; end $$`).catch(() => {});
}
await admin.query("create database kb_check");
await admin.end();

const c = new pg.Client({ ...conn, database: "kb_check" });
await c.connect();
await c.query(readFileSync(resolve(here, "supabase-stubs.sql"), "utf8"));
// the role Supabase Auth uses to insert into auth.users (only has rights on the auth schema)
await c.query(`create role supabase_auth_admin noinherit;
  grant usage on schema auth to supabase_auth_admin;
  grant select, insert, update, delete on auth.users, auth.identities to supabase_auth_admin;`);

let failures = 0, passes = 0;
const pass = (n) => { passes++; console.log("  ✔", n); };
const fail = (n, why) => { failures++; console.log("  ✘", n, "—", why); };

for (const [i, sql] of migration.entries()) {
  try { await c.query(sql); }
  catch (e) {
    fail(`migration block #${i + 1}`, `${e.message}\n----\n${sql.slice(0, 400)}`);
    process.exit(1);
  }
}
pass(`migration applied cleanly (${migration.length} blocks)`);

// seed.sql generated from the live SQLite data by the guide's own script
const seedPath = "/tmp/kb-seed-check.sql";
execFileSync("npx", ["tsx", "scripts/export-supabase-seed.ts", seedPath], { cwd: resolve(root, "backend"), stdio: "pipe" });
await c.query(readFileSync(seedPath, "utf8"));
const counts = (await c.query(`select
  (select count(*) from categories)::int cats, (select count(*) from menu_items)::int items,
  (select count(*) from toppings)::int tops, (select count(*) from item_toppings)::int itops,
  (select count(*) from todays_special)::int specials, (select count(*) from promotions)::int promos,
  (select count(*) from translation_strings)::int strings, (select vat_rate from shop_settings) vat`)).rows[0];
counts.cats === 30 && counts.items === 175 && counts.tops === 26 && counts.strings === 215
  ? pass(`seed loaded: ${JSON.stringify(counts)}`) : fail("seed counts", JSON.stringify(counts));

/* ── helpers: run SQL as a role with JWT claims, like PostgREST ────────── */
const U = {}; // uuids by name
async function as(role, who, sql, params = []) {
  await c.query("begin");
  try {
    const claims = who ? { sub: U[who], role } : { role };
    await c.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)]);
    await c.query(`set local role ${role}`);
    const r = await c.query(sql, params.map((p) => (p && typeof p === "object" ? JSON.stringify(p) : p)));
    await c.query("commit");
    return r;
  } catch (e) { await c.query("rollback"); throw e; }
}
async function ok(name, role, who, sql, check, params) {
  try {
    const r = await as(role, who, sql, params);
    const verdict = check ? check(r) : true;
    verdict === true ? pass(name) : fail(name, verdict || `unexpected result ${JSON.stringify(r.rows).slice(0, 200)}`);
  } catch (e) { fail(name, "error: " + e.message); }
}
async function denied(name, role, who, sql, pattern = /permission denied|row-level security|violates/, params) {
  try { const r = await as(role, who, sql, params); fail(name, `expected an error, got ${r.rowCount} row(s)`); }
  catch (e) { pattern.test(e.message) ? pass(`${name}  [${e.message.slice(0, 70)}]`) : fail(name, "wrong error: " + e.message); }
}
const rows = (n) => (r) => r.rowCount === n || `expected ${n} row(s), got ${r.rowCount}`;
const val = (f, want) => (r) => (r.rows[0]?.[f] === want) || `expected ${f}=${JSON.stringify(want)}, got ${JSON.stringify(r.rows[0]?.[f])}`;

/* ── 3a. accounts via the signup trigger ───────────────────────────────── */
console.log("\nauth trigger");
async function signup(name, email, appMeta = {}, userMeta = {}, identity = null) {
  await c.query("set role supabase_auth_admin");
  const r = await c.query(
    `insert into auth.users (email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
     values ($1, $2, $3, $4) returning id`,
    [email, identity?.provider === "google" ? new Date() : null, appMeta, userMeta]);
  U[name] = r.rows[0].id;
  if (identity) {
    await c.query(
      `insert into auth.identities (user_id, provider_id, provider, identity_data, last_sign_in_at)
       values ($1, $2, $3, $4, now())`,
      [U[name], identity.providerId, identity.provider, identity.data ?? { email, email_verified: true }]);
  }
  await c.query("reset role");
}
await signup("owner", "owner@kuopiobites.fi", { kb_staff: true });
await signup("manager", "manager@kuopiobites.fi", { kb_staff: true });
await signup("kitchen", "kitchen@kuopiobites.fi", { kb_staff: true });
await signup("A", "testi@example.com", {}, { name: "Testi A", phone: "0401234567" });
await signup("B", "b@example.com", {}, { name: "Asiakas B" });
await signup("faker", "faker@example.com", {}, { kb_staff: true, name: "Faker" }); // user_metadata can't opt out
const prof = (await c.query("select id, name, email, phone from customers order by name")).rows;
prof.length === 3 && prof.some((p) => p.name === "Testi A" && p.email === "testi@example.com" && p.phone === "0401234567") && prof.some((p) => p.name === "Faker")
  ? pass("customers rows created for A, B and the faker; none for staff (app_metadata.kb_staff)")
  : fail("signup trigger", JSON.stringify(prof));
await c.query(`insert into staff_users (id, username, name, role) values
  ($1,'admin','Omistaja','owner'), ($2,'manager','Vuoropäällikkö','manager'), ($3,'kitchen','Keittiö','kitchen')`,
  [U.owner, U.manager, U.kitchen]);

/* ── 3b. orders through create_order (backend path) ────────────────────── */
console.log("\nbackend path (service_role)");
const vat = (t) => Math.round(t * 0.135 / 1.135 * 100) / 100;
const order = (id, cust, extra = {}) => ({
  id, customer_id: U[cust], type: "pickup", subtotal: 26, delivery_fee: 0, discount: 0, vat: vat(26), total: 26,
  payment_ref: "pi_test", contact_name: cust === "A" ? "Testi A" : "Asiakas B", contact_phone: "0401234567",
  contact_email: cust === "A" ? "testi@example.com" : "b@example.com", note: "soita ovikello", ...extra });
const line = (extra = {}) => ({ menu_item_id: "kebab-68", item_name_snapshot: "Pitaleivällä Kebab", variant_label: "",
  options: [], quantity: 2, unit_price: 13, line_price: 26, note: "ei sipulia", ...extra });
await ok("create_order (A, with Helsinki pre-order time)", "service_role", null,
  "select * from create_order($1, $2)",
  (r) => (r.rows[0].id === "KB-AAAAAA" && new Date(r.rows[0].scheduled_for).toISOString() === "2026-10-04T08:00:00.000Z") || JSON.stringify(r.rows[0]),
  [order("KB-AAAAAA", "A", { scheduled_for: "2026-10-04 11:00 Europe/Helsinki" }), [line()]]);
await ok("create_order (B)", "service_role", null, "select * from create_order($1, $2)", rows(1),
  [order("KB-BBBBBB", "B"), [line({ note: null })]]);
await denied("bad total rejected by the check constraint", "service_role", null, "select * from create_order($1, $2)",
  /orders_check|violates check/, [order("KB-BAD001", "A", { total: 1 }), [line()]]);
await denied("bad line_price rejected", "service_role", null, "select * from create_order($1, $2)",
  /order_items_check|violates check/, [order("KB-BAD002", "A"), [line({ line_price: 2 })]]);
await c.query(`insert into promotions (id, code, discount_type, discount_value, usage_limit, used_count, title_fi, title_en)
  values ('promo-once', 'KERRAN', 'fixed', 2, 1, 0, 'Kerran', 'Once')`);
await ok("promo redeemed atomically (used_count 0 → 1)", "service_role", null, "select * from create_order($1, $2)", rows(1),
  [order("KB-PROMO1", "A", { discount: 2, discount_title: "Once", offer_id: "promo-once", subtotal: 26, total: 24, vat: vat(24) }), [line()]]);
await denied("exhausted promo → whole order rolled back", "service_role", null, "select * from create_order($1, $2)",
  /order.promoUnavailable/, [order("KB-PROMO2", "A", { discount: 2, offer_id: "promo-once", total: 24, vat: vat(24) }), [line()]]);
const p2 = (await c.query("select count(*)::int n from orders where id = 'KB-PROMO2'")).rows[0].n;
const used = (await c.query("select used_count from promotions where id = 'promo-once'")).rows[0].used_count;
p2 === 0 && used === 1 ? pass("no half order left behind; used_count still 1") : fail("atomicity", `orders=${p2} used=${used}`);
const auditBefore = (await c.query("select count(*)::int n from activity_log")).rows[0].n;
auditBefore === 0 ? pass("backend writes are not double-logged by the trigger") : fail("trigger skip", `${auditBefore} rows`);
await signup("G", "google@example.com", { provider: "google", providers: ["google"] },
  { full_name: "Google Testi", name: "Google Testi", email: "google@example.com", email_verified: true },
  { provider: "google", providerId: "google-sub-1", data: { sub: "google-sub-1", email: "google@example.com", full_name: "Google Testi", email_verified: true } });
const googleProfile = (await c.query("select name, email from customers where id = $1", [U.G])).rows[0];
const googleAudit = (await c.query(`select action, actor_role, target_id, details
  from activity_log where target_id = $1::text and action = 'auth.google.first_sign_in'`, [U.G])).rows[0];
googleProfile?.name === "Google Testi" && googleProfile.email === "google@example.com" &&
  googleAudit?.actor_role === "customer" && googleAudit.details?.provider === "google" && googleAudit.details?.email_verified === true
  ? pass("Google signup copies full_name + verified Auth email and appends one audit event")
  : fail("Google signup/identity trigger", JSON.stringify({ googleProfile, googleAudit }));
await c.query("set role supabase_auth_admin");
await c.query(`insert into auth.identities (user_id, provider_id, provider, identity_data, last_sign_in_at)
  values ($1, 'google-sub-b', 'google', $2, now())`,
  [U.B, { sub: "google-sub-b", email: "b@example.com", full_name: "Google B", email_verified: true }]);
await c.query("reset role");
const linkedB = (await c.query("select count(*)::int n from customers where id = $1", [U.B])).rows[0].n;
linkedB === 1 ? pass("linking Google to password user keeps the same customer id") : fail("identity linking", `customers=${linkedB}`);
await c.query(`insert into reservations (id, customer_id, date, time, party_size, contact_name, contact_phone, contact_email) values
  ('R-A00001', $1, '2026-10-10', '18:00', 4, 'Testi A', '0401234567', 'testi@example.com'),
  ('R-GUEST1', null, '2026-10-11', '19:00', 2, 'Testi A', '0401234567', 'TESTI@example.com'),
  ('R-OTHER1', null, '2026-10-12', '12:00', 3, 'Joku Muu', '0409999999', 'muu@example.com')`, [U.A]);

/* ── 3c. anon (publishable key, nobody signed in) ──────────────────────── */
console.log("\nanon");
await ok("reads the menu (175 items)", "anon", null, "select id from menu_items", rows(175));
await ok("reads shop settings", "anon", null, "select vat_rate, min_order from shop_settings", rows(1));
await denied("cannot insert menu items", "anon", null, "insert into menu_items (id, category_id, name_fi, price_med) values ('x','kebab','x',1)");
await denied("cannot read orders", "anon", null, "select * from orders");
await denied("cannot read customers", "anon", null, "select * from customers");
await denied("cannot read promotions", "anon", null, "select * from promotions");
await denied("cannot insert reservations directly", "anon", null, "insert into reservations (id, date, time, party_size, contact_name, contact_phone) values ('R-X','2026-10-10','18:00',2,'x','1')");
await denied("cannot pause the shop", "anon", null, "update shop_settings set paused = true");
await denied("cannot call create_order", "anon", null, "select create_order('{}'::jsonb, '[]'::jsonb)");
await denied("cannot call gdpr_export", "anon", null, `select gdpr_export('${"0".repeat(8)}-0000-0000-0000-000000000000')`);

/* ── 3d. customer A ────────────────────────────────────────────────────── */
console.log("\ncustomer");
await ok("sees only own orders (2 of 3)", "authenticated", "A", "select id from orders", (r) => r.rows.every((x) => x.id !== "KB-BBBBBB") && r.rowCount === 2 || JSON.stringify(r.rows));
await ok("sees only own order lines", "authenticated", "A", "select order_id from order_items", (r) => r.rows.every((x) => x.order_id !== "KB-BBBBBB") && r.rowCount === 2 || JSON.stringify(r.rows));
await ok("sees only own profile", "authenticated", "A", "select id from customers", rows(1));
await ok("sees own reservation only (not guest rows)", "authenticated", "A", "select id from reservations", rows(1));
const t0 = (await c.query("select consent_updated_at from customers where id = $1", [U.A])).rows[0].consent_updated_at;
await ok("updates own profile + marketing consent", "authenticated", "A",
  "update customers set name = 'Testi Asiakas', marketing_consent = true where id = auth.uid() returning name", rows(1));
const t1 = (await c.query("select consent_updated_at, updated_at from customers where id = $1", [U.A])).rows[0];
t1.consent_updated_at > t0 ? pass("consent_updated_at stamped on consent change") : fail("consent stamp", `${t0} → ${t1.consent_updated_at}`);
await ok("cannot touch another customer's profile (0 rows)", "authenticated", "A", "update customers set name = 'hacked' where id = $1", rows(0), [U.B]);
await denied("cannot change protected profile columns", "authenticated", "A", "update customers set created_at = now() where id = auth.uid()");
await denied("cannot insert an order directly (no repricing bypass)", "authenticated", "A",
  "insert into orders (id, customer_id, type, subtotal, vat, total, contact_name) values ('KB-FAKE01', auth.uid(), 'pickup', 0, 0, 0, 'x')");
await ok("cannot move an order's status (0 rows)", "authenticated", "A", "update orders set status = 'completed' where id = 'KB-AAAAAA'", rows(0));
await denied("cannot change an order total", "authenticated", "A", "update orders set total = 0 where id = 'KB-AAAAAA'");
await ok("menu update affects 0 rows", "authenticated", "A", "update menu_items set price_med = 0 where id = 'kebab-68'", rows(0));
await ok("sees no staff, audit or promotions", "authenticated", "A",
  "select (select count(*) from staff_users)::int s, (select count(*) from activity_log)::int a, (select count(*) from promotions)::int p",
  (r) => (r.rows[0].s + r.rows[0].a + r.rows[0].p === 0) || JSON.stringify(r.rows[0]));
await denied("cannot call gdpr_export for someone else (IDOR)", "authenticated", "A", "select gdpr_export($1)", undefined, [U.B]);
await denied("cannot insert reservations directly", "authenticated", "A",
  "insert into reservations (id, customer_id, date, time, party_size, contact_name, contact_phone) values ('R-X', auth.uid(), '2026-10-10','18:00',2,'x','1')");
await denied("cannot write the audit log", "authenticated", "A", "insert into activity_log (actor_name, actor_role, action) values ('x','owner','fake')");

/* ── 3e. kitchen ───────────────────────────────────────────────────────── */
console.log("\nkitchen");
await ok("sees all orders", "authenticated", "kitchen", "select id from orders", rows(3));
await ok("moves an order to 'preparing'", "authenticated", "kitchen", "update orders set status = 'preparing' where id = 'KB-AAAAAA'", rows(1));
const a1 = (await c.query("select * from activity_log order by id desc limit 1")).rows[0];
a1 && a1.actor_name === "kitchen" && a1.action === "orders.update" && a1.details?.changes?.status?.to === "preparing" && !JSON.stringify(a1.details).includes("0401234567")
  ? pass(`direct write audited by trigger: ${a1.action} ${JSON.stringify(a1.details)}`) : fail("audit trigger", JSON.stringify(a1));
await denied("cannot refund (payment_status)", "authenticated", "kitchen", "update orders set payment_status = 'refunded' where id = 'KB-AAAAAA'");
await ok("cannot edit menu prices (0 rows)", "authenticated", "kitchen", "update menu_items set price_med = 1 where id = 'kebab-68'", rows(0));
await ok("sees no customers, staff list or audit log", "authenticated", "kitchen",
  "select (select count(*) from customers)::int c, (select count(*) from staff_users)::int s, (select count(*) from activity_log)::int a",
  (r) => (r.rows[0].c + r.rows[0].s + r.rows[0].a === 0) || JSON.stringify(r.rows[0]));
await ok("accepts a reservation", "authenticated", "kitchen", "update reservations set status = 'accepted' where id = 'R-GUEST1'", rows(1));
await denied("cannot upload menu photos", "authenticated", "kitchen", "insert into storage.objects (bucket_id, name) values ('menu-images', 'items/x.webp')");
await ok("sees no promotions", "authenticated", "kitchen", "select id from promotions", rows(0));
await ok("cannot update a customer profile (0 rows)", "authenticated", "kitchen", "update customers set name = 'x' where id = $1", rows(0), [U.B]);

/* ── 3f. manager ───────────────────────────────────────────────────────── */
console.log("\nmanager");
await ok("changes a price (kebab-68 13 → 13.50)", "authenticated", "manager", "update menu_items set price_med = 13.50 where id = 'kebab-68'", rows(1));
const a2 = (await c.query("select * from activity_log order by id desc limit 1")).rows[0];
a2?.details?.changes?.price_med?.from === 13 && a2.details.changes.price_med.to === 13.5 && a2.actor_role === "manager"
  ? pass(`price change audited: ${JSON.stringify(a2.details.changes)}`) : fail("price audit", JSON.stringify(a2));
await ok("reads the audit log", "authenticated", "manager", "select id from activity_log", (r) => r.rowCount >= 2 || `got ${r.rowCount}`);
await ok("reads all customers", "authenticated", "manager", "select id from customers", rows(4));
await ok("reads promotions", "authenticated", "manager", "select id from promotions", (r) => r.rowCount >= 2 || `got ${r.rowCount}`);
await ok("reads the staff list", "authenticated", "manager", "select id from staff_users", rows(3));
await ok("cannot update a customer profile (0 rows)", "authenticated", "manager", "update customers set name = 'x' where id = $1", rows(0), [U.B]);
await ok("cannot promote self to owner (0 rows)", "authenticated", "manager", "update staff_users set role = 'owner' where id = auth.uid()", rows(0));
await denied("cannot add staff", "authenticated", "manager", "insert into staff_users (id, username, name, role) values (gen_random_uuid(), 'x', 'x', 'owner')");
await ok("pauses the shop", "authenticated", "manager", "update shop_settings set paused = true", rows(1));
await ok("uploads a menu photo", "authenticated", "manager", "insert into storage.objects (bucket_id, name) values ('menu-images', 'items/kebab-68-1.webp')", rows(1));
await denied("cannot delete audit rows", "authenticated", "manager", "delete from activity_log");

/* ── 3g. owner ─────────────────────────────────────────────────────────── */
console.log("\nowner");
const s0 = (await c.query("select updated_at from staff_users where id = $1", [U.kitchen])).rows[0].updated_at;
await ok("changes a staff member's name", "authenticated", "owner", "update staff_users set name = 'Keittiö 1' where id = $1", rows(1), [U.kitchen]);
const s1 = (await c.query("select updated_at from staff_users where id = $1", [U.kitchen])).rows[0].updated_at;
s1 > s0 ? pass("staff_users.updated_at maintained by trigger") : fail("updated_at", `${s0} → ${s1}`);
await ok("edits the menu (kebab-68 back to 13.00)", "authenticated", "owner", "update menu_items set price_med = 13.00 where id = 'kebab-68'", rows(1));
await ok("reads the audit log", "authenticated", "owner", "select id from activity_log", (r) => r.rowCount >= 3 || `got ${r.rowCount}`);
await denied("audit log is append-only even for the secret key", "service_role", null, "delete from activity_log", /append-only/);
await denied("…and for UPDATE", "service_role", null, "update activity_log set action = 'x'", /append-only/);
try { await c.query("truncate activity_log"); fail("truncate", "allowed"); } catch (e) { /append-only/.test(e.message) ? pass("…and TRUNCATE (even as postgres)") : fail("truncate", e.message); }
try { await c.query("delete from auth.users where id = $1", [U.kitchen]); fail("offboarding protection", "staff with audit rows was deleted"); }
catch (e) { /activity_log/.test(e.message) ? pass("staff with audit history can't be deleted (deactivate instead)") : fail("offboarding", e.message); }

/* ── 3h. storage + realtime ────────────────────────────────────────────── */
console.log("\nstorage / realtime");
const b = (await c.query("select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'menu-images'")).rows[0];
b?.public === true && +b.file_size_limit === 5242880 ? pass("bucket menu-images: public, 5 MB, " + b.allowed_mime_types) : fail("bucket", JSON.stringify(b));
await denied("anon cannot upload", "anon", null, "insert into storage.objects (bucket_id, name) values ('menu-images', 'x.webp')");
await denied("customer cannot upload", "authenticated", "A", "insert into storage.objects (bucket_id, name) values ('menu-images', 'x.webp')");
const pub = (await c.query("select tablename from pg_publication_tables where pubname = 'supabase_realtime'")).rows.map((r) => r.tablename);
pub.includes("orders") ? pass("orders published to supabase_realtime") : fail("realtime", JSON.stringify(pub));
const rls = (await c.query("select tablename from pg_tables where schemaname = 'public' and not rowsecurity")).rows;
const nt = (await c.query("select count(*)::int n from pg_tables where schemaname = 'public'")).rows[0].n;
rls.length === 0 ? pass(`RLS enabled on all ${nt} public tables`) : fail("RLS", JSON.stringify(rls));

/* ── 3i. GDPR ──────────────────────────────────────────────────────────── */
console.log("\nGDPR");
await ok("Google-linked export includes the Auth identity", "service_role", null, "select gdpr_export($1) j",
  (r) => { const j = r.rows[0].j; return (j.account.email === "google@example.com" && j.profile.email === "google@example.com" &&
    j.auth_identities.length === 1 && j.auth_identities[0].provider === "google") || JSON.stringify(j).slice(0, 400); }, [U.G]);
await ok("Google-linked erase removes public profile", "service_role", null, "select gdpr_erase($1) j",
  (r) => (r.rows[0].j.orders_anonymized === 0 && r.rows[0].j.reservations_deleted === 0) || JSON.stringify(r.rows[0].j), [U.G]);
try { await c.query("delete from auth.users where id = $1", [U.G]);
  const n = (await c.query("select count(*)::int n from auth.identities where user_id = $1", [U.G])).rows[0].n;
  n === 0 ? pass("Auth delete after Google erase cascades the Google identity") : fail("Google Auth identity delete", `identities=${n}`);
} catch (e) { fail("Google Auth delete after erase", e.message); }
await ok("Google export after erase is empty", "service_role", null, "select gdpr_export($1) j",
  (r) => (r.rows[0].j.profile === null && r.rows[0].j.auth_identities.length === 0) || JSON.stringify(r.rows[0].j), [U.G]);
await ok("export (A): profile, 2 orders with lines, own + guest reservation", "service_role", null, "select gdpr_export($1) j",
  (r) => { const j = r.rows[0].j; return (j.account.email === "testi@example.com" && j.profile.name === "Testi Asiakas" &&
    j.orders.length === 2 && j.orders[0].items.length === 1 && j.reservations.length === 2) || JSON.stringify(j).slice(0, 300); }, [U.A]);
await ok("erase (A)", "service_role", null, "select gdpr_erase($1) j",
  (r) => (r.rows[0].j.orders_anonymized === 2 && r.rows[0].j.reservations_deleted === 2) || JSON.stringify(r.rows[0].j), [U.A]);
const left = (await c.query(`select
  (select count(*) from customers where id = $1)::int prof,
  (select count(*) from orders where contact_name = 'Poistettu asiakas' and customer_id is null and contact_phone is null and contact_email is null and note is null)::int anon_orders,
  (select sum(total) from orders where id in ('KB-AAAAAA','KB-PROMO1')) kept_total,
  (select count(*) from order_items where order_id in ('KB-AAAAAA','KB-PROMO1') and note is not null)::int notes,
  (select count(*) from reservations where id in ('R-A00001','R-GUEST1'))::int resv,
  (select count(*) from reservations where id = 'R-OTHER1')::int other`, [U.A])).rows[0];
left.prof === 0 && left.anon_orders === 2 && +left.kept_total === 50 && left.notes === 0 && left.resv === 0 && left.other === 1
  ? pass(`after erase: profile gone, orders anonymized (€${left.kept_total} kept for bookkeeping), notes cleared, other guests untouched`)
  : fail("erase result", JSON.stringify(left));
try { await c.query("delete from auth.users where id = $1", [U.A]); pass("Auth user deletable after erase (Admin API step)"); }
catch (e) { fail("auth delete after erase", e.message); }
await ok("export after erase is empty", "service_role", null, "select gdpr_export($1) j",
  (r) => (r.rows[0].j.profile === null && r.rows[0].j.orders.length === 0) || JSON.stringify(r.rows[0].j), [U.A]);

/* ── 3j. run-by-hand blocks are valid SQL too ──────────────────────────── */
console.log("\nrun-by-hand blocks");
for (const [i, sql] of byHand.entries()) {
  await c.query("begin");
  try {
    const runnable = sql
      .replace(/'00000000-0000-0000-0000-000000000000'/g, `'${U.B}'`)
      .replace(/owner@kuopiobites\.fi/g, "b@example.com")           // convert customer B instead of the real owner
      .replace("'admin', 'Omistaja', 'owner'", "'admin2', 'Omistaja', 'owner'");
    await c.query(runnable);
    pass(`✋ block #${i + 1} executes (${sql.split("\n")[0].replace("-- ✋ run by hand: ", "").slice(0, 60)})`);
  } catch (e) { fail(`✋ block #${i + 1}`, e.message); }
  await c.query("rollback").catch(() => {});
}

await c.end();
console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
