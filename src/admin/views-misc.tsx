"use client";
import { useEffect, useMemo, useState } from "react";
import { eur, cx } from "@/lib/format";
import { todayStrHelsinki } from "@/lib/hours";
import { useLang } from "@/lib/i18n";
import { MENU, RESTAURANT } from "@/lib/menu";
import { useShop } from "@/lib/store";
import { AuditTab, Switch } from "@/app/admin/v3tabs";
import { Ic } from "./icons";
import { Bars, DataTable, EmptyState, Field, GhostBtn, Pill, PrimaryBtn, StatCard, downloadCSV, fmtDT, inputCls, useLocal, useDelayedReady, type Col } from "./ui";

/* ══ CUSTOMERS ══ */
export function CustomersView() {
  const { users, orders } = useShop();
  const ready = useDelayedReady("customers");
  type Row = { id: string; name: string; email: string; phone?: string; orders: number; spend: number; marketing: boolean; createdAt: number };
  const rows: Row[] = users.map((u) => {
    const mine = orders.filter((o) => o.userId === u.id);
    return { id: u.id, name: u.name, email: u.email, phone: u.phone, orders: mine.length, spend: mine.reduce((a, o) => a + o.total, 0), marketing: u.marketing, createdAt: u.createdAt };
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
  const { orders, orderStatus } = useShop();
  const live = orders.filter((o) => !o.refunded);
  const [range, setRange] = useState(7);
  const since = Date.now() - range * 86400000;
  const inRange = live.filter((o) => o.createdAt >= since);

  const days = useMemo(
    () =>
      Array.from({ length: range }).map((_, i) => {
        const d = new Date(Date.now() - (range - 1 - i) * 86400000);
        const key = d.toLocaleDateString("en-CA", { timeZone: "Europe/Helsinki" });
        return { label: d.toLocaleDateString("en-GB", { weekday: "short", timeZone: "Europe/Helsinki" }), value: Math.round(inRange.filter((o) => new Date(o.createdAt).toLocaleDateString("en-CA", { timeZone: "Europe/Helsinki" }) === key).reduce((a, o) => a + o.total, 0)) };
      }),
    [inRange, range]
  );

  const items = useMemo(() => {
    const m: Record<string, { qty: number; rev: number }> = {};
    inRange.forEach((o) => o.lines.forEach((l) => { const e = (m[l.name] ??= { qty: 0, rev: 0 }); e.qty += l.qty; e.rev += l.qty * l.unitPrice; }));
    return Object.entries(m).sort((a, b) => b[1].rev - a[1].rev);
  }, [inRange]);

  const hours = useMemo(() => {
    const h = Array.from({ length: 24 }, (_, i) => ({ label: String(i), value: 0 }));
    inRange.forEach((o) => { const hr = new Date(o.createdAt).toLocaleString("en-GB", { hour: "2-digit", timeZone: "Europe/Helsinki", hour12: false }); h[parseInt(hr) % 24].value += 1; });
    return h;
  }, [inRange]);

  const aov = inRange.length ? inRange.reduce((a, o) => a + o.total, 0) / inRange.length : 0;
  const deliveryShare = inRange.length ? Math.round((inRange.filter((o) => o.type === "delivery").length / inRange.length) * 100) : 0;
  const refundCount = orders.filter((o) => o.refunded && o.createdAt >= since).length;

  const rangeBtns = (
    <div className="flex gap-1">
      {[7, 14, 30].map((r) => (
        <button key={r} onClick={() => setRange(r)} className={r === range ? "rounded-lg bg-cherry px-2.5 py-1 text-[11px] font-black text-cream" : "rounded-lg px-2.5 py-1 text-[11px] font-black text-cherry/50"}>{r}d</button>
      ))}
    </div>
  );

  if (mode === "items")
    return (
      <div className="overflow-hidden rounded-2xl border border-cherry/10 bg-cream-deep/40">
        <div className="flex items-center justify-between border-b border-cherry/10 px-4 py-3">
          <p className="text-sm font-black text-cherry">Item performance · {range}d</p>
          <span className="flex items-center gap-3">{rangeBtns}<GhostBtn onClick={() => downloadCSV("item-perf.csv", [["item", "qty", "revenue"], ...items.map(([n, v]) => [n, v.qty, v.rev.toFixed(2)])])}><Ic n="csv" size={13} /> CSV</GhostBtn></span>
        </div>
        <DataTable
          rows={items.map(([name, v], i) => ({ rank: i + 1, name, ...v }))}
          id={(r) => r.name}
          search={(r, q) => r.name.toLowerCase().includes(q)}
          cols={[
            { key: "rank", label: "#", render: (r) => <span className="font-black text-cherry/40">{r.rank}</span> },
            { key: "name", label: "Item", sort: (r) => r.name, render: (r) => <span className="font-bold">{r.name}</span> },
            { key: "qty", label: "Qty", sort: (r) => r.qty, render: (r) => <span className="tabular-nums">×{r.qty}</span> },
            { key: "rev", label: "Revenue", sort: (r) => r.rev, render: (r) => <span className="font-black tabular-nums">{eur(r.rev)}</span> },
          ]}
          empty={<EmptyState icon="analytics" title="No sales in range" />}
        />
      </div>
    );

  if (mode === "peaks")
    return (
      <div className="rounded-2xl border border-cherry/10 bg-cream-deep/40 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-black text-cherry">Order volume by hour (Helsinki) · {range}d</p>
          {rangeBtns}
        </div>
        <div className="mt-4"><Bars data={hours} height={160} /></div>
        <p className="mt-2 text-xs text-cherry/60">Use peaks to staff the kitchen and time pre-order push notifications.</p>
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label={`Revenue ${range}d`} value={eur(inRange.reduce((a, o) => a + o.total, 0))} icon="analytics" tone="green" />
        <StatCard label="Orders" value={inRange.length} icon="orders" />
        <StatCard label="Avg order value" value={eur(aov)} icon="cash" tone="gold" />
        <StatCard label="Refunds" value={refundCount} icon="trash" tone={refundCount ? "red" : "gray"} />
      </div>
      <div className="rounded-2xl border border-cherry/10 bg-cream-deep/40 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-black text-cherry">Revenue trend</p>
          <span className="flex items-center gap-3">{rangeBtns}<GhostBtn onClick={() => downloadCSV("sales.csv", [["day", "revenue"], ...days.map((d) => [d.label, d.value])])}><Ic n="csv" size={13} /> CSV</GhostBtn></span>
        </div>
        <div className="mt-3"><Bars data={days} height={150} /></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-cherry/10 bg-cream-deep/40 p-4">
          <p className="text-[11px] font-black uppercase text-cherry/50">Delivery vs pickup</p>
          <div className="mt-3 flex h-4 overflow-hidden rounded-full">
            <span className="bg-cherry-bright" style={{ width: `${deliveryShare}%` }} />
            <span className="flex-1 bg-gold" />
          </div>
          <p className="mt-2 text-xs font-bold text-cherry/70">{deliveryShare}% delivery · {100 - deliveryShare}% pickup</p>
        </div>
        <div className="rounded-2xl border border-cherry/10 bg-cream-deep/40 p-4">
          <p className="text-[11px] font-black uppercase text-cherry/50">Status mix (all time)</p>
          <ul className="mt-2 space-y-1 text-xs font-bold text-cherry/70">
            {["completed", "ready", "preparing", "accepted", "placed"].map((s) => (
              <li key={s} className="flex justify-between"><span className="capitalize">{s}</span><span className="tabular-nums">{orders.filter((o) => orderStatus(o) === s).length}</span></li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ══ ADMIN ▸ staff + activity ══ */
export type Staff = { name: string; role: "Owner" | "Manager" | "Kitchen"; since: number };
export function AdminStaffView() {
  const [staff, setStaff] = useLocal<Staff[]>("kb_staff", [{ name: "admin", role: "Owner", since: Date.now() }]);
  const [draft, setDraft] = useState({ name: "", role: "Manager" as Staff["role"] });
  const { settings } = useShop();
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-cherry/10 bg-cream-deep/40">
        <p className="border-b border-cherry/10 px-4 py-3 text-sm font-black text-cherry">Staff accounts</p>
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b border-cherry/10 text-[11px] font-black uppercase text-cherry/50"><th className="px-4 py-2">Name</th><th className="px-3 py-2">Role</th><th className="px-3 py-2">Since</th><th className="px-3 py-2" /></tr></thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.name} className="border-b border-cherry/5">
                <td className="px-4 py-2.5 font-black text-cherry">{s.name}</td>
                <td className="px-3 py-2.5"><Pill tone={s.role === "Owner" ? "gold" : s.role === "Manager" ? "teal" : "gray"}>{s.role}</Pill></td>
                <td className="px-3 py-2.5 tabular-nums text-cherry/60">{new Date(s.since).toLocaleDateString("fi-FI")}</td>
                <td className="px-3 py-2.5 text-right">
                  {s.role !== "Owner" && (
                    <button onClick={() => setStaff(staff.filter((x) => x.name !== s.name))} className="text-xs font-black text-brick underline">remove</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <form
          className="flex flex-wrap items-end gap-2 border-t border-cherry/10 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.name.trim() || staff.some((s) => s.name === draft.name)) return;
            setStaff([...staff, { name: draft.name.trim(), role: draft.role, since: Date.now() }]);
            setDraft({ name: "", role: "Manager" });
          }}
        >
          <Field label="Name"><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={inputCls} /></Field>
          <Field label="Role">
            <select value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value as Staff["role"] })} className={inputCls}>
              <option>Manager</option><option>Kitchen</option><option>Owner</option>
            </select>
          </Field>
          <PrimaryBtn>Add staff</PrimaryBtn>
        </form>
        <p className="px-4 pb-3 text-[11px] text-cherry/40">Roles: Owner = everything · Manager = no Settings/Admin · Kitchen = Orders + Menu availability only. Demo storage — wire to auth in production.</p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-cherry/10 bg-cream-deep/40">
        <AuditTab />
      </div>
    </div>
  );
}

/* ══ SETTINGS ══ */
export function SettingsView({ mode }: { mode: "general" | "restaurant" }) {
  const { settings, saveSettings, toast, logAudit } = useShop();
  const { dayName } = useLang();
  const [s, setS] = useState(settings);
  useEffect(() => setS(settings), [settings]);
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
            <Switch on={s.announcement.enabled} ariaLabel="announcement" onChange={() => setS({ ...s, announcement: { ...s.announcement, enabled: !s.announcement.enabled } })} />
          </label>
          <input value={s.announcement.text} onChange={(e) => setS({ ...s, announcement: { ...s.announcement, text: e.target.value } })} placeholder="e.g. Perjantaisin live-musiikkia klo 19!" className={inputCls + " mt-2"} />
        </div>
        <Field label="Pause message (shown when ordering is paused)">
          <textarea rows={2} value={s.pauseMessage} onChange={(e) => setS({ ...s, pauseMessage: e.target.value })} className={inputCls} />
        </Field>
        <PrimaryBtn icon="save" onClick={() => { saveSettings(s); logAudit("restaurant info / announcement updated"); toast("Saved"); }}>Save</PrimaryBtn>
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
          onChange={() => {
            setS({ ...s, paused: !s.paused });
            saveSettings({ ...s, paused: !s.paused });
            logAudit(`ordering ${s.paused ? "resumed" : "paused"}`);
            toast(s.paused ? "Ordering resumed" : "Ordering paused", s.paused ? "ok" : "err");
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
                <input type="checkbox" checked={!s.hours[d]} onChange={(e) => setS({ ...s, hours: { ...s.hours, [d]: e.target.checked ? null : { open: "10:00", close: "21:00" } } })} className="h-4 w-4 accent-[#0F3D3E]" />
                closed
              </label>
              {s.hours[d] && (
                <>
                  <input type="time" value={s.hours[d]!.open} onChange={(e) => setS({ ...s, hours: { ...s.hours, [d]: { ...s.hours[d]!, open: e.target.value } } })} className="min-h-[36px] rounded-lg border border-cherry/20 bg-cream px-2" />
                  <span>–</span>
                  <input type="time" value={s.hours[d]!.close} onChange={(e) => setS({ ...s, hours: { ...s.hours, [d]: { ...s.hours[d]!, close: e.target.value } } })} className="min-h-[36px] rounded-lg border border-cherry/20 bg-cream px-2" />
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-cherry/10 bg-cream-deep/40 p-4 sm:grid-cols-3">
        <Field label="Delivery fee (€)"><input type="number" step="0.5" value={s.deliveryFee} onChange={(e) => setS({ ...s, deliveryFee: parseFloat(e.target.value) || 0 })} className={inputCls} /></Field>
        <Field label="Min delivery order (€)"><input type="number" step="1" value={s.minOrder} onChange={(e) => setS({ ...s, minOrder: parseFloat(e.target.value) || 0 })} className={inputCls} /></Field>
        <Field label="Radius (km)"><input type="number" step="1" value={s.radiusKm} onChange={(e) => setS({ ...s, radiusKm: parseFloat(e.target.value) || 0 })} className={inputCls} /></Field>
      </div>

      <div className="space-y-3 rounded-2xl border border-cherry/10 bg-cream-deep/40 p-4">
        <h3 className="text-sm font-black text-cherry">Ordering platforms & display</h3>
        <Field label="Wolt URL"><input value={s.platforms.wolt} onChange={(e) => setS({ ...s, platforms: { ...s.platforms, wolt: e.target.value } })} className={inputCls} /></Field>
        <Field label="Uber Eats URL"><input value={s.platforms.uberEats} onChange={(e) => setS({ ...s, platforms: { ...s.platforms, uberEats: e.target.value } })} className={inputCls} /></Field>
        <label className="flex items-center justify-between text-sm font-black text-cherry">
          Header logo
          <select value={s.headerLogo} onChange={(e) => setS({ ...s, headerLogo: e.target.value as "round" | "mark" })} className="min-h-[36px] rounded-lg border border-cherry/20 bg-cream px-2 text-xs font-bold">
            <option value="round">Round logo</option>
            <option value="mark">Banner pizza mark</option>
          </select>
        </label>
        <label className="flex items-center justify-between text-sm font-black text-cherry">
          Hide unavailable items
          <Switch on={s.hideUnavailable} ariaLabel="hide unavailable" onChange={() => setS({ ...s, hideUnavailable: !s.hideUnavailable })} />
        </label>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-cherry/10 bg-cream-deep/40 px-4 py-3 text-sm">
        <span className="font-black text-cherry">Today ({today}) — quick availability</span>
        <GhostBtn onClick={() => { const map = { ...s.offItems }; for (const k of Object.keys(map)) if (map[k].offToday === today) delete map[k]; setS({ ...s, offItems: map }); saveSettings({ ...s, offItems: map }); toast("Today's sold-outs reset"); }}>Reset today's sold-outs</GhostBtn>
      </div>

      <PrimaryBtn icon="save" onClick={() => { saveSettings(s); toast("Settings saved"); }}>Save settings</PrimaryBtn>
    </div>
  );
}
