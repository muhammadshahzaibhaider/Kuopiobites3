import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { CFG } from "./config";

mkdirSync(dirname(CFG.dbFile), { recursive: true, mode: 0o700 });
mkdirSync(CFG.uploadsDir, { recursive: true, mode: 0o700 });
export const db = new Database(CFG.dbFile);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.pragma("busy_timeout = 5000");

db.exec(`
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, en TEXT, sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY, cat TEXT NOT NULL, sort INTEGER NOT NULL DEFAULT 0, data TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS overrides (
  id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
  pass_hash TEXT NOT NULL, phone TEXT, addresses TEXT NOT NULL DEFAULT '[]',
  marketing INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL,
  email_verified INTEGER NOT NULL DEFAULT 1 CHECK (email_verified IN (0, 1))
);
CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, pass_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner','manager','kitchen'))
);
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY, user_id TEXT, created_at INTEGER NOT NULL, data TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS reservations (
  id TEXT PRIMARY KEY, created_at INTEGER NOT NULL, data TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS translations (
  lang TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL,
  PRIMARY KEY (lang, key)
);
CREATE TABLE IF NOT EXISTS activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL,
  who TEXT NOT NULL, role TEXT NOT NULL, msg TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS auth_attempts (
  key TEXT PRIMARY KEY, failures INTEGER NOT NULL, first_failed_at INTEGER NOT NULL,
  locked_until INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS email_tokens (
  token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at INTEGER NOT NULL,
  used_at INTEGER
);
CREATE TABLE IF NOT EXISTS stripe_events (
  event_id TEXT PRIMARY KEY, received_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  email TEXT PRIMARY KEY, subscribed_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_items_cat ON items(cat);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_email_tokens_user ON email_tokens(user_id);
`);

/* Existing local databases predate email confirmation. Existing accounts were
   created by the trusted seed/local app, so they remain verified; new users are
   inserted with email_verified=0. */
const userColumns = db.prepare(`PRAGMA table_info(users)`).all() as { name: string }[];
if (!userColumns.some((column) => column.name === "email_verified")) {
  db.exec(`ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 1`);
}

export const getJSON = <T>(table: "settings" | "overrides"): T => {
  const row = db.prepare(`SELECT data FROM ${table} WHERE id = 1`).get() as
    | { data: string }
    | undefined;
  return row ? (JSON.parse(row.data) as T) : (null as T);
};

export const setJSON = (table: "settings" | "overrides", value: unknown) => {
  db.prepare(
    `INSERT INTO ${table} (id, data) VALUES (1, ?)
     ON CONFLICT(id) DO UPDATE SET data = excluded.data`
  ).run(JSON.stringify(value));
};

/** Audit rows are append-only: there is deliberately no update/delete API. */
export function logActivity(who: string, role: string, msg: string) {
  db.prepare(`INSERT INTO activity (ts, who, role, msg) VALUES (?, ?, ?, ?)`).run(
    Date.now(), who.slice(0, 120), role.slice(0, 40), msg.slice(0, 500)
  );
}
