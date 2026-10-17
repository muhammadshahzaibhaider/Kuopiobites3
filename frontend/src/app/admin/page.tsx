"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cx } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { useShop, useTick } from "@/lib/store";
import { Ic } from "@/admin/icons";
import { Pill, useLocal } from "@/admin/ui";
import NewOrderAlert from "@/admin/order-alert";
import { playNewOrderChime, playTestChime, unlockAudio } from "@/admin/notify";
import type { Order } from "@/lib/types";
import { DashboardView, OrdersView, DiningView } from "@/admin/views-orders";
import { MenuCategoriesView, MenuItemsView, ToppingsMasterView, SpecialsView } from "@/admin/views-menu";
import { DeliveryRulesView, OffersView } from "@/admin/views-delivery";
import { CustomersView, AnalyticsView, AdminStaffView, SettingsView } from "@/admin/views-misc";

/* credentials live ONLY in the backend (bcrypt + scoped staff JWTs) */

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    setAuthed(sessionStorage.getItem("kb_admin") === "1");
  }, []);
  if (!authed)
    return (
      <Gate
        onOk={() => {
          sessionStorage.setItem("kb_admin", "1");
          setAuthed(true);
        }}
      />
    );
  return (
    <AdminShell
      onLogout={() => {
        sessionStorage.removeItem("kb_admin");
        setAuthed(false);
      }}
    />
  );
}

function Gate({ onOk }: { onOk: () => void }) {
  const { adminLogin } = useShop();
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <div className="grid min-h-[80vh] place-items-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-2xl font-black text-cherry">Kuopio Bites · Staff login</h1>
        <p className="mt-1 text-xs text-cherry/60">Admin area — function over fashion.</p>
        <form
          className="mt-6 space-y-3 rounded-2xl border border-cherry/15 bg-cream-deep p-5 shadow-card"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const problem = await adminLogin(u, p); // POST /api/auth/admin-login
            setBusy(false);
            if (problem) setErr(true);
            else onOk();
          }}
        >
          <input className="min-h-[44px] w-full rounded-lg border border-cherry/20 bg-cream px-3 text-sm font-bold" placeholder="Username" value={u} onChange={(e) => setU(e.target.value)} />
          <input type="password" className="min-h-[44px] w-full rounded-lg border border-cherry/20 bg-cream px-3 text-sm font-bold" placeholder="Password" value={p} onChange={(e) => setP(e.target.value)} />
          {err && <p className="text-xs font-bold text-brick">Wrong credentials</p>}
          <button disabled={busy} className="min-h-[44px] w-full rounded-lg bg-cherry font-black text-cream hover:bg-cherry-bright disabled:opacity-60">Sign in</button>
        </form>
      </div>
    </div>
  );
}

/* ── navigation tree ── */
type Leaf = { id: string; label: string; icon: string };
type Group = { id: string; label: string; icon: string; leaves?: Leaf[]; leaf?: string };

const NAV: Group[] = [
  { id: "dashboard", label: "Dashboard", icon: "grid", leaf: "dashboard" },
  { id: "orders", label: "Orders", icon: "orders", leaves: [
    { id: "orders.queue", label: "Live Queue", icon: "clock" },
    { id: "orders.history", label: "History", icon: "history" },
    { id: "orders.refunds", label: "Refunds", icon: "cash" },
  ] },
  { id: "dining", label: "Dining", icon: "calendar", leaves: [
    { id: "dining.calendar", label: "Calendar", icon: "calendar" },
    { id: "dining.list", label: "Reservations", icon: "list" },
    { id: "dining.slots", label: "Slot Settings", icon: "clock" },
  ] },
  { id: "menu", label: "Menu", icon: "menu", leaves: [
    { id: "menu.items", label: "Items", icon: "list" },
    { id: "menu.off", label: "Off-menu", icon: "warn" },
    { id: "menu.categories", label: "Categories", icon: "group" },
    { id: "menu.toppings", label: "Toppings", icon: "pizza" },
    { id: "menu.offers", label: "Offers", icon: "cash" },
    { id: "menu.delivery", label: "Delivery rules", icon: "clock" },
    { id: "menu.special", label: "Today's Special", icon: "star" },
  ] },
  { id: "customers", label: "Customers", icon: "users", leaf: "customers" },
  { id: "analytics", label: "Analytics", icon: "analytics", leaves: [
    { id: "analytics.sales", label: "Sales", icon: "analytics" },
    { id: "analytics.items", label: "Item Performance", icon: "list" },
    { id: "analytics.peaks", label: "Peak Hours", icon: "clock" },
  ] },
  { id: "admin", label: "Admin", icon: "shield", leaf: "admin.staff" },
  { id: "settings", label: "Settings", icon: "cog", leaves: [
    { id: "settings.general", label: "General", icon: "cog" },
    { id: "settings.restaurant", label: "Restaurant Info", icon: "store" },
  ] },
];

const ALL_LEAVES: Leaf[] = NAV.flatMap((g) => (g.leaves ?? (g.leaf ? [{ id: g.leaf, label: g.label, icon: g.icon }] : [])));

function AdminShell({ onLogout }: { onLogout: () => void }) {
  const [tabs, setTabs] = useLocal<string[]>("kb_admin_tabs", ["dashboard"]);
  const [active, setActive] = useLocal<string>("kb_admin_active", "dashboard");
  const validIds = useMemo(() => new Set(ALL_LEAVES.map((leaf) => leaf.id)), []);
  const activeId = validIds.has(active) ? active : "dashboard";
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(["orders", "menu"]));
  const [mobileNav, setMobileNav] = useState(false);
  const [navQuery, setNavQuery] = useState("");
  const [userMenu, setUserMenu] = useState(false);
  const [quickCreate, setQuickCreate] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [soundOn, setSoundOn] = useState(() => (typeof window === "undefined" ? true : localStorage.getItem("kb_admin_sound") !== "0"));
  const [alertQueue, setAlertQueue] = useState<Order[]>([]);
  const seenOrders = useRef<Set<string> | null>(null);
  const { orders, orderStatus, refresh } = useShop();
  const { lang, setLang } = useLang();
  useTick(4000);

  const placed = orders.filter((o) => orderStatus(o) === "placed" && !o.refunded);

  /* Poll so a new ticket reaches the kitchen even if this tab was left open. */
  useEffect(() => {
    const id = window.setInterval(() => { void refresh(); }, 15000);
    return () => window.clearInterval(id);
  }, [refresh]);

  /* Browser audio needs a user gesture before it can play. */
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  /* New-order detection: chime + full-screen takeover. */
  useEffect(() => {
    const live = orders
      .filter((o) => orderStatus(o) === "placed" && !o.refunded)
      .sort((a, b) => a.createdAt - b.createdAt);
    if (seenOrders.current === null) {
      seenOrders.current = new Set(live.map((o) => o.id));
      if (live.length) {
        setAlertQueue(live);
        if (soundOn) window.setTimeout(() => playNewOrderChime(), 500);
      }
      return;
    }
    /* Drop alerts handled elsewhere (another tab/device). */
    setAlertQueue((q) => {
      const next = q.filter((a) => {
        const current = orders.find((o) => o.id === a.id);
        return !!current && orderStatus(current) === "placed" && !current.refunded;
      });
      return next.length === q.length ? q : next;
    });
    const fresh = live.filter((o) => !seenOrders.current!.has(o.id));
    if (!fresh.length) return;
    fresh.forEach((o) => seenOrders.current!.add(o.id));
    setAlertQueue((q) => [...q, ...fresh.filter((o) => !q.some((x) => x.id === o.id))]);
    if (soundOn) playNewOrderChime();
  }, [orders, orderStatus, soundOn]);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    localStorage.setItem("kb_admin_sound", next ? "1" : "0");
    if (next) { unlockAudio(); playTestChime(); }
  };

  const pending = orders.filter((o) => ["placed", "accepted", "preparing"].includes(orderStatus(o)) && !o.refunded).length;

  const openView = (id: string) => {
    setActive(id);
    setTabs((t) => (t.includes(id) ? t : [...t, id]));
    setMobileNav(false);
    setNavQuery("");
  };
  const closeTab = (id: string) => {
    const next = tabs.filter((x) => x !== id);
    setTabs(next.length ? next : ["dashboard"]);
    if (activeId === id) setActive(next.length ? next[next.length - 1] : "dashboard");
  };

  useEffect(() => {
    const clean = tabs.filter((id) => validIds.has(id));
    const next = clean.length ? clean : ["dashboard"];
    if (next.length !== tabs.length || next.some((id, i) => id !== tabs[i])) setTabs(next);
    if (active !== activeId) setActive(next.includes(activeId) ? activeId : next[0]);
  }, [tabs, active, activeId, validIds, setTabs, setActive]);

  const labelOf = (id: string) => ALL_LEAVES.find((l) => l.id === id)?.label ?? id;
  const filteredNav = useMemo(() => {
    if (!navQuery.trim()) return NAV;
    const q = navQuery.toLowerCase();
    return NAV.map((g) => ({
      ...g,
      leaves: g.leaves?.filter((l) => l.label.toLowerCase().includes(q)),
    })).filter((g) => (g.leaves ? g.leaves.length > 0 : g.label.toLowerCase().includes(q)));
  }, [navQuery]);

  const navContent = (isMobile: boolean) => {
    const open = isMobile || expanded;
    return (
      <>
        <div className={cx("flex shrink-0 items-center border-b border-cream/10", open ? "gap-3 px-4 py-4" : "justify-center px-2 py-4")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Kuopio Bites" className="h-10 w-10 shrink-0 rounded-full border-2 border-gold/70 bg-cream object-cover" />
          {open && (
            <span className="min-w-0">
              <span className="block truncate font-display text-sm font-black leading-tight text-cream">Kuopio Bites</span>
              <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-gold">Kitchen admin</span>
            </span>
          )}
        </div>

        {open ? (
          <div className="shrink-0 px-3 pt-3">
            <label className="relative block">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cream/40"><Ic n="search" size={14} /></span>
              <input
                value={navQuery}
                onChange={(e) => setNavQuery(e.target.value)}
                placeholder="Search sections…"
                aria-label="Search sections"
                className="min-h-[36px] w-full rounded-xl border border-cream/10 bg-cream/10 pl-9 pr-3 text-xs font-bold text-cream placeholder:text-cream/40 focus:border-gold/60 focus:outline-none"
              />
            </label>
          </div>
        ) : (
          <div className="mx-auto mt-3 h-px w-8 shrink-0 bg-cream/10" />
        )}

        <nav className="no-scrollbar flex-1 overflow-y-auto px-2 py-3" aria-label="Admin sections">
          {filteredNav.map((g, gi) => {
            const isOpen = openGroups.has(g.id) || (!!navQuery && open);
            const groupActive = g.leaves ? g.leaves.some((l) => l.id === activeId) : g.leaf === activeId;
            return (
              <div key={g.id} className="mb-0.5">
                {!open && gi > 0 && <div className="mx-auto my-2 h-px w-8 bg-cream/10" />}
                <button
                  onClick={() => {
                    if (g.leaf) { openView(g.leaf); return; }
                    if (!g.leaves) return;
                    if (!open) { openView(g.leaves[0].id); return; }
                    setOpenGroups((prev) => { const nx = new Set(prev); nx.has(g.id) ? nx.delete(g.id) : nx.add(g.id); return nx; });
                    if (!g.leaves.some((l) => l.id === activeId)) openView(g.leaves[0].id);
                  }}
                  title={!open ? g.label : undefined}
                  aria-current={groupActive ? "page" : undefined}
                  aria-expanded={open && g.leaves ? isOpen : undefined}
                  className={cx(
                    "group relative flex w-full items-center rounded-xl text-[13px] font-black transition",
                    open ? "gap-2.5 px-3 py-2.5" : "justify-center px-0 py-2.5",
                    groupActive ? "bg-gold text-cherry-dark shadow-sm" : "text-cream/80 hover:bg-cream/10 hover:text-cream"
                  )}
                >
                  <Ic n={g.icon} size={18} className="shrink-0" />
                  {open && <span className="flex-1 truncate text-left">{g.label}</span>}
                  {open && g.leaves && <Ic n="chevD" size={12} className={cx("shrink-0 transition-transform", isOpen && "rotate-180")} />}
                </button>
                <AnimatePresence initial={false}>
                  {open && g.leaves && isOpen && (
                    <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                      {g.leaves.map((l) => {
                        const activeLeaf = activeId === l.id;
                        return (
                          <li key={l.id}>
                            <button
                              onClick={() => openView(l.id)}
                              aria-current={activeLeaf ? "page" : undefined}
                              className={cx(
                                "my-0.5 flex w-full items-center gap-2 rounded-lg py-2 pl-9 pr-3 text-left text-xs font-bold transition",
                                activeLeaf ? "bg-cream/15 text-gold" : "text-cream/60 hover:bg-cream/5 hover:text-cream"
                              )}
                            >
                              <span className={cx("h-1.5 w-1.5 shrink-0 rounded-full", activeLeaf ? "bg-gold" : "bg-cream/25")} />
                              <span className="truncate">{l.label}</span>
                            </button>
                          </li>
                        );
                      })}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
          {open && filteredNav.length === 0 && (
            <p className="px-3 py-6 text-center text-xs font-bold text-cream/40">No sections match “{navQuery}”.</p>
          )}
        </nav>

        <div className={cx("shrink-0 border-t border-cream/10", open ? "px-4 py-3" : "px-2 py-3 text-center")}>
          {open ? (
            <p className="text-[10px] font-bold text-cream/50">{RESTAURANT_LINE}</p>
          ) : (
            <span className="mx-auto grid h-9 w-9 place-items-center rounded-full bg-cream/10 text-[9px] font-black text-cream/60" title={RESTAURANT_LINE}>KB</span>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-cream-deep">
      {/* sidebar — icon rail by default, expands on hover/focus */}
      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        onFocus={() => setExpanded(true)}
        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setExpanded(false); }}
        aria-label="Admin navigation"
        className={cx(
          "fixed inset-y-0 left-0 z-40 hidden flex-col bg-[#0F3D3E] text-cream transition-[width,box-shadow] duration-300 ease-out lg:flex",
          expanded ? "w-[276px] shadow-lift" : "w-[78px]"
        )}
      >
        {navContent(false)}
      </aside>

      <AnimatePresence>
        {mobileNav && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-cherry-dark/50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileNav(false)} />
            <motion.aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#0F3D3E] text-cream lg:hidden" initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", bounce: 0, duration: 0.35 }} aria-label="Admin navigation">
              {navContent(true)}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="lg:pl-[78px]">
        {/* top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-cherry/10 bg-cream/95 px-3 py-2 backdrop-blur sm:px-4">
          <button onClick={() => setMobileNav(true)} aria-label="Open navigation" className="grid h-9 w-9 place-items-center rounded-lg border border-cherry/20 text-cherry lg:hidden">
            <Ic n="menu" size={17} />
          </button>
          <span className="relative hidden flex-1 sm:block sm:max-w-sm">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cherry/40"><Ic n="search" size={14} /></span>
            <input
              placeholder="Search orders, items… (sidebar search above)"
              onFocus={() => setMobileNav(true)}
              readOnly
              className="min-h-[36px] w-full cursor-pointer rounded-lg border border-cherry/15 bg-cream-deep pl-9 pr-3 text-xs font-bold placeholder:text-cherry/40"
            />
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={() => setLang(lang === "fi" ? "en" : "fi")}
              className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-cherry/20 px-2.5 text-[11px] font-black uppercase text-cherry hover:border-cherry"
            >
              <Ic n="lang" size={13} /> {lang === "fi" ? "EN" : "FI"}
            </button>
            <div className="relative">
              <button onClick={() => { setQuickCreate((v) => !v); setUserMenu(false); }} aria-label="Quick create" className="grid h-9 w-9 place-items-center rounded-lg bg-gold text-cherry-dark shadow-card hover:bg-gold-deep">
                <Ic n="plus" size={16} />
              </button>
              {quickCreate && (
                <div className="absolute right-0 top-11 z-40 w-52 overflow-hidden rounded-xl border border-cherry/15 bg-cream shadow-lift">
                  <p className="px-3 pt-2 text-[10px] font-black uppercase text-cherry/40">Quick create</p>
                  {[["menu.items", "New menu item"], ["menu.special", "Today's Special"], ["dining.list", "Table reservation"]].map(([to, label]) => (
                    <button key={to} onClick={() => { setQuickCreate(false); openView(to); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-black text-cherry hover:bg-cream-deep">
                      <Ic n="plus" size={12} /> {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={toggleSound}
              aria-label={soundOn ? "Mute new-order sound" : "Enable new-order sound"}
              title={soundOn ? "New-order sound is on" : "New-order sound is off"}
              className={cx(
                "grid h-9 w-9 place-items-center rounded-lg border transition",
                soundOn ? "border-gold/50 bg-gold/15 text-gold-deep" : "border-cherry/20 text-cherry/40"
              )}
            >
              <Ic n={soundOn ? "volume" : "volumeOff"} size={16} />
            </button>
            <button onClick={() => openView("orders.queue")} aria-label="Pending orders" className="relative grid h-9 w-9 place-items-center rounded-lg border border-cherry/20 text-cherry hover:border-cherry">
              <Ic n="bell" size={16} />
              {pending > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-brick px-1 text-[9px] font-black text-cream">{pending}</span>}
            </button>
            <div className="relative">
              <button onClick={() => { setUserMenu((v) => !v); setQuickCreate(false); }} aria-label="Account" className="grid h-9 w-9 place-items-center rounded-full bg-cherry font-display text-xs font-black text-cream">
                AD
              </button>
              {userMenu && (
                <div className="absolute right-0 top-11 z-40 w-44 overflow-hidden rounded-xl border border-cherry/15 bg-cream shadow-lift">
                  <p className="px-3 pt-2 text-xs font-black text-cherry">admin</p>
                  <p className="px-3 pb-1 text-[10px] text-cherry/50">Owner</p>
                  <button onClick={onLogout} className="flex w-full items-center gap-2 border-t border-cherry/10 px-3 py-2 text-left text-xs font-black text-brick hover:bg-cream-deep">
                    <Ic n="logout" size={13} /> Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* tab chips */}
        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto border-b border-cherry/10 bg-cream px-3 py-2 sm:px-4">
          {tabs.map((id) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              className={cx("group inline-flex min-h-[32px] items-center gap-2 whitespace-nowrap rounded-full border px-3 text-xs font-black transition", activeId === id ? "border-cherry bg-cherry text-cream" : "border-cherry/20 bg-cream-deep text-cherry/70 hover:border-cherry/50")}
            >
              {labelOf(id)}
              <span
                role="button"
                aria-label={`Close ${labelOf(id)}`}
                onClick={(e) => { e.stopPropagation(); closeTab(id); }}
                className={cx("grid h-4 w-4 place-items-center rounded-full text-[10px]", activeId === id ? "bg-cream/20 hover:bg-cream/40" : "bg-cherry/10 hover:bg-cherry/25")}
              >
                ×
              </span>
            </button>
          ))}
        </div>

        {/* view */}
        <main className="p-3 sm:p-5">
          <div className="mb-3 flex items-center gap-2">
            <h1 className="font-display text-xl font-black text-cherry">{labelOf(activeId)}</h1>
            {activeId.startsWith("orders.") && pending > 0 && <Pill tone="orange">{pending} pending</Pill>}
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={activeId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              {renderView(activeId, openView)}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {alertQueue[0] && (
        <NewOrderAlert
          key={alertQueue[0].id}
          order={alertQueue[0]}
          queued={alertQueue.length - 1}
          onResolved={() => setAlertQueue((q) => q.slice(1))}
          onLater={() => setAlertQueue((q) => q.slice(1))}
        />
      )}
    </div>
  );
}

const RESTAURANT_LINE = "Jalkasenkatu 7 · 044 981 6223";

function renderView(id: string, go: (v: string) => void) {
  switch (id) {
    case "dashboard": return <DashboardView go={go} />;
    case "orders.queue": return <OrdersView mode="queue" />;
    case "orders.history": return <OrdersView mode="history" />;
    case "orders.refunds": return <OrdersView mode="refunds" />;
    case "dining.calendar": return <DiningView mode="calendar" />;
    case "dining.list": return <DiningView mode="list" />;
    case "dining.slots": return <DiningView mode="slots" />;
    case "menu.items": return <MenuItemsView />;
    case "menu.off": return <MenuItemsView initialAvailability="off" />;
    case "menu.categories": return <MenuCategoriesView />;
    case "menu.toppings": return <ToppingsMasterView />;
    case "menu.offers": return <OffersView />;
    case "menu.delivery": return <DeliveryRulesView />;
    case "menu.special": return <SpecialsView />;
    case "customers": return <CustomersView />;
    case "analytics.sales": return <AnalyticsView mode="sales" />;
    case "analytics.items": return <AnalyticsView mode="items" />;
    case "analytics.peaks": return <AnalyticsView mode="peaks" />;
    case "admin.staff": return <AdminStaffView />;
    case "settings.general": return <SettingsView mode="general" />;
    case "settings.restaurant": return <SettingsView mode="restaurant" />;
    default: return <DashboardView go={go} />;
  }
}
