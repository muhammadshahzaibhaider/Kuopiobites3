"use client";
import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { cx } from "@/lib/format";
import { Ic } from "./icons";

/* ── localStorage state hook ── */
export function useLocal<T>(key: string, initial: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [v, setV] = useState<T>(initial);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw != null) setV(JSON.parse(raw));
    } catch {}
  }, [key]);
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch {}
  }, [key, v]);
  return [v, setV];
}

/* ── status pills ── */
export type Tone = "green" | "orange" | "red" | "gray" | "teal" | "gold";
const TONES: Record<Tone, string> = {
  green: "bg-[#e6f4e7] text-[#2e7d32] border-[#2e7d32]/30",
  orange: "bg-[#fdf0e2] text-[#b45309] border-[#E8792B]/40",
  red: "bg-[#fdeaea] text-[#b3261e] border-[#b3261e]/30",
  gray: "bg-cherry/5 text-cherry/50 border-cherry/20",
  teal: "bg-[#e3efee] text-[#0F3D3E] border-[#0F3D3E]/30",
  gold: "bg-[#fdf0e2] text-gold-deep border-gold/50",
};
export function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-black", TONES[tone])}>
      {children}
    </span>
  );
}

export function statusTone(s: string): Tone {
  if (["completed", "accepted", "active", "available", "confirmed", "accepted-res"].includes(s)) return "green";
  if (["placed", "preparing", "pending", "scheduled"].includes(s)) return "orange";
  if (["ready", "out"].includes(s)) return "teal";
  if (["cancelled", "declined", "refunded", "unavailable", "soldout"].includes(s)) return "red";
  return "gray";
}

/* ── toggle switch ── */
export function Toggle({ on, onChange, label }: { on: boolean; onChange: () => void; label?: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className={cx("relative h-6 w-11 shrink-0 rounded-full transition-colors", on ? "bg-[#2e7d32]" : "bg-cherry/20")}
    >
      <span className={cx("absolute top-0.5 h-5 w-5 rounded-full bg-cream shadow transition-all", on ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}

/* ── skeleton + empty ── */
export function SkeletonRows({ n = 6 }: { n?: number }) {
  return (
    <div className="space-y-2 p-4" role="status" aria-label="Loading">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="h-11 animate-pulse rounded-xl bg-cherry/8 motion-reduce:animate-none" style={{ opacity: 1 - i * 0.12 }} />
      ))}
    </div>
  );
}
export function EmptyState({ icon = "search", title, sub }: { icon?: string; title: string; sub?: string }) {
  return (
    <div className="grid place-items-center gap-2 py-16 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-cream-deep text-cherry/40">
        <Ic n={icon} size={28} />
      </span>
      <p className="font-display text-lg font-black text-cherry">{title}</p>
      {sub && <p className="max-w-sm text-sm text-cherry/60">{sub}</p>}
    </div>
  );
}

/* ── buttons ── */
export function PrimaryBtn({ children, onClick, icon = "plus" }: { children: React.ReactNode; onClick?: () => void; icon?: string }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-gold px-4 text-sm font-black text-cherry-dark shadow-card transition hover:bg-gold-deep hover:text-cream active:scale-[0.97]"
    >
      <Ic n={icon} size={16} /> {children}
    </button>
  );
}
export function GhostBtn({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button onClick={onClick} className={cx("inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-cherry/20 px-3 text-xs font-black text-cherry transition hover:border-cherry hover:bg-cherry hover:text-cream", className)}>
      {children}
    </button>
  );
}

/* ── toolbar: search + filters + group + primary ── */
export interface FilterDef {
  id: string;
  label: string;
  options: { value: string; label: string }[];
  value: string;
  set: (v: string) => void;
}
export function Toolbar({
  search, setSearch, searchPh, filters, group, groupOptions, onGroup, action, children,
}: {
  search?: string;
  setSearch?: (s: string) => void;
  searchPh?: string;
  filters?: FilterDef[];
  group?: string;
  groupOptions?: { value: string; label: string }[];
  onGroup?: (v: string) => void;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const active = (filters ?? []).filter((f) => f.value && f.value !== "all").length;
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-cherry/10 bg-cream-deep/60 px-4 py-3">
      {setSearch && (
        <label className="relative min-w-[180px] flex-1 sm:max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cherry/40"><Ic n="search" size={15} /></span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPh ?? "Search…"}
            className="min-h-[38px] w-full rounded-lg border border-cherry/15 bg-cream pl-9 pr-3 text-sm font-bold placeholder:text-cherry/40 focus:border-gold"
          />
        </label>
      )}
      {filters && filters.length > 0 && (
        <div className="relative">
          <button onClick={() => setOpen((o) => !o)} className={cx("inline-flex min-h-[38px] items-center gap-2 rounded-lg border px-3 text-xs font-black", active ? "border-gold bg-gold/15 text-gold-deep" : "border-cherry/20 text-cherry")}>
            <Ic n="filter" size={14} /> Filters {active > 0 && <span className="grid h-4 min-w-[16px] place-items-center rounded-full bg-gold px-1 text-[10px] text-cherry-dark">{active}</span>}
            <Ic n="chevD" size={12} />
          </button>
          {open && (
            <div className="absolute left-0 top-11 z-30 w-64 rounded-xl border border-cherry/15 bg-cream p-3 shadow-lift">
              {filters.map((f) => (
                <label key={f.id} className="mb-2 block text-xs font-black text-cherry/60">
                  {f.label}
                  <select value={f.value} onChange={(e) => f.set(e.target.value)} className="mt-1 min-h-[34px] w-full rounded-lg border border-cherry/20 bg-cream px-2 text-xs font-bold text-cherry">
                    {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
              ))}
              <button onClick={() => { filters.forEach((f) => f.set("all")); setOpen(false); }} className="mt-1 text-[11px] font-black text-brick underline">Clear all</button>
            </div>
          )}
        </div>
      )}
      {groupOptions && onGroup && (
        <label className="inline-flex min-h-[38px] items-center gap-2 rounded-lg border border-cherry/20 px-3 text-xs font-black text-cherry">
          <Ic n="group" size={14} /> Group
          <select value={group} onChange={(e) => onGroup(e.target.value)} className="bg-transparent text-xs font-bold outline-none">
            {groupOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
      )}
      {children}
      {action && <span className="ml-auto">{action}</span>}
    </div>
  );
}

/* ── generic data table ── */
export interface Col<T> {
  key: string;
  label: string;
  sort?: (r: T) => string | number;
  render: (r: T) => React.ReactNode;
  hideMd?: boolean;
}
export function DataTable<T>({
  rows, cols, id, search, selectable, bulk, rowMenu, onRow, pageSizeDefault = 12, loading, empty,
}: {
  rows: T[];
  cols: Col<T>[];
  id: (r: T) => string;
  search?: (r: T, q: string) => boolean;
  selectable?: boolean;
  bulk?: (ids: string[], clear: () => void) => React.ReactNode;
  rowMenu?: (r: T) => { label: string; icon?: string; danger?: boolean; onClick: () => void }[];
  onRow?: (r: T) => void;
  pageSizeDefault?: number;
  loading?: boolean;
  empty?: React.ReactNode;
}) {
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [dir, setDir] = useState<1 | -1>(1);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(pageSizeDefault);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = rows;
    if (q.trim() && search) list = list.filter((r) => search(r, q.trim().toLowerCase()));
    if (sortKey) {
      const col = cols.find((c) => c.key === sortKey);
      if (col?.sort) list = [...list].sort((a, b) => (col.sort!(a) > col.sort!(b) ? dir : -dir));
    }
    return list;
  }, [rows, q, sortKey, dir, cols, search]);

  useEffect(() => setPage(0), [q, rows.length, pageSize]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice(page * pageSize, page * pageSize + pageSize);
  const shown = Math.min(filtered.length, (page + 1) * pageSize);

  if (loading) return <SkeletonRows />;
  if (rows.length === 0) return <>{empty ?? <EmptyState title="Nothing here yet" sub="Add your first record with the + button above." />}</>;

  return (
    <div>
      <div className="flex items-center gap-2 border-b border-cherry/10 px-4 py-2">
        <label className="relative flex-1 sm:max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cherry/40"><Ic n="search" size={14} /></span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search in table…" className="min-h-[34px] w-full rounded-lg border border-cherry/15 bg-cream pl-8 pr-3 text-xs font-bold placeholder:text-cherry/40" />
        </label>
        {sel.size > 0 && bulk && <div className="flex items-center gap-2 rounded-lg bg-gold/15 px-3 py-1">{bulk(Array.from(sel), () => setSel(new Set()))}</div>}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-cherry/10 text-[11px] font-black uppercase tracking-wide text-cherry/50">
              {selectable && (
                <th className="w-10 px-4 py-2.5">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={sel.size > 0 && pageRows.every((r) => sel.has(id(r)))}
                    onChange={(e) => {
                      const nx = new Set(sel);
                      pageRows.forEach((r) => (e.target.checked ? nx.add(id(r)) : nx.delete(id(r))));
                      setSel(nx);
                    }}
                    className="h-4 w-4 accent-[#0F3D3E]"
                  />
                </th>
              )}
              {cols.map((c) => (
                <th key={c.key} className={cx("px-3 py-2.5", c.hideMd && "hidden lg:table-cell")}>
                  {c.sort ? (
                    <button onClick={() => { if (sortKey === c.key) setDir((d) => (d === 1 ? -1 : 1)); else { setSortKey(c.key); setDir(1); } }} className="inline-flex items-center gap-1 hover:text-cherry">
                      {c.label}
                      <Ic n="chevD" size={11} className={cx("transition", sortKey === c.key ? "opacity-100" : "opacity-0 group-hover:opacity-40", sortKey === c.key && dir === -1 && "rotate-180")} />
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              ))}
              {rowMenu && <th className="w-12 px-3 py-2.5" />}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 && (
              <tr><td colSpan={cols.length + 2}><EmptyState title="No results" sub={`Nothing matches “${q}”. Try clearing the search or filters.`} /></td></tr>
            )}
            {pageRows.map((r) => (
              <tr key={id(r)} onClick={() => onRow?.(r)} className={cx("border-b border-cherry/5 transition hover:bg-cream-deep/70", onRow && "cursor-pointer")}>
                {selectable && (
                  <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      aria-label="Select row"
                      checked={sel.has(id(r))}
                      onChange={(e) => {
                        const nx = new Set(sel);
                        if (e.target.checked) nx.add(id(r)); else nx.delete(id(r));
                        setSel(nx);
                      }}
                      className="h-4 w-4 accent-[#0F3D3E]"
                    />
                  </td>
                )}
                {cols.map((c) => (
                  <td key={c.key} className={cx("px-3 py-2.5", c.hideMd && "hidden lg:table-cell")}>{c.render(r)}</td>
                ))}
                {rowMenu && (
                  <td className="relative px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <button aria-label="Row actions" onClick={() => setMenuFor(menuFor === id(r) ? null : id(r))} className="grid h-8 w-8 place-items-center rounded-lg text-cherry/50 hover:bg-cherry/10 hover:text-cherry">
                      <Ic n="dots" size={16} />
                    </button>
                    {menuFor === id(r) && (
                      <div className="absolute right-2 top-10 z-30 w-40 overflow-hidden rounded-xl border border-cherry/15 bg-cream shadow-lift">
                        {rowMenu(r).map((a) => (
                          <button key={a.label} onClick={() => { setMenuFor(null); a.onClick(); }} className={cx("flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-black hover:bg-cream-deep", a.danger ? "text-brick" : "text-cherry")}>
                            <Ic n={a.icon ?? "edit"} size={13} /> {a.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* pagination */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs font-bold text-cherry/60">
        <label className="flex items-center gap-2">
          Showing
          <select value={pageSize} onChange={(e) => setPageSize(parseInt(e.target.value))} className="min-h-[30px] rounded-lg border border-cherry/20 bg-cream px-1.5 font-black text-cherry">
            {[12, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          of {filtered.length}
        </label>
        <div className="flex items-center gap-1">
          <button disabled={page === 0} onClick={() => setPage(0)} className="grid h-8 w-8 place-items-center rounded-lg border border-cherry/15 disabled:opacity-30">«</button>
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="grid h-8 w-8 place-items-center rounded-lg border border-cherry/15 disabled:opacity-30">‹</button>
          {Array.from({ length: Math.min(5, pages) }).map((_, i) => {
            const start = Math.max(0, Math.min(page - 2, pages - 5));
            const p = start + i;
            if (p >= pages) return null;
            return (
              <button key={p} onClick={() => setPage(p)} className={cx("h-8 min-w-[32px] rounded-lg border px-1 font-black", p === page ? "border-cherry bg-cherry text-cream" : "border-cherry/15 text-cherry")}>
                {p + 1}
              </button>
            );
          })}
          <button disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} className="grid h-8 w-8 place-items-center rounded-lg border border-cherry/15 disabled:opacity-30">›</button>
          <button disabled={page >= pages - 1} onClick={() => setPage(pages - 1)} className="grid h-8 w-8 place-items-center rounded-lg border border-cherry/15 disabled:opacity-30">»</button>
        </div>
      </div>
    </div>
  );
}

/* ── right drawer ── */
export function Drawer({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: React.ReactNode; children: React.ReactNode; wide?: boolean }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-40 bg-cherry-dark/40 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside
            className={cx("fixed right-0 top-0 z-50 flex h-full w-full flex-col bg-cream shadow-lift", wide ? "max-w-2xl" : "max-w-md")}
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            role="dialog" aria-modal="true"
          >
            <div className="flex items-center justify-between border-b-2 border-gold/40 px-5 py-4">
              <h2 className="font-display text-lg font-black text-cherry">{title}</h2>
              <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-lg border border-cherry/20 text-cherry hover:bg-cherry hover:text-cream"><Ic n="close" size={15} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">{children}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

/* ── sub tabs (underlined row) ── */
export function SubTabs({ tabs, active, onChange }: { tabs: { id: string; label: string }[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="no-scrollbar flex gap-1 overflow-x-auto border-b-2 border-cherry/10">
      {tabs.map((tb) => (
        <button key={tb.id} onClick={() => onChange(tb.id)} className={cx("relative min-h-[42px] whitespace-nowrap px-4 text-sm font-black", active === tb.id ? "text-cherry" : "text-cherry/50 hover:text-cherry")}>
          {tb.label}
          {active === tb.id && <motion.span layoutId="subtab" className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded bg-gold" />}
        </button>
      ))}
    </div>
  );
}

/* ── stat card ── */
export function StatCard({ label, value, icon, tone = "teal", onClick }: { label: string; value: React.ReactNode; icon: string; tone?: Tone; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-3 rounded-2xl border border-cherry/10 bg-cream-deep p-4 text-left transition hover:border-gold hover:shadow-card">
      <span className={cx("grid h-11 w-11 shrink-0 place-items-center rounded-xl border", TONES[tone])}><Ic n={icon} size={20} /></span>
      <span>
        <span className="block text-[11px] font-black uppercase tracking-wide text-cherry/50">{label}</span>
        <span className="block font-display text-xl font-black tabular-nums text-cherry">{value}</span>
      </span>
    </button>
  );
}

/* ── confirm ── */
export function Confirm({ open, title, body, onYes, onNo, danger }: { open: boolean; title: string; body?: string; onYes: () => void; onNo: () => void; danger?: boolean }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] grid place-items-center bg-cherry-dark/50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onNo}>
          <motion.div className="w-full max-w-sm rounded-2xl bg-cream p-5 shadow-lift" initial={{ scale: 0.94, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 8 }} onClick={(e) => e.stopPropagation()}>
            <p className="font-display text-lg font-black text-cherry">{title}</p>
            {body && <p className="mt-1 text-sm text-cherry/70">{body}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <GhostBtn onClick={onNo}>Cancel</GhostBtn>
              <button onClick={onYes} className={cx("min-h-[36px] rounded-lg px-4 text-xs font-black text-cream", danger ? "bg-brick" : "bg-cherry hover:bg-cherry-bright")}>Confirm</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── csv export ── */
export function downloadCSV(name: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ── tiny bar chart ── */
export function Bars({ data, height = 120 }: { data: { label: string; value: number }[]; height?: number }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1" title={`${d.label}: ${d.value}`}>
          <span className="text-[9px] font-black tabular-nums text-cherry/50">{d.value || ""}</span>
          <div className="w-full rounded-t bg-cherry-bright transition-all" style={{ height: `${Math.max(3, (d.value / max) * 100)}%` }} />
          <span className="text-[9px] font-black uppercase text-cherry/50">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function useDelayedReady(key: string, ms = 220) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(false);
    const t = setTimeout(() => setReady(true), ms);
    return () => clearTimeout(t);
  }, [key, ms]);
  return ready;
}

export const fmtDT = (ts: number) =>
  new Date(ts).toLocaleString("fi-FI", { timeZone: "Europe/Helsinki", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-black text-cherry/60">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}
export const inputCls = "min-h-[38px] w-full rounded-lg border border-cherry/20 bg-cream px-3 text-sm font-bold text-cherry focus:border-gold";

export function RowMenuButton() {
  return null;
}
export { useRef };
