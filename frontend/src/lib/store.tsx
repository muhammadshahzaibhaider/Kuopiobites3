"use client";
/**
 * Post-split ShopProvider. The backend owns settings, menu, orders, reservations,
 * users and audit; this provider only fetches/caches them, keeps the cart locally,
 * and routes every mutation through the typed API client. No business logic here:
 * prices/availability/pre-order rules execute in /backend (src/logic.ts).
 */
import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from "react";
import * as api from "./api";
import { DEFAULT_SETTINGS } from "./hours";
import { uid } from "./format";
import { hydrateMenu } from "./menuStore";
import { hydrateTranslations } from "./i18n";
import { CATEGORIES as BASE_CATS, MENU as BASE_ITEMS } from "./menu";
import { trDesc, trName } from "./v3";
import type {
  CartLine, Category, Lang, MenuItem, Order, OrderStatus, Overrides, Reservation, Settings, User,
} from "./types";

export interface Toast { id: string; msg: string; kind: "ok" | "err" }

interface ShopCtx {
  settings: Settings;
  saveSettings: (s: Settings) => Promise<boolean>;
  overrides: Overrides; // compat shim — backend data is already effective
  patchItem: (id: string, patch: { soldOut?: boolean; name?: string; prices?: number[] }) => Promise<boolean>;
  moveItem: (cat: string, id: string, dir: -1 | 1) => Promise<boolean>;
  moveItemTo: (cat: string, dragId: string, overId: string) => Promise<boolean>;
  addItem: (cat: string, name: string, price: number) => Promise<boolean>;
  removeAdded: (id: string) => Promise<boolean>;
  addCat: (title: string, en: string) => Promise<boolean>;
  setItemText: (lang: Lang, id: string, text: { name?: string; desc?: string }) => Promise<boolean>;
  effectiveMenu: (items: MenuItem[], lang?: Lang) => MenuItem[];
  categories: () => Category[];

  user: User | null;
  users: User[];
  register: (d: { name: string; email: string; pass: string; phone?: string }) => Promise<string | null>;
  login: (email: string, pass: string) => Promise<string | null>;
  logout: () => void;
  updateUser: (patch: Partial<User>) => Promise<void>;
  adminLogin: (u: string, p: string) => Promise<string | null>;
  adminLogout: () => void;
  staffRole: string | null;

  cart: CartLine[];
  addLine: (l: Omit<CartLine, "key">) => void;
  setQty: (key: string, qty: number) => void;
  removeLine: (key: string) => void;
  clearCart: () => void;
  cartOpen: boolean;
  setCartOpen: (b: boolean) => void;
  cartCount: number;
  cartSubtotal: number;
  pulse: number;
  priceCart: (type: "pickup" | "delivery", code?: string) => Promise<void>;
  serverPricing: { total: number; subtotal: number; deliveryFee: number; vat: number; discount?: { title: string; amount: number } } | null;

  orders: Order[];
  startCheckout: (o: Omit<Order, "id" | "createdAt" | "paymentId" | "paymentStatus"> & { lang?: Lang; code?: string }) => Promise<{ mode: "stripe" | "demo"; url?: string; sessionId?: string; orderId?: string; order?: Order }>;
  placeOrder: (o: Omit<Order, "id" | "createdAt" | "paymentId" | "paymentStatus">) => Promise<Order>;
  setOrderStatus: (id: string, s: OrderStatus) => Promise<boolean>;
  refundOrder: (id: string) => Promise<boolean>;
  orderStatus: (o: Order) => OrderStatus;

  reservations: Reservation[];
  addReservation: (r: Omit<Reservation, "id" | "createdAt">) => Promise<Reservation>;
  cancelReservation: (id: string) => Promise<boolean>;
  setReservationStatus: (id: string, s: "accepted" | "declined") => Promise<boolean>;

  toasts: Toast[];
  toast: (msg: string, kind?: "ok" | "err") => void;
  logAudit: (msg: string) => void;
  refresh: () => Promise<void>;
}

const Ctx = createContext<ShopCtx | null>(null);
export function useShop(): ShopCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useShop outside provider");
  return c;
}

const readLS = <T,>(k: string, f: T): T => {
  if (typeof window === "undefined") return f;
  try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as T) : f; } catch { return f; }
};

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  /* Session identity comes from the HttpOnly cookie via /api/auth/session;
     profile data is in memory only, not localStorage. */
  const [user, setUser] = useState<User | null>(null);
  const [staffRole, setStaffRole] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartReady, setCartReady] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [pulse, setPulse] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [serverPricing, setServerPricing] = useState<ShopCtx["serverPricing"]>(null);
  const allItems = BASE_ITEMS; // live array, hydrated in place from the backend
  const allCats = BASE_CATS;

  // Load the saved cart AFTER hydration: reading localStorage during the first render made the
  // client HTML differ from the server HTML (React #418/#423 on every page with a non-empty cart).
  useEffect(() => { setCart(readLS<CartLine[]>("kb_cart", [])); setCartReady(true); }, []);
  useEffect(() => { if (cartReady) localStorage.setItem("kb_cart", JSON.stringify(cart)); }, [cart, cartReady]);

  const toast = useCallback((msg: string, kind: "ok" | "err" = "ok") => {
    const id = uid("t");
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);

  /* ── boot: hydrate everything from the backend ── */
  const refresh = useCallback(async () => {
    try {
      const [s, items, cats, tr, session, staffSession] = await Promise.all([
        api.fetchSettings(), api.fetchItems(), api.fetchCategories(), api.fetchTranslations(),
        api.apiSession(), api.apiStaffSession(),
      ]);
      setSettings(s);
      hydrateMenu(items, cats);
      hydrateTranslations(tr);
      setUser((session.user ?? null) as User | null);
      setStaffRole(staffSession.role);
      if (staffSession.role) {
        const [o, r] = await Promise.all([api.apiListOrders(), api.apiListReservations()]);
        setOrders(o); setReservations(r);
        api.apiCustomers().then((cs) =>
          setUsers(cs.map((c) => ({ ...c, marketing: !!c.marketing, addresses: [], createdAt: c.created_at } as unknown as User)))
        ).catch(() => {}); // kitchen role has no customer reads
      } else if (session.user) {
        api.apiAccountOrders().then(setOrders).catch(() => {});
      } else {
        setOrders([]);
      }
    } catch (e) {
      // offline first-paint fallback (bundled data) stays in place
      console.warn("backend unreachable, using bundled fallback", e);
    }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  /* ── auth: identity is maintained by HttpOnly cookies, never localStorage ── */
  const register: ShopCtx["register"] = async (d) => {
    try {
      const result = await api.apiRegister(d);
      if (result.devConfirmationToken) {
        /* Only the local backend can return this helper; production requires
           the SMTP confirmation link and never returns the token. */
        await api.apiConfirmEmail(result.devConfirmationToken);
        const u = await api.apiLogin(d.email, d.pass);
        setUser(u as User);
        void refresh();
        return null;
      }
      void refresh();
      return result.needsConfirmation ? "auth.confirmationSent" : null;
    } catch (e) { return (e as Error).message; }
  };
  const login: ShopCtx["login"] = async (email, pass) => {
    try {
      const u = await api.apiLogin(email, pass);
      setUser(u as User);
      void refresh();
      return null;
    } catch (e) { return (e as Error).message; }
  };
  const logout = () => { void api.apiLogout(); setUser(null); setOrders([]); };
  const updateUser: ShopCtx["updateUser"] = async (patch) => {
    const u = await api.apiUpdateAccount(patch);
    setUser({ ...user, ...u } as User);
  };
  const adminLogin: ShopCtx["adminLogin"] = async (u, p) => {
    try {
      const role = await api.apiAdminLogin(u, p);
      setStaffRole(role);
      void refresh();
      return null;
    } catch (e) { return (e as Error).message; }
  };
  const adminLogout = () => { void api.apiAdminLogout(); setStaffRole(null); setOrders([]); };

  /* ── cart (local; totals always from the server) ── */
  const addLine: ShopCtx["addLine"] = (l) => {
    setCart((p) => {
      const same = p.find(
        (x) => x.itemId === l.itemId && x.variantLabel === l.variantLabel &&
          JSON.stringify(x.options) === JSON.stringify(l.options)
      );
      if (same) return p.map((x) => (x.key === same.key ? { ...x, qty: x.qty + l.qty } : x));
      return [...p, { ...l, key: uid("l") }];
    });
    setPulse((p) => p + 1);
  };
  const setQty = (key: string, qty: number) =>
    setCart((p) => (qty <= 0 ? p.filter((x) => x.key !== key) : p.map((x) => (x.key === key ? { ...x, qty } : x))));
  const removeLine = (key: string) => setCart((p) => p.filter((x) => x.key !== key));
  const clearCart = () => setCart([]);
  const cartCount = cart.reduce((a, l) => a + l.qty, 0);
  const cartSubtotal = cart.reduce((a, l) => a + l.qty * l.unitPrice, 0);

  const priceCart: ShopCtx["priceCart"] = async (type, code) => {
    if (!cart.length) return setServerPricing(null);
    try {
      const p = await api.apiPriceCart(cart, type, "en", code);
      setServerPricing({ total: p.total, subtotal: p.subtotal, deliveryFee: p.deliveryFee, vat: p.vat, discount: p.discount });
      // displayed line prices come from the server too (only touch state on real change,
      // otherwise the [cart] effect dependency would re-trigger forever)
      setCart((prev) => {
        let changed = false;
        const next = prev.map((l) => {
          const s = p.lines.find((x) => x.key === l.key || (x.itemId === l.itemId && x.variantLabel === l.variantLabel));
          if (s && s.unitPrice !== l.unitPrice) { changed = true; return { ...l, unitPrice: s.unitPrice }; }
          return l;
        });
        return changed ? next : prev;
      });
    } catch (e) { toast((e as Error).message, "err"); }
  };

  /* ── menu admin (backend CRUD) ── */
  const patchItem: ShopCtx["patchItem"] = async (id, patch) => {
    try {
      if (patch.soldOut !== undefined) {
        const next = { ...settings, offItems: { ...settings.offItems, [id]: { off: patch.soldOut } } };
        await api.apiSaveSettings(next); setSettings(next); return true;
      }
      const m = allItems.find((x) => x.id === id);
      if (!m) return false;
      const upd: MenuItem = {
        ...m,
        name: patch.name ?? m.name,
        prices: patch.prices ? m.prices.map((p, i) => ({ ...p, value: patch.prices![i] ?? p.value })) : m.prices,
      };
      await api.apiPutItem(upd); await refresh();
      return true;
    } catch {
      toast("Item could not be saved", "err");
      return false;
    }
  };

  const orderListOf = (cat: string) => allItems.filter((m) => m.cat === cat).map((m) => m.id);
  const moveItem: ShopCtx["moveItem"] = async (cat, id, dir) => {
    try {
      const list = orderListOf(cat);
      const from = list.indexOf(id); const to = from + dir;
      if (from < 0 || to < 0 || to >= list.length) return false;
      [list[from], list[to]] = [list[to], list[from]];
      await api.apiReorderItems(cat, list); await refresh();
      return true;
    } catch {
      toast("Item order could not be saved", "err");
      return false;
    }
  };
  const moveItemTo: ShopCtx["moveItemTo"] = async (cat, dragId, overId) => {
    try {
      const list = orderListOf(cat);
      const from = list.indexOf(dragId); const to = list.indexOf(overId);
      if (from < 0 || to < 0 || from === to) return false;
      list.splice(from, 1); list.splice(to, 0, dragId);
      await api.apiReorderItems(cat, list); await refresh();
      return true;
    } catch {
      toast("Item order could not be saved", "err");
      return false;
    }
  };
  const addItem: ShopCtx["addItem"] = async (cat, name, price) => {
    try {
      await api.apiPostItem({
        id: "custom-" + uid().slice(0, 6), cat, name, prices: [{ label: "", value: price }],
      } as MenuItem);
      await refresh();
      return true;
    } catch {
      toast("Item could not be added", "err");
      return false;
    }
  };
  const removeAdded: ShopCtx["removeAdded"] = async (id) => {
    try {
      await api.apiDeleteItem(id); await refresh();
      return true;
    } catch {
      toast("Item could not be deleted", "err");
      return false;
    }
  };
  const addCat: ShopCtx["addCat"] = async (title, en) => {
    try {
      await api.apiPostCategory(title, en || title); await refresh();
      return true;
    } catch {
      toast("Category could not be added", "err");
      return false;
    }
  };
  const setItemText: ShopCtx["setItemText"] = async (lang, id, text) => {
    try {
      const m = allItems.find((x) => x.id === id);
      if (!m) return false;
      const upd: MenuItem = {
        ...m,
        ...(lang === "fi" ? { nameFi: text.name ?? m.nameFi, descFi: text.desc ?? m.descFi }
          : { name: text.name ?? m.name, desc: text.desc ?? m.desc }),
      };
      await api.apiPutItem(upd); await refresh();
      return true;
    } catch {
      toast("Item text could not be saved", "err");
      return false;
    }
  };

  const categories = (): Category[] => {
    const withNames = allCats.map((c) => {
      const meta = settings.catMeta[c.id];
      return { ...c, title: meta?.nameFi || c.title, en: meta?.nameEn ?? c.en };
    });
    const order = settings.catOrder?.length ? settings.catOrder : null;
    if (!order) return withNames;
    return [...withNames].sort((a, b) => {
      const ia = order.indexOf(a.id), ib = order.indexOf(b.id);
      if (ia < 0 && ib < 0) return 0;
      if (ia < 0) return 1;
      if (ib < 0) return -1;
      return ia - ib;
    });
  };

  const effectiveMenu: ShopCtx["effectiveMenu"] = (items, lang = "en") =>
    items.map((m) => ({
      ...m,
      name: lang === "fi" ? trName(lang, m) : m.name,
      desc: lang === "fi" ? trDesc(lang, m) : m.desc,
    }));

  const saveSettings: ShopCtx["saveSettings"] = async (s) => {
    // Optimistic local update keeps switches, drafts, and specials responsive while
    // the backend persists the same complete settings snapshot.
    setSettings(s);
    try {
      const next = await api.apiSaveSettings(s);
      setSettings(next);
      await refresh();
      return true;
    } catch {
      await refresh();
      toast("Settings could not be saved", "err");
      return false;
    }
  };
  const logAudit: ShopCtx["logAudit"] = () => { /* backend audit trail now; client no-op */ };

  /* ── orders ─ */
  const startCheckout: ShopCtx["startCheckout"] = async (o) => {
    return api.apiCreateCheckoutSession({
      type: o.type, customer: o.customer, address: o.address, note: o.note,
      lines: o.lines, total: o.total, scheduled: o.scheduled, lang: o.lang, code: o.code,
    });
  };
  const placeOrder: ShopCtx["placeOrder"] = async (o) => {
    const created = await api.apiCreateOrder({
      type: o.type, customer: o.customer, address: o.address, note: o.note,
      lines: o.lines, total: o.total, scheduled: o.scheduled,
    });
    setOrders((p) => [created, ...p.filter((x) => x.id !== created.id)]);
    return created;
  };
  const setOrderStatus: ShopCtx["setOrderStatus"] = async (id, s) => {
    try {
      const upd = await api.apiPatchOrderStatus(id, s);
      setOrders((p) => p.map((x) => (x.id === id ? { ...x, ...upd } : x)));
      return true;
    } catch {
      toast("Order status could not be updated", "err");
      return false;
    }
  };
  const refundOrder: ShopCtx["refundOrder"] = async (id) => {
    try {
      const upd = await api.apiRefundOrder(id);
      setOrders((p) => p.map((x) => (x.id === id ? { ...x, ...upd } : x)));
      return true;
    } catch {
      toast("Refund could not be completed", "err");
      return false;
    }
  };
  const orderStatus = (o: Order): OrderStatus => {
    if (o.statusOverride) return o.statusOverride;
    const el = (Date.now() - o.createdAt) / 1000;
    if (el < 45) return "placed";
    if (el < 120) return "accepted";
    if (el < 300) return "preparing";
    if (el < 720) return "ready";
    return "completed";
  };

  /* ── reservations ── */
  const addReservation: ShopCtx["addReservation"] = async (r) => {
    const created = await api.apiCreateReservation(r);
    setReservations((p) => [created, ...p]);
    return created;
  };
  const cancelReservation: ShopCtx["cancelReservation"] = async (id) => {
    try {
      await api.apiDeleteReservation(id);
      setReservations((p) => p.filter((x) => x.id !== id));
      return true;
    } catch {
      toast("Reservation could not be cancelled", "err");
      return false;
    }
  };
  const setReservationStatus: ShopCtx["setReservationStatus"] = async (id, s) => {
    try {
      const upd = await api.apiPatchReservation(id, s);
      setReservations((p) => p.map((x) => (x.id === id ? { ...x, ...upd } : x)));
      return true;
    } catch {
      toast("Reservation status could not be updated", "err");
      return false;
    }
  };

  const value: ShopCtx = {
    settings, saveSettings,
    overrides: { items: {}, order: {} },
    patchItem, moveItem, moveItemTo, addItem, removeAdded, addCat, setItemText,
    effectiveMenu, categories,
    user, users, register, login, logout, updateUser, adminLogin, adminLogout, staffRole,
    cart, addLine, setQty, removeLine, clearCart, cartOpen, setCartOpen, cartCount, cartSubtotal,
    pulse, priceCart, serverPricing,
    orders, startCheckout, placeOrder, setOrderStatus, refundOrder, orderStatus,
    reservations, addReservation, cancelReservation, setReservationStatus,
    toasts, toast, logAudit, refresh,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTick(ms = 2000): number {
  const [t, setT] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setT((x) => x + 1), ms);
    return () => clearInterval(i);
  }, [ms]);
  return t;
}
