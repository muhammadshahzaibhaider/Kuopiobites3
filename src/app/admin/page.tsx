"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cx } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { useShop, useTick } from "@/lib/store";
import { Ic } from "@/admin/icons";
import { Pill, useLocal } from "@/admin/ui";
import { DashboardView, OrdersView, DiningView } from "@/admin/views-orders";
import { MenuCategoriesView, MenuItemsView, ToppingsMasterView, SpecialsView } from "@/admin/views-menu";
import { CustomersView, AnalyticsView, AdminStaffView, SettingsView } from "@/admin/views-misc";
import { DeliveryRulesView } from "@/admin/DeliveryRulesView";
import { PromotionsView } from "@/admin/PromotionsView";

/* Staff identity is verified by the backend HttpOnly session, never browser storage. */
export default function AdminPage() {
  const { authChecked, staffRole, adminLogout } = useShop();
  if (!authChecked) return <div className="grid min-h-[60vh] place-items-center text-sm font-bold text-cherry/60">Loading staff session…</div>;
  if (!staffRole) return <Gate />;
  return <AdminShell onLogout={adminLogout} />;
}

function Gate() {
  const { adminLogin } = useShop();
  const { t } = useLang();
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="grid min-h-[80vh] place-items-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-2xl font-black text-cherry">Kuopio Bites · Staff login</h1>
        <p className="mt-1 text-xs text-cherry/60">{t("admin.loginSubtitle")}</p>
        <form
          className="mt-6 space-y-3 rounded-2xl border border-cherry/15 bg-cream-deep p-5 shadow-card"
          onSubmit={async (e) => {
            e.preventDefault(); setErr(""); setBusy(true);
            const problem = await adminLogin(u, p);
            setBusy(false);
            if (problem) setErr(t(problem));
          }}
        >
          <input name="username" autoComplete="username" required className="min-h-[44px] w-full rounded-lg border border-cherry/20 bg-cream px-3 text-sm font-bold" placeholder={t("admin.username")} value={u} onChange={(e) => setU(e.target.value)} />
          <input name="password" type="password" autoComplete="current-password" required className="min-h-[44px] w-full rounded-lg border border-cherry/20 bg-cream px-3 text-sm font-bold" placeholder={t("admin.password")} value={p} onChange={(e) => setP(e.target.value)} />
          {err && <p role="alert" className="text-xs font-bold text-brick">{err}</p>}
          <button disabled={busy} className="min-h-[44px] w-full rounded-lg bg-cherry font-black text-cream hover:bg-cherry-bright disabled:opacity-60">{busy ? t("admin.signingIn") : t("admin.signIn")}</button>
        </form>
      </div>
    </div>
  );
}

/* ── navigation tree ── */
type Leaf = { id: string; label: string; icon: string; labelFi?: string };
type Group = { id: string; label: string; icon: string; labelFi?: string; leaves?: Leaf[]; leaf?: string };

const NAV: Group[] = [
  { id: "dashboard", label: "Dashboard", labelFi: "Yleiskatsaus", icon: "grid", leaf: "dashboard" },
  { id: "orders", label: "Orders", labelFi: "Tilaukset", icon: "orders", leaves: [
    { id: "orders.queue", label: "Live Queue", labelFi: "Live-jono", icon: "clock" },
    { id: "orders.history", label: "History", labelFi: "Historia", icon: "history" },
    { id: "orders.refunds", label: "Refunds", labelFi: "Palautukset", icon: "cash" },
  ] },
  { id: "dining", label: "Dining", labelFi: "Ruokailu", icon: "calendar", leaves: [
    { id: "dining.calendar", label: "Calendar", labelFi: "Kalenteri", icon: "calendar" },
    { id: "dining.list", label: "Reservations", labelFi: "Varaukset", icon: "list" },
    { id: "dining.slots", label: "Slot Settings", labelFi: "Aikavarausten asetukset", icon: "clock" },
  ] },
  { id: "menu", label: "Menu", labelFi: "Ruokalista", icon: "menu", leaves: [
    { id: "menu.items", label: "Items", labelFi: "Tuotteet", icon: "list" },
    { id: "menu.off", label: "Off-menu", labelFi: "Pois valikosta", icon: "warn" },
    { id: "menu.categories", label: "Categories", labelFi: "Kategoriat", icon: "group" },
    { id: "menu.toppings", label: "Toppings", labelFi: "Täytteet", icon: "pizza" },
    { id: "menu.special", label: "Today's Special", labelFi: "Päivän annos", icon: "star" },
    { id: "menu.offers", label: "Offers", labelFi: "Tarjoukset", icon: "cash" },
  ] },
  { id: "customers", label: "Customers", labelFi: "Asiakkaat", icon: "users", leaf: "customers" },
  { id: "analytics", label: "Analytics", labelFi: "Analytiikka", icon: "analytics", leaves: [
    { id: "analytics.sales", label: "Sales", labelFi: "Myynti", icon: "analytics" },
    { id: "analytics.items", label: "Item Performance", labelFi: "Tuotemyynti", icon: "list" },
    { id: "analytics.peaks", label: "Peak Hours", labelFi: "Ruuhka-ajat", icon: "clock" },
  ] },
  { id: "admin", label: "Admin", labelFi: "Hallinta", icon: "shield", leaf: "admin.staff" },
  { id: "settings", label: "Settings", labelFi: "Asetukset", icon: "cog", leaves: [
    { id: "settings.general", label: "General", labelFi: "Yleiset", icon: "cog" },
    { id: "settings.restaurant", label: "Restaurant Info", labelFi: "Ravintolan tiedot", icon: "store" },
    { id: "settings.delivery", label: "Delivery Rules", labelFi: "Toimitussäännöt", icon: "cash" },
  ] },
];

const ALL_LEAVES: Leaf[] = NAV.flatMap((g) => (g.leaves ?? (g.leaf ? [{ id: g.leaf, label: g.label, icon: g.icon }] : [])));

function AdminShell({ onLogout }: { onLogout: () => void }) {
  const [tabs, setTabs] = useLocal<string[]>("kb_admin_tabs", ["dashboard"]);
  const [active, setActive] = useLocal<string>("kb_admin_active", "dashboard");
  const { orders, orderStatus, settings, staffRole } = useShop();
  const { lang, setLang } = useLang();
  const validLeaves = useMemo(() => ALL_LEAVES.filter((leaf) => {
    if (staffRole === "owner") return true;
    if (staffRole === "kitchen") return leaf.id === "orders.queue" || leaf.id === "orders.history" || leaf.id === "menu.items" || leaf.id === "menu.off";
    return leaf.id !== "admin.staff" && (!leaf.id.startsWith("settings.") || leaf.id === "settings.delivery");
  }), [staffRole]);
  const validIds = useMemo(() => new Set(validLeaves.map((leaf) => leaf.id)), [validLeaves]);
  const activeId = validIds.has(active) ? active : "dashboard";
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(["orders", "menu"]));
  const [mobileNav, setMobileNav] = useState(false);
  const [navQuery, setNavQuery] = useState("");
  const [userMenu, setUserMenu] = useState(false);
  const [quickCreate, setQuickCreate] = useState(false);
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
    if (activeId === id) setActive(next.length ? next[next.length - 1] : "dashboard");
  };

  useEffect(() => {
    const clean = tabs.filter((id) => validIds.has(id));
    const next = clean.length ? clean : ["dashboard"];
    if (next.length !== tabs.length || next.some((id, i) => id !== tabs[i])) setTabs(next);
    if (active !== activeId) setActive(next.includes(activeId) ? activeId : next[0]);
  }, [tabs, active, activeId, validIds, setTabs, setActive]);

  const labelOf = (id: string) => {
    const leaf = ALL_LEAVES.find((entry) => entry.id === id);
    return leaf ? (lang === "fi" ? leaf.labelFi ?? leaf.label : leaf.label) : id;
  };
  const roleNav = useMemo(() => NAV.map((group) => ({
    ...group,
    leaves: group.leaves?.filter((leaf) => validIds.has(leaf.id)),
  })).filter((group) => group.id !== "admin" || staffRole === "owner").filter((group) => !group.leaves || group.leaves.length > 0), [validIds, staffRole]);
  const filteredNav = useMemo(() => {
    if (!navQuery.trim()) return roleNav;
    const q = navQuery.toLowerCase();
    return roleNav.map((group) => ({
      ...group,
      leaves: group.leaves?.filter((leaf) => `${leaf.label} ${leaf.labelFi ?? ""}`.toLowerCase().includes(q)),
    })).filter((group) => (group.leaves ? group.leaves.length > 0 : `${group.label} ${group.labelFi ?? ""}`.toLowerCase().includes(q)));
  }, [navQuery, roleNav]);

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
          const groupActive = g.leaves ? g.leaves.some((l) => l.id === activeId) : g.leaf === activeId;
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
                <span className="flex-1">{lang === "fi" ? g.labelFi ?? g.label : g.label}</span>
                {g.leaves && <Ic n="chevD" size={12} className={cx("transition", isOpen && "rotate-180")} />}
              </button>
              <AnimatePresence initial={false}>
                {g.leaves && isOpen && (
                  <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                    {g.leaves.map((l) => (
                      <li key={l.id}>
                        <button
                          onClick={() => openView(l.id)}
                          className={cx("ml-4 flex w-[calc(100%-1rem)] items-center gap-2 rounded-lg border-l-2 px-3 py-1.5 text-left text-xs font-bold transition", activeId === l.id ? "border-gold bg-cream/10 text-gold" : "border-transparent text-cream/60 hover:text-cream")}
                        >
                          <Ic n={l.icon} size={13} /> {lang === "fi" ? l.labelFi ?? l.label : l.label}
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
        {settings.restaurant.address} · {settings.restaurant.phone}
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
                  {[["menu.items", "New menu item"], ["menu.special", "Today's Special"], ["dining.list", "Table reservation"]].map(([to, label]) => (
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
        <main className="p-3 pt-24 sm:p-5 sm:pt-28">
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
    </div>
  );
}


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
    case "menu.off": return <MenuItemsView key="off-menu" initialAvailability="off" />;
    case "menu.categories": return <MenuCategoriesView />;
    case "menu.toppings": return <ToppingsMasterView />;
    case "menu.special": return <SpecialsView />;
    case "menu.offers": return <PromotionsView />;
    case "customers": return <CustomersView />;
    case "analytics.sales": return <AnalyticsView mode="sales" />;
    case "analytics.items": return <AnalyticsView mode="items" />;
    case "analytics.peaks": return <AnalyticsView mode="peaks" />;
    case "admin.staff": return <AdminStaffView />;
    case "settings.general": return <SettingsView mode="general" />;
    case "settings.restaurant": return <SettingsView mode="restaurant" />;
    case "settings.delivery": return <DeliveryRulesView />;
    default: return <DashboardView go={go} />;
  }
}
