/**
 * REAL API CLIENT (post-split). Every function maps 1:1 to the contract in
 * /backend/API.md. No business logic, no secrets, no localStorage data stores —
 * the backend owns all of that. Tokens live in http.ts.
 */
import { api, apiBinary } from "./http";
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
  return api<{ user: Omit<User, "pass">; needsConfirmation: boolean; devConfirmationToken?: string }>("/api/auth/register", { method: "POST", body: d });
}
export async function apiLogin(email: string, pass: string, remember = true) {
  const r = await api<{ user: Omit<User, "pass"> }>("/api/auth/login", { method: "POST", body: { email, pass, remember } });
  return r.user;
}
export const apiForgotPassword = (email: string) =>
  api<{ ok: true }>("/api/auth/forgot-password", { method: "POST", body: { email } });
export const apiResendConfirmation = (email: string) =>
  api<{ ok: true }>("/api/auth/resend-confirmation", { method: "POST", body: { email } });
export type ResetProof = { token: string; type?: "signup" | "email" | "recovery" } | { accessToken: string; refreshToken: string } | { code: string };
export const apiResetPassword = (proof: ResetProof, next: string) =>
  api<{ ok: true }>("/api/auth/reset-password", { method: "POST", body: { ...proof, next } });
export async function apiAdminLogin(username: string, password: string) {
  const r = await api<{ role: string }>("/api/auth/admin-login", { method: "POST", body: { username, password } });
  return r.role;
}
export const apiConfirmEmail = (confirmation: string | { token: string; type?: string } | { accessToken: string; refreshToken: string } | { code: string }) =>
  api<{ confirmed: true }>("/api/auth/confirm-email", {
    method: "POST",
    body: typeof confirmation === "string" ? { token: confirmation } : confirmation,
  });
export const apiSession = () => api<{ user: Omit<User, "pass"> | null; role: string | null }>("/api/auth/session");
export const apiStaffSession = () => api<{ user: null; role: string | null }>("/api/auth/session", { staff: true });
export const apiLogout = () => api<{ ok: true }>("/api/auth/logout", { method: "POST" });
export const apiAdminLogout = () => api<{ ok: true }>("/api/auth/logout", { method: "POST", staff: true });
export const apiUpload = (body: Blob) => apiBinary<{ url: string; mime: string }>("/api/uploads", body, { contentType: body.type || "image/webp", staff: true });

export const apiCurrentAccount = () => api<Omit<User, "pass">>("/api/account");
export const apiUpdateAccount = (patch: Partial<Pick<User, "name" | "phone" | "addresses" | "marketing">>) =>
  api<User>("/api/account", { method: "PUT", body: patch });
/* ── favorites (per user, server-side) ────────────────────────────────── */
export const apiListFavorites = () => api<string[]>("/api/favorites");
export const apiAddFavorite = (itemId: string) =>
  api<{ favorites: string[] }>("/api/favorites", { method: "POST", body: { itemId } });
export const apiRemoveFavorite = (itemId: string) =>
  api<{ favorites: string[] }>(`/api/favorites/${encodeURIComponent(itemId)}`, { method: "DELETE" });
export const apiMergeFavorites = (itemIds: string[]) =>
  api<{ favorites: string[] }>("/api/favorites/merge", { method: "POST", body: { itemIds } });
/* ── cart (per user, server-side; guests receive 401) ─────────────────── */
export const apiListCart = () => api<CartLine[]>("/api/cart");
export const apiAddCartLine = (line: CartLine) => api<CartLine[]>("/api/cart/lines", { method: "POST", body: line });
export const apiSetCartQty = (key: string, qty: number) =>
  api<CartLine[]>(`/api/cart/lines/${encodeURIComponent(key)}`, { method: "PATCH", body: { qty } });
export const apiRemoveCartLine = (key: string) =>
  api<CartLine[]>(`/api/cart/lines/${encodeURIComponent(key)}`, { method: "DELETE" });
export const apiClearCart = () => api<CartLine[]>("/api/cart", { method: "DELETE" });
export const apiMergeCart = (lines: CartLine[]) => api<CartLine[]>("/api/cart", { method: "PUT", body: { lines } });
export const apiChangePassword = (current: string, next: string) => api<{ ok: true }>("/api/account/password", { method: "PUT", body: { current, next } });
export const apiAccountOrders = () => api<Order[]>("/api/account/orders");
export const apiCustomers = () =>
  api<{ id: string; name: string; email: string; phone: string; marketing: number; created_at: number; orderCount: number; lifetimeSpend: number }[]>("/api/customers", { staff: true });

/* ── pricing (server is the price authority) ───────────────────────────── */

/** A quoted line. `unitPrice` is null when the row could not be priced —
    `error` then carries the contract code (validation.* / avail.*). */
export type CartQuoteLine = Omit<CartLine, "unitPrice"> & { unitPrice: number | null; error: string | null };

export type CartQuote = {
  lines: CartQuoteLine[];
  subtotal: number;
  deliveryFee: number;
  deliveryDistanceKm?: number;
  weightKg: number;
  total: number;
  vat: number;
  /** number of lines excluded from the totals; checkout is blocked while > 0 */
  invalidCount: number;
  discount?: { title: string; amount: number; offerId?: string; freeDelivery?: boolean };
  /** cart line key → the part of `discount.amount` that belongs to that line */
  lineDiscounts?: Record<string, number>;
};

/** Lenient quote: always 200, prices what it can and reports each bad line.
    Checkout (/api/checkout/session) remains strict — see apiCreateCheckoutSession. */
export const apiPriceCart = (lines: CartLine[], type: "pickup" | "delivery", lang: "en" | "fi", code?: string, address?: string) =>
  api<CartQuote>("/api/cart/price", { method: "POST", body: { lines, type, lang, code, address } });

/* ── orders ────────────────────────────────────────────────────────────── */
export type CheckoutInput = {
  type: "pickup" | "delivery"; customer: Order["customer"]; address?: string; note?: string;
  lines: CartLine[]; total: number; scheduled?: { date: string; time: string };
  lang?: "en" | "fi"; code?: string;
};
export const apiCreateOrder = (o: CheckoutInput) => api<Order>("/api/orders", { method: "POST", body: o });
export const apiCreateCheckoutSession = (o: CheckoutInput) =>
  api<{ mode: "stripe" | "demo"; url?: string; sessionId?: string; orderId?: string; order?: Order }>("/api/checkout/session", { method: "POST", body: o });
export const apiListOrders = () => api<Order[]>("/api/orders", { staff: true });
export const apiGetOrder = (id: string) => api<Order>(`/api/orders/${id}`);
export const apiPatchOrderStatus = (id: string, status: OrderStatus) =>
  api<Order>(`/api/orders/${id}/status`, { method: "PATCH", body: { status }, staff: true });
export const apiPatchOrderReadyTime = (id: string, minutes: number | null) =>
  api<Order>(`/api/orders/${id}/ready-time`, { method: "PATCH", body: { minutes }, staff: true });
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
/* A whole-settings snapshot can legitimately take a few seconds on a
   cross-region link; the default 15 s transport timeout used to abort it. */
export const apiSaveSettings = (s: Settings) => api<Settings>("/api/settings", { method: "PUT", body: s, staff: true, timeoutMs: 45_000 });
export const apiSaveSpecial = (body: { special?: unknown; todaysSpecials?: unknown }) =>
  api<unknown>("/api/todays-special", { method: "PUT", body, staff: true, timeoutMs: 45_000 });
export const apiPutItem = (m: MenuItem) => api<MenuItem>(`/api/items/${m.id}`, { method: "PUT", body: m, staff: true });
export const apiPostItem = (m: MenuItem) => api<MenuItem>("/api/items", { method: "POST", body: m, staff: true });
export const apiDeleteItem = (id: string) => api<{ ok: true }>(`/api/items/${id}`, { method: "DELETE", staff: true });
export const apiArchiveItem = (id: string, archived: boolean) =>
  api<{ id: string; archived: boolean }>(`/api/items/${encodeURIComponent(id)}/archive`, { method: "PATCH", body: { archived }, staff: true });
export const apiAdminItems = (includeArchived = true) =>
  api<MenuItem[]>(`/api/admin/items?includeArchived=${includeArchived ? "true" : "false"}`, { staff: true });
export const apiPostPromotion = (promotion: Omit<import("./types").Offer, "id" | "uses">) =>
  api<import("./types").Offer>("/api/promotions", { method: "POST", body: promotion, staff: true });
export const apiPutPromotion = (id: string, promotion: Omit<import("./types").Offer, "id" | "uses">) =>
  api<import("./types").Offer>(`/api/promotions/${encodeURIComponent(id)}`, { method: "PUT", body: promotion, staff: true });
export const apiDeletePromotion = (id: string) =>
  api<{ ok: true }>(`/api/promotions/${encodeURIComponent(id)}`, { method: "DELETE", staff: true });
export const apiReorderItems = (cat: string, order: string[]) =>
  api<{ ok: true }>(`/api/items/reorder`, { method: "PATCH", body: { cat, order }, staff: true });
export const apiPostCategory = (title: string, en: string) =>
  api<{ id: string }>(`/api/categories`, { method: "POST", body: { title, en }, staff: true });
export const apiPutCategory = (id: string, patch: { title?: string; en?: string }) =>
  api<{ ok: true }>(`/api/categories/${encodeURIComponent(id)}`, { method: "PUT", body: patch, staff: true });
export const apiDeleteCategory = (id: string) =>
  api<{ ok: true }>(`/api/categories/${encodeURIComponent(id)}`, { method: "DELETE", staff: true });
export const apiPutTranslation = (lang: "en" | "fi", key: string, value: string) =>
  api<{ ok: true }>(`/api/translations`, { method: "PUT", body: { lang, key, value }, staff: true });
export const apiActivity = () => api<{ ts: number; who: string; role: string; msg: string }[]>("/api/admin/activity", { staff: true });
export const apiAnalytics = () => api<Record<string, unknown>>("/api/analytics/summary", { staff: true });
export interface AnalyticsReport {
  days: number; orders: number; revenue: number; averageOrderValue: number;
  refunded: number; refundedAmount: number; pickup: number; delivery: number;
  revenueByDay: { date: string; revenue: number; orders: number }[];
  items: { itemId: string; name: string; quantity: number; revenue: number }[];
  ordersByHour: { hour: number; orders: number }[];
  statusCounts: Record<OrderStatus, number>;
  pendingReservations: number;
}
export const apiAnalyticsReport = (days: 7 | 14 | 30) =>
  api<AnalyticsReport>(`/api/analytics/report?days=${days}`, { staff: true });
export const apiSubscribeNewsletter = (email: string) => api<{ subscribed: true }>("/api/newsletter", { method: "POST", body: { email } });
export const apiNewsletter = () => api<{ email: string; subscribed_at: number }[]>("/api/admin/newsletter", { staff: true });
export const apiDeleteNewsletter = (email: string) => api<{ ok: true }>(`/api/admin/newsletter/${encodeURIComponent(email)}`, { method: "DELETE", staff: true });

export const newId = (prefix: string) =>
  `${prefix}-${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8).toUpperCase() : Date.now().toString(36).toUpperCase()}`;
