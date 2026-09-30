"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cx } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { useShop, useTick } from "@/lib/store";
import { Ic } from "@/admin/icons";
import { Pill, useLocal } from "@/admin/ui";
import { DashboardView, OrdersView, DiningView } from "@/admin/views-orders";
import { MenuCategoriesView, MenuItemsView, ToppingsMasterView, SpecialsView, BulkPricingView } from "@/admin/views-menu";
import { MarketingView, CustomersView, LocalizationView, MediaView, AnalyticsView, AdminStaffView, SettingsView } from "@/admin/views-misc";

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
    { id: "menu.categories", label: "Categories", icon: "group" },
    { id: "menu.toppings", label: "Toppings", icon: "pizza" },
    { id: "menu.special", label: "Today's Special", icon: "star" },
    { id: "menu.pricing", label: "Bulk Pricing", icon: "cash" },
  ] },
  { id: "marketing", label: "Marketing", icon: "megaphone", leaves: [
    { id: "marketing.promos", label: "Promos & Offers", icon: "tag" },
    { id: "marketing.subscribers", label: "Subscribers", icon: "bell" },
  ] },
  { id: "customers", label: "Customers", icon: "users", leaf: "customers" },
  { id: "localization", label: "Localization", icon: "lang", leaves: [
    { id: "localization.translations", label: "Translation Manager", icon: "lang" },
    { id: "localization.missing", label: "Coverage Report", icon: "warn" },
  ] },
  { id: "media", label: "Media", icon: "image", leaves: [
    { id: "media.library", label: "Library", icon: "image" },
    { id: "media.import", label: "Bulk Import", icon: "upload" },
    { id: "media.coverage", label: "Coverage", icon: "check" },
  ] },
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
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(["orders", "menu"]));
  const [mobileNav, setMobileNav] = useState(false);
  const [navQuery, setNavQuery] = useState("");
  const [userMenu, setUserMenu] = useState(false);
  const [quickCreate, setQuickCreate] = useState(false);
  const { orders, orderStatus } = useShop();
  const { lang, setLang } = useLang();
  useTick(4000);

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
    if (active === id) setActive(next.length ? next[next.length - 1] : "dashboard");
  };

  useEffect(() => {
    const h = () => openView("media.coverage");
    window.addEventListener("kb-go-media", h);
    return () => window.removeEventListener("kb-go-media", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const labelOf = (id: string) => ALL_LEAVES.find((l) => l.id === id)?.label ?? id;
  const filteredNav = useMemo(() => {
    if (!navQuery.trim()) return NAV;
    const q = navQuery.toLowerCase();
    return NAV.map((g) => ({
      ...g,
      leaves: g.leaves?.filter((l) => l.label.toLowerCase().includes(q)),
    })).filter((g) => (g.leaves ? g.leaves.length > 0 : g.label.toLowerCase().includes(q)));
  }, [navQuery]);

  const sidebar = (
    <nav className="flex h-full flex-col bg-[#0F3D3E] text-cream">
      <div className="flex items-center gap-2 px-4 py-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" className="h-9 w-9 rounded-full border-2 border-gold/70 bg-cream" />
        <span>
          <span className="block font-display text-sm font-black leading-tight">Kuopio Bites</span>
          <span className="block text-[10px] font-black uppercase tracking-widest text-gold">Kitchen admin</span>
        </span>
      </div>
      <div className="px-3 pb-2">
        <label className="relative block">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-cream/40"><Ic n="search" size={14} /></span>
          <input
            value={navQuery}
            onChange={(e) => setNavQuery(e.target.value)}
            placeholder="Search sections…"
            className="min-h-[34px] w-full rounded-lg border border-cream/15 bg-cream/10 pl-8 pr-2 text-xs font-bold placeholder:text-cream/40 focus:border-gold"
          />
        </label>
      </div>
      <div className="no-scrollbar flex-1 overflow-y-auto px-2 pb-4">
        {filteredNav.map((g) => {
          const isOpen = openGroups.has(g.id) || !!navQuery;
          const groupActive = g.leaves ? g.leaves.some((l) => l.id === active) : g.leaf === active;
          return (
            <div key={g.id} className="mb-0.5">
              <button
                onClick={() => {
                  if (g.leaves && !g.leaf) setOpenGroups((s) => { const nx = new Set(s); nx.has(g.id) ? nx.delete(g.id) : nx.add(g.id); return nx; });
                  if (g.leaf) openView(g.leaf);
                  else if (g.leaves) openView(g.leaves[0].id);
                }}
                className={cx("flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-black transition", groupActive ? "bg-gold text-cherry-dark" : "text-cream/85 hover:bg-cream/10")}
              >
                <Ic n={g.icon} size={16} />
                <span className="flex-1">{g.label}</span>
                {g.leaves && <Ic n="chevD" size={12} className={cx("transition", isOpen && "rotate-180")} />}
              </button>
              <AnimatePresence initial={false}>
                {g.leaves && isOpen && (
                  <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                    {g.leaves.map((l) => (
                      <li key={l.id}>
                        <button
                          onClick={() => openView(l.id)}
                          className={cx("ml-4 flex w-[calc(100%-1rem)] items-center gap-2 rounded-lg border-l-2 px-3 py-1.5 text-left text-xs font-bold transition", active === l.id ? "border-gold bg-cream/10 text-gold" : "border-transparent text-cream/60 hover:text-cream")}
                        >
                          <Ic n={l.icon} size={13} /> {l.label}
                        </button>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
      <div className="border-t border-cream/10 px-4 py-3 text-[10px] font-bold text-cream/50">
        {RESTAURANT_LINE}
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-cream-deep">
      {/* sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 lg:block">{sidebar}</aside>
      <AnimatePresence>
        {mobileNav && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-cherry-dark/50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileNav(false)} />
            <motion.aside className="fixed inset-y-0 left-0 z-50 w-64 lg:hidden" initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", bounce: 0, duration: 0.35 }}>
              {sidebar}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="lg:pl-60">
        {/* top bar */}
        <header className="sticky top-16 z-30 flex items-center gap-2 border-b border-cherry/10 bg-cream/95 px-3 py-2 backdrop-blur sm:px-4">
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
                  {[["menu.items", "New menu item"], ["menu.special", "Today's Special"], ["marketing.promos", "Promo code"], ["dining.list", "Table reservation"]].map(([to, label]) => (
                    <button key={to} onClick={() => { setQuickCreate(false); openView(to); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-black text-cherry hover:bg-cream-deep">
                      <Ic n="plus" size={12} /> {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
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
              className={cx("group inline-flex min-h-[32px] items-center gap-2 whitespace-nowrap rounded-full border px-3 text-xs font-black transition", active === id ? "border-cherry bg-cherry text-cream" : "border-cherry/20 bg-cream-deep text-cherry/70 hover:border-cherry/50")}
            >
              {labelOf(id)}
              <span
                role="button"
                aria-label={`Close ${labelOf(id)}`}
                onClick={(e) => { e.stopPropagation(); closeTab(id); }}
                className={cx("grid h-4 w-4 place-items-center rounded-full text-[10px]", active === id ? "bg-cream/20 hover:bg-cream/40" : "bg-cherry/10 hover:bg-cherry/25")}
              >
                ×
              </span>
            </button>
          ))}
        </div>

        {/* view */}
        <main className="p-3 pt-24 sm:p-5 sm:pt-28">
          <div className="mb-3 flex items-center gap-2">
            <h1 className="font-display text-xl font-black text-cherry">{labelOf(active)}</h1>
            {active.startsWith("orders.") && pending > 0 && <Pill tone="orange">{pending} pending</Pill>}
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={active} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              {renderView(active, openView)}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
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
    case "menu.categories": return <MenuCategoriesView />;
    case "menu.toppings": return <ToppingsMasterView />;
    case "menu.special": return <SpecialsView />;
    case "menu.pricing": return <BulkPricingView />;
    case "marketing.promos": return <MarketingView mode="promos" />;
    case "marketing.subscribers": return <MarketingView mode="subscribers" />;
    case "customers": return <CustomersView />;
    case "localization.translations": return <LocalizationView mode="translations" />;
    case "localization.missing": return <LocalizationView mode="missing" />;
    case "media.library": return <MediaView mode="library" />;
    case "media.import": return <MediaView mode="import" />;
    case "media.coverage": return <MediaView mode="coverage" />;
    case "analytics.sales": return <AnalyticsView mode="sales" />;
    case "analytics.items": return <AnalyticsView mode="items" />;
    case "analytics.peaks": return <AnalyticsView mode="peaks" />;
    case "admin.staff": return <AdminStaffView />;
    case "settings.general": return <SettingsView mode="general" />;
    case "settings.restaurant": return <SettingsView mode="restaurant" />;
    default: return <DashboardView go={go} />;
  }
}
