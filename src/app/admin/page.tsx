"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { cx } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { useShop, useTick } from "@/lib/store";
import { Ic } from "@/admin/icons";
import { SolidBtn, useLocal } from "@/admin/ui";
import NewOrderAlert from "@/admin/order-alert";
import { playNewOrderChime, playTestChime, unlockAudio } from "@/admin/notify";
import { DashboardView, OrdersView, DiningView } from "@/admin/views-orders";
import { MenuCategoriesView, MenuItemsView, ToppingsMasterView, SpecialsView } from "@/admin/views-menu";
import { CustomersView, AnalyticsView, AdminStaffView, SettingsView } from "@/admin/views-misc";

const ADMIN_USER = "admin";
const ADMIN_PASS = "kuopio2026";

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    setAuthed(sessionStorage.getItem("kb_admin") === "1");
    setChecked(true);
  }, []);
  if (!checked) return <div className="min-h-screen bg-[#F6F1E4]" />;
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

/* ── sign in ─────────────────────────────────────────────── */

function Gate({ onOk }: { onOk: () => void }) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState(false);
  return (
    <div className="grid min-h-screen place-items-center bg-[#F6F1E4] px-4 py-10">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-[28px] border border-cherry/10 bg-white/70 shadow-lift md:grid-cols-[1.05fr_1fr]">
        <div className="relative hidden overflow-hidden bg-cherry-deep p-8 text-cream md:block">
          <span className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-gold/15 blur-3xl" />
          <div className="relative flex h-full flex-col">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" className="h-16 w-16 rounded-full border-2 border-gold/70 bg-cream object-cover" />
            <p className="mt-5 font-display text-3xl font-black leading-tight">Kuopio Bites<br /><span className="text-gold-soft">Kitchen admin</span></p>
            <p className="mt-3 max-w-xs text-sm font-semibold text-cream/65">
              Live orders, menu availability and service timing — one calm place for the whole team.
            </p>
            <ul className="mt-auto space-y-2.5 text-xs font-bold text-cream/75">
              {[
                ["bell", "Instant sound + takeover for new orders"],
                ["timer", "Promise time visible to every customer"],
                ["menu", "Menu, portions and descriptions in one editor"],
              ].map(([icon, text]) => (
                <li key={text} className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-xl border border-cream/15 bg-cream/10 text-gold-soft"><Ic n={icon} size={15} /></span>
                  {text}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-[10px] font-black uppercase tracking-[0.22em] text-cream/35">Jalkasenkatu 7 · Kuopio</p>
          </div>
        </div>

        <div className="p-6 sm:p-9">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-gold-deep">Staff access</p>
          <h1 className="mt-1 font-display text-3xl font-black text-cherry">Welcome back</h1>
          <p className="mt-1 text-sm font-semibold text-cherry/55">Sign in to open today's kitchen.</p>
          <form
            className="mt-6 space-y-3"
            autoComplete="off"
            onSubmit={(e) => {
              e.preventDefault();
              unlockAudio();
              if (u === ADMIN_USER && p === ADMIN_PASS) onOk();
              else setErr(true);
            }}
          >
            <label className="block text-[11px] font-black uppercase tracking-wide text-cherry/50">
              Username
              <input
                name="admin_username"
                autoComplete="off"
                className="mt-1 min-h-[46px] w-full rounded-xl border border-cherry/20 bg-white px-3.5 text-sm font-bold text-cherry outline-none transition focus:border-gold"
                placeholder="admin"
                value={u}
                onChange={(e) => { setU(e.target.value); setErr(false); }}
              />
            </label>
            <label className="block text-[11px] font-black uppercase tracking-wide text-cherry/50">
              Password
              <span className="relative mt-1 block">
                <input
                  type={show ? "text" : "password"}
                  name="admin_password"
                  autoComplete="new-password"
                  className="min-h-[46px] w-full rounded-xl border border-cherry/20 bg-white pl-3.5 pr-11 text-sm font-bold text-cherry outline-none transition focus:border-gold"
                  placeholder="••••••••"
                  value={p}
                  onChange={(e) => { setP(e.target.value); setErr(false); }}
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  aria-label={show ? "Hide password" : "Show password"}
                  className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-cherry/45 hover:bg-cherry/5 hover:text-cherry"
                >
                  <Ic n="eye" size={16} />
                </button>
              </span>
            </label>
            {err && (
              <p className="rounded-xl border border-brick/25 bg-brick/5 px-3 py-2 text-xs font-black text-brick">Wrong username or password.</p>
            )}
            <SolidBtn type="submit" tone="gold" icon="logout" className="w-full">Sign in to admin</SolidBtn>
            <p className="text-center text-[11px] font-semibold text-cherry/40">Demo credentials: admin / kuopio2026</p>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ── navigation tree ─────────────────────────────────────── */

type Leaf = { id: string; label: string; icon: string; desc?: string };
type Group = { id: string; label: string; icon: string; section: string; leaves?: Leaf[]; leaf?: string; desc?: string };

const NAV: Group[] = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard", section: "Service", leaf: "dashboard", desc: "Today at a glance" },
  { id: "orders", label: "Orders", icon: "orders", section: "Service", desc: "Live queue, history & refunds", leaves: [
    { id: "orders.queue", label: "Live queue", icon: "clock", desc: "Accept, prepare and time orders" },
    { id: "orders.history", label: "Order history", icon: "history", desc: "Every order ever placed" },
    { id: "orders.refunds", label: "Refunds", icon: "cash", desc: "Refunded orders and reasons" },
  ] },
  { id: "dining", label: "Dining", icon: "dining", section: "Service", desc: "Table reservations & slots", leaves: [
    { id: "dining.calendar", label: "Calendar", icon: "calendar", desc: "Month view of bookings" },
    { id: "dining.list", label: "Reservations", icon: "list", desc: "Accept or decline requests" },
    { id: "dining.slots", label: "Slot settings", icon: "clock", desc: "Block dates and time slots" },
  ] },
  { id: "menu", label: "Menu", icon: "menu", section: "Kitchen", desc: "Items, categories & pricing", leaves: [
    { id: "menu.items", label: "Items", icon: "list", desc: "Descriptions, portions & prices" },
    { id: "menu.categories", label: "Categories", icon: "group", desc: "Order, images & visibility" },
    { id: "menu.toppings", label: "Toppings", icon: "pizza", desc: "Toppings, extras & availability" },
    { id: "menu.special", label: "Today's special", icon: "star", desc: "Carousel featured dishes" },
  ] },
  { id: "customers", label: "Customers", icon: "users", section: "Business", leaf: "customers", desc: "Profiles, orders & spend" },
  { id: "analytics", label: "Analytics", icon: "analytics", section: "Business", desc: "Sales, items & peak hours", leaves: [
    { id: "analytics.sales", label: "Sales", icon: "analytics", desc: "Revenue and average order" },
    { id: "analytics.items", label: "Item performance", icon: "list", desc: "Best sellers by revenue" },
    { id: "analytics.peaks", label: "Peak hours", icon: "clock", desc: "Staff the kitchen better" },
  ] },
  { id: "admin", label: "Team & audit", icon: "shield", section: "Business", leaf: "admin.staff", desc: "Staff roles and change log" },
  { id: "settings", label: "Settings", icon: "cog", section: "Business", desc: "Hours, delivery & timing", leaves: [
    { id: "settings.general", label: "General", icon: "cog", desc: "Timing, hours & ordering" },
    { id: "settings.restaurant", label: "Restaurant info", icon: "store", desc: "Announcements & content" },
  ] },
];

const ALL_LEAVES: Leaf[] = NAV.flatMap((g) => (g.leaves ?? (g.leaf ? [{ id: g.leaf, label: g.label, icon: g.icon, desc: g.desc }] : [])));

const VIEW_META = (id: string): { title: string; sub: string; eyebrow: string } => {
  const leaf = ALL_LEAVES.find((l) => l.id === id);
  switch (id) {
    case "dashboard": return { eyebrow: "Kitchen admin", title: "Dashboard", sub: "Live orders, revenue and the kitchen's promise time — all in one glance." };
    case "orders.queue": return { eyebrow: "Orders", title: "Live queue", sub: "Accept new orders, set the promise time and move every ticket forward manually." };
    case "orders.history": return { eyebrow: "Orders", title: "Order history", sub: "Search, filter and export every order placed at Kuopio Bites." };
    case "orders.refunds": return { eyebrow: "Orders", title: "Refunds", sub: "Orders that were refunded, with the reason logged for the team." };
    case "dining.calendar": return { eyebrow: "Dining", title: "Reservation calendar", sub: "A month at a glance — tap any booking to review it." };
    case "dining.list": return { eyebrow: "Dining", title: "Reservations", sub: "Accept or decline table requests as they arrive." };
    case "dining.slots": return { eyebrow: "Dining", title: "Slot settings", sub: "Block specific dates or time slots when the dining room is full." };
    case "menu.items": return { eyebrow: "Menu", title: "Menu items", sub: "Every dish has a description; edit names, portions, prices and availability." };
    case "menu.categories": return { eyebrow: "Menu", title: "Categories", sub: "Shape the public menu — images, bilingual names, order and visibility." };
    case "menu.toppings": return { eyebrow: "Menu", title: "Toppings", sub: "The build-your-own list used by Fantasia and Pannu pizzas." };
    case "menu.special": return { eyebrow: "Menu", title: "Today's special", sub: "Curate the carousel that appears at the top of the public menu." };
    case "customers": return { eyebrow: "Business", title: "Customers", sub: "Registered customers, lifetime spend and marketing consent." };
    case "analytics.sales": return { eyebrow: "Analytics", title: "Sales", sub: "Revenue, order volume and average order value over time." };
    case "analytics.items": return { eyebrow: "Analytics", title: "Item performance", sub: "Which dishes earn their place on the menu." };
    case "analytics.peaks": return { eyebrow: "Analytics", title: "Peak hours", sub: "When the kitchen is busiest — staff and prep accordingly." };
    case "admin.staff": return { eyebrow: "Business", title: "Team & audit", sub: "Staff roles and a full log of changes made from the admin panel." };
    case "settings.general": return { eyebrow: "Settings", title: "General settings", sub: "Opening hours, delivery rules, ordering pause and the default kitchen timer." };
    case "settings.restaurant": return { eyebrow: "Settings", title: "Restaurant info", sub: "Announcement strip, pause message and site-wide contact details." };
    default: return { eyebrow: "Kitchen admin", title: leaf?.label ?? "Dashboard", sub: leaf?.desc ?? "" };
  }
};

/* ── shell ───────────────────────────────────────────────── */

function AdminShell({ onLogout }: { onLogout: () => void }) {
  const [tabs, setTabs] = useLocal<string[]>("kb_admin_tabs", ["dashboard"]);
  const [active, setActive] = useLocal<string>("kb_admin_active", "dashboard");
  const validIds = useMemo(() => new Set(ALL_LEAVES.map((leaf) => leaf.id)), []);
  const activeId = validIds.has(active) ? active : "dashboard";
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(["orders"]));
  const [mobileNav, setMobileNav] = useState(false);
  const [navQuery, setNavQuery] = useState("");
  const [command, setCommand] = useState("");
  const [userMenu, setUserMenu] = useState(false);
  const [quickCreate, setQuickCreate] = useState(false);
  const [soundOn, setSoundOn] = useState(() => (typeof window === "undefined" ? true : localStorage.getItem("kb_admin_sound") !== "0"));
  const [expanded, setExpanded] = useState(false);
  const [alertQueue, setAlertQueue] = useState<import("@/lib/types").Order[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const quickRef = useRef<HTMLDivElement>(null);
  const seenOrders = useRef<Set<string> | null>(null);
  const { orders, orderStatus, settings } = useShop();
  const { lang, setLang } = useLang();
  useTick(5000);

  const placed = orders.filter((o) => orderStatus(o) === "placed" && !o.refunded);
  const pending = orders.filter((o) => ["placed", "accepted", "preparing"].includes(orderStatus(o)) && !o.refunded).length;
  const meta = VIEW_META(activeId);

  const openView = (id: string) => {
    setActive(id);
    setTabs((t) => (t.includes(id) ? t : [...t, id]));
    setMobileNav(false);
    setNavQuery("");
    setCommand("");
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

  /* sound preference + browser audio unlock */
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  /* new-order detection: sound + full-screen takeover */
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
    /* drop alerts that were handled elsewhere (another tab/device) */
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
    if (next) {
      unlockAudio();
      playTestChime();
    }
  };

  /* close popovers on outside click */
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserMenu(false);
      if (quickRef.current && !quickRef.current.contains(e.target as Node)) setQuickCreate(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);

  /* ⌘K / Ctrl-K jumps to nav search */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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

  const commandResults = useMemo(() => {
    if (!command.trim()) return [];
    const q = command.toLowerCase();
    return ALL_LEAVES.filter((l) => l.label.toLowerCase().includes(q) || (l.desc ?? "").toLowerCase().includes(q)).slice(0, 7);
  }, [command]);

  const sections = Array.from(new Set(NAV.map((g) => g.section)));

  const navContent = (isMobile: boolean) => {
    const open = isMobile || expanded;
    return (
      <>
        <div className={cx("flex items-center border-b border-cream/10", open ? "gap-3 px-4 py-4" : "justify-center px-2 py-4")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Kuopio Bites" className="h-10 w-10 shrink-0 rounded-full border-2 border-gold/70 bg-cream object-cover" />
          {open && (
            <span className="min-w-0">
              <span className="block truncate font-display text-sm font-black leading-tight text-cream">Kuopio Bites</span>
              <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-gold-soft">Kitchen admin</span>
            </span>
          )}
        </div>

        {open ? (
          <div className="px-3 pt-3">
            <label className="relative block">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cream/35"><Ic n="search" size={14} /></span>
              <input
                value={navQuery}
                onChange={(e) => setNavQuery(e.target.value)}
                placeholder="Find a section…"
                aria-label="Find a section"
                className="min-h-[36px] w-full rounded-xl border border-cream/10 bg-cream/10 pl-9 pr-3 text-xs font-bold text-cream placeholder:text-cream/35 focus:border-gold/60 focus:outline-none"
              />
            </label>
          </div>
        ) : (
          <div className="mx-auto mt-3 h-px w-8 bg-cream/10" />
        )}

        <nav className="no-scrollbar flex-1 overflow-y-auto px-2 py-3" aria-label="Admin sections">
          {filteredNav.map((g, gi) => {
            const isOpen = openGroups.has(g.id) || (!!navQuery && open);
            const groupActive = g.leaves ? g.leaves.some((l) => l.id === activeId) : g.leaf === activeId;
            const showSection = open && (gi === 0 || filteredNav[gi - 1].section !== g.section);
            return (
              <div key={g.id} className="mb-0.5">
                {showSection && (
                  <p className="mb-1 mt-2 px-3 text-[9px] font-black uppercase tracking-[0.22em] text-cream/30 first:mt-0">{g.section}</p>
                )}
                {!open && gi > 0 && filteredNav[gi - 1].section !== g.section && <div className="mx-auto my-2 h-px w-8 bg-cream/10" />}
                <button
                  onClick={() => {
                    if (g.leaf) openView(g.leaf);
                    else if (g.leaves) {
                      if (!open) openView(g.leaves[0].id);
                      else {
                        setOpenGroups((s) => { const nx = new Set(s); if (nx.has(g.id)) nx.delete(g.id); else nx.add(g.id); return nx; });
                        const first = g.leaves[0];
                        if (!g.leaves.some((l) => l.id === activeId)) openView(first.id);
                      }
                    }
                  }}
                  title={!open ? g.label : undefined}
                  aria-current={groupActive ? "page" : undefined}
                  className={cx(
                    "group relative flex w-full items-center rounded-xl text-[13px] font-black transition",
                    open ? "gap-2.5 px-3 py-2.5" : "justify-center px-0 py-2.5",
                    groupActive ? "bg-gold text-cherry-dark shadow-sm" : "text-cream/75 hover:bg-cream/10 hover:text-cream"
                  )}
                >
                  {groupActive && open && <span className="absolute inset-y-2 left-0 w-1 rounded-r bg-cherry-dark/40" />}
                  <Ic n={g.icon} size={18} className="shrink-0" />
                  {open && <span className="flex-1 truncate text-left">{g.label}</span>}
                  {open && g.leaves && <Ic n="chevD" size={12} className={cx("transition-transform", isOpen && "rotate-180")} />}
                </button>
                <AnimatePresence initial={false}>
                  {open && g.leaves && isOpen && (
                    <motion.ul
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden"
                    >
                      {g.leaves.map((l) => {
                        const activeLeaf = activeId === l.id;
                        return (
                          <li key={l.id}>
                            <button
                              onClick={() => openView(l.id)}
                              aria-current={activeLeaf ? "page" : undefined}
                              className={cx(
                                "my-0.5 flex w-full items-center gap-2 rounded-lg py-2 pl-9 pr-3 text-left text-xs font-bold transition",
                                activeLeaf ? "bg-cream/15 text-gold-soft" : "text-cream/55 hover:bg-cream/5 hover:text-cream"
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

        <div className={cx("border-t border-cream/10", open ? "px-3 py-3" : "px-2 py-3")}>
          {open ? (
            <div className="flex items-center gap-2.5 rounded-xl bg-cream/5 px-2.5 py-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold font-display text-[11px] font-black text-cherry-dark">AD</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-black text-cream">admin</span>
                <span className="block text-[9px] font-bold uppercase tracking-wide text-cream/40">Owner</span>
              </span>
              <button onClick={onLogout} aria-label="Log out" title="Log out" className="grid h-8 w-8 place-items-center rounded-lg text-cream/50 hover:bg-cream/10 hover:text-gold-soft">
                <Ic n="logout" size={15} />
              </button>
            </div>
          ) : (
            <button onClick={onLogout} aria-label="Log out" title="Log out" className="mx-auto grid h-10 w-10 place-items-center rounded-xl text-cream/50 hover:bg-cream/10 hover:text-gold-soft">
              <Ic n="logout" size={16} />
            </button>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-[#F6F1E4] text-cherry" style={{ backgroundImage: "radial-gradient(circle at 18% 0%, rgba(232,121,43,0.06), transparent 32%), radial-gradient(circle at 100% 20%, rgba(15,61,62,0.05), transparent 30%)" }}>
      {/* desktop sidebar — icons only by default, expands on hover/focus */}
      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        onFocus={() => setExpanded(true)}
        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setExpanded(false); }}
        className={cx(
          "fixed inset-y-0 left-0 z-50 hidden flex-col border-r border-cream/10 bg-cherry-deep text-cream transition-[width,box-shadow] duration-300 ease-out lg:flex",
          expanded ? "w-[276px] shadow-lift" : "w-[78px]"
        )}
        aria-label="Admin navigation"
      >
        {navContent(false)}
      </aside>

      {/* mobile drawer */}
      <AnimatePresence>
        {mobileNav && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-cherry-dark/60 backdrop-blur-sm lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileNav(false)} />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 flex w-[286px] flex-col bg-cherry-deep text-cream lg:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.35 }}
              aria-label="Admin navigation"
            >
              {navContent(true)}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="lg:pl-[78px]">
        {/* top bar */}
        <header className="sticky top-0 z-30 border-b border-cherry/10 bg-[#FBF7EC]/90 backdrop-blur-md">
          <div className="flex h-16 items-center gap-2 px-3 sm:px-5">
            <button onClick={() => setMobileNav(true)} aria-label="Open navigation" className="grid h-10 w-10 place-items-center rounded-xl border border-cherry/15 text-cherry lg:hidden">
              <Ic n="menu" size={18} />
            </button>

            <div className="hidden min-w-0 items-center gap-2 lg:flex">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-cherry/35">Admin</span>
              <Ic n="chevR" size={11} className="text-cherry/25" />
              <span className="truncate text-xs font-black text-cherry/75">{labelOf(activeId)}</span>
            </div>

            <div className="relative hidden min-w-0 flex-1 md:ml-4 md:block md:max-w-[360px]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cherry/35"><Ic n="search" size={15} /></span>
              <input
                ref={searchRef}
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && commandResults[0]) openView(commandResults[0].id);
                  if (e.key === "Escape") setCommand("");
                }}
                placeholder="Search admin… (⌘K)"
                aria-label="Search admin sections"
                className="min-h-[40px] w-full rounded-xl border border-cherry/10 bg-white/70 pl-9 pr-3 text-xs font-bold text-cherry placeholder:text-cherry/35 transition focus:border-gold focus:bg-white focus:outline-none"
              />
              {command.trim() && (
                <div className="absolute left-0 right-0 top-[46px] z-50 overflow-hidden rounded-2xl border border-cherry/10 bg-cream shadow-lift">
                  {commandResults.length ? commandResults.map((l) => (
                    <button key={l.id} onClick={() => openView(l.id)} className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left hover:bg-cream-deep">
                      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-cherry/5 text-cherry/60"><Ic n={l.icon} size={14} /></span>
                      <span>
                        <span className="block text-xs font-black text-cherry">{l.label}</span>
                        {l.desc && <span className="block text-[10px] font-semibold text-cherry/45">{l.desc}</span>}
                      </span>
                    </button>
                  )) : <p className="px-3 py-4 text-xs font-bold text-cherry/45">No sections found.</p>}
                </div>
              )}
            </div>

            <div className="ml-auto flex items-center gap-1.5">
              <button
                onClick={() => openView("settings.general")}
                className={cx(
                  "hidden min-h-[34px] items-center gap-1.5 rounded-full border px-2.5 text-[10px] font-black uppercase tracking-wide transition xl:inline-flex",
                  settings.paused ? "border-brick/30 bg-brick/10 text-brick" : "border-[#2e7d32]/25 bg-[#e6f4e7] text-[#2e7d32]"
                )}
                title={settings.paused ? "Online ordering is paused" : "Online ordering is live"}
              >
                <span className={cx("h-1.5 w-1.5 rounded-full", settings.paused ? "bg-brick" : "bg-[#2e7d32]")} />
                {settings.paused ? "Paused" : "Online"}
              </button>

              <button
                onClick={toggleSound}
                aria-label={soundOn ? "Mute new-order sound" : "Enable new-order sound"}
                title={soundOn ? "New-order sound is on" : "New-order sound is off"}
                className={cx(
                  "grid h-10 w-10 place-items-center rounded-xl border transition",
                  soundOn ? "border-gold/40 bg-gold/10 text-gold-deep" : "border-cherry/15 bg-white/60 text-cherry/40"
                )}
              >
                <Ic n={soundOn ? "volume" : "volumeOff"} size={17} />
              </button>

              <button
                onClick={() => openView("orders.queue")}
                aria-label={`Pending orders (${pending})`}
                title={`${placed.length} new · ${pending} active`}
                className="relative grid h-10 w-10 place-items-center rounded-xl border border-cherry/15 bg-white/60 text-cherry/70 transition hover:border-cherry/35 hover:text-cherry"
              >
                <Ic n="bell" size={17} />
                {pending > 0 && (
                  <span className={cx("absolute -right-1.5 -top-1.5 grid h-5 min-w-[20px] place-items-center rounded-full px-1 text-[10px] font-black text-cream", placed.length ? "bg-brick motion-safe:animate-pulse" : "bg-gold-deep")}>
                    {placed.length || pending}
                  </span>
                )}
              </button>

              <button
                onClick={() => setLang(lang === "fi" ? "en" : "fi")}
                aria-label="Switch language"
                className="hidden min-h-[40px] items-center gap-1 rounded-xl border border-cherry/15 bg-white/60 px-2.5 text-[11px] font-black uppercase text-cherry/70 hover:border-cherry/35 sm:inline-flex"
              >
                <Ic n="lang" size={14} /> {lang === "fi" ? "EN" : "FI"}
              </button>

              <div className="relative" ref={quickRef}>
                <button
                  onClick={() => { setQuickCreate((v) => !v); setUserMenu(false); }}
                  aria-label="Quick create"
                  className="grid h-10 w-10 place-items-center rounded-xl bg-gold text-cherry-dark shadow-sm transition hover:bg-gold-deep hover:text-cream"
                >
                  <Ic n="plus" size={17} />
                </button>
                {quickCreate && (
                  <div className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-2xl border border-cherry/10 bg-cream shadow-lift">
                    <p className="px-3 pb-1 pt-2.5 text-[9px] font-black uppercase tracking-[0.18em] text-cherry/40">Quick create</p>
                    {[["menu.items", "New menu item", "list"], ["menu.special", "Today's special", "star"], ["dining.list", "Table reservation", "calendar"], ["menu.categories", "New category", "group"]].map(([to, label, icon]) => (
                      <button key={to} onClick={() => { setQuickCreate(false); openView(to); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-black text-cherry hover:bg-cream-deep">
                        <Ic n={icon} size={13} className="text-cherry/45" /> {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative" ref={userRef}>
                <button
                  onClick={() => { setUserMenu((v) => !v); setQuickCreate(false); }}
                  aria-label="Account menu"
                  aria-expanded={userMenu}
                  className="grid h-10 w-10 place-items-center rounded-full border border-gold/60 bg-cherry font-display text-[11px] font-black text-cream transition hover:bg-cherry-bright"
                >
                  AD
                </button>
                {userMenu && (
                  <div className="absolute right-0 top-12 z-50 w-52 overflow-hidden rounded-2xl border border-cherry/10 bg-cream shadow-lift">
                    <div className="border-b border-cherry/10 px-3 py-2.5">
                      <p className="text-xs font-black text-cherry">admin</p>
                      <p className="text-[10px] font-semibold text-cherry/45">Owner · kitchen admin</p>
                    </div>
                    <button onClick={() => { setUserMenu(false); openView("settings.general"); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-black text-cherry hover:bg-cream-deep">
                      <Ic n="cog" size={13} /> Settings
                    </button>
                    <button onClick={() => { setUserMenu(false); toggleSound(); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-black text-cherry hover:bg-cream-deep">
                      <Ic n={soundOn ? "volumeOff" : "volume"} size={13} /> {soundOn ? "Mute alerts" : "Enable alerts"}
                    </button>
                    <button onClick={onLogout} className="flex w-full items-center gap-2 border-t border-cherry/10 px-3 py-2 text-left text-xs font-black text-brick hover:bg-cream-deep">
                      <Ic n="logout" size={13} /> Log out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* open tabs */}
        <div className="sticky top-16 z-20 border-b border-cherry/10 bg-[#F6F1E4]/95 backdrop-blur-sm">
          <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto px-3 py-2 sm:px-5">
            {tabs.map((id) => (
              <button
                key={id}
                onClick={() => setActive(id)}
                className={cx(
                  "group inline-flex min-h-[32px] shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-3 text-[11px] font-black transition",
                  activeId === id
                    ? "border-cherry bg-cherry text-cream shadow-sm"
                    : "border-cherry/12 bg-white/50 text-cherry/60 hover:border-cherry/30 hover:text-cherry"
                )}
              >
                {labelOf(id)}
                <span
                  role="button"
                  aria-label={`Close ${labelOf(id)}`}
                  onClick={(e) => { e.stopPropagation(); closeTab(id); }}
                  className={cx(
                    "grid h-4 w-4 place-items-center rounded-full text-[10px] transition",
                    activeId === id ? "bg-cream/20 hover:bg-cream/35" : "bg-cherry/10 hover:bg-cherry/20"
                  )}
                >
                  ×
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* view */}
        <div className="mx-auto w-full max-w-[1480px] px-3 py-5 sm:px-5 sm:py-6 lg:px-7">
          <PageHeading meta={meta} />
          <AnimatePresence mode="wait">
            <motion.div key={activeId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.16 }}>
              {renderView(activeId, openView)}
            </motion.div>
          </AnimatePresence>
        </div>
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

function PageHeading({ meta }: { meta: { title: string; sub: string; eyebrow: string } }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-gold-deep">{meta.eyebrow}</p>
        <h1 className="font-display text-2xl font-black tracking-tight text-cherry sm:text-[28px]">{meta.title}</h1>
        <p className="mt-1 max-w-2xl text-sm font-semibold text-cherry/55">{meta.sub}</p>
      </div>
      <div className="flex items-center gap-2 text-[11px] font-bold text-cherry/40">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-cherry/10 bg-white/50 px-2.5 py-1">
          <Ic n="clock" size={12} />
          {new Date().toLocaleDateString("fi-FI", { weekday: "short", day: "numeric", month: "short" })}
        </span>
      </div>
    </div>
  );
}

/* ── view router ─────────────────────────────────────────── */

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
