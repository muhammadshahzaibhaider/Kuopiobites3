"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { eur } from "@/lib/format";
import { todayStrHelsinki, toHhmm } from "@/lib/hours";
import type { DayHours, Settings } from "@/lib/types";
import { useLang } from "@/lib/i18n";
import { RESTAURANT } from "@/lib/menu";
import { useShop } from "@/lib/store";
import { AuditTab, Switch } from "@/app/admin/v3tabs";
import { apiAnalyticsReport, apiListWalkInStreaks, apiResolveWalkInStreak, type AnalyticsReport, type WalkInStreakClaim } from "@/lib/api";
import { Ic } from "./icons";
import { Bars, DataTable, EmptyState, Field, GhostBtn, Pill, PrimaryBtn, StatCard, downloadCSV, inputCls, useDelayedReady, type Col } from "./ui";

/* ══ CUSTOMERS ══ */
export function WalkInStreaksView() {
  const { toast } = useShop();
  const [rows, setRows] = useState<WalkInStreakClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const load = () => {
    setLoading(true);
    apiListWalkInStreaks().then(setRows).catch(() => setRows([])).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);
  const pending = rows.filter((row) => row.status === "pending");
  const decide = async (id: string, action: "approve" | "reject") => {
    try {
      const next = await apiResolveWalkInStreak(id, action);
      setRows((prev) => prev.map((row) => row.id === id ? next : row));
      toast(action === "approve" ? "Walk-in stamp approved" : "Walk-in request rejected");
    } catch {
      toast("Could not update the request", "err");
    }
  };
  const cols: Col<WalkInStreakClaim>[] = [
    { key: "name", label: "Customer", sort: (r) => r.name, render: (r) => <span className="font-black text-cherry">{r.name || r.email}</span> },
    { key: "email", label: "Email", render: (r) => <span className="text-xs text-cherry/70">{r.email}</span> },
    { key: "note", label: "Note", render: (r) => <span className="text-xs text-cherry/70">{r.note || "—"}</span> },
    { key: "when", label: "Requested", sort: (r) => r.createdAt, render: (r) => <span className="tabular-nums text-cherry/60">{new Date(r.createdAt).toLocaleString("fi-FI", { timeZone: "Europe/Helsinki" })}</span> },
    { key: "status", label: "Status", render: (r) => <Pill tone={r.status === "approved" ? "green" : r.status === "rejected" ? "red" : "gold"}>{r.status}</Pill> },
    { key: "act", label: "Action", render: (r) => r.status === "pending" ? (
      <span className="flex gap-1">
        <PrimaryBtn onClick={() => void decide(r.id, "approve")}>Approve</PrimaryBtn>
        <GhostBtn onClick={() => void decide(r.id, "reject")}>Reject</GhostBtn>
      </span>
    ) : <span className="text-xs text-cherry/40">—</span> },
  ];
  return (
    <div className="space-y-4">
      <p className="text-sm font-bold text-cherry/70">In-house till orders do not stamp the 7-order streak automatically. Customers send a request from Contact; approve only if they paid at the counter.</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Pending requests" value={pending.length} icon="clock" tone="gold" />
        <StatCard label="Approved" value={rows.filter((r) => r.status === "approved").length} icon="orders" tone="green" />
        <StatCard label="Rejected" value={rows.filter((r) => r.status === "rejected").length} icon="warn" tone="red" />
      </div>
      <div className="overflow-hidden rounded-2xl border border-cherry/10 bg-cream-deep/40">
        <DataTable rows={rows} cols={cols} id={(r) => r.id} loading={loading} search={(r, q) => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || r.note.toLowerCase().includes(q)} empty={<EmptyState icon="users" title="No walk-in stamp requests" sub="Contact-page requests appear here for approve / reject." />} />
      </div>
    </div>
  );
}

export function CustomersView() {
  const { users, orders } = useShop();
  const ready = useDelayedReady("customers");
  type Row = { id: string; name: string; email: string; phone?: string; orders: number; spend: number; marketing: boolean; createdAt: number };
  const rows: Row[] = users.map((u) => {
    const mine = orders.filter((o) => o.userId === u.id);
    return { id: u.id, name: u.name, email: u.email, phone: u.phone, orders: u.orderCount ?? mine.length, spend: u.lifetimeSpend ?? mine.filter((order) => !order.refunded).reduce((sum, order) => sum + order.total, 0), marketing: u.marketing, createdAt: u.createdAt };
  });
  const cols: Col<Row>[] = [
    { key: "name", label: "Name", sort: (r) => r.name, render: (r) => <span className="font-black text-cherry">{r.name}</span> },
    { key: "email", label: "Contact", render: (r) => <span className="text-xs text-cherry/70">{r.email}{r.phone ? ` · ${r.phone}` : ""}</span> },
    { key: "orders", label: "Orders", sort: (r) => r.orders, render: (r) => <span className="tabular-nums">{r.orders}</span> },
    { key: "spend", label: "Lifetime spend", sort: (r) => r.spend, render: (r) => <span className="font-black tabular-nums">{eur(r.spend)}</span> },
    { key: "marketing", label: "Marketing", hideMd: true, render: (r) => <Pill tone={r.marketing ? "green" : "gray"}>{r.marketing ? "opted in" : "—"}</Pill> },
    { key: "joined", label: "Joined", sort: (r) => r.createdAt, render: (r) => <span className="tabular-nums text-cherry/60">{new Date(r.createdAt).toLocaleDateString("fi-FI")}</span> },
  ];
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Registered customers" value={users.length} icon="users" />
        <StatCard label="Ordered at least once" value={rows.filter((r) => r.orders > 0).length} icon="orders" tone="green" />
        <StatCard label="Avg lifetime spend" value={eur(rows.length ? rows.reduce((a, r) => a + r.spend, 0) / rows.length : 0)} icon="analytics" tone="gold" />
      </div>
      <div className="overflow-hidden rounded-2xl border border-cherry/10 bg-cream-deep/40">
        <DataTable rows={rows} cols={cols} id={(r) => r.id} loading={!ready} search={(r, q) => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)} empty={<EmptyState icon="users" title="No customers yet" sub="Account sign-ups on the public site appear here." />} />
      </div>
    </div>
  );
}

/* ══ ANALYTICS ══ */
export function AnalyticsView({ mode }: { mode: "sales" | "items" | "peaks" }) {
  const [range, setRange] = useState<7 | 14 | 30>(7);
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true); setError(false);
    apiAnalyticsReport(range).then((value) => { if (active) setReport(value); }).catch(() => { if (active) { setReport(null); setError(true); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [range]);

  const days = useMemo(() => (report?.revenueByDay ?? []).map((day) => ({
    label: new Date(`${day.date}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short", timeZone: "Europe/Helsinki" }),
    value: day.revenue,
  })), [report]);
  const items = report?.items ?? [];
  const hours = (report?.ordersByHour ?? []).map((item) => ({ label: String(item.hour).padStart(2, "0"), value: item.orders }));
  const aov = report?.averageOrderValue ?? 0;
  const totalOrders = report?.orders ?? 0;
  const deliveryShare = totalOrders ? Math.round(((report?.delivery ?? 0) / totalOrders) * 100) : 0;
  const refundCount = report?.refunded ?? 0;

  const rangeBtns = (
    <div className="flex gap-1">
      {([7, 14, 30] as const).map((value) => (
        <button key={value} onClick={() => setRange(value)} aria-pressed={value === range} className={value === range ? "rounded-lg bg-cherry px-2.5 py-1 text-[11px] font-black text-cream" : "rounded-lg px-2.5 py-1 text-[11px] font-black text-cherry/50"}>{value}d</button>
      ))}
    </div>
  );

  if (loading && !report) return <div className="rounded-2xl border border-cherry/10 bg-cream-deep/40 p-8 text-center text-sm font-bold text-cherry/60">Loading database-backed analytics…</div>;
  if (error && !report) return <div role="alert" className="rounded-2xl border border-brick/20 bg-brick/10 p-5 text-sm font-bold text-brick">Analytics could not be loaded from the server. Refresh or check that this staff account has manager access.</div>;

  if (mode === "items")
    return (
      <div className="overflow-hidden rounded-2xl border border-cherry/10 bg-cream-deep/40">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cherry/10 px-4 py-3">
          <p className="text-sm font-black text-cherry">Item performance · {range}d · paid orders</p>
          <span className="flex items-center gap-3">{rangeBtns}<GhostBtn onClick={() => downloadCSV("item-perf.csv", [["item", "qty", "revenue"], ...items.map((item) => [item.name, item.quantity, item.revenue.toFixed(2)])])}><Ic n="csv" size={13} /> CSV</GhostBtn></span>
        </div>
        <DataTable
          rows={items.map((item, index) => ({ rank: index + 1, ...item }))}
          id={(row) => row.itemId}
          loading={loading}
          search={(row, query) => row.name.toLowerCase().includes(query)}
          cols={[
            { key: "rank", label: "#", render: (row) => <span className="font-black text-cherry/40">{row.rank}</span> },
            { key: "name", label: "Item", sort: (row) => row.name, render: (row) => <span className="font-bold">{row.name}</span> },
            { key: "qty", label: "Qty", sort: (row) => row.quantity, render: (row) => <span className="tabular-nums">×{row.quantity}</span> },
            { key: "rev", label: "Revenue", sort: (row) => row.revenue, render: (row) => <span className="font-black tabular-nums">{eur(row.revenue)}</span> },
          ]}
          empty={<EmptyState icon="analytics" title="No paid sales in range" />}
        />
      </div>
    );

  if (mode === "peaks")
    return (
      <div className="rounded-2xl border border-cherry/10 bg-cream-deep/40 p-4">
        <div className="flex items-center justify-between"><p className="text-sm font-black text-cherry">Paid order volume by hour (Helsinki) · {range}d</p>{rangeBtns}</div>
        <div className="mt-4"><Bars data={hours} height={160} /></div>
        <p className="mt-2 text-xs text-cherry/60">Use peaks to staff the kitchen and time pre-order push notifications.</p>
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label={`Paid revenue ${range}d`} value={eur(report?.revenue ?? 0)} icon="analytics" tone="green" />
        <StatCard label="Paid orders" value={totalOrders} icon="orders" />
        <StatCard label="Avg order value" value={eur(aov)} icon="cash" tone="gold" />
        <StatCard label="Refunded orders" value={refundCount} icon="trash" tone={refundCount ? "red" : "gray"} />
      </div>
      <div className="rounded-2xl border border-cherry/10 bg-cream-deep/40 p-4">
        <div className="flex items-center justify-between"><p className="text-sm font-black text-cherry">Revenue trend · paid orders</p><span className="flex items-center gap-3">{rangeBtns}<GhostBtn onClick={() => downloadCSV("sales.csv", [["date", "orders", "revenue"], ...(report?.revenueByDay ?? []).map((day) => [day.date, day.orders, day.revenue.toFixed(2)])])}><Ic n="csv" size={13} /> CSV</GhostBtn></span></div>
        <div className="mt-3"><Bars data={days} height={150} formatValue={eur} /></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-cherry/10 bg-cream-deep/40 p-4">
          <p className="text-[11px] font-black uppercase text-cherry/50">Delivery vs pickup</p>
          <div className="mt-3 flex h-4 overflow-hidden rounded-full"><span className="bg-cherry-bright" style={{ width: `${deliveryShare}%` }} /><span className="flex-1 bg-gold" /></div>
          <p className="mt-2 text-xs font-bold text-cherry/70">{deliveryShare}% delivery · {100 - deliveryShare}% pickup</p>
        </div>
        <div className="rounded-2xl border border-cherry/10 bg-cream-deep/40 p-4">
          <p className="text-[11px] font-black uppercase text-cherry/50">Paid order status mix · {range}d</p>
          <ul className="mt-2 space-y-1 text-xs font-bold text-cherry/70">{(["completed", "ready", "preparing", "accepted", "placed"] as const).map((status) => <li key={status} className="flex justify-between"><span className="capitalize">{status}</span><span className="tabular-nums">{report?.statusCounts[status] ?? 0}</span></li>)}</ul>
        </div>
      </div>
    </div>
  );
}

/* ══ ADMIN ▸ staff + activity ══ */
export function AdminStaffView() {
  const { staffRole } = useShop();
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-cherry/10 bg-cream-deep/40 p-5">
        <p className="text-sm font-black text-cherry">Current staff session</p>
        <p className="mt-2 text-sm text-cherry/70">Signed in role: <strong>{staffRole ?? "not authenticated"}</strong></p>
        <p className="mt-4 text-sm text-cherry/70">
          Staff provisioning and removal are intentionally not client-side features. Create, disable, and rotate staff accounts in the trusted backend/identity administration path; the browser cannot change its own role or manufacture a staff record.
        </p>
        <p className="mt-3 text-[11px] text-cherry/50">Roles remain Owner, Manager, and kitchen. Server middleware re-checks the current role on every request.</p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-cherry/10 bg-cream-deep/40">
        <AuditTab />
      </div>
    </div>
  );
}

/* ══ SETTINGS ══ */
export function SettingsView({ mode }: { mode: "general" | "restaurant" }) {
  const { settings, saveSettings, toast, logAudit, adminItems } = useShop();
  const { dayName } = useLang();
  const [s, setS] = useState(settings);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const dirtyRef = useRef(false);
  const markDirty = (next: Settings) => { dirtyRef.current = true; setDirty(true); setS(next); };
  useEffect(() => {
    if (!dirtyRef.current) setS(settings);
  }, [settings]);
  const patchHours = (day: number, entry: DayHours) => {
    markDirty({ ...s, hours: { ...s.hours, [day]: entry && { open: toHhmm(entry.open), close: toHhmm(entry.close) } } });
  };
  const persist = async (next: Settings, okMsg: string) => {
    setSaving(true);
    const ok = await saveSettings(next);
    setSaving(false);
    if (ok) {
      dirtyRef.current = false;
      setDirty(false);
      setS(next);
      toast(okMsg);
    }
    return ok;
  };
  const today = todayStrHelsinki();

  if (mode === "restaurant")
    return (
      <div className="max-w-2xl space-y-4 rounded-2xl border border-cherry/10 bg-cream-deep/40 p-5">
        <p className="text-sm font-black text-cherry">Restaurant info (shown site-wide)</p>
        {[["Name", RESTAURANT.name], ["Address", RESTAURANT.address], ["Phone", RESTAURANT.phone], ["Email", RESTAURANT.email], ["Instagram", RESTAURANT.instagram], ["Facebook", RESTAURANT.facebook]].map(([k, v]) => (
          <div key={k} className="flex justify-between border-b border-cherry/5 pb-2 text-sm">
            <span className="font-black text-cherry/60">{k}</span><span className="font-bold text-cherry">{v}</span>
          </div>
        ))}
        <p className="text-[11px] text-cherry/40">Contact details live in <code>src/lib/menu.ts</code> (RESTAURANT) and map links — editing them here ships with the next deploy; everything else on this page is live.</p>
        <div className="rounded-xl border border-cherry/10 bg-cream p-4">
          <p className="mb-2 text-sm font-black text-cherry">Announcement strip</p>
          <label className="flex items-center justify-between text-xs font-bold text-cherry/70">
            Show announcement banner on the site
            <Switch on={s.announcement.enabled} ariaLabel="announcement" onChange={() => markDirty({ ...s, announcement: { ...s.announcement, enabled: !s.announcement.enabled } })} />
          </label>
          <input value={s.announcement.text} onChange={(e) => markDirty({ ...s, announcement: { ...s.announcement, text: e.target.value } })} placeholder="e.g. Perjantaisin live-musiikkia klo 19!" className={inputCls + " mt-2"} />
        </div>
        <Field label="Pause message (shown when ordering is paused)">
          <textarea rows={2} value={s.pauseMessage} onChange={(e) => markDirty({ ...s, pauseMessage: e.target.value })} className={inputCls} />
        </Field>
        <div className="flex flex-wrap items-center gap-2">
          {dirty && <span className="inline-flex min-h-[32px] items-center rounded-full bg-gold/25 px-3 text-[11px] font-black uppercase tracking-wide text-gold-deep">Unsaved changes</span>}
          <PrimaryBtn icon="save" disabled={saving} onClick={async () => {
            const ok = await persist({ ...settings, announcement: s.announcement, pauseMessage: s.pauseMessage }, "Saved and reloaded from the database");
            if (ok) logAudit("restaurant info / announcement updated");
          }}>{saving ? "Saving…" : "Save"}</PrimaryBtn>
        </div>
      </div>
    );

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between rounded-2xl border border-cherry/10 bg-cream-deep/40 px-4 py-3">
        <span>
          <span className="block text-sm font-black text-cherry">Pause online ordering</span>
          <span className="text-xs text-cherry/60">Emergency switch — site shows closed for orders</span>
        </span>
        <Switch
          on={s.paused}
          ariaLabel="pause ordering"
          onChange={async () => {
            const next = { ...settings, ...s, paused: !s.paused };
            markDirty(next);
            if (await persist(next, next.paused ? "Ordering paused" : "Ordering resumed")) {
              logAudit(`ordering ${next.paused ? "paused" : "resumed"}`);
            }
          }}
        />
      </div>

      <div className="rounded-2xl border border-cherry/10 bg-cream-deep/40 p-4">
        <h3 className="text-sm font-black text-cherry">Opening hours</h3>
        <div className="mt-3 space-y-2">
          {[1, 2, 3, 4, 5, 6, 0].map((d) => (
            <div key={d} className="flex flex-wrap items-center gap-3 text-sm">
              <span className="w-24 font-bold">{dayName(d)}</span>
              <label className="flex items-center gap-2 text-xs font-bold text-cherry/60">
                <input type="checkbox" checked={!s.hours[d]} onChange={(e) => patchHours(d, e.target.checked ? null : { open: "10:00", close: "21:00" })} className="h-4 w-4 accent-[#0F3D3E]" />
                closed
              </label>
              {s.hours[d] && (
                <>
                  <input type="time" step={60} value={toHhmm(s.hours[d]!.open)} onChange={(e) => patchHours(d, { ...s.hours[d]!, open: e.target.value })} className="min-h-[36px] rounded-lg border border-cherry/20 bg-cream px-2" />
                  <span>–</span>
                  <input type="time" step={60} value={toHhmm(s.hours[d]!.close)} onChange={(e) => patchHours(d, { ...s.hours[d]!, close: e.target.value })} className="min-h-[36px] rounded-lg border border-cherry/20 bg-cream px-2" />
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-cherry/10 bg-cream-deep/40 p-4">
        <h3 className="text-sm font-black text-cherry">Default order-ready estimate</h3>
        <p className="mt-1 text-xs text-cherry/60">New customer orders receive this kitchen estimate. Staff can set a different timer for an individual order in the live queue.</p>
        <Field label="Minutes from order acceptance (5–240)">
          <input type="number" min="5" max="240" step="5" value={s.readyTimeMinutes} onChange={(e) => markDirty({ ...s, readyTimeMinutes: Math.max(5, Math.min(240, Number(e.target.value) || 5)) })} className={inputCls + " max-w-[180px]"} />
        </Field>
      </div>

      <div className="grid gap-3 rounded-2xl border border-cherry/10 bg-cream-deep/40 p-4 sm:grid-cols-3">
        <Field label="Delivery fee (€)"><input type="number" step="0.5" value={s.deliveryFee} onChange={(e) => markDirty({ ...s, deliveryFee: parseFloat(e.target.value) || 0 })} className={inputCls} /></Field>
        <Field label="Min delivery order (€)"><input type="number" step="1" value={s.minOrder} onChange={(e) => markDirty({ ...s, minOrder: parseFloat(e.target.value) || 0 })} className={inputCls} /></Field>
        <Field label="Radius (km)"><input type="number" step="1" value={s.radiusKm} onChange={(e) => markDirty({ ...s, radiusKm: parseFloat(e.target.value) || 0 })} className={inputCls} /></Field>
      </div>

      <div className="space-y-3 rounded-2xl border border-cherry/10 bg-cream-deep/40 p-4">
        <h3 className="text-sm font-black text-cherry">Ordering platforms & display</h3>
        <Field label="Wolt URL"><input value={s.platforms.wolt} onChange={(e) => markDirty({ ...s, platforms: { ...s.platforms, wolt: e.target.value } })} className={inputCls} /></Field>
        <Field label="Uber Eats URL"><input value={s.platforms.uberEats} onChange={(e) => markDirty({ ...s, platforms: { ...s.platforms, uberEats: e.target.value } })} className={inputCls} /></Field>
        <label className="flex items-center justify-between text-sm font-black text-cherry">
          Header logo
          <select value={s.headerLogo} onChange={(e) => markDirty({ ...s, headerLogo: e.target.value as "round" | "mark" })} className="min-h-[36px] rounded-lg border border-cherry/20 bg-cream px-2 text-xs font-bold">
            <option value="round">Round logo</option>
            <option value="mark">Banner pizza mark</option>
          </select>
        </label>
        <label className="flex items-center justify-between text-sm font-black text-cherry">
          Hide unavailable items
          <Switch on={s.hideUnavailable} ariaLabel="hide unavailable" onChange={() => markDirty({ ...s, hideUnavailable: !s.hideUnavailable })} />
        </label>
      </div>

      <div className="space-y-3 rounded-2xl border border-cherry/10 bg-cream-deep/40 p-4">
        <h3 className="text-sm font-black text-cherry">Order streak loyalty</h3>
        <p className="text-xs text-cherry/60">Paid orders fill 7 steps. At 7 the customer unlocks one free unit of the item you pick. Claiming it on checkout resets the streak.</p>
        <label className="flex items-center justify-between text-sm font-black text-cherry">
          Enable streak
          <Switch on={Boolean(s.orderStreak?.enabled)} ariaLabel="order streak" onChange={() => markDirty({ ...s, orderStreak: { ...(s.orderStreak ?? settings.orderStreak), enabled: !s.orderStreak?.enabled } })} />
        </label>
        <Field label="Reward item">
          <select
            value={s.orderStreak?.rewardItemId ?? ""}
            onChange={(e) => markDirty({ ...s, orderStreak: { ...(s.orderStreak ?? settings.orderStreak), rewardItemId: e.target.value } })}
            className={inputCls}
          >
            <option value="">— pick a menu item —</option>
            {adminItems.map((item) => (
              <option key={item.id} value={item.id}>{item.name} ({item.id})</option>
            ))}
          </select>
        </Field>
        <Field label="Reward name (EN)">
          <input value={s.orderStreak?.rewardNameEn ?? ""} onChange={(e) => markDirty({ ...s, orderStreak: { ...(s.orderStreak ?? settings.orderStreak), rewardNameEn: e.target.value } })} className={inputCls} />
        </Field>
        <Field label="Reward name (FI)">
          <input value={s.orderStreak?.rewardNameFi ?? ""} onChange={(e) => markDirty({ ...s, orderStreak: { ...(s.orderStreak ?? settings.orderStreak), rewardNameFi: e.target.value } })} className={inputCls} />
        </Field>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-cherry/10 bg-cream-deep/40 px-4 py-3 text-sm">
        <span className="font-black text-cherry">Today ({today}) — quick availability</span>
        <GhostBtn onClick={async () => {
          const map = { ...s.offItems };
          for (const k of Object.keys(map)) if (map[k].offToday === today) delete map[k];
          const next = { ...settings, ...s, offItems: map };
          markDirty(next);
          await persist(next, "Today's sold-outs reset");
        }}>Reset today's sold-outs</GhostBtn>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {dirty && <span className="inline-flex min-h-[32px] items-center rounded-full bg-gold/25 px-3 text-[11px] font-black uppercase tracking-wide text-gold-deep">Unsaved changes</span>}
        {dirty && <GhostBtn onClick={() => { dirtyRef.current = false; setDirty(false); setS(settings); toast("Draft reloaded from the database"); }}>Reload draft</GhostBtn>}
        <PrimaryBtn icon="save" disabled={saving} onClick={async () => {
          const hours: Settings["hours"] = { ...s.hours };
          for (const day of [0, 1, 2, 3, 4, 5, 6]) {
            const entry = hours[day];
            if (entry) hours[day] = { open: toHhmm(entry.open), close: toHhmm(entry.close) };
          }
          await persist({
            ...settings,
            paused: s.paused,
            hours,
            readyTimeMinutes: s.readyTimeMinutes,
            deliveryFee: s.deliveryFee,
            minOrder: s.minOrder,
            radiusKm: s.radiusKm,
            platforms: s.platforms,
            headerLogo: s.headerLogo,
            hideUnavailable: s.hideUnavailable,
            offItems: s.offItems,
            orderStreak: s.orderStreak,
          }, "Settings saved and reloaded from the database");
        }}>{saving ? "Saving…" : "Save settings"}</PrimaryBtn>
      </div>
    </div>
  );
}
