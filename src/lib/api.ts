/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  API STUB LAYER
 *  Every function below simulates a network call (latency + async signature)
 *  and persists to localStorage so the whole product works end-to-end today.
 *  Each stub is annotated with the real endpoint it should be swapped for —
 *  the UI only talks to these functions, so wiring a real backend later means
 *  replacing the bodies here, not restructuring any components.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { sleep, uid } from "./format";
import type { Order, Reservation, Settings, User, Overrides } from "./types";

const K = {
  orders: "kb_orders",
  reservations: "kb_reservations",
  users: "kb_users",
  session: "kb_session",
  sessionEphemeral: "kb_session_ephemeral",
  resets: "kb_password_resets",
  settings: "kb_settings",
  overrides: "kb_overrides",
  cart: "kb_cart",
  favorites: "kb_guest_favorites",
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("kb-local", { detail: key }));
}

export const db = { read, write, K };

/* ── Orders ─────────────────────────────────────────────────────────────── */

/** STUB → POST /api/orders  (creates order + payment intent) */
export async function apiCreateOrder(order: Order): Promise<Order> {
  await sleep(900); // network + Stripe payment intent latency
  const orders = read<Order[]>(K.orders, []);
  orders.unshift(order);
  write(K.orders, orders);
  return order;
}

/** STUB → GET /api/orders */
export async function apiListOrders(): Promise<Order[]> {
  await sleep(120);
  return read<Order[]>(K.orders, []);
}

/** STUB → PATCH /api/orders/:id  (status change / refund) */
export async function apiPatchOrder(
  id: string,
  patch: Partial<Order>
): Promise<void> {
  await sleep(150);
  const orders = read<Order[]>(K.orders, []);
  const i = orders.findIndex((o) => o.id === id);
  if (i >= 0) {
    orders[i] = { ...orders[i], ...patch };
    write(K.orders, orders);
  }
}

/* ── Reservations ───────────────────────────────────────────────────────── */

/** STUB → POST /api/reservations */
export async function apiCreateReservation(r: Reservation): Promise<Reservation> {
  await sleep(700);
  const all = read<Reservation[]>(K.reservations, []);
  all.unshift(r);
  write(K.reservations, all);
  return r;
}

/** STUB → GET /api/reservations */
export async function apiListReservations(): Promise<Reservation[]> {
  await sleep(120);
  return read<Reservation[]>(K.reservations, []);
}

/** STUB → DELETE /api/reservations/:id */
export async function apiDeleteReservation(id: string): Promise<void> {
  await sleep(150);
  const all = read<Reservation[]>(K.reservations, []);
  write(K.reservations, all.filter((r) => r.id !== id));
}

/* ── Auth (STUB → POST /api/auth/register | /api/auth/login) ────────────── */

/** Demo-store hashing (SubtleCrypto). The production app never sees these —
    its passwords live in Supabase Auth with bcrypt. The local demo cannot
    hold a secret key, but passwords still get a per-user random salt so two
    demo accounts never share a digest and stolen records cannot be
    rainbow-tabled. Format: v2$<salt-hex>$<sha256-hex>. */
const HASH_PREFIX = "v2";

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const newSalt = () => Array.from(crypto.getRandomValues(new Uint8Array(12))).map((b) => b.toString(16).padStart(2, "0")).join("");

async function hashPassword(pass: string, salt = newSalt()): Promise<string> {
  return `${HASH_PREFIX}$${salt}$${await sha256Hex(`kuopio-bites:${salt}:${pass}`)}`;
}

/** v1 records (before the version prefix) were a single unsalted digest. */
async function matchesPassword(passHash: string, pass: string): Promise<boolean> {
  const [version, salt] = passHash.split("$");
  if (version === HASH_PREFIX && salt) return passHash === (await hashPassword(pass, salt));
  return passHash === (await sha256Hex(`kuopio-bites:${pass}`));
}

/** Verify a password, upgrading plaintext/unsalted legacy records in place. */
async function verifyAndMigrate(u: User, pass: string, users: User[]): Promise<boolean> {
  const matches = u.passHash ? await matchesPassword(u.passHash, pass) : (u as { pass?: string }).pass === pass;
  if (!matches) return false;
  if (!u.passHash?.startsWith(`${HASH_PREFIX}$`)) {
    const upgraded: User = { ...u, passHash: await hashPassword(pass) };
    delete upgraded.pass;
    const i = users.findIndex((x) => x.id === u.id);
    if (i >= 0) { users[i] = upgraded; write(K.users, users); }
  }
  return true;
}

/** remember=false keeps the session only for the browser session (sessionStorage). */
function writeSession(id: string | null, remember: boolean): void {
  if (typeof window === "undefined") return;
  if (id && !remember) {
    sessionStorage.setItem(K.sessionEphemeral, id);
    write(K.session, null);
  } else {
    sessionStorage.removeItem(K.sessionEphemeral);
    write(K.session, id);
  }
  window.dispatchEvent(new CustomEvent("kb-local", { detail: K.session }));
}

export function readSession(): string | null {
  const stable = read<string | null>(K.session, null);
  if (stable) return stable;
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(K.sessionEphemeral);
}

export async function apiRegister(u: User, remember = true): Promise<void> {
  await sleep(500);
  const users = read<User[]>(K.users, []);
  const record: User = { ...u, passHash: await hashPassword(u.pass ?? "") };
  delete record.pass;
  users.push(record);
  write(K.users, users);
  writeSession(u.id, remember);
}

export async function apiLogin(email: string, pass: string, remember = true): Promise<User> {
  await sleep(500);
  const users = read<User[]>(K.users, []);
  const u = users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
  /* One generic message for both unknown email and wrong password. */
  if (!u || !(await verifyAndMigrate(u, pass, users))) throw new Error("auth.badCredentials");
  writeSession(u.id, remember);
  return { ...u, pass: undefined };
}

export function apiLogout() {
  writeSession(null, true);
}

/* Tokens are stored hashed (like production's GoTrue), so a localStorage dump
   cannot be replayed as a reset link. `token` remains only to accept legacy
   records written before hashing — new records never carry it. */
interface PasswordReset { token?: string; tokenHash?: string; userId: string; expiresAt: number }

/** STUB → POST /api/auth/forgot-password. Demo mode has no SMTP, so the token
    is returned to the caller (the UI shows it as a clickable reset link). */
export async function apiRequestPasswordReset(email: string): Promise<string | null> {
  await sleep(400);
  const users = read<User[]>(K.users, []);
  const u = users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
  if (!u) return null; // neutral: never reveal whether the account exists
  const token = uid("rst");
  const resets = read<PasswordReset[]>(K.resets, []).filter((r) => r.expiresAt > Date.now() && r.userId !== u.id);
  resets.push({ tokenHash: await sha256Hex(token), userId: u.id, expiresAt: Date.now() + 30 * 60 * 1000 });
  write(K.resets, resets);
  return token;
}

/** STUB → POST /api/auth/reset-password. Single-use, 30-minute expiry. */
export async function apiResetPassword(token: string, next: string): Promise<string | null> {
  await sleep(300);
  const resets = read<PasswordReset[]>(K.resets, []);
  const tokenHash = await sha256Hex(token);
  const reset = resets.find((r) => (r.tokenHash ? r.tokenHash === tokenHash : r.token === token) && r.expiresAt > Date.now());
  if (!reset) return "auth.resetInvalid";
  const users = read<User[]>(K.users, []);
  const i = users.findIndex((x) => x.id === reset.userId);
  if (i < 0) return "auth.resetInvalid";
  const upgraded: User = { ...users[i], passHash: await hashPassword(next) };
  delete upgraded.pass;
  users[i] = upgraded;
  write(K.users, users);
  write(K.resets, resets.filter((r) => r.token !== token));
  writeSession(null, true); // invalidate existing sessions, like production
  return null;
}

export async function apiChangePassword(id: string, current: string, next: string): Promise<string | null> {
  await sleep(200);
  const users = read<User[]>(K.users, []);
  const i = users.findIndex((x) => x.id === id);
  if (i < 0 || !(await verifyAndMigrate(users[i], current, users))) return "Current password is incorrect";
  const upgraded: User = { ...users[i], passHash: await hashPassword(next) };
  delete upgraded.pass;
  users[i] = upgraded;
  write(K.users, users);
  return null;
}

export async function apiUpdateUser(id: string, patch: Partial<User>) {
  await sleep(200);
  const users = read<User[]>(K.users, []);
  const i = users.findIndex((x) => x.id === id);
  if (i >= 0) {
    users[i] = { ...users[i], ...patch };
    write(K.users, users);
    return users[i];
  }
}

export function readUsers(): User[] {
  return read<User[]>(K.users, []);
}

/* ── Settings / overrides ───────────────────────────────────────────────── */

/** STUB → GET /api/settings */
export function readSettings<T>(fallback: T): T {
  return read<T>(K.settings, fallback);
}
/** STUB → PATCH /api/settings */
export function writeSettings(s: Settings) {
  write(K.settings, s);
}
export function readOverrides(fallback: Overrides): Overrides {
  return read<Overrides>(K.overrides, fallback);
}
export function writeOverrides(o: Overrides) {
  write(K.overrides, o);
}

export function newId(prefix: string) {
  return prefix + "-" + uid().slice(0, 6).toUpperCase();
}
