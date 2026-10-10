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
  addItem: (cat: string, name: string, price: number, desc?: string, image?: import("./types").UploadedImg) => Promise<boolean>;
  removeAdded: (id: string) => Promise<boolean>;
  addCat: (title: string, en: string) => Promise<boolean>;
  setItemText: (lang: Lang, id: string, text: { name?: string; desc?: string }) => Promise<boolean>;
  effectiveMenu: (items: MenuItem[], lang?: Lang) => MenuItem[];
  categories: () => Category[];

  user: User | null;
  /* True once the first session probe finished — pages use it before
     deciding whether "already logged in" redirects should fire. */
  authChecked: boolean;
  users: User[];
  register: (d: { name: string; email: string; pass: string; phone?: string }) => Promise<string | null>;
  login: (email: string, pass: string, remember?: boolean) => Promise<string | null>;
  logout: () => void;
  updateUser: (patch: Partial<User>) => Promise<void>;
  changePassword: (current: string, next: string) => Promise<string | null>;
  favorites: string[];
  isFavorite: (itemId: string) => boolean;
  toggleFavorite: (itemId: string) => Promise<void>;
  adminLogin: (u: string, p: string) => Promise<string | null>;
  adminLogout: () => void;
  staffRole: string | null;

  cart: CartLine[];
  addLine: (l: Omit<CartLine, "key">) => void;
  setQty: (key: string, qty: number) => void;
  removeLine: (key: string) => void;
  clearCart: () => void;
  /* Guests never mutate cart/favorites: they get a login prompt instead. The
     pending action is replayed automatically once they sign in. */
  loginGate: boolean;
  openLoginGate: () => void;
  closeLoginGate: () => void;
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

const GUEST_FAVORITES_KEY = "kb_guest_favorites";
const LEGACY_CART_KEY = "kb_cart";
const PENDING_ACTION_KEY = "kb_pending_action";
const readLS = <T,>(k: string, f: T): T => {
  if (typeof window === "undefined") return f;
  try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as T) : f; } catch { return f; }
};

/* A deterministic cart-line key: identical item+variant+options merge into one
   server row no matter which device or session issued them. */
const lineKeyOf = (l: Omit<CartLine, "key"> | CartLine): string =>
  `${l.itemId}|${l.variantLabel}|${JSON.stringify(l.options ?? [])}`.slice(0, 100);

type PendingAction =
  | { kind: "cart"; line: Omit<CartLine, "key"> }
  | { kind: "favorite"; itemId: string };
const stashPending = (action: PendingAction) => {
  try { sessionStorage.setItem(PENDING_ACTION_KEY, JSON.stringify(action)); } catch { /* quota: skip */ }
};
const readPending = (): PendingAction | null => {
  if (typeof window === "undefined") return null;
  try { const raw = sessionStorage.getItem(PENDING_ACTION_KEY); return raw ? (JSON.parse(raw) as PendingAction) : null; } catch { return null; }
};
const clearPending = () => { try { sessionStorage.removeItem(PENDING_ACTION_KEY); } catch { /* noop */ } };

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  /* Session identity comes from the HttpOnly cookie via /api/auth/session;
     profile data is in memory only, not localStorage. */
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [staffRole, setStaffRole] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);

  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [loginGate, setLoginGate] = useState(false);
  const [pulse, setPulse] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [serverPricing, setServerPricing] = useState<ShopCtx["serverPricing"]>(null);
  const allItems = BASE_ITEMS; // live array, hydrated in place from the backend
  const allCats = BASE_CATS;

  /* The authenticated user's cart & favorites always come from the server
     (hydrateUser). Guests hold neither — only a legacy local copy imported
     once on the next sign-in. Nothing user-related is read from this device
     beyond session cookies. */

  const toast = useCallback((msg: string, kind: "ok" | "err" = "ok") => {
    const id = uid("t");
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);

  /* Pull the owner's private data after sign-in: favorites + server cart,
     import any pre-login leftovers exactly once, then replay the action the
     guest started (e.g. an Add-to-Cart that was gated behind login). Failures
     here never break the session itself — each load degrades to empty. */
  const hydrateUser = useCallback(async (u: User) => {
    const [favoriteIds, cartLines] = await Promise.all([
      api.apiListFavorites().catch(() => [] as string[]),
      api.apiListCart().catch(() => [] as CartLine[]),
    ]);
    let favs = favoriteIds;
    let cartLinesOut = cartLines;
    const legacyFavs = readLS<string[]>(GUEST_FAVORITES_KEY, []);
    const legacyCart = readLS<CartLine[]>(LEGACY_CART_KEY, []);
    if (legacyFavs.length) {
      try {
        favs = (await api.apiMergeFavorites(legacyFavs)).favorites;
      } catch { /* keep server list; legacy key still cleared below */ }
    }
    if (legacyCart.length) {
      try {
        cartLinesOut = await api.apiMergeCart(legacyCart.map((l) => ({ ...l, key: l.key || lineKeyOf(l) })));
      } catch { /* keep server list */ }
    }
    try {
      localStorage.removeItem(GUEST_FAVORITES_KEY);
      localStorage.removeItem(LEGACY_CART_KEY);
    } catch { /* noop */ }
    setUser({ ...u, favorites: favs });
    setFavorites(favs);
    setCart(cartLinesOut);

    const pending = readPending();
    if (pending) {
      clearPending();
      if (pending.kind === "cart") {
        try {
          const line: CartLine = { ...pending.line, key: lineKeyOf(pending.line) };
          cartLinesOut = await api.apiAddCartLine(line);
          setCart(cartLinesOut);
          setPulse((p) => p + 1);
          setTimeout(() => toast("Added to cart ✔"), 0);
        } catch { setTimeout(() => toast("Item could not be added — pick it again from the menu", "err"), 0); }
      } else if (pending.kind === "favorite" && !favs.includes(pending.itemId)) {
        try {
          const updated = await api.apiAddFavorite(pending.itemId);
          setFavorites(updated.favorites);
          setUser((prev) => (prev ? { ...prev, favorites: updated.favorites } : prev));
          setTimeout(() => toast("Added to favorites"), 0);
        } catch { /* keep as-is */ }
      }
    }
  }, [toast]);

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
      const sessionUser = (session.user ?? null) as User | null;
      if (sessionUser) {
        await hydrateUser(sessionUser);
      } else {
        setUser(null);
        setFavorites([]);
        setCart([]);
      }
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
    } finally {
      setAuthChecked(true);
    }
  }, [hydrateUser]);
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
        await hydrateUser(u as User);
        void refresh();
        return null;
      }
      void refresh();
      return result.needsConfirmation ? "auth.confirmationSent" : null;
    } catch (e) { return (e as Error).message; }
  };
  const login: ShopCtx["login"] = async (email, pass, remember = true) => {
    try {
      const u = await api.apiLogin(email, pass, remember);
      await hydrateUser(u as User);
      api.apiAccountOrders().then(setOrders).catch(() => {});
      return null;
    } catch (e) { return (e as Error).message; }
  };
  /* Signing out wipes every trace of the owner: no cart, no favorites, no
     cached private data survives into the next session on this device. */
  const logout = async () => {
    try { await api.apiLogout(); } catch { /* backend down: still clear locally */ }
    try {
      localStorage.removeItem(GUEST_FAVORITES_KEY);
      localStorage.removeItem(LEGACY_CART_KEY);
    } catch { /* noop */ }
    clearPending();
    setUser(null);
    setFavorites([]);
    setCart([]);
    setOrders([]);
    setUsers([]);
    setCartOpen(false);
    setLoginGate(false);
    setAuthChecked(true);
  };
  const updateUser: ShopCtx["updateUser"] = async (patch) => {
    const u = await api.apiUpdateAccount(patch);
    setUser({ ...user, ...u } as User);
  };
  const changePassword: ShopCtx["changePassword"] = async (current, next) => {
    try { await api.apiChangePassword(current, next); return null; }
    catch (e) { return (e as Error).message; }
  };
  const isFavorite = useCallback((itemId: string) => favorites.includes(itemId), [favorites]);
  const toggleFavorite: ShopCtx["toggleFavorite"] = async (itemId) => {
    /* Guests never mutate favorites: stash the intent behind the login gate. */
    if (!user) {
      stashPending({ kind: "favorite", itemId });
      setLoginGate(true);
      return;
    }
    const previous = favorites;
    const adding = !previous.includes(itemId);
    const next = adding ? [...previous, itemId] : previous.filter((id) => id !== itemId);
    setFavorites(next);
    setUser({ ...user, favorites: next });
    try {
      const res = adding ? await api.apiAddFavorite(itemId) : await api.apiRemoveFavorite(itemId);
      setFavorites(res.favorites);
      setUser((prev) => (prev ? { ...prev, favorites: res.favorites } : prev));
      toast(adding ? "Added to favorites" : "Removed from favorites");
    } catch (e) {
      setFavorites(previous); setUser({ ...user, favorites: previous });
      toast((e as Error).message || "Could not update favorites", "err");
      throw e;
    }
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

  /* ── cart (server is the single source of truth for logged-in users;
        totals always re-priced by the server at checkout) ── */
  /* Re-sync from the server whenever a mutation failed or raced. */
  const syncCart = () => { if (user) api.apiListCart().then(setCart).catch(() => {}); };
  const addLine: ShopCtx["addLine"] = (l) => {
    /* Guests get the login prompt; the line is replayed after they sign in. */
    if (!user) {
      stashPending({ kind: "cart", line: l });
      setLoginGate(true);
      return;
    }
    const line: CartLine = { ...l, key: lineKeyOf(l) };
    setCart((p) => {
      const same = p.find((x) => x.key === line.key);
      if (same) return p.map((x) => (x.key === line.key ? { ...x, qty: Math.min(x.qty + line.qty, 99) } : x));
      return [...p, line];
    });
    setPulse((p) => p + 1);
    api.apiAddCartLine(line).then(setCart).catch((e) => {
      toast((e as Error).message || "Cart could not be updated", "err");
      syncCart();
    });
  };
  const setQty = (key: string, qty: number) => {
    if (!user) return;
    if (qty <= 0) { removeLine(key); return; }
    setCart((p) => p.map((x) => (x.key === key ? { ...x, qty } : x)));
    api.apiSetCartQty(key, qty).then(setCart).catch(syncCart);
  };
  const removeLine = (key: string) => {
    if (!user) return;
    setCart((p) => p.filter((x) => x.key !== key));
    api.apiRemoveCartLine(key).then(setCart).catch(syncCart);
  };
  const clearCart = () => {
    setCart([]);
    if (user) api.apiClearCart().then(setCart).catch(syncCart);
  };
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
  const addItem: ShopCtx["addItem"] = async (cat, name, price, desc, image) => {
    try {
      const item = {
        id: "custom-" + uid().slice(0, 6),
        cat,
        name,
        desc: desc?.trim() || undefined,
        imageUrl: image?.src,
        prices: [{ label: "", value: price }],
      } as MenuItem;
      await api.apiPostItem(item);
      await refresh();
      if (image) {
        const saved = await saveSettings({ ...settings, itemImages: { ...settings.itemImages, [item.id]: image } });
        if (!saved) return false;
      }
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
    user, authChecked, users, register, login, logout, updateUser, changePassword, favorites, isFavorite, toggleFavorite, adminLogin, adminLogout, staffRole,
    cart, addLine, setQty, removeLine, clearCart, loginGate,
    openLoginGate: () => setLoginGate(true),
    closeLoginGate: () => setLoginGate(false),
    cartOpen, setCartOpen, cartCount, cartSubtotal,
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
