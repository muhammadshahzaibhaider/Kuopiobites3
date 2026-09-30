/**
 * REAL API CLIENT (post-split). Every function maps 1:1 to the contract in
 * /backend/API.md. No business logic, no secrets, no localStorage data stores —
 * the backend owns all of that. Tokens live in http.ts.
 */
import { api, setToken, setStaffToken } from "./http";
import type {
  CartLine, Category, MenuItem, Order, OrderStatus, Reservation, Settings, User,
} from "./types";

/* ── bootstrap / public reads ──────────────────────────────────────────── */
export const fetchSettings = () => api<Settings>("/api/settings");
export const fetchItems = () => api<MenuItem[]>("/api/items");
export const fetchCategories = () => api<Category[]>("/api/categories");
export const fetchTranslations = () => api<Record<string, Record<string, string>>>("/api/translations");

/* ── auth ──────────────────────────────────────────────────────────────── */
export async function apiRegister(d: { name: string; email: string; pass: string; phone?: string }) {
  const r = await api<{ token: string; user: Omit<User, "pass"> }>("/api/auth/register", { method: "POST", body: d });
  setToken(r.token);
  return r.user;
}
export async function apiLogin(email: string, pass: string) {
  const r = await api<{ token: string; user: Omit<User, "pass"> }>("/api/auth/login", { method: "POST", body: { email, pass } });
  setToken(r.token);
  return r.user;
}
export async function apiAdminLogin(username: string, password: string) {
  const r = await api<{ token: string; role: string }>("/api/auth/admin-login", { method: "POST", body: { username, password } });
  setStaffToken(r.token);
  return r.role;
}
export const apiLogout = () => setToken(null);
export const apiAdminLogout = () => setStaffToken(null);

export const apiUpdateAccount = (patch: Partial<Pick<User, "name" | "phone" | "addresses" | "marketing">>) =>
  api<User>("/api/account", { method: "PUT", body: patch });

/* ── pricing (server is the price authority) ───────────────────────────── */
export const apiPriceCart = (lines: CartLine[], type: "pickup" | "delivery", lang: "en" | "fi", code?: string) =>
  api<{ lines: CartLine[]; subtotal: number; deliveryFee: number; total: number; vat: number; discount?: { title: string; amount: number } }>(
    "/api/cart/price", { method: "POST", body: { lines, type, lang, code } });

/* ── orders ────────────────────────────────────────────────────────────── */
export const apiCreateOrder = (o: {
  type: "pickup" | "delivery"; customer: Order["customer"]; address?: string; note?: string;
  lines: CartLine[]; total: number; scheduled?: { date: string; time: string };
  lang?: "en" | "fi"; code?: string;
}) => api<Order>("/api/orders", { method: "POST", body: o });
export const apiListOrders = () => api<Order[]>("/api/orders", { staff: true });
export const apiGetOrder = (id: string) => api<Order>(`/api/orders/${id}`);
export const apiPatchOrderStatus = (id: string, status: OrderStatus) =>
  api<Order>(`/api/orders/${id}/status`, { method: "PATCH", body: { status }, staff: true });
export const apiRefundOrder = (id: string) =>
  api<Order>(`/api/orders/${id}/refund`, { method: "POST", staff: true });

/* ── reservations ──────────────────────────────────────────────────────── */
export const apiCreateReservation = (r: Omit<Reservation, "id" | "createdAt" | "status">) =>
  api<Reservation>("/api/reservations", { method: "POST", body: r });
export const apiListReservations = () => api<Reservation[]>("/api/reservations", { staff: true });
export const apiPatchReservation = (id: string, status: "pending" | "accepted" | "declined") =>
  api<Reservation>(`/api/reservations/${id}`, { method: "PATCH", body: { status }, staff: true });
export const apiDeleteReservation = (id: string) =>
  api<{ ok: true }>(`/api/reservations/${id}`, { method: "DELETE", staff: true });

/* ── admin mutations ───────────────────────────────────────────────────── */
export const apiSaveSettings = (s: Settings) => api<Settings>("/api/settings", { method: "PUT", body: s, staff: true });
export const apiSaveSpecial = (body: { special?: unknown; todaysSpecials?: unknown }) =>
  api<unknown>("/api/todays-special", { method: "PUT", body, staff: true });
export const apiPutItem = (m: MenuItem) => api<MenuItem>(`/api/items/${m.id}`, { method: "PUT", body: m, staff: true });
export const apiPostItem = (m: MenuItem) => api<MenuItem>("/api/items", { method: "POST", body: m, staff: true });
export const apiDeleteItem = (id: string) => api<{ ok: true }>(`/api/items/${id}`, { method: "DELETE", staff: true });
export const apiReorderItems = (cat: string, order: string[]) =>
  api<{ ok: true }>(`/api/items/reorder`, { method: "PATCH", body: { cat, order }, staff: true });
export const apiPostCategory = (title: string, en: string) =>
  api<{ id: string }>(`/api/categories`, { method: "POST", body: { title, en }, staff: true });
export const apiPutTranslation = (lang: "en" | "fi", key: string, value: string) =>
  api<{ ok: true }>(`/api/translations`, { method: "PUT", body: { lang, key, value }, staff: true });
export const apiActivity = () => api<{ ts: number; who: string; role: string; msg: string }[]>("/api/admin/activity", { staff: true });
export const apiAnalytics = () => api<Record<string, unknown>>("/api/analytics/summary", { staff: true });

export const newId = (prefix: string) =>
  prefix + "-" + Math.random().toString(36).slice(2, 8).toUpperCase();
