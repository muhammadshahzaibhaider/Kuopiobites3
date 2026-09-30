"use client";
import { useMemo, useState } from "react";
import { eur } from "@/lib/format";
import { todayStrHelsinki } from "@/lib/hours";
import { useLang } from "@/lib/i18n";
import { useShop, useTick } from "@/lib/store";
import type { Order, OrderStatus, Reservation } from "@/lib/types";
import { Ic } from "./icons";
import { Bars, Confirm, DataTable, Drawer, EmptyState, Field, GhostBtn, Pill, PrimaryBtn, StatCard, SubTabs, Toolbar, downloadCSV, fmtDT, inputCls, statusTone, useDelayedReady, SkeletonRows, type Col, type FilterDef } from "./ui";

const NEXT: Record<OrderStatus, OrderStatus> = { placed: "accepted", accepted: "preparing", preparing: "ready", ready: "completed", completed: "completed" };

/* ══ DASHBOARD ══ */
export function DashboardView({ go }: { go: (v: string) => void }) {
  const { orders, reservations, users, orderStatus, settings, saveSettings, logAudit, toast } = useShop();
  const { t } = useLang();
  const [range, setRange] = useState<7 | 30>(7);
  const [confirmPause, setConfirmPause] = useState(false);
  const ready = useDelayedReady("dash");
  const today = todayStrHelsinki();

  const todays = orders.filter((o) => new Date(o.createdAt).toLocaleDateString("en-CA", { timeZone: "Europe/Helsinki" }) === today);
  const revenue = todays.filter((o) => !o.refunded).reduce((a, o) => a + o.total, 0);
  const pending = orders.filter((o) => ["placed", "accepted", "preparing"].includes(orderStatus(o)) && !o.refunded).length;
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

  if (!ready) return <SkeletonRows n={8} />;
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard label={t("admin.orders") + " today"} value={todays.length} icon="orders" onClick={() => go("orders.queue")} />
        <StatCard label="Revenue today" value={eur(revenue)} icon="analytics" tone="green" onClick={() => go("analytics.sales")} />
        <StatCard label="Pending orders" value={pending} icon="clock" tone="orange" onClick={() => go("orders.queue")} />
        <StatCard label="Reservations" value={upcoming} icon="calendar" onClick={() => go("dining.list")} />
        <StatCard label="Off-menu items" value={offCount} icon="warn" tone={offCount ? "red" : "gray"} onClick={() => go("menu.items")} />
        <StatCard label="New sign-ups" value={newUsers} icon="users" tone="gold" onClick={() => go("customers.list")} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-cherry/10 bg-cream-deep p-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-black uppercase tracking-wide text-cherry/50">Revenue · last {range} days</p>
            <div className="flex gap-1">
              {([7, 30] as const).map((r) => (
                <button key={r} onClick={() => setRange(r)} className={r === range ? "rounded-lg bg-cherry px-2.5 py-1 text-[11px] font-black text-cream" : "rounded-lg px-2.5 py-1 text-[11px] font-black text-cherry/50"}>{r}d</button>
              ))}
            </div>
          </div>
          <div className="mt-3"><Bars data={days} height={140} /></div>
        </div>
        <div className="rounded-2xl border border-cherry/10 bg-cream-deep p-4">
          <p className="text-[11px] font-black uppercase tracking-wide text-cherry/50">Top selling · {range}d</p>
          <ul className="mt-3 space-y-2">
            {top.map(([name, n], i) => (
              <li key={name} className="flex items-center gap-2 text-sm">
                <span className="grid h-6 w-6 place-items-center rounded-lg bg-gold/20 text-[11px] font-black text-gold-deep">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate font-bold text-cherry">{name}</span>
                <span className="font-black tabular-nums text-cherry/60">×{n}</span>
              </li>
            ))}
            {top.length === 0 && <li className="text-xs text-cherry/50">No sales in range yet.</li>}
          </ul>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-cherry/10 bg-cream-deep p-4 lg:col-span-2">
          <p className="text-[11px] font-black uppercase tracking-wide text-cherry/50">Live feed</p>
          <ul className="mt-2 divide-y divide-cherry/5">
            {feed.map((o) => (
              <li key={o.id}>
                <button onClick={() => go("orders.queue")} className="flex w-full items-center gap-3 py-2 text-left text-sm hover:bg-cream">
                  <span className="font-black text-cherry">{o.id}</span>
                  <span className="text-xs text-cherry/60">{fmtDT(o.createdAt)} · {o.customer.name}</span>
                  <span className="ml-auto font-black tabular-nums">{eur(o.total)}</span>
                  <Pill tone={statusTone(orderStatus(o))}>{orderStatus(o)}</Pill>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-2 rounded-2xl border border-cherry/10 bg-cream-deep p-4">
          <p className="text-[11px] font-black uppercase tracking-wide text-cherry/50">Quick actions</p>
          <PrimaryBtn onClick={() => go("menu.items")}>Add menu item</PrimaryBtn>
          <GhostBtn className="w-full justify-center" onClick={() => go("menu.special")}>★ Set Today's Special</GhostBtn>
          <GhostBtn className="w-full justify-center" onClick={() => go("marketing.promos")}>+ Promo code</GhostBtn>
          <button
            onClick={() => setConfirmPause(true)}
            className={settings.paused ? "min-h-[40px] w-full rounded-xl bg-[#2e7d32] px-4 text-sm font-black text-cream" : "min-h-[40px] w-full rounded-xl border-2 border-brick px-4 text-sm font-black text-brick hover:bg-brick hover:text-cream"}
          >
            {settings.paused ? "▶ Resume online ordering" : "⏸ Pause online ordering"}
          </button>
        </div>
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
  const { orders, orderStatus, setOrderStatus, refundOrder, toast, logAudit } = useShop();
  const [fStatus, setFStatus] = useState("all");
  const [fType, setFType] = useState("all");
  const [fDate, setFDate] = useState("all");
  const [group, setGroup] = useState("none");
  const [detail, setDetail] = useState<Order | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const ready = useDelayedReady(mode);

  const base = useMemo(() => {
    let list = [...orders].sort((a, b) => b.createdAt - a.createdAt);
    if (mode === "refunds") list = list.filter((o) => o.refunded);
    if (mode === "queue") list = list.filter((o) => orderStatus(o) !== "completed" && !o.refunded);
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
    { id: "status", label: "Status", value: fStatus, set: setFStatus, options: [{ value: "all", label: "All statuses" }, ...["placed", "accepted", "preparing", "ready", "completed"].map((s) => ({ value: s, label: s }))] },
    { id: "type", label: "Type", value: fType, set: setFType, options: [{ value: "all", label: "Pickup + Delivery" }, { value: "pickup", label: "Pickup" }, { value: "delivery", label: "Delivery" }] },
    { id: "date", label: "Date", value: fDate, set: setFDate, options: [{ value: "all", label: "All dates" }, { value: "today", label: "Today" }] },
  ];

  const cols: Col<Order>[] = [
    { key: "id", label: "Order #", sort: (o) => o.id, render: (o) => <span className="font-black text-cherry">{o.id}</span> },
    { key: "time", label: "Placed", sort: (o) => o.createdAt, render: (o) => <span className="tabular-nums text-cherry/60">{fmtDT(o.createdAt)}</span> },
    { key: "cust", label: "Customer", sort: (o) => o.customer.name, render: (o) => <span className="font-bold">{o.customer.name}</span> },
    { key: "type", label: "Type", hideMd: true, render: (o) => <Pill tone={o.type === "delivery" ? "teal" : "gray"}>{o.type}</Pill> },
    { key: "items", label: "Items", hideMd: true, render: (o) => <span className="text-cherry/60">{o.lines.reduce((a, l) => a + l.qty, 0)} pcs</span> },
    {
      key: "total", label: "Total", sort: (o) => o.total,
      render: (o) => <span className="font-black tabular-nums">{eur(o.total)}</span>,
    },
    {
      key: "status", label: "Status", sort: (o) => orderStatus(o),
      render: (o) => (
        <span className="flex items-center gap-2">
          <Pill tone={statusTone(orderStatus(o))}>{orderStatus(o)}</Pill>
          {o.refunded && <Pill tone="red">refunded</Pill>}
          {o.scheduled && <Pill tone="gold">pre-order</Pill>}
        </span>
      ),
    },
    {
      key: "act", label: "Actions",
      render: (o) =>
        mode !== "refunds" && orderStatus(o) !== "completed" ? (
          <button
            onClick={(e) => { e.stopPropagation(); setOrderStatus(o.id, NEXT[orderStatus(o)]); toast(`${o.id} → ${NEXT[orderStatus(o)]}`); }}
            className="inline-flex min-h-[30px] items-center gap-1 rounded-lg bg-cherry px-2.5 text-[11px] font-black text-cream hover:bg-cherry-bright"
          >
            <Ic n="chevR" size={12} /> {NEXT[orderStatus(o)]}
          </button>
        ) : (
          <GhostBtn onClick={() => setDetail(o)}><Ic n="eye" size={12} /> View</GhostBtn>
        ),
    },
  ];

  const renderTable = (list: Order[]) => (
    <DataTable
      rows={list}
      cols={cols}
      id={(o) => o.id}
      loading={!ready}
      search={(o, q) => o.id.toLowerCase().includes(q) || o.customer.name.toLowerCase().includes(q)}
      selectable
      bulk={(ids, clear) => (
        <>
          <span className="text-xs font-black text-cherry">{ids.length} selected</span>
          <GhostBtn onClick={() => { ids.forEach((id) => setOrderStatus(id, NEXT[orderStatus(orders.find((o) => o.id === id)!)] ?? "accepted")); toast(`${ids.length} advanced`); clear(); }}>Advance status</GhostBtn>
          <GhostBtn onClick={() => { downloadCSV("orders.csv", [["id", "total", "status"], ...ids.map((id) => { const o = orders.find((x) => x.id === id)!; return [o.id, o.total, orderStatus(o)]; })]); clear(); }}><Ic n="csv" size={12} /> CSV</GhostBtn>
        </>
      )}
      onRow={(o) => setDetail(o)}
      rowMenu={(o) => [
        { label: "View detail", icon: "eye", onClick: () => setDetail(o) },
        { label: "Print ticket", icon: "print", onClick: () => printTicket(o) },
        ...(!o.refunded ? [{ label: "Refund…", icon: "trash", danger: true, onClick: () => setDetail(o) }] : []),
      ]}
      empty={<EmptyState icon="orders" title="No orders here" sub={mode === "queue" ? "New orders appear instantly with a sound + badge." : "Orders will show up as customers check out."} />}
    />
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-cherry/10 bg-cream-deep/40">
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
            <div key={k} className="overflow-hidden rounded-xl border border-cherry/10 bg-cream">
              <p className="border-b border-cherry/10 bg-cream-deep px-4 py-2 text-xs font-black uppercase text-cherry/60">{k} · {list.length}</p>
              {renderTable(list)}
            </div>
          ))}
        </div>
      ) : (
        renderTable(rows)
      )}

      <Drawer open={!!detail} onClose={() => setDetail(null)} title={detail ? `Order ${detail.id}` : ""} wide>
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2">
              <Pill tone={statusTone(orderStatus(detail))}>{orderStatus(detail)}</Pill>
              <Pill tone={detail.type === "delivery" ? "teal" : "gray"}>{detail.type}</Pill>
              {detail.scheduled && <Pill tone="gold">pre-order {detail.scheduled.date} {detail.scheduled.time}</Pill>}
            </div>
            {/* timeline */}
            <ol className="flex items-center gap-1">
              {(["placed", "accepted", "preparing", "ready", "completed"] as OrderStatus[]).map((s, i, arr) => {
                const idx = arr.indexOf(orderStatus(detail));
                const done = i <= idx;
                return (
                  <li key={s} className="flex flex-1 flex-col items-center gap-1">
                    <span className={done ? "h-3 w-3 rounded-full bg-[#2e7d32]" : "h-3 w-3 rounded-full bg-cherry/20"} />
                    <span className={done ? "text-[10px] font-black uppercase text-[#2e7d32]" : "text-[10px] font-black uppercase text-cherry/40"}>{s}</span>
                    {i < arr.length - 1 && <span className="sr-only">→</span>}
                  </li>
                );
              })}
            </ol>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="font-black text-cherry">Customer</p>
                <p className="text-cherry/70">{detail.customer.name}</p>
                <p className="text-cherry/70">{detail.customer.phone} · {detail.customer.email}</p>
                {detail.type === "delivery" && <p className="mt-1 font-bold text-cherry">🛵 {detail.address}</p>}
                {detail.note && <p className="mt-1 rounded-lg bg-gold/15 px-2 py-1 text-xs font-bold">Note: {detail.note}</p>}
              </div>
              <div>
                <p className="font-black text-cherry">Items</p>
                <ul className="mt-1 space-y-1 text-cherry/80">
                  {detail.lines.map((l, i) => (
                    <li key={i}>{l.qty}× {l.name} ({l.variantLabel}){l.options.length ? ` — ${l.options.join("; ")}` : ""} · {eur(l.unitPrice * l.qty)}</li>
                  ))}
                </ul>
              </div>
            </div>
            <dl className="space-y-1 rounded-xl border border-cherry/10 bg-cream p-3">
              <div className="flex justify-between"><dt>Subtotal</dt><dd className="tabular-nums">{eur(detail.subtotal)}</dd></div>
              <div className="flex justify-between"><dt>Delivery</dt><dd className="tabular-nums">{detail.deliveryFee ? eur(detail.deliveryFee) : "—"}</dd></div>
              {detail.discount && detail.discount.amount > 0 && <div className="flex justify-between text-[#2e7d32]"><dt>− {detail.discount.title}</dt><dd>−{eur(detail.discount.amount)}</dd></div>}
              <div className="flex justify-between text-xs text-cherry/60"><dt>VAT</dt><dd className="tabular-nums">{eur(detail.vat)}</dd></div>
              <div className="flex justify-between font-display text-lg font-black text-cherry"><dt>Total</dt><dd className="tabular-nums">{eur(detail.total)}</dd></div>
            </dl>
            <div className="flex flex-wrap gap-2">
              {orderStatus(detail) !== "completed" && (
                <select value={orderStatus(detail)} onChange={(e) => { setOrderStatus(detail.id, e.target.value as OrderStatus); setDetail({ ...detail }); }} className={inputCls + " w-auto"}>
                  {["placed", "accepted", "preparing", "ready", "completed"].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              )}
              <GhostBtn onClick={() => printTicket(detail)}><Ic n="print" size={13} /> Print ticket</GhostBtn>
              {!detail.refunded && (
                <button
                  onClick={async () => { await refundOrder(detail.id); logAudit(`refund ${detail.id}: ${refundReason || "no reason"}`); toast(`${detail.id} refunded`, "err"); setDetail(null); }}
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
  w.document.write(`<pre style="font:12px monospace;white-space:pre-wrap">${o.id}  ${new Date(o.createdAt).toLocaleString("fi-FI")}\n${o.customer.name} · ${o.type}\n--------------------------------\n${o.lines.map((l) => `${l.qty}x ${l.name} (${l.variantLabel})${l.options.length ? "\n   " + l.options.join("\n   ") : ""}`).join("\n")}\n--------------------------------\nTOTAL ${o.total.toFixed(2)} EUR\n${o.note ? "NOTE: " + o.note : ""}</pre>`);
  w.document.close();
  w.print();
}

/* ══ DINING ══ */
export function DiningView({ mode }: { mode: "calendar" | "list" | "slots" }) {
  const { reservations, setReservationStatus, settings, saveSettings, toast, logAudit } = useShop();
  const [month, setMonth] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [selRes, setSelRes] = useState<Reservation | null>(null);
  const ready = useDelayedReady(mode);

  if (mode === "calendar") {
    const first = new Date(month.y, month.m, 1);
    const startDay = (first.getDay() + 6) % 7; // Monday first
    const daysIn = new Date(month.y, month.m + 1, 0).getDate();
    const cells: (number | null)[] = [...Array(startDay).fill(null), ...Array.from({ length: daysIn }, (_, i) => i + 1)];
    const tone = (s?: string) => (s === "accepted" ? "bg-[#2e7d32]/20 border-[#2e7d32]" : s === "declined" ? "bg-brick/10 border-brick/50" : "bg-gold/20 border-gold");
    return (
      <div className="rounded-2xl border border-cherry/10 bg-cream-deep/40 p-4">
        <div className="mb-3 flex items-center justify-between">
          <GhostBtn onClick={() => setMonth((m) => (m.m === 0 ? { y: m.y - 1, m: 11 } : { ...m, m: m.m - 1 }))}>‹</GhostBtn>
          <p className="font-display text-lg font-black text-cherry">{first.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</p>
          <GhostBtn onClick={() => setMonth((m) => (m.m === 11 ? { y: m.y + 1, m: 0 } : { ...m, m: m.m + 1 }))}>›</GhostBtn>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase text-cherry/50">
          {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => <span key={d} className="py-1">{d}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            const key = d ? `${month.y}-${String(month.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}` : "";
            const dayRes = d ? reservations.filter((r) => r.date === key) : [];
            return (
              <div key={i} className={d ? "min-h-[72px] rounded-lg border border-cherry/10 bg-cream p-1" : ""}>
                {d && (
                  <>
                    <p className="text-right text-[10px] font-black text-cherry/50">{d}</p>
                    {dayRes.slice(0, 3).map((r) => (
                      <button key={r.id} onClick={() => setSelRes(r)} className={`mb-0.5 block w-full truncate rounded border px-1 text-left text-[10px] font-bold ${tone(r.status)}`}>
                        {r.time} {r.name}
                      </button>
                    ))}
                    {dayRes.length > 3 && <p className="text-[9px] font-black text-cherry/40">+{dayRes.length - 3} more</p>}
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
                <GhostBtn onClick={() => { setReservationStatus(selRes.id, "accepted"); toast("Reservation accepted"); }}>Accept</GhostBtn>
                <GhostBtn onClick={() => { setReservationStatus(selRes.id, "declined"); toast("Reservation declined", "err"); }}>Decline</GhostBtn>
              </div>
            </div>
          )}
        </Drawer>
      </div>
    );
  }

  if (mode === "slots") {
    return (
      <div className="max-w-2xl space-y-4 rounded-2xl border border-cherry/10 bg-cream-deep/40 p-5">
        <p className="text-sm font-black text-cherry">Table / slot settings</p>
        <Field label="Blocked slots (date-time keys, one per line)">
          <textarea value={settings.blockedSlots.join("\n")} onChange={(e) => saveSettings({ ...settings, blockedSlots: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })} rows={4} className={inputCls} />
        </Field>
        <Field label="Blackout dates (YYYY-MM-DD, one per line)">
          <textarea value={settings.blockedDates.join("\n")} onChange={(e) => saveSettings({ ...settings, blockedDates: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })} rows={4} className={inputCls} />
        </Field>
        <p className="text-xs text-cherry/60">Max party size and concurrent slots are enforced by the public reservation flow against these rules.</p>
      </div>
    );
  }

  const sorted = [...reservations].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  return (
    <div className="overflow-hidden rounded-2xl border border-cherry/10 bg-cream-deep/40">
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
    </div>
  );
}
