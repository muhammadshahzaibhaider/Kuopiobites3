"use client";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as api from "./api";
import { DEFAULT_SETTINGS } from "./hours";
import { uid } from "./format";
import { CATEGORIES as CATEGORIES_BASE, MENU as allItems } from "./menu";
import { builderUnitPrice, isItemOff, optionOff, pizzaUnitPrice, validatePreorder } from "./v3";
import type {
  CartLine,
  Category,
  Lang,
  MenuItem,
  Order,
  OrderStatus,
  Overrides,
  Reservation,
  Settings,
  User,
} from "./types";

/* ── tiny localStorage-bound state hook with cross-tab + same-tab sync ── */
function useStored<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void] {
  const [v, setV] = useState<T>(() => api.db.read(key, initial));
  useEffect(() => {
    const local = (e: Event) => {
      if ((e as CustomEvent).detail === key) setV(api.db.read(key, initial));
    };
    const remote = (e: StorageEvent) => {
      if (e.key === key) setV(api.db.read(key, initial));
    };
    window.addEventListener("kb-local", local);
    window.addEventListener("storage", remote);
    return () => {
      window.removeEventListener("kb-local", local);
      window.removeEventListener("storage", remote);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const set = useCallback(
    (nv: T | ((p: T) => T)) => {
      setV((prev) => {
        const next = typeof nv === "function" ? (nv as (p: T) => T)(prev) : nv;
        api.db.write(key, next);
        return next;
      });
    },
    [key]
  );
  return [v, set];
}

export interface Toast {
  id: string;
  msg: string;
  kind: "ok" | "err";
}

interface ShopCtx {
  settings: Settings;
  saveSettings: (s: Settings) => void;
  overrides: Overrides;
  patchItem: (id: string, patch: { soldOut?: boolean; name?: string; prices?: number[] }) => void;
  moveItem: (cat: string, id: string, dir: -1 | 1) => void;
  moveItemTo: (cat: string, dragId: string, overId: string) => void;
  addItem: (cat: string, name: string, price: number, desc?: string, image?: import("./types").UploadedImg) => void;
  removeAdded: (id: string) => void;
  addCat: (title: string, en: string) => void;
  setItemText: (lang: Lang, id: string, text: { name?: string; desc?: string }) => void;
  effectiveMenu: (items: MenuItem[], lang?: Lang) => MenuItem[];
  categories: () => Category[];

  user: User | null;
  users: User[];
  register: (d: { name: string; email: string; pass: string; phone?: string }) => Promise<string | null>;
  login: (email: string, pass: string) => Promise<string | null>;
  logout: () => void;
  updateUser: (patch: Partial<User>) => Promise<void>;
  favorites: string[];
  isFavorite: (itemId: string) => boolean;
  toggleFavorite: (itemId: string) => Promise<void>;

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

  orders: Order[];
  placeOrder: (o: Omit<Order, "id" | "createdAt" | "paymentId">) => Promise<Order>;
  setOrderStatus: (id: string, s: OrderStatus) => Promise<void>;
  refundOrder: (id: string) => Promise<void>;
  orderStatus: (o: Order) => OrderStatus;

  reservations: Reservation[];
  addReservation: (r: Omit<Reservation, "id" | "createdAt">) => Promise<Reservation>;
  cancelReservation: (id: string) => Promise<void>;
  setReservationStatus: (id: string, s: "accepted" | "declined") => Promise<void>;

  toasts: Toast[];
  toast: (msg: string, kind?: "ok" | "err") => void;
  logAudit: (msg: string) => void;
}

const Ctx = createContext<ShopCtx | null>(null);

export function useShop(): ShopCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useShop outside provider");
  return c;
}

const EMPTY_OVERRIDES: Overrides = { items: {}, order: {} };

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const [rawSettings, setSettings] = useStored<Settings>("kb_settings", DEFAULT_SETTINGS);
  const [overrides, setOverrides] = useStored<Overrides>("kb_overrides", EMPTY_OVERRIDES);
  const [users, setUsers] = useStored<User[]>("kb_users", []);
  const [sessionId, setSessionId] = useStored<string | null>("kb_session", null);
  const [cart, setCart] = useStored<CartLine[]>("kb_cart", []);
  const [orders, setOrders] = useStored<Order[]>("kb_orders", []);
  const [reservations, setReservations] = useStored<Reservation[]>("kb_reservations", []);
  const [cartOpen, setCartOpen] = useState(false);
  const [pulse, setPulse] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [guestFavorites, setGuestFavorites] = useStored<string[]>(api.db.K.favorites, []);

  /* merge defaults so older stored settings gain new fields (toppings, special…) */
  const settings = useMemo<Settings>(
    () => ({
      ...DEFAULT_SETTINGS,
      ...rawSettings,
      hours: { ...DEFAULT_SETTINGS.hours, ...(rawSettings.hours ?? {}) },
      toppings: rawSettings.toppings?.length ? rawSettings.toppings : DEFAULT_SETTINGS.toppings,
      special: rawSettings.special ?? DEFAULT_SETTINGS.special,
      blockedSlots: rawSettings.blockedSlots ?? [],
      blockedDates: rawSettings.blockedDates ?? [],
    }),
    [rawSettings]
  );

  const toast = useCallback((msg: string, kind: "ok" | "err" = "ok") => {
    const id = uid("t");
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);

  const user = useMemo(
    () => users.find((u) => u.id === sessionId) ?? null,
    [users, sessionId]
  );

  /* auth */
  const register: ShopCtx["register"] = async (d) => {
    if (users.some((u) => u.email.toLowerCase() === d.email.toLowerCase()))
      return "An account with this email already exists";
    const u: User = {
      id: uid("u"),
      name: d.name,
      email: d.email,
      pass: d.pass,
      phone: d.phone,
      addresses: [],
      marketing: false,
      createdAt: Date.now(),
      favorites: Array.from(new Set(guestFavorites)),
    };
    await api.apiRegister(u);
    setUsers((p) => [...p, u]);
    setGuestFavorites([]);
    setSessionId(u.id);
    return null;
  };
  const login: ShopCtx["login"] = async (email, pass) => {
    try {
      const u = await api.apiLogin(email, pass);
      const merged = Array.from(new Set([...(u.favorites ?? []), ...guestFavorites]));
      const updated = merged.length !== (u.favorites ?? []).length ? await api.apiUpdateUser(u.id, { favorites: merged }) : u;
      setUsers((p) => p.map((x) => x.id === u.id ? { ...x, ...(updated ?? u), favorites: merged } : x));
      setGuestFavorites([]);
      setSessionId(u.id);
      return null;
    } catch (e) {
      return (e as Error).message;
    }
  };
  const logout = () => {
    setGuestFavorites(favorites);
    api.apiLogout();
    setSessionId(null);
  };
  const updateUser: ShopCtx["updateUser"] = async (patch) => {
    if (!user) return;
    const updated = await api.apiUpdateUser(user.id, patch);
    if (updated) setUsers((p) => p.map((x) => (x.id === updated.id ? updated : x)));
  };

  const favorites = useMemo(() => Array.from(new Set(user?.favorites ?? guestFavorites)), [user?.favorites, guestFavorites]);
  const isFavorite = useCallback((itemId: string) => favorites.includes(itemId), [favorites]);
  const toggleFavorite: ShopCtx["toggleFavorite"] = async (itemId) => {
    const previous = favorites;
    const next = previous.includes(itemId) ? previous.filter((id) => id !== itemId) : [...previous, itemId];
    if (user) {
      const updated = await api.apiUpdateUser(user.id, { favorites: next });
      if (updated) setUsers((p) => p.map((x) => (x.id === updated.id ? updated : x)));
      else { toast("Could not update favorites", "err"); throw new Error("favorites.updateFailed"); }
    } else setGuestFavorites(next);
    toast(previous.includes(itemId) ? "Removed from favorites" : "Added to favorites");
  };

  /* cart */
  const addLine: ShopCtx["addLine"] = (l) => {
    setCart((p) => {
      const same = p.find(
        (x) =>
          x.itemId === l.itemId &&
          x.variantLabel === l.variantLabel &&
          x.unitPrice === l.unitPrice &&
          JSON.stringify(x.options) === JSON.stringify(l.options)
      );
      if (same)
        return p.map((x) => (x.key === same.key ? { ...x, qty: x.qty + l.qty } : x));
      return [...p, { ...l, key: uid("l") }];
    });
    setPulse((p) => p + 1);
  };
  const setQty = (key: string, qty: number) =>
    setCart((p) =>
      qty <= 0 ? p.filter((x) => x.key !== key) : p.map((x) => (x.key === key ? { ...x, qty } : x))
    );
  const removeLine = (key: string) => setCart((p) => p.filter((x) => x.key !== key));
  const clearCart = () => setCart([]);
  const cartCount = cart.reduce((a, l) => a + l.qty, 0);
  const cartSubtotal = cart.reduce((a, l) => a + l.qty * l.unitPrice, 0);

  /* menu overrides */
  const patchItem: ShopCtx["patchItem"] = (id, patch) =>
    setOverrides((p) => ({
      ...p,
      items: { ...p.items, [id]: { ...p.items[id], ...patch } },
    }));

  const baseOrder = (cat: string) =>
    overrides.order[cat] ?? allItems.filter((m) => m.cat === cat).map((m) => m.id);

  const moveItem: ShopCtx["moveItem"] = (cat, id, dir) =>
    setOverrides((p) => {
      const list = [...(p.order[cat] ?? allItems.filter((m) => m.cat === cat).map((m) => m.id))];
      const from = list.indexOf(id);
      if (from < 0) return p;
      const to = from + dir;
      if (to < 0 || to >= list.length) return p;
      [list[from], list[to]] = [list[to], list[from]];
      return { ...p, order: { ...p.order, [cat]: list } };
    });

  const moveItemTo: ShopCtx["moveItemTo"] = (cat, dragId, overId) =>
    setOverrides((p) => {
      const list = [...(p.order[cat] ?? allItems.filter((m) => m.cat === cat).map((m) => m.id))];
      // include custom items missing from stored order
      for (const m of [...allItems, ...Object.values(p.added ?? {}).flat()]) {
        if (m.cat === cat && !list.includes(m.id)) list.push(m.id);
      }
      const from = list.indexOf(dragId);
      const to = list.indexOf(overId);
      if (from < 0 || to < 0 || from === to) return p;
      list.splice(from, 1);
      list.splice(to, 0, dragId);
      return { ...p, order: { ...p.order, [cat]: list } };
    });

  const addItem: ShopCtx["addItem"] = (cat, name, price, desc, image) => {
    const id = "custom-" + uid().slice(0, 6);
    setOverrides((p) => ({
      ...p,
      added: {
        ...p.added,
        [cat]: [
          ...(p.added?.[cat] ?? []),
          { id, cat, name, desc: desc?.trim() || undefined, imageUrl: image?.src, prices: [{ label: "", value: price }] },
        ],
      },
    }));
    if (image) setSettings((p) => ({ ...p, itemImages: { ...p.itemImages, [id]: image } }));
  };

  const removeAdded: ShopCtx["removeAdded"] = (id) =>
    setOverrides((p) => {
      const added: Record<string, MenuItem[]> = {};
      for (const [c, list] of Object.entries(p.added ?? {}))
        added[c] = list.filter((m) => m.id !== id);
      const items = { ...p.items };
      delete items[id];
      return { ...p, added, items };
    });

  const addCat: ShopCtx["addCat"] = (title, en) =>
    setOverrides((p) => ({
      ...p,
      cats: [...(p.cats ?? []), { id: "cat-" + uid().slice(0, 5), title, en: en || title }],
    }));

  const setItemText: ShopCtx["setItemText"] = (lang, id, text) =>
    setOverrides((p) => ({
      ...p,
      texts: {
        ...p.texts,
        [lang]: { ...(p.texts?.[lang] ?? {}), [id]: { ...(p.texts?.[lang]?.[id] ?? {}), ...text } },
      },
    }));

  const categories = (): Category[] => {
    const base: Category[] = [...(overrides.cats ?? [])].length
      ? [...CATEGORIES_BASE, ...(overrides.cats ?? [])]
      : CATEGORIES_BASE;
    const withNames = base.map((c) => {
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
    [...items, ...Object.values(overrides.added ?? {}).flat()]
      .map((m) => {
        const o = overrides.items[m.id];
        const tx = overrides.texts?.[lang]?.[m.id];
        let patched: MenuItem = {
          ...m,
          name: tx?.name ?? o?.name ?? m.name,
          desc: tx?.desc ?? m.desc,
          prices: o?.prices
            ? m.prices.map((p, i) => ({ ...p, value: o.prices![i] ?? p.value }))
            : m.prices,
        };
        // inject editable topping list into build-your-own groups
        if (patched.mods?.some((g) => g.id === "top")) {
          patched = {
            ...patched,
            mods: patched.mods.map((g) =>
              g.id === "top"
                ? { ...g, options: settings.toppings.map((t) => ({ label: t, price: 0 })) }
                : g
            ),
          };
        }
        return patched;
      })
      .sort((a, b) => {
        const list = overrides.order[a.cat];
        if (!list) return 0;
        const ia = list.indexOf(a.id);
        const ib = list.indexOf(b.id);
        if (ia < 0 && ib < 0) return 0;
        if (ia < 0) return 1;
        if (ib < 0) return -1;
        return ia - ib;
      });

  const logAudit: ShopCtx["logAudit"] = (msg) =>
    setSettings((p) => ({
      ...p,
      audit: [{ ts: Date.now(), who: "admin", msg }, ...(p.audit ?? [])].slice(0, 200),
    }));

  /* orders */
  const placeOrder: ShopCtx["placeOrder"] = async (o) => {
    // server-side re-validation (stub backend)
    const preErr = validatePreorder(settings, o.lines, o.scheduled);
    if (preErr) throw new Error(preErr);
    if (o.lines.some((l) => isItemOff(settings, l.itemId)))
      throw new Error("avail.unavailable");
    // pizza sheet re-validation: never trust the browser total
    {
      const eff = effectiveMenu(allItems);
      for (const l of o.lines) {
        if (!l.pizza) continue;
        const m = eff.find((x) => x.id === l.itemId);
        if (!m) throw new Error("avail.unavailable");
        const vi = m.prices.findIndex((p) => p.label === l.pizza!.sizeLabel);
        if (vi < 0) throw new Error("order.priceChanged");
        for (const e of l.pizza.extras)
          if (optionOff(settings, "topping", e.label)) throw new Error("avail.unavailable");
        const expected = l.pizza.builder
          ? builderUnitPrice(m, vi, l.pizza.extras.reduce((a, e) => a + e.count, 0))
          : pizzaUnitPrice(settings, m, vi, l.pizza.extras);
        if (Math.abs(expected - l.unitPrice) > 0.02) throw new Error("order.priceChanged");
      }
    }
    if (o.discount?.offerId) {
      const oid = o.discount.offerId;
      setSettings((p) => ({
        ...p,
        offers: p.offers.map((of) => (of.id === oid ? { ...of, uses: (of.uses ?? 0) + 1 } : of)),
      }));
    }
    const order: Order = {
      ...o,
      id: api.newId("KB"),
      createdAt: Date.now(),
      paymentId: "pi_" + uid(),
    };
    const created = await api.apiCreateOrder(order);
    setOrders((p) => [created, ...p.filter((x) => x.id !== created.id)]);
    return created;
  };
  const setOrderStatus: ShopCtx["setOrderStatus"] = async (id, s) => {
    await api.apiPatchOrder(id, { statusOverride: s });
    setOrders((p) => p.map((x) => (x.id === id ? { ...x, statusOverride: s } : x)));
  };
  const refundOrder: ShopCtx["refundOrder"] = async (id) => {
    await api.apiPatchOrder(id, { refunded: true, statusOverride: "completed" });
    setOrders((p) =>
      p.map((x) => (x.id === id ? { ...x, refunded: true, statusOverride: "completed" } : x))
    );
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

  /* reservations */
  const addReservation: ShopCtx["addReservation"] = async (r) => {
    const res: Reservation = { ...r, id: api.newId("R"), createdAt: Date.now(), status: "pending" };
    const created = await api.apiCreateReservation(res);
    setReservations((p) => [created, ...p]);
    return created;
  };
  const cancelReservation: ShopCtx["cancelReservation"] = async (id) => {
    await api.apiDeleteReservation(id);
    setReservations((p) => p.filter((x) => x.id !== id));
  };
  const setReservationStatus: ShopCtx["setReservationStatus"] = async (id, s) => {
    setReservations((p) => {
      const next = p.map((x) => (x.id === id ? { ...x, status: s } : x));
      api.db.write(api.db.K.reservations, next);
      return next;
    });
  };

  const saveSettings = (s: Settings) => {
    api.writeSettings(s);
    setSettings(s);
  };

  const value: ShopCtx = {
    settings,
    saveSettings,
    overrides,
    patchItem,
    moveItem,
    moveItemTo,
    addItem,
    removeAdded,
    addCat,
    setItemText,
    effectiveMenu,
    categories,
    user,
    users,
    register,
    login,
    logout,
    updateUser,
    favorites, isFavorite, toggleFavorite,
    cart,
    addLine,
    setQty,
    removeLine,
    clearCart,
    cartOpen,
    setCartOpen,
    cartCount,
    cartSubtotal,
    pulse,
    orders,
    placeOrder,
    setOrderStatus,
    refundOrder,
    orderStatus,
    logAudit,
    reservations,
    addReservation,
    cancelReservation,
    setReservationStatus,
    toasts,
    toast,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/* keep a live-updating status tick for tracking pages */
export function useTick(ms = 2000): number {
  const [t, setT] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setT((x) => x + 1), ms);
    return () => clearInterval(i);
  }, [ms]);
  return t;
}
