import bcrypt from "bcryptjs";
import { db, setJSON, logActivity } from "./db";
import { CATEGORIES, MENU } from "./lib/menu";
import { DEFAULT_SETTINGS } from "./lib/hours";
import { EN, FI } from "./lib/strings";

/* idempotent seed: wipes and reloads base data (keeps orders/reservations/users) */
db.exec(`DELETE FROM categories; DELETE FROM items; DELETE FROM translations; DELETE FROM staff;`);

const insCat = db.prepare(`INSERT INTO categories (id, title, en, sort) VALUES (?, ?, ?, ?)`);
CATEGORIES.forEach((c, i) => insCat.run(c.id, c.title, c.en ?? null, i));

const orderIdx = new Map<string, number>();
MENU.forEach((m) => orderIdx.set(m.id, (orderIdx.get(m.cat) ?? -1) + 1));
const insItem = db.prepare(`INSERT INTO items (id, cat, sort, data) VALUES (?, ?, ?, ?)`);
for (const m of MENU) insItem.run(m.id, m.cat, orderIdx.get(m.id)!, JSON.stringify(m));

setJSON("settings", DEFAULT_SETTINGS);
setJSON("overrides", { items: {}, order: {} });

const insTr = db.prepare(
  `INSERT INTO translations (lang, key, value) VALUES (?, ?, ?)
   ON CONFLICT(lang, key) DO UPDATE SET value = excluded.value`
);
for (const [k, v] of Object.entries(EN)) insTr.run("en", k, v);
for (const [k, v] of Object.entries(FI)) insTr.run("fi", k, v);

const insStaff = db.prepare(`INSERT INTO staff (id, username, pass_hash, role) VALUES (?, ?, ?, ?)`);
/* demo staff — change these credentials in production (documented in API.md) */
for (const [username, role] of [
  ["admin", "owner"],
  ["manager", "manager"],
  ["kitchen", "kitchen"],
] as const) {
  insStaff.run("st-" + username, username, bcrypt.hashSync("kuopio2026", 10), role);
}

logActivity("seed", "system", "database seeded (categories, items, settings, translations, staff)");
console.log(
  `seeded: ${CATEGORIES.length} categories, ${MENU.length} items, ${Object.keys(EN).length} en + ${Object.keys(FI).length} fi strings, 3 staff`
);
