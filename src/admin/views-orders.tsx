"use client";
import { useMemo, useState } from "react";
import { clockLabel, countdownLabel, eur, readyAtOf } from "@/lib/format";
import { todayStrHelsinki } from "@/lib/hours";
import { useLang } from "@/lib/i18n";
import { useShop, useTick } from "@/lib/store";
import type { Order, OrderStatus, Reservation } from "@/lib/types";
import { Ic } from "./icons";
import {
  Bars, Confirm, DataTable, Drawer, EmptyState, EtaPill, Field, GhostBtn, Panel, PanelHead,
  Pill, PrimaryBtn, SolidBtn, StatCard, Toolbar, downloadCSV, fmtDT, inputCls, statusTone, useDelayedReady, SkeletonRows,
  type Col, type FilterDef,
} from "./ui";

const NEXT: Record<OrderStatus, OrderStatus> = {
  placed: "accepted", accepted: "preparing", preparing: "ready", ready: "completed", completed: "completed", cancelled: "cancelled",
};
const ACTIVE: OrderStatus[] = ["placed", "accepted", "preparing", "ready"];
const ALL_STATUSES: OrderStatus[] = ["placed", "accepted", "preparing", "ready", "completed", "cancelled"];

/* ══ DASHBOARD ══ */
export function DashboardView({ go }: { go: (v: string) => void }) {
  const { orders, reservations, users, orderStatus, settings, saveSettings, logAudit, toast, acceptOrder } = useShop();
  const { t } = useLang();
  const [range, setRange] = useState<7 | 30>(7);
  const [confirmPause, setConfirmPause] = useState(false);
  const ready = useDelayedReady("dash");
  const today = todayStrHelsinki();
  useTick(5000);

  const todays = orders.filter((o) => new Date(o.createdAt).toLocaleDateString("en-CA", { timeZone: "Europe/Helsinki" }) === today);
  const revenue = todays.filter((o) => !o.refunded).reduce((a, o) => a + o.total, 0);
  const newOrders = orders.filter((o) => orderStatus(o) === "placed" && !o.refunded);
  const inProgress = orders.filter((o) => ["accepted", "preparing"].includes(orderStatus(o)) && !o.refunded);
  const readyOrders = orders.filter((o) => orderStatus(o) === "ready" && !o.refunded);
  const pending = newOrders.length + inProgress.length;
  const upcoming = reservations.filter((r) => r.date >= today && r.status !== "declined").length;
  const newUsers = users.filter((u) => new Date(u.createdAt).toLocaleDateString("en-CA", { timeZone: "Europe/Helsinki" }) === today).length;
  const offCount = Object.values(settings.offItems).filter((s) => s.off || s.offToday === today).length;

  const days = useMemo(() => {
    return Array.from({ length: range }).map((_, i) => {
      const d = new Date(Date.now() - (range - 1 - i) * 86400000);
      const key = d.toLocaleDateString("en-CA", { timeZone: "Europe/Helsinki" });
      const total = Math.round(orders.filter((o) => !o.refunded && new Date(o.createdAt).toLocaleDateString("en-CA", { timeZone: "Europe/Helsinki" }) === key).reduce((a, o) => a + o.total, 0));
      return { label: d.toLocaleDateString("en-GB", { weekday: "short", timeZone: "Europe/Helsinki" }), value: total };
    });
  }, [orders, range]);

  const top = useMemo(() => {
    const count: Record<string, number> = {};
    const since = Date.now() - range * 86400000;
    orders.filter((o) => o.createdAt >= since && !o.refunded).forEach((o) => o.lines.forEach((l) => (count[l.name] = (count[l.name] ?? 0) + l.qty)));
    return Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [orders, range]);

  const feed = useMemo(() => [...orders].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6), [orders]);
  const hour = new Date().getHours();
  const greeting = hour < 11 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  if (!ready) return <SkeletonRows n={8} />;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* live service hero */}
      <section className="relative overflow-hidden rounded-[28px] bg-cherry-deep p-5 text-cream shadow-lift sm:p-6">
        <span className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-gold/15 blur-3xl" />
        <span className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-[#2e7d32]/15 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-gold-soft">
              <span className="relative flex h-2 w-2">
                <span className={settings.paused ? "relative inline-flex h-2 w-2 rounded-full bg-brick" : "absolute inline-flex h-full w-full animate-ping rounded-full bg-[#8fd694] motion-reduce:animate-none"} />
                <span className={settings.paused ? "relative inline-flex h-2 w-2 rounded-full bg-brick" : "relative inline-flex h-2 w-2 rounded-full bg-[#8fd694]"} />
              </span>
              {settings.paused ? "Online ordering paused" : "Live service"}
            </p>
            <h2 className="mt-1 font-display text-2xl font-black leading-tight sm:text-3xl">{greeting}, kitchen 👋</h2>
            <p className="mt-1 max-w-xl text-sm font-semibold text-cream/60">
              {newOrders.length
                ? `${newOrders.length} new order${newOrders.length > 1 ? "s" : ""} waiting for your decision.`
                : pending
                  ? `${pending} order${pending > 1 ? "s" : ""} in the kitchen right now.`
                  : "Everything is under control — no open tickets."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <SolidBtn tone="gold" icon="orders" onClick={() => go("orders.queue")}>Open live queue</SolidBtn>
            <button
              onClick={() => setConfirmPause(true)}
              className={settings.paused
                ? "inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-[#2e7d32] px-4 text-sm font-black text-cream transition hover:bg-[#236327]"
                : "inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-cream/25 px-4 text-sm font-black text-cream/80 transition hover:border-cream hover:text-cream"}
            >
              <Ic n={settings.paused ? "play" : "toggle"} size={15} /> {settings.paused ? "Resume ordering" : "Pause ordering"}
            </button>
          </div>
        </div>
        <div className="relative mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: "New orders", value: newOrders.length, icon: "bell", tone: newOrders.length ? "text-gold-soft" : "text-cream" },
            { label: "In kitchen", value: inProgress.length, icon: "flame", tone: "text-cream" },
            { label: "Ready", value: readyOrders.length, icon: "checkCircle", tone: "text-[#8fd694]" },
            { label: "Revenue today", value: eur(revenue), icon: "analytics", tone: "text-cream" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-cream/10 bg-cream/5 px-3.5 py-2.5">
              <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-cream/45"><Ic n={s.icon} size={11} /> {s.label}</span>
              <span className={`mt-0.5 block font-display text-xl font-black tabular-nums ${s.tone}`}>{s.value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* stat cards */}
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Orders today" value={todays.length} icon="orders" onClick={() => go("orders.history")} hint="All tickets today" />
        <StatCard label="Pending now" value={pending} icon="clock" tone="orange" onClick={() => go("orders.queue")} hint={`${newOrders.length} awaiting accept`} />
        <StatCard label="Reservations" value={upcoming} icon="calendar" tone="gold" onClick={() => go("dining.list")} hint="Upcoming bookings" />
        <StatCard label="Off-menu items" value={offCount} icon="warn" tone={offCount ? "red" : "gray"} onClick={() => go("menu.items")} hint="Sold out right now" />
      </div>

      {/* new orders needing action */}
      {newOrders.length > 0 && (
        <Panel>
          <PanelHead
            title="Needs your decision"
            sub="New orders stay on hold — and the customer's timer starts — only when you accept."
            icon="bell"
            action={<GhostBtn onClick={() => go("orders.queue")}>Open queue</GhostBtn>}
          />
          <div className="grid gap-2 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {newOrders.slice(0, 3).map((o) => (
              <div key={o.id} className="rounded-2xl border border-gold/40 bg-gold/5 p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-lg font-black text-cherry">{o.id}</p>
                    <p className="text-[11px] font-bold text-cherry/50">{fmtDT(o.createdAt)} · {o.type}</p>
                  </div>
                  <Pill tone="orange">new</Pill>
                </div>
                <p className="mt-2 text-sm font-bold text-cherry/75">{o.customer.name}</p>
                <p className="text-xs font-semibold text-cherry/50">{o.lines.reduce((n, l) => n + l.qty, 0)} items · {eur(o.total)}</p>
                <div className="mt-2.5 flex gap-1.5">
                  <SolidBtn tone="green" icon="check" className="min-h-[34px] flex-1 px-2 text-xs" onClick={() => { void acceptOrder(o.id); toast(`${o.id} accepted · ready in ${o.etaMinutes ?? settings.prepTimeMinutes} min`); }}>
                    Accept
                  </SolidBtn>
                  <GhostBtn onClick={() => go("orders.queue")}>Review</GhostBtn>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <PanelHead title="Revenue" sub={`Last ${range} days`} icon="analytics"
            action={<div className="flex gap-1">{[7, 30].map((r) => (
              <button key={r} onClick={() => setRange(r as 7 | 30)} className={r === range ? "rounded-lg bg-cherry px-2.5 py-1 text-[11px] font-black text-cream" : "rounded-lg px-2.5 py-1 text-[11px] font-black text-cherry/45 hover:bg-cherry/5"}>{r}d</button>
            ))}</div>}
          />
          <div className="p-4 pt-3"><Bars data={days} height={150} /></div>
        </Panel>
        <Panel>
          <PanelHead title="Top sellers" sub={`${range}-day ranking`} icon="flame" />
          <ul className="space-y-1.5 p-4">
            {top.map(([name, n], i) => (
              <li key={name} className="flex items-center gap-2.5 text-sm">
                <span className={i === 0 ? "grid h-6 w-6 place-items-center rounded-lg bg-gold text-[11px] font-black text-cherry-dark" : "grid h-6 w-6 place-items-center rounded-lg bg-cherry/5 text-[11px] font-black text-cherry/50"}>{i + 1}</span>
                <span className="min-w-0 flex-1 truncate font-bold text-cherry">{name}</span>
                <span className="font-black tabular-nums text-cherry/55">×{n}</span>
              </li>
            ))}
            {top.length === 0 && <li className="text-xs font-semibold text-cherry/45">No sales in range yet.</li>}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <PanelHead title="Latest orders" sub="Updated live" icon="orders" action={<GhostBtn onClick={() => go("orders.history")}>See all</GhostBtn>} />
          <ul className="divide-y divide-cherry/5">
            {feed.map((o) => (
              <li key={o.id}>
                <button onClick={() => go("orders.queue")} className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-cherry/5">
                  <span className="font-black text-cherry">{o.id}</span>
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold text-cherry/55">{fmtDT(o.createdAt)} · {o.customer.name} · {o.type}</span>
                  <span className="hidden sm:block"><EtaPill createdAt={o.createdAt} readyAt={o.readyAt} etaMinutes={o.etaMinutes} prefix="" /></span>
                  <span className="font-black tabular-nums text-cherry">{eur(o.total)}</span>
                  <Pill tone={statusTone(orderStatus(o))}>{orderStatus(o)}</Pill>
                </button>
              </li>
            ))}
            {feed.length === 0 && <li className="px-4 py-10 text-center text-sm font-semibold text-cherry/45">No orders yet — new tickets appear here instantly.</li>}
          </ul>
        </Panel>
        <Panel>
          <PanelHead title="Quick actions" icon="sparkle" />
          <div className="space-y-2 p-4">
            <SolidBtn tone="gold" icon="plus" className="w-full justify-start" onClick={() => go("menu.items")}>Add a menu item</SolidBtn>
            <GhostBtn className="w-full justify-start" onClick={() => go("menu.special")}><Ic n="star" size={14} /> Set today's special</GhostBtn>
            <GhostBtn className="w-full justify-start" onClick={() => go("menu.categories")}><Ic n="group" size={14} /> Edit categories</GhostBtn>
            <GhostBtn className="w-full justify-start" onClick={() => go("settings.general")}><Ic n="timer" size={14} /> Default prep time · {settings.prepTimeMinutes} min</GhostBtn>
            <button
              onClick={() => setConfirmPause(true)}
              className={settings.paused ? "min-h-[38px] w-full rounded-xl bg-[#2e7d32] px-4 text-sm font-black text-cream" : "min-h-[38px] w-full rounded-xl border border-brick/40 px-4 text-sm font-black text-brick hover:bg-brick hover:text-cream"}
            >
              {settings.paused ? "Resume online ordering" : "Pause online ordering"}
            </button>
          </div>
        </Panel>
      </div>

      <Confirm
        open={confirmPause}
        title={settings.paused ? "Resume online ordering?" : "Pause online ordering?"}
        body={settings.paused ? "Customers will be able to order again immediately." : "Customers will see the site as closed for online orders until you resume."}
        danger={!settings.paused}
        onNo={() => setConfirmPause(false)}
        onYes={() => {
          saveSettings({ ...settings, paused: !settings.paused });
          logAudit(`ordering ${settings.paused ? "resumed" : "paused"} from dashboard`);
          toast(settings.paused ? "Ordering resumed" : "Ordering paused", settings.paused ? "ok" : "err");
          setConfirmPause(false);
        }}
      />
    </div>
  );
}

/* ══ ORDERS ══ */
export function OrdersView({ mode }: { mode: "queue" | "history" | "refunds" }) {
  const shop = useShop();
  const { orders, orderStatus, setOrderStatus, setOrderEta, acceptOrder, declineOrder, refundOrder, toast, logAudit, settings } = shop;
  const [fStatus, setFStatus] = useState("all");
  const [fType, setFType] = useState("all");
  const [fDate, setFDate] = useState("all");
  const [group, setGroup] = useState("none");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [etaMinutes, setEtaMinutes] = useState(settings.prepTimeMinutes || 25);
  const ready = useDelayedReady(mode);
  useTick(5000);

  const detail = detailId ? orders.find((o) => o.id === detailId) ?? null : null;
  const newOrders = useMemo(() => orders.filter((o) => orderStatus(o) === "placed" && !o.refunded).sort((a, b) => a.createdAt - b.createdAt), [orders, orderStatus]);

  const base = useMemo(() => {
    let list = [...orders].sort((a, b) => b.createdAt - a.createdAt);
    if (mode === "refunds") list = list.filter((o) => o.refunded);
    if (mode === "queue") list = list.filter((o) => ACTIVE.includes(orderStatus(o)) && !o.refunded);
    return list;
  }, [orders, mode, orderStatus]);

  const rows = useMemo(() => {
    let list = base;
    if (fStatus !== "all") list = list.filter((o) => orderStatus(o) === fStatus);
    if (fType !== "all") list = list.filter((o) => o.type === fType);
    if (fDate === "today") {
      const today = todayStrHelsinki();
      list = list.filter((o) => new Date(o.createdAt).toLocaleDateString("en-CA", { timeZone: "Europe/Helsinki" }) === today);
    }
    return list;
  }, [base, fStatus, fType, fDate, orderStatus]);

  const groups = useMemo(() => {
    if (group === "none") return null;
    const m = new Map<string, Order[]>();
    for (const o of rows) {
      const k = group === "status" ? orderStatus(o) : new Date(o.createdAt).toLocaleString("en-GB", { hour: "2-digit", timeZone: "Europe/Helsinki" }) + ":00";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(o);
    }
    return Array.from(m.entries());
  }, [rows, group, orderStatus]);

  const filters: FilterDef[] = [
    { id: "status", label: "Status", value: fStatus, set: setFStatus, options: [{ value: "all", label: "All statuses" }, ...ALL_STATUSES.map((s) => ({ value: s, label: s }))] },
    { id: "type", label: "Type", value: fType, set: setFType, options: [{ value: "all", label: "Pickup + Delivery" }, { value: "pickup", label: "Pickup" }, { value: "delivery", label: "Delivery" }] },
    { id: "date", label: "Date", value: fDate, set: setFDate, options: [{ value: "all", label: "All dates" }, { value: "today", label: "Today" }] },
  ];

  const cols: Col<Order>[] = [
    { key: "id", label: "Order", sort: (o) => o.id, render: (o) => (
      <span className="flex flex-col">
        <span className="font-black text-cherry">{o.id}</span>
        <span className="text-[10px] font-bold text-cherry/40">{clockLabel(o.createdAt)}</span>
      </span>
    ) },
    { key: "customer", label: "Customer", sort: (o) => o.customer.name, render: (o) => (
      <span className="flex flex-col">
        <span className="font-bold text-cherry">{o.customer.name}</span>
        <span className="text-[11px] font-semibold text-cherry/45">{o.type === "delivery" ? "Delivery" : "Pickup"} · {o.lines.reduce((n, l) => n + l.qty, 0)} items</span>
      </span>
    ) },
    { key: "placed", label: "Placed", hideMd: true, sort: (o) => o.createdAt, render: (o) => <span className="tabular-nums text-cherry/60">{fmtDT(o.createdAt)}</span> },
    { key: "eta", label: "Promise", render: (o) => (orderStatus(o) === "cancelled" || orderStatus(o) === "completed") ? <span className="text-cherry/35">—</span> : <EtaPill createdAt={o.createdAt} readyAt={o.readyAt} etaMinutes={o.etaMinutes} /> },
    { key: "total", label: "Total", sort: (o) => o.total, render: (o) => <span className="font-black tabular-nums">{eur(o.total)}</span> },
    { key: "status", label: "Status", render: (o) => <Pill tone={statusTone(orderStatus(o))}>{orderStatus(o)}</Pill> },
  ];

  const renderTable = (list: Order[]) => (
    <DataTable
      rows={list}
      cols={cols}
      id={(o) => o.id}
      loading={!ready}
      search={(o, q) => o.id.toLowerCase().includes(q) || o.customer.name.toLowerCase().includes(q) || o.customer.phone.includes(q) || o.customer.email.toLowerCase().includes(q)}
      onRow={(o) => { setDetailId(o.id); setEtaMinutes(o.etaMinutes ?? settings.prepTimeMinutes ?? 25); }}
      rowMenu={(o) => [
        { label: "View detail", icon: "eye", onClick: () => { setDetailId(o.id); setEtaMinutes(o.etaMinutes ?? settings.prepTimeMinutes ?? 25); } },
        { label: "Print ticket", icon: "print", onClick: () => printTicket(o) },
        ...(orderStatus(o) === "placed" ? [{ label: "Accept order", icon: "check", onClick: () => { void acceptOrder(o.id); toast(`${o.id} accepted`); } }] : []),
        ...(!o.refunded ? [{ label: "Refund…", icon: "trash", danger: true, onClick: () => setDetailId(o.id) }] : []),
      ]}
      empty={<EmptyState icon="orders" title="No orders here" sub={mode === "queue" ? "New orders appear instantly with a sound and a full-screen alert." : "Orders will show up as customers check out."} />}
      pageSizeDefault={25}
    />
  );

  return (
    <div className="space-y-4">
      {mode === "queue" && newOrders.length > 0 && (
        <Panel className="border-gold/50">
          <PanelHead
            icon="bell"
            title={`${newOrders.length} order${newOrders.length > 1 ? "s" : ""} waiting for acceptance`}
            sub="Status never changes by itself — accept or decline each ticket, then move it through the kitchen manually."
          />
          <div className="grid gap-2 p-4 lg:grid-cols-2">
            {newOrders.map((o) => (
              <div key={o.id} className="rounded-2xl border border-gold/40 bg-gold/5 p-3.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-lg font-black text-cherry">{o.id} <span className="ml-1 align-middle"><Pill tone="orange">new</Pill></span></p>
                    <p className="text-[11px] font-bold text-cherry/50">{fmtDT(o.createdAt)} · {o.customer.name} · {o.type} · {eur(o.total)}</p>
                  </div>
                  <span className="text-[11px] font-bold text-cherry/45">{o.lines.reduce((n, l) => n + l.qty, 0)} items</span>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <SolidBtn tone="green" icon="check" className="min-h-[34px] px-3 text-xs" onClick={() => { void acceptOrder(o.id); toast(`${o.id} accepted · ready in ${settings.prepTimeMinutes} min`); }}>
                    Accept · {settings.prepTimeMinutes} min
                  </SolidBtn>
                  <GhostBtn onClick={() => { setDetailId(o.id); setEtaMinutes(settings.prepTimeMinutes ?? 25); }}>Set time & review</GhostBtn>
                  <button onClick={() => { void declineOrder(o.id, "Declined from queue"); toast(`${o.id} declined`, "err"); }} className="ml-auto text-[11px] font-black text-brick underline underline-offset-4">Decline</button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <Panel>
        <Toolbar
          filters={filters}
          group={group}
          onGroup={setGroup}
          groupOptions={[{ value: "none", label: "No grouping" }, { value: "status", label: "By status" }, { value: "hour", label: "By hour" }]}
          action={<PrimaryBtn icon="csv" onClick={() => downloadCSV("orders.csv", [["id", "date", "customer", "type", "total", "status"], ...rows.map((o) => [o.id, fmtDT(o.createdAt), o.customer.name, o.type, o.total, orderStatus(o)])])}>Export CSV</PrimaryBtn>}
        />
        {groups ? (
          <div className="space-y-4 p-4">
            {groups.map(([k, list]) => (
              <div key={k} className="overflow-hidden rounded-2xl border border-cherry/10 bg-white/60">
                <p className="border-b border-cherry/10 bg-cream-deep/60 px-4 py-2 text-xs font-black uppercase text-cherry/60">{k} · {list.length}</p>
                {renderTable(list)}
              </div>
            ))}
          </div>
        ) : renderTable(rows)}
      </Panel>

      <Drawer open={!!detail} onClose={() => setDetailId(null)} title={detail ? `Order ${detail.id}` : ""} wide>
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={statusTone(orderStatus(detail))}>{orderStatus(detail)}</Pill>
              <Pill tone={detail.type === "delivery" ? "teal" : "gray"}>{detail.type}</Pill>
              {detail.scheduled && <Pill tone="gold">pre-order {detail.scheduled.date} {detail.scheduled.time}</Pill>}
              {detail.refunded && <Pill tone="red">refunded</Pill>}
              <span className="ml-auto text-[11px] font-bold text-cherry/40">{fmtDT(detail.createdAt)}</span>
            </div>

            {/* promise time */}
            {!detail.refunded && ACTIVE.includes(orderStatus(detail)) ? (
              <div className="rounded-2xl border-2 border-gold/50 bg-gold/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-gold-deep"><Ic n="timer" size={14} /> Promise time</p>
                  <EtaPill createdAt={detail.createdAt} readyAt={detail.readyAt} etaMinutes={detail.etaMinutes} />
                </div>
                <p className="mt-1.5 font-display text-2xl font-black text-cherry">
                  {detail.readyAt ? clockLabel(detail.readyAt) : clockLabel(readyAtOf(detail))}
                  <span className="ml-2 text-sm font-bold text-cherry/45">{detail.etaMinutes ?? settings.prepTimeMinutes} min total</span>
                </p>
                <div className="mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-6">
                  {[10, 15, 20, 25, 30, 45].map((m) => (
                    <button
                      key={m}
                      onClick={() => { setEtaMinutes(m); void setOrderEta(detail.id, m); toast(`${detail.id} timer set to ${m} min`); }}
                      className={`min-h-[34px] rounded-lg border text-xs font-black tabular-nums transition ${etaMinutes === m ? "border-cherry bg-cherry text-cream" : "border-cherry/20 bg-white/70 text-cherry hover:border-cherry"}`}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-2 text-[11px] font-bold text-cherry/55">
                    Custom
                    <input
                      type="number"
                      min={1}
                      max={240}
                      value={etaMinutes}
                      onChange={(e) => setEtaMinutes(Math.max(1, Math.min(240, parseInt(e.target.value) || 1)))}
                      className="h-9 w-20 rounded-lg border border-cherry/20 bg-white px-2 text-sm font-black tabular-nums text-cherry"
                    />
                    min
                  </label>
                  <GhostBtn onClick={() => { void setOrderEta(detail.id, etaMinutes); toast(`Promise time updated to ${etaMinutes} min`); }}>Apply timer</GhostBtn>
                  <span className="text-[10px] font-semibold text-cherry/40">The customer sees this as a live countdown.</span>
                </div>
              </div>
            ) : null}

            {orderStatus(detail) === "placed" && (
              <div className="flex flex-wrap gap-2 rounded-2xl border border-[#2e7d32]/30 bg-[#e6f4e7] p-3">
                <SolidBtn tone="green" icon="checkCircle" onClick={() => { void acceptOrder(detail.id, etaMinutes); toast(`${detail.id} accepted · ready in ${etaMinutes} min`); }}>Accept order</SolidBtn>
                <SolidBtn tone="danger" icon="xCircle" onClick={() => { void declineOrder(detail.id, "Declined by kitchen"); toast(`${detail.id} declined`, "err"); }}>Decline</SolidBtn>
                <span className="self-center text-[11px] font-bold text-cherry/50">Accepting confirms the promise time and starts the kitchen clock.</span>
              </div>
            )}

            {detail.cancelledReason && (
              <p className="rounded-xl border border-brick/25 bg-brick/5 px-3 py-2 text-xs font-bold text-brick">Cancelled: {detail.cancelledReason}</p>
            )}

            {/* timeline */}
            <ol className="flex items-center gap-1">
              {(["placed", "accepted", "preparing", "ready", "completed"] as OrderStatus[]).map((s, i, arr) => {
                const idx = arr.indexOf(orderStatus(detail));
                const done = idx >= 0 && i <= idx;
                return (
                  <li key={s} className="flex flex-1 flex-col items-center gap-1">
                    <span className={done ? "h-3 w-3 rounded-full bg-[#2e7d32]" : "h-3 w-3 rounded-full bg-cherry/15"} />
                    <span className={done ? "text-[10px] font-black uppercase text-[#2e7d32]" : "text-[10px] font-black uppercase text-cherry/35"}>{s}</span>
                  </li>
                );
              })}
            </ol>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="font-black text-cherry">Customer</p>
                <p className="text-cherry/70">{detail.customer.name}</p>
                <p className="text-cherry/70">{detail.customer.phone} · {detail.customer.email}</p>
                {detail.type === "delivery" && <p className="mt-1 flex items-start gap-1.5 font-bold text-cherry"><Ic n="mapPin" size={14} className="mt-0.5 shrink-0" /> {detail.address}</p>}
                {detail.note && <p className="mt-1 rounded-lg bg-gold/15 px-2 py-1 text-xs font-bold">Note: {detail.note}</p>}
              </div>
              <div>
                <p className="font-black text-cherry">Items</p>
                <ul className="mt-1 space-y-1 text-cherry/80">
                  {detail.lines.map((l, i) => (
                    <li key={i}>{l.qty}× {l.name} {l.variantLabel && l.variantLabel !== "—" ? `(${l.variantLabel})` : ""}{l.options.length ? ` — ${l.options.join("; ")}` : ""} · {eur(l.unitPrice * l.qty)}</li>
                  ))}
                </ul>
              </div>
            </div>
            <dl className="space-y-1 rounded-xl border border-cherry/10 bg-white/60 p-3">
              <div className="flex justify-between"><dt>Subtotal</dt><dd className="tabular-nums">{eur(detail.subtotal)}</dd></div>
              <div className="flex justify-between"><dt>Delivery</dt><dd className="tabular-nums">{detail.deliveryFee ? eur(detail.deliveryFee) : "—"}</dd></div>
              {detail.discount && detail.discount.amount > 0 && <div className="flex justify-between text-[#2e7d32]"><dt>− {detail.discount.title}</dt><dd>−{eur(detail.discount.amount)}</dd></div>}
              <div className="flex justify-between text-xs text-cherry/60"><dt>VAT</dt><dd className="tabular-nums">{eur(detail.vat)}</dd></div>
              <div className="flex justify-between font-display text-lg font-black text-cherry"><dt>Total</dt><dd className="tabular-nums">{eur(detail.total)}</dd></div>
            </dl>

            <div className="rounded-xl border border-cherry/10 bg-white/60 p-3">
              <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-cherry/45">Change status manually</p>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={orderStatus(detail)}
                  onChange={(e) => { void setOrderStatus(detail.id, e.target.value as OrderStatus); toast(`${detail.id} → ${e.target.value}`); }}
                  className={inputCls + " w-auto min-w-[150px] capitalize"}
                >
                  {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                {ACTIVE.includes(orderStatus(detail)) && orderStatus(detail) !== "ready" && (
                  <GhostBtn onClick={() => { void setOrderStatus(detail.id, NEXT[orderStatus(detail)]); toast(`${detail.id} → ${NEXT[orderStatus(detail)]}`); }}>
                    <Ic n="arrowRight" size={13} /> Move to {NEXT[orderStatus(detail)]}
                  </GhostBtn>
                )}
                {orderStatus(detail) === "ready" && (
                  <GhostBtn onClick={() => { void setOrderStatus(detail.id, "completed"); toast(`${detail.id} completed`); }}><Ic n="check" size={13} /> Complete order</GhostBtn>
                )}
              </div>
              <p className="mt-1.5 text-[10px] font-semibold text-cherry/40">Nothing changes automatically — every status change is an explicit staff action.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <GhostBtn onClick={() => printTicket(detail)}><Ic n="print" size={13} /> Print ticket</GhostBtn>
              {!detail.refunded && (
                <button
                  onClick={async () => { await refundOrder(detail.id); logAudit(`refund ${detail.id}: ${refundReason || "no reason"}`); toast(`${detail.id} refunded`, "err"); }}
                  className="ml-auto min-h-[36px] rounded-lg border border-brick px-3 text-xs font-black text-brick hover:bg-brick hover:text-cream"
                >
                  Refund order
                </button>
              )}
            </div>
            {!detail.refunded && (
              <Field label="Refund reason (logged)">
                <input value={refundReason} onChange={(e) => setRefundReason(e.target.value)} className={inputCls} placeholder="e.g. customer cancelled, kitchen out of stock" />
              </Field>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}

function printTicket(o: Order) {
  const w = window.open("", "_blank", "width=320,height=600");
  if (!w) return;
  const ticket = [
    `${o.id}  ${new Date(o.createdAt).toLocaleString("fi-FI")}`,
    `${o.customer.name} · ${o.type}`,
    `READY ${o.readyAt ? clockLabel(o.readyAt) : clockLabel(readyAtOf(o))} (${o.etaMinutes ?? 25} min)`,
    "--------------------------------",
    ...o.lines.map((l) => `${l.qty}x ${l.name} (${l.variantLabel})${l.options.length ? "\n   " + l.options.join("\n   ") : ""}`),
    "--------------------------------",
    `TOTAL ${o.total.toFixed(2)} EUR`,
    ...(o.note ? [`NOTE: ${o.note}`] : []),
  ].join("\n");
  const pre = w.document.createElement("pre");
  pre.style.cssText = "font:12px monospace;white-space:pre-wrap";
  pre.textContent = ticket;
  w.document.body.replaceChildren(pre);
  w.print();
}

/* ══ DINING ══ */
export function DiningView({ mode }: { mode: "calendar" | "list" | "slots" }) {
  const { reservations, setReservationStatus, settings, saveSettings, toast } = useShop();
  const [month, setMonth] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [selRes, setSelRes] = useState<Reservation | null>(null);
  const ready = useDelayedReady(mode);

  if (mode === "calendar") {
    const first = new Date(month.y, month.m, 1);
    const startDay = (first.getDay() + 6) % 7;
    const daysIn = new Date(month.y, month.m + 1, 0).getDate();
    const cells: (number | null)[] = [...Array(startDay).fill(null), ...Array.from({ length: daysIn }, (_, i) => i + 1)];
    const tone = (s?: string) => (s === "accepted" ? "bg-[#2e7d32]/15 border-[#2e7d32]/40 text-[#2e7d32]" : s === "declined" ? "bg-brick/10 border-brick/30 text-brick" : "bg-gold/15 border-gold/40 text-gold-deep");
    return (
      <Panel padded>
        <div className="mb-3 flex items-center justify-between">
          <GhostBtn onClick={() => setMonth((m) => (m.m === 0 ? { y: m.y - 1, m: 11 } : { ...m, m: m.m - 1 }))}>‹</GhostBtn>
          <p className="font-display text-lg font-black capitalize text-cherry">{first.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</p>
          <GhostBtn onClick={() => setMonth((m) => (m.m === 11 ? { y: m.y + 1, m: 0 } : { ...m, m: m.m + 1 }))}>›</GhostBtn>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase text-cherry/45">
          {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => <span key={d} className="py-1">{d}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            const key = d ? `${month.y}-${String(month.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}` : "";
            const dayRes = d ? reservations.filter((r) => r.date === key) : [];
            return (
              <div key={i} className={d ? "min-h-[76px] rounded-xl border border-cherry/10 bg-white/60 p-1" : ""}>
                {d && (
                  <>
                    <p className="text-right text-[10px] font-black text-cherry/40">{d}</p>
                    {dayRes.slice(0, 3).map((r) => (
                      <button key={r.id} onClick={() => setSelRes(r)} className={`mb-0.5 block w-full truncate rounded border px-1 text-left text-[10px] font-bold ${tone(r.status)}`}>
                        {r.time} {r.name}
                      </button>
                    ))}
                    {dayRes.length > 3 && <p className="text-[9px] font-black text-cherry/35">+{dayRes.length - 3} more</p>}
                  </>
                )}
              </div>
            );
          })}
        </div>
        <Drawer open={!!selRes} onClose={() => setSelRes(null)} title={selRes ? `${selRes.name} · ${selRes.party}p` : ""}>
          {selRes && (
            <div className="space-y-3 text-sm">
              <p className="font-black text-cherry">{selRes.date} klo {selRes.time}</p>
              <p className="text-cherry/70">{selRes.phone}{selRes.email ? ` · ${selRes.email}` : ""}</p>
              {selRes.note && <p className="rounded-lg bg-gold/15 p-2 text-xs font-bold">{selRes.note}</p>}
              <Pill tone={statusTone(selRes.status === "accepted" ? "accepted-res" : selRes.status ?? "pending")}>{selRes.status ?? "pending"}</Pill>
              <div className="flex gap-2">
                <SolidBtn tone="green" icon="check" onClick={() => { setReservationStatus(selRes.id, "accepted"); toast("Reservation accepted"); }}>Accept</SolidBtn>
                <GhostBtn onClick={() => { setReservationStatus(selRes.id, "declined"); toast("Reservation declined", "err"); }}>Decline</GhostBtn>
              </div>
            </div>
          )}
        </Drawer>
      </Panel>
    );
  }

  if (mode === "slots") {
    return (
      <Panel className="max-w-2xl" padded>
        <p className="text-sm font-black text-cherry">Table / slot settings</p>
        <div className="mt-3 space-y-4">
          <Field label="Blocked slots (date-time keys, one per line)">
            <textarea value={settings.blockedSlots.join("\n")} onChange={(e) => saveSettings({ ...settings, blockedSlots: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })} rows={4} className={inputCls} />
          </Field>
          <Field label="Blackout dates (YYYY-MM-DD, one per line)">
            <textarea value={settings.blockedDates.join("\n")} onChange={(e) => saveSettings({ ...settings, blockedDates: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })} rows={4} className={inputCls} />
          </Field>
          <p className="text-xs font-semibold text-cherry/50">Max party size and concurrent slots are enforced by the public reservation flow against these rules.</p>
        </div>
      </Panel>
    );
  }

  const sorted = [...reservations].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  return (
    <Panel>
      <DataTable
        rows={sorted}
        id={(r) => r.id}
        loading={!ready}
        search={(r, q) => r.name.toLowerCase().includes(q) || r.date.includes(q)}
        cols={[
          { key: "date", label: "Date", sort: (r) => r.date, render: (r) => <span className="font-black">{r.date}</span> },
          { key: "time", label: "Time", sort: (r) => r.time, render: (r) => <span className="tabular-nums">{r.time}</span> },
          { key: "party", label: "Party", render: (r) => <span>{r.party}p</span> },
          { key: "name", label: "Customer", sort: (r) => r.name, render: (r) => <span className="font-bold">{r.name}</span> },
          { key: "contact", label: "Contact", hideMd: true, render: (r) => <span className="text-xs text-cherry/60">{r.phone}</span> },
          { key: "status", label: "Status", render: (r) => <Pill tone={r.status === "accepted" ? "green" : r.status === "declined" ? "red" : "orange"}>{r.status ?? "pending"}</Pill> },
          {
            key: "act", label: "Actions",
            render: (r) => (
              <span className="flex gap-1">
                <GhostBtn onClick={() => { setReservationStatus(r.id, "accepted"); toast("Accepted"); }}>✓</GhostBtn>
                <GhostBtn onClick={() => { setReservationStatus(r.id, "declined"); toast("Declined", "err"); }}>✕</GhostBtn>
              </span>
            ),
          },
        ]}
        empty={<EmptyState icon="calendar" title="No reservations" sub="Reservations from the public Dining page land here." />}
      />
    </Panel>
  );
}
