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
  settings: "kb_settings",
  overrides: "kb_overrides",
  cart: "kb_cart",
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

export async function apiRegister(u: User): Promise<void> {
  await sleep(500);
  const users = read<User[]>(K.users, []);
  users.push(u);
  write(K.users, users);
  write(K.session, u.id);
}

export async function apiLogin(email: string, pass: string): Promise<User> {
  await sleep(500);
  const users = read<User[]>(K.users, []);
  const u = users.find(
    (x) => x.email.toLowerCase() === email.toLowerCase() && x.pass === pass
  );
  if (!u) throw new Error("Wrong email or password");
  write(K.session, u.id);
  return u;
}

export function apiLogout() {
  write(K.session, null);
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
export function readSession(): string | null {
  return read<string | null>(K.session, null);
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
