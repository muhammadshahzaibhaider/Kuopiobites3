"use client";
import { useEffect, useRef, useState } from "react";
import ImageUploader from "@/components/ImageUploader";
import { cx, eur, fmtDate } from "@/lib/format";
import { resolveImageSrc } from "@/lib/images";
import { todayStrHelsinki, toHhmm } from "@/lib/hours";
import { useLang } from "@/lib/i18n"
import { MENU } from "@/lib/menu";
import { useShop } from "@/lib/store";
import { apiActivity } from "@/lib/api";
import { inputCls, PrimaryBtn } from "@/admin/ui";
import { nextPreorderSundays } from "@/lib/v3";
import { newSpecialId, specialsValidationError, withSpecialFor } from "@/lib/specials";
import type { MenuItem, SpecialItem, ToppingMeta } from "@/lib/types";

/* ── shared ─────────────────────────────────────────── */

export function Switch({ on, onChange, ariaLabel }: { on: boolean; onChange: () => void; ariaLabel: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      onClick={onChange}
      className={cx("relative h-6 w-11 shrink-0 rounded-full transition-colors", on ? "bg-[#2e7d32]" : "bg-cherry/25")}
    >
      <span className={cx("absolute top-0.5 h-5 w-5 rounded-full bg-cream transition-all", on ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}

const TODAY = () => todayStrHelsinki();

/* ── availability: item / category / options ─────────── */

export function ItemAvailSwitch({ id, name }: { id: string; name: string }) {
  const { settings, saveSettings, toast, logAudit } = useShop();
  const { t } = useLang();
  const st = settings.offItems[id];
  const off = !!st && (st.off === true || st.offToday === TODAY());

  const set = async (mode: "until" | "today" | "on") => {
    const map = { ...settings.offItems };
    if (mode === "on") delete map[id];
    else map[id] = mode === "until" ? { off: true } : { offToday: TODAY() };
    if (!await saveSettings({ ...settings, offItems: map })) return;
    logAudit(`${mode === "on" ? "ON" : mode === "until" ? "OFF (until on)" : "OFF (today)"} item ${name}`);
    toast(mode === "on" ? `${name} back on menu` : `${name} ${mode === "until" ? t("admin.untilOn") : t("admin.todayOnly")}`, mode === "on" ? "ok" : "err");
  };

  return off ? (
    <button onClick={() => set("on")} className="min-h-[36px] rounded-lg border border-[#2e7d32] bg-[#2e7d32] px-3 text-xs font-black text-cream">
      ON — restore
    </button>
  ) : (
    <span className="flex gap-1">
      <button onClick={() => set("until")} className="min-h-[36px] rounded-lg border border-brick/50 px-2 text-xs font-black text-brick hover:bg-brick hover:text-cream" title={t("admin.untilOn")}>
        OFF
      </button>
      <button onClick={() => set("today")} className="min-h-[36px] rounded-lg border border-brick/30 px-2 text-xs font-black text-brick/70 hover:bg-brick hover:text-cream" title={t("admin.todayOnly")}>
        today
      </button>
    </span>
  );
}

export function CatAvailSwitch({ id, title }: { id: string; title: string }) {
  const { settings, saveSettings, logAudit, toast } = useShop();
  const { t } = useLang();
  const st = settings.offCats[id];
  const off = !!st && (st.off === true || st.offToday === TODAY());
  const set = async (mode: "until" | "today" | "on") => {
    const map = { ...settings.offCats };
    if (mode === "on") delete map[id];
    else map[id] = mode === "until" ? { off: true } : { offToday: TODAY() };
    if (!await saveSettings({ ...settings, offCats: map })) return;
    logAudit(`${mode === "on" ? "ON" : "OFF"} category ${title} (${mode})`);
    toast(mode === "on" ? `${title} back on menu` : `${title} marked unavailable`, mode === "on" ? "ok" : "err");
  };
  return (
    <span className="flex items-center gap-1">
      {off ? (
        <button onClick={() => set("on")} className="min-h-[32px] rounded-lg bg-[#2e7d32] px-2 text-[11px] font-black text-cream">CAT ON</button>
      ) : (
        <>
          <button onClick={() => set("until")} className="min-h-[32px] rounded-lg border border-brick/50 px-2 text-[11px] font-black text-brick" title={t("admin.untilOn")}>CAT OFF</button>
          <button onClick={() => set("today")} className="min-h-[32px] rounded-lg border border-brick/30 px-2 text-[11px] font-black text-brick/70" title={t("admin.todayOnly")}>today</button>
        </>
      )}
    </span>
  );
}

export function BulkAvail({ ids }: { ids: string[] }) {
  const { settings, saveSettings, logAudit, toast } = useShop();
  const { t } = useLang();
  if (!ids.length) return null;
  const apply = async (mode: "until" | "today" | "on") => {
    const map = { ...settings.offItems };
    for (const id of ids) {
      if (mode === "on") delete map[id];
      else map[id] = mode === "until" ? { off: true } : { offToday: TODAY() };
    }
    if (!await saveSettings({ ...settings, offItems: map })) return;
    logAudit(`bulk ${mode} ×${ids.length} items`);
    toast(mode === "on" ? `${ids.length} items back on menu` : `${ids.length} items marked sold out`, mode === "on" ? "ok" : "err");
  };
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gold/60 bg-gold/10 px-3 py-2 text-xs font-black text-cherry">
      {t("admin.bulk")}: {ids.length}
      <button onClick={() => apply("until")} className="rounded bg-brick px-2 py-1 text-cream">OFF ({t("admin.untilOn")})</button>
      <button onClick={() => apply("today")} className="rounded bg-brick/70 px-2 py-1 text-cream">OFF ({t("admin.todayOnly")})</button>
      <button onClick={() => apply("on")} className="rounded bg-[#2e7d32] px-2 py-1 text-cream">ON</button>
    </div>
  );
}

function OptionChip({ optKey, label }: { optKey: string; label: string }) {
  const { settings, saveSettings, logAudit, toast } = useShop();
  const off = (settings.offOptions[optKey] ?? []).includes(label);
  return (
    <button
      onClick={async () => {
        const arr = settings.offOptions[optKey] ?? [];
        const next = off ? arr.filter((x) => x !== label) : [...arr, label];
        if (!await saveSettings({ ...settings, offOptions: { ...settings.offOptions, [optKey]: next } })) return;
        logAudit(`${off ? "ON" : "OFF"} option ${optKey}:${label}`);
        toast(off ? `${label} is available again` : `${label} marked unavailable`, off ? "ok" : "err");
      }}
      className={cx("min-h-[30px] rounded-full border px-2.5 text-xs font-bold", off ? "border-brick bg-brick/15 text-brick line-through" : "border-cherry/20 bg-cream text-cherry")}
    >
      {label}
    </button>
  );
}

export function OptionAvailPanel() {
  const dips = Array.from(new Set(MENU.flatMap((m) => m.mods?.find((g) => g.id === "dips")?.options.map((o) => o.label) ?? [])));
  const sizeItems = MENU.filter((m) => m.prices.length > 1);
  return (
    <div className="space-y-3">
      <details className="rounded-xl border border-cherry/15 bg-cream-deep p-3">
        <summary className="cursor-pointer text-xs font-black uppercase text-cherry/50">Toppings availability</summary>
        <p className="mt-2 text-[11px] text-cherry/50">A topping switched off here disappears from every pizza dialog for customers (it is not shown greyed out). To remove it permanently, delete it from the topping list in Menu → Toppings.</p>
        <OptionAvailPanel2 />
      </details>
    </div>
  );
  function OptionAvailPanel2() {
    const { settings } = useShop();
    return (
      <div className="mt-2 space-y-3">
        <div>
          <p className="text-[11px] font-black uppercase text-cherry/40">Toppings</p>
          <div className="mt-1 flex flex-wrap gap-1.5">{settings.toppings.map((tp) => <OptionChip key={tp} optKey="topping" label={tp} />)}</div>
        </div>
        <div>
          <p className="text-[11px] font-black uppercase text-cherry/40">Dips</p>
          <div className="mt-1 flex flex-wrap gap-1.5">{dips.map((d) => <OptionChip key={d} optKey="dip" label={d} />)}</div>
        </div>
        <div>
          <p className="text-[11px] font-black uppercase text-cherry/40">Sizes</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {sizeItems.flatMap((m) => m.prices.map((p) => <OptionChip key={`${m.id}-${p.label}`} optKey={`size:${m.id}`} label={`${m.name} ${p.label}`} />))}
          </div>
        </div>
      </div>
    );
  }
}

/* ── pre-orders ──────────────────────────────────────── */

export function PreorderPanel() {
  const { settings, saveSettings, orders, toast, logAudit } = useShop();
  const { t, dayName } = useLang();
  const [draft, setDraft] = useState(settings.preorder);
  const [saving, setSaving] = useState(false);
  const dirtyRef = useRef(false);
  useEffect(() => { if (!dirtyRef.current) setDraft(settings.preorder); }, [settings.preorder]);
  const pre = draft;
  const sunday = nextPreorderSundays({ ...settings, preorder: pre }, 1)[0] ?? "";
  const preOrders = orders.filter((o) => o.scheduled?.date === sunday && !o.refunded);
  const portions = preOrders.reduce((a, o) => a + o.lines.reduce((x, l) => x + l.qty, 0), 0);
  const update = (patch: Partial<typeof pre>) => { dirtyRef.current = true; setDraft((current) => ({ ...current, ...patch })); };
  const save = async () => {
    setSaving(true);
    const next = {
      ...draft,
      cutoffTime: toHhmm(draft.cutoffTime),
      slots: draft.slots.map(toHhmm),
    };
    const ok = await saveSettings({ ...settings, preorder: next });
    setSaving(false);
    if (ok) {
      dirtyRef.current = false;
      setDraft(next);
      logAudit("pre-order settings updated");
      toast("Pre-order settings saved and reloaded from the database");
    }
  };

  return (
    <div className="rounded-xl border border-gold/60 bg-cream-deep p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-black uppercase text-gold-deep">{t("admin.pre")}</p>
        <Switch on={pre.enabled} ariaLabel={t("admin.pre")} onChange={() => update({ enabled: !pre.enabled })} />
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="text-xs font-black text-cherry/60">Cutoff day
          <select value={pre.cutoffDay} onChange={(e) => update({ cutoffDay: parseInt(e.target.value) })} className="mt-1 min-h-[36px] w-full rounded-lg border border-cherry/20 bg-cream px-2 text-sm font-bold">
            {[0, 1, 2, 3, 4, 5, 6].map((d) => <option key={d} value={d}>{dayName(d)}</option>)}
          </select>
        </label>
        <label className="text-xs font-black text-cherry/60">Cutoff time
          <input type="time" step={60} value={toHhmm(pre.cutoffTime)} onChange={(e) => update({ cutoffTime: toHhmm(e.target.value) })} className="mt-1 min-h-[36px] w-full rounded-lg border border-cherry/20 bg-cream px-2 text-sm font-bold" />
        </label>
        <label className="text-xs font-black text-cherry/60">Sunday pickup slots (comma-separated HH:MM)
          <input value={pre.slots.join(", ")} onChange={(e) => update({ slots: e.target.value.split(",").map((value) => value.trim()).filter(Boolean) })} className="mt-1 min-h-[36px] w-full rounded-lg border border-cherry/20 bg-cream px-2 text-sm font-bold" />
        </label>
        <label className="text-xs font-black text-cherry/60">Capacity per Sunday (optional)
          <input type="number" min="1" value={pre.capacity ?? ""} onChange={(e) => update({ capacity: parseInt(e.target.value) || undefined })} className="mt-1 min-h-[36px] w-full rounded-lg border border-cherry/20 bg-cream px-2 text-sm font-bold tabular-nums" />
        </label>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <input value={pre.noteEn} onChange={(e) => update({ noteEn: e.target.value })} placeholder="Note EN" className="min-h-[36px] rounded-lg border border-cherry/20 bg-cream px-2 text-xs font-bold" />
        <input value={pre.noteFi} onChange={(e) => update({ noteFi: e.target.value })} placeholder="Huomautus FI" className="min-h-[36px] rounded-lg border border-cherry/20 bg-cream px-2 text-xs font-bold" />
      </div>

      <div className="mt-3 rounded-lg border border-cherry/15 bg-cream p-3 text-xs">
        <p className="font-black text-cherry">{t("admin.sundayPre")} — {sunday && fmtDate(sunday)}</p>
        <p className="mt-1 text-cherry/70">{preOrders.length} {t("admin.orders").toLowerCase()} · <b className="text-gold-deep">{portions} {t("admin.portions")}</b>{pre.capacity ? ` / ${pre.capacity}` : ""}</p>
        <ul className="mt-1 space-y-0.5 text-cherry/60">{preOrders.map((o) => <li key={o.id}>· {o.id} — {o.scheduled?.time} — {o.lines.reduce((x, l) => x + l.qty, 0)}× ({o.customer.name})</li>)}</ul>
      </div>
      <div className="mt-3 flex justify-end"><PrimaryBtn icon="save" disabled={saving} onClick={() => { void save(); }}>{saving ? "Saving…" : "Save pre-order settings"}</PrimaryBtn></div>
    </div>
  );
}

/* ── today's specials (carousel list) ────────────────── */

/* A dish picker instead of "the first menu item": the manager chooses which
   dish becomes a special, and already-featured dishes are marked so the same
   dish is not added twice. */
function SpecialDishPicker({
  menu, used, onPick, onClose,
}: {
  menu: MenuItem[];
  used: Set<string>;
  onPick: (itemId: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const results = menu.filter((entry) =>
    !needle ||
    entry.name.toLowerCase().includes(needle) ||
    (entry.nameFi ?? "").toLowerCase().includes(needle) ||
    (entry.desc ?? "").toLowerCase().includes(needle) ||
    entry.cat.toLowerCase().includes(needle)
  );
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-cherry-dark/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Choose a dish for Today's Special">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-cream shadow-lift sm:rounded-2xl">
        <div className="flex items-center justify-between border-b-2 border-gold/40 px-4 py-3">
          <h2 className="font-display text-lg font-black text-cherry">Add to Today&rsquo;s Special</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="min-h-[36px] rounded-lg border border-cherry/20 px-3 text-xs font-black text-cherry hover:bg-cherry hover:text-cream">Close</button>
        </div>
        <div className="px-4 pt-3">
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search a dish…"
            aria-label="Search a dish"
            className="min-h-[42px] w-full rounded-xl border border-cherry/20 bg-cream-deep px-3 text-sm font-bold"
          />
        </div>
        <ul className="flex-1 overflow-y-auto p-3">
          {results.length === 0 && <li className="p-6 text-center text-sm font-bold text-cherry/50">No dish matches that search.</li>}
          {results.map((entry) => {
            const already = used.has(entry.id);
            const price = entry.prices.length ? Math.min(...entry.prices.map((variant) => variant.value)) : 0;
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  disabled={already}
                  onClick={() => onPick(entry.id)}
                  className={cx(
                    "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition",
                    already ? "cursor-not-allowed opacity-50" : "hover:bg-cream-deep"
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black text-cherry">{entry.name}</span>
                    <span className="block truncate text-[11px] font-bold text-cherry/50">{entry.cat}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-black tabular-nums text-gold-deep">{eur(price)}</span>
                    {already && <span className="block text-[10px] font-black uppercase text-cherry/40">Already a special</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export function SpecialsPanel() {
  const { settings, saveSettings, adminItems, effectiveMenu, toast, logAudit } = useShop();
  const { lang } = useLang();
  const menu = effectiveMenu(adminItems.length ? adminItems.filter((item) => item.archived !== true) : MENU, lang);
  const [draft, setDraft] = useState<SpecialItem[]>(settings.todaysSpecials ?? []);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  /* The store re-reads settings in the background (tab focus, another admin
     tab saving). A reset effect keyed on settings.todaysSpecials therefore used
     to wipe the manager's unsaved draft mid-edit — an uploaded photo vanished
     when the file dialog closed and returned focus, and "+ Add special" looked
     broken because the new card disappeared again. Only sync when the panel has
     nothing unsaved; the ref keeps the effect from reading a stale flag. */
  const dirtyRef = useRef(false);
  const markDirty = () => { dirtyRef.current = true; setDirty(true); };
  useEffect(() => {
    if (!dirtyRef.current) setDraft(settings.todaysSpecials ?? []);
  }, [settings.todaysSpecials]);
  const list = [...draft].sort((a, b) => a.sortOrder - b.sortOrder);

  const save = async () => {
    const validation = specialsValidationError(list);
    if (validation) { toast(validation, "err"); return; }
    setSaving(true);
    const next = list.map((special, index) => ({ ...special, sortOrder: index }));
    const ok = await saveSettings({ ...settings, todaysSpecials: next });
    setSaving(false);
    if (ok) {
      dirtyRef.current = false;
      setDirty(false);
      setDraft(next);
      logAudit("today's specials updated");
      toast("Specials saved and reloaded from the database");
    }
  };
  const reload = () => {
    dirtyRef.current = false;
    setDirty(false);
    setDraft(settings.todaysSpecials ?? []);
    toast("Draft reloaded from the database");
  };
  const patch = (id: string, patchValue: Partial<SpecialItem>) => {
    markDirty();
    setDraft((current) => current.map((special) => special.id === id ? { ...special, ...patchValue } : special));
  };
  const move = (index: number, direction: -1 | 1) => {
    markDirty();
    setDraft((current) => {
      const next = [...current].sort((a, b) => a.sortOrder - b.sortOrder);
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((special, sortOrder) => ({ ...special, sortOrder }));
    });
  };
  const addDish = (itemId: string) => {
    const next = withSpecialFor(list, itemId);
    setPickerOpen(false);
    if (!next) { toast("That dish is already a Today's Special", "err"); return; }
    markDirty();
    setDraft(next.map((special, sortOrder) => ({ ...special, sortOrder })));
    toast("Special added — remember to Save specials");
  };
  const used = new Set(list.map((special) => special.itemId));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-xs text-cherry/60">Today's Special is a scrollable carousel on Home. Each card links to /menu?item=&lt;id&gt; (scroll + pulse + sheet). Changes stay in this draft until saved.</p>
        <div className="flex flex-wrap items-center gap-2">
          {dirty && (
            <span className="inline-flex min-h-[32px] items-center rounded-full bg-gold/25 px-3 text-[11px] font-black uppercase tracking-wide text-gold-deep">
              Unsaved changes
            </span>
          )}
          {dirty && (
            <button type="button" onClick={reload} className="min-h-[40px] rounded-lg border border-cherry/20 px-3 text-xs font-black text-cherry">Reload draft</button>
          )}
          <button type="button" onClick={() => setPickerOpen(true)} className="min-h-[40px] rounded-lg border border-cherry/20 px-4 text-xs font-black text-cherry">+ Add special</button>
          <PrimaryBtn icon="save" disabled={saving} onClick={() => { void save(); }}>{saving ? "Saving…" : "Save specials"}</PrimaryBtn>
        </div>
      </div>
      {dirty && (
        <p className="rounded-xl border border-gold/50 bg-gold/10 px-3 py-2 text-xs font-bold text-gold-deep">
          You have unsaved changes. They stay in this draft while the page refreshes settings in the background — press <b>Save specials</b> to publish.
        </p>
      )}
      {list.length === 0 && <p className="rounded-xl bg-cream-deep p-8 text-center text-sm font-bold text-cherry/60">No specials — the carousel is hidden.</p>}
      {list.map((special, index) => {
        const item = menu.find((entry) => entry.id === special.itemId);
        const base = item ? Math.min(...item.prices.map((price) => price.value)) : 0;
        const now = special.overridePrice ?? (special.discount !== undefined ? Math.round(base * (1 - special.discount / 100) * 100) / 100 : base);
        return (
          <div key={special.id} className="rounded-xl border border-cherry/15 bg-cream-deep p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex gap-1">
                <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="min-h-[32px] rounded-lg border border-cherry/30 px-2 text-xs font-black text-cherry disabled:opacity-30">↑</button>
                <button type="button" onClick={() => move(index, 1)} disabled={index === list.length - 1} className="min-h-[32px] rounded-lg border border-cherry/30 px-2 text-xs font-black text-cherry disabled:opacity-30">↓</button>
              </span>
              <span className="text-sm font-black text-cherry">{item?.name ?? special.itemId}</span>
              <span className="text-xs text-cherry/60">
                {special.overridePrice != null ? `override ${eur(special.overridePrice)}` : special.discount != null ? `−${special.discount}%` : "list price"}{" "}
                {now < base && <s className="text-cherry/40">{eur(base)}</s>} <b className="text-gold-deep">{eur(now)}</b>
              </span>
              <span className="ml-auto flex items-center gap-2">
                <Switch on={special.active} ariaLabel={`${item?.name ?? ""} active`} onChange={() => patch(special.id, { active: !special.active })} />
                <button type="button" onClick={() => { markDirty(); setDraft((current) => [...current, { ...special, id: newSpecialId(), active: false, sortOrder: current.length }]); toast("Special duplicated — save to publish"); }} className="min-h-[32px] rounded-lg border border-cherry/30 px-2 text-xs font-black text-cherry">Duplicate</button>
                <button type="button" onClick={() => { markDirty(); setDraft((current) => current.filter((entry) => entry.id !== special.id)); }} className="min-h-[32px] rounded-lg border border-brick/50 px-2 text-xs font-black text-brick">Remove</button>
              </span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <label className="text-xs font-black text-cherry/60">Dish
                <select value={special.itemId} onChange={(e) => patch(special.id, { itemId: e.target.value })} className="mt-1 min-h-[36px] w-full rounded-lg border border-cherry/20 bg-cream px-2 text-sm font-bold">
                  {menu.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
                </select>
              </label>
              <label className="text-xs font-black text-cherry/60">Override price (€)
                <input type="number" min="0" step="0.1" value={special.overridePrice ?? ""} onChange={(e) => patch(special.id, { overridePrice: e.target.value === "" ? undefined : Number(e.target.value), discount: undefined })} className="mt-1 min-h-[36px] w-full rounded-lg border border-cherry/20 bg-cream px-2 text-sm font-bold tabular-nums" />
              </label>
              <label className="text-xs font-black text-cherry/60">…or discount (%)
                <input type="number" min="0" max="100" step="1" value={special.discount ?? ""} onChange={(e) => patch(special.id, { discount: e.target.value === "" ? undefined : Number(e.target.value), overridePrice: undefined })} className="mt-1 min-h-[36px] w-full rounded-lg border border-cherry/20 bg-cream px-2 text-sm font-bold tabular-nums" />
              </label>
              <input value={special.textEn ?? ""} onChange={(e) => patch(special.id, { textEn: e.target.value })} placeholder="Badge EN" className="min-h-[36px] rounded-lg border border-cherry/20 bg-cream px-2 text-xs font-bold" />
              <input value={special.textFi ?? ""} onChange={(e) => patch(special.id, { textFi: e.target.value })} placeholder="Kyltti FI" className={cx("min-h-[36px] rounded-lg border bg-cream px-2 text-xs font-bold", special.textFi ? "border-cherry/20" : "border-brick")} />
              <span className="self-center text-[10px] font-black text-brick">{!special.textFi && "Missing Finnish translation"}</span>
              <label className="text-xs font-black text-cherry/60">From
                <input type="date" value={special.start ?? ""} onChange={(e) => patch(special.id, { start: e.target.value || undefined })} className="mt-1 min-h-[36px] w-full rounded-lg border border-cherry/20 bg-cream px-2 text-sm font-bold" />
              </label>
              <label className="text-xs font-black text-cherry/60">To
                <input type="date" value={special.end ?? ""} onChange={(e) => patch(special.id, { end: e.target.value || undefined })} className="mt-1 min-h-[36px] w-full rounded-lg border border-cherry/20 bg-cream px-2 text-sm font-bold" />
              </label>
              <div className="text-xs font-black text-cherry/60">Card image (optional, overrides category photo)
                <div className="mt-1">
                  <ImageUploader
                    preset="1:1"
                    fallbackAlt={item?.name ?? "Today's Special"}
                    value={special.imageUrl ? { src: special.imageUrl, altEn: item?.name ?? "Today's Special", altFi: item?.name ?? "Päivän annos" } : undefined}
                    onChange={(value) => patch(special.id, { imageUrl: value?.src })}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
      {list.length > 0 && <div className="flex justify-end"><PrimaryBtn icon="save" disabled={saving} onClick={() => { void save(); }}>{saving ? "Saving…" : "Save specials"}</PrimaryBtn></div>}
      {pickerOpen && <SpecialDishPicker menu={menu} used={used} onPick={addDish} onClose={() => setPickerOpen(false)} />}
    </div>
  );
}

/* ── topping names & extra prices ────────────────────── */

export function ToppingsMetaPanel() {
  const { settings, saveSettings, toast } = useShop();
  const [draft, setDraft] = useState(settings.toppingMeta ?? {});
  useEffect(() => setDraft(settings.toppingMeta ?? {}), [settings.toppingMeta]);

  const update = (label: string, patch: Partial<ToppingMeta>) => {
    setDraft((current) => ({ ...current, [label]: { ...(current[label] ?? {}), ...patch } }));
  };
  const save = async () => {
    if (await saveSettings({ ...settings, toppingMeta: draft })) toast("Topping settings saved");
  };

  return (
    <details className="rounded-xl border border-cherry/15 bg-cream-deep p-3">
      <summary className="cursor-pointer text-xs font-black uppercase text-cherry/50">Topping names (EN/FI) & extra prices — defaults €1.00 Med / €2.00 Perhe</summary>
      <table className="mt-3 w-full text-left text-xs">
        <thead>
          <tr className="border-b border-cherry/15 font-black uppercase text-cherry/40">
            <th className="py-1.5 pr-2">Key (FI base)</th><th className="py-1.5 pr-2">Name EN</th><th className="py-1.5 pr-2">Nimi FI</th>
            <th className="py-1.5 pr-2">€ Med</th><th className="py-1.5">€ Perhe</th>
          </tr>
        </thead>
        <tbody>
          {settings.toppings.map((tp) => {
            const m = draft[tp] ?? {};
            return (
              <tr key={tp} className="border-b border-cherry/5">
                <td className="py-1.5 pr-2 font-bold text-cherry capitalize">{tp}</td>
                <td className="py-1.5 pr-2"><input value={m.en ?? ""} placeholder="EN" onChange={(e) => update(tp, { en: e.target.value || undefined })} className="min-h-[32px] w-32 rounded border border-cherry/20 bg-cream px-2 font-bold" /></td>
                <td className="py-1.5 pr-2"><input value={m.fi ?? ""} placeholder="FI" onChange={(e) => update(tp, { fi: e.target.value || undefined })} className="min-h-[32px] w-32 rounded border border-cherry/20 bg-cream px-2 font-bold" /></td>
                <td className="py-1.5 pr-2"><input type="number" min="0" step="0.1" value={m.priceMed ?? 1} onChange={(e) => update(tp, { priceMed: parseFloat(e.target.value) || 0 })} className="min-h-[32px] w-20 rounded border border-cherry/20 bg-cream px-2 font-bold tabular-nums" /></td>
                <td className="py-1.5"><input type="number" min="0" step="0.1" value={m.pricePerhe ?? 2} onChange={(e) => update(tp, { pricePerhe: parseFloat(e.target.value) || 0 })} className="min-h-[32px] w-20 rounded border border-cherry/20 bg-cream px-2 font-bold tabular-nums" /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mt-3 flex justify-end">
        <button type="button" onClick={() => { void save(); }} className="min-h-[36px] rounded-lg bg-cherry px-3 text-xs font-black text-cream">Save topping settings</button>
      </div>
    </details>
  );
}

/* ── categories manager ──────────────────────────────── */

export function CatsTab() {
  const { settings, saveSettings, categories, adminItems, addCat, deleteCat, toast, logAudit } = useShop();
  const [newFi, setNewFi] = useState("");
  const [newEn, setNewEn] = useState("");
  const [adding, setAdding] = useState(false);
  const [savingNames, setSavingNames] = useState<string | null>(null);
  const [nameDrafts, setNameDrafts] = useState<Record<string, { fi: string; en: string }>>({});
  const [query, setQuery] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const cats = categories();

  const order = settings.catOrder?.length ? [...settings.catOrder] : cats.map((c) => c.id);
  cats.forEach((c) => { if (!order.includes(c.id)) order.push(c.id); });

  const moveTo = async (id: string, index: number) => {
    const next = order.filter((x) => x !== id);
    next.splice(Math.max(0, Math.min(next.length, index)), 0, id);
    if (await saveSettings({ ...settings, catOrder: next })) {
      logAudit(`category ${id} moved`);
      toast("Category order saved");
    }
  };
  const move = async (id: string, dir: -1 | 1) => {
    const i = order.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= order.length) return;
    await moveTo(id, j);
  };
  const meta = (id: string) => settings.catMeta[id] ?? {};
  const updateNameDraft = (id: string, patch: Partial<{ fi: string; en: string }>) => {
    setNameDrafts((current) => ({
      ...current,
      [id]: { fi: current[id]?.fi ?? meta(id).nameFi ?? "", en: current[id]?.en ?? meta(id).nameEn ?? "", ...patch },
    }));
  };
  const saveMeta = async (id: string, patch: Partial<(typeof settings.catMeta)[string]>) => {
    const saved = await saveSettings({ ...settings, catMeta: { ...settings.catMeta, [id]: { ...meta(id), ...patch } } });
    if (saved) {
      logAudit(`category ${id} settings updated`);
      toast("Category settings saved");
    }
    return saved;
  };
  const saveNames = async (id: string) => {
    const draft = nameDrafts[id];
    if (!draft) return;
    if (!draft.fi.trim() || !draft.en.trim()) { toast("Enter both Finnish and English category names", "err"); return; }
    setSavingNames(id);
    const saved = await saveMeta(id, { nameFi: draft.fi.trim(), nameEn: draft.en.trim() });
    setSavingNames(null);
    if (saved) setNameDrafts((current) => { const next = { ...current }; delete next[id]; return next; });
  };

  const visible = cats.filter((c) => !settings.catMeta[c.id]?.hidden).length;
  const totalItems = cats.reduce((n, c) => n + adminItems.filter((x) => x.cat === c.id).length, 0);
  const q = query.trim().toLowerCase();
  const shown = q
    ? cats.filter((c) => c.id.toLowerCase().includes(q) || c.title.toLowerCase().includes(q) || (c.en ?? "").toLowerCase().includes(q))
    : cats;

  return (
    <div className="space-y-4">
      {/* summary */}
      <div className="grid gap-2.5 sm:grid-cols-3">
        {[
          { label: "Categories", value: cats.length, icon: "group", tone: "text-cherry" },
          { label: "Visible on site", value: visible, icon: "eye", tone: "text-[#2e7d32]" },
          { label: "Items across menus", value: totalItems, icon: "list", tone: "text-gold-deep" },
        ].map((stat) => (
          <div key={stat.label} className="flex items-center gap-3 rounded-2xl border border-cherry/10 bg-cream p-3.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-cherry/5 text-cherry/60">{stat.icon === "group" ? "▦" : stat.icon === "eye" ? "◉" : "≡"}</span>
            <span>
              <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-cherry/40">{stat.label}</span>
              <span className={cx("block font-display text-xl font-black tabular-nums", stat.tone)}>{stat.value}</span>
            </span>
          </div>
        ))}
      </div>

      {/* toolbar */}
      <div className="rounded-2xl border border-cherry/10 bg-cream p-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-[180px] flex-1 sm:max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cherry/40">⌕</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search categories…"
              className="min-h-[38px] w-full rounded-xl border border-cherry/15 bg-white pl-9 pr-3 text-sm font-bold text-cherry placeholder:text-cherry/35 focus:border-gold focus:outline-none"
            />
          </label>
          <span className="hidden items-center gap-1.5 rounded-full border border-cherry/10 bg-white/70 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-cherry/45 sm:inline-flex">
            ⋮⋮ Drag a card to re-order
          </span>
        </div>
        <form
          className="mt-2 flex flex-wrap items-center gap-2 border-t border-cherry/10 pt-2"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!newFi.trim() || !newEn.trim()) { toast("Enter both Finnish and English category names", "err"); return; }
            setAdding(true);
            const ok = await addCat(newFi.trim(), newEn.trim());
            setAdding(false);
            if (ok) { setNewFi(""); setNewEn(""); toast("Category created"); }
          }}
        >
          <input value={newFi} onChange={(e) => setNewFi(e.target.value)} maxLength={60} required placeholder="New category — Finnish name" className={cx(inputCls, "sm:w-56")} />
          <input value={newEn} onChange={(e) => setNewEn(e.target.value)} maxLength={60} required placeholder="English name" className={cx(inputCls, "sm:w-56")} />
          <PrimaryBtn icon="plus" disabled={adding}>{adding ? "Adding…" : "Add category"}</PrimaryBtn>
        </form>
      </div>

      {/* cards */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((c) => {
          const m = meta(c.id);
          const idx = order.indexOf(c.id);
          const n = adminItems.filter((x) => x.cat === c.id).length;
          const draft = nameDrafts[c.id];
          return (
            <div
              key={c.id}
              draggable
              onDragStart={() => setDragId(c.id)}
              onDragEnd={() => { setDragId(null); setOverId(null); }}
              onDragOver={(e) => { e.preventDefault(); setOverId(c.id); }}
              onDragLeave={() => setOverId((x) => (x === c.id ? null : x))}
              onDrop={(e) => { e.preventDefault(); if (dragId && dragId !== c.id) void moveTo(dragId, idx); setDragId(null); setOverId(null); }}
              className={cx(
                "rounded-3xl border bg-white p-3.5 shadow-[0_10px_24px_-24px_rgba(6,32,31,0.55)] transition",
                dragId === c.id ? "opacity-50" : "hover:-translate-y-0.5 hover:border-gold/60 hover:shadow-card",
                overId === c.id && dragId !== c.id ? "border-gold ring-2 ring-gold/30" : "border-cherry/10",
                m.hidden && "bg-cherry/[0.03]"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="relative shrink-0">
                  <ImageUploader
                    preset="1:1"
                    value={m.img ? { src: resolveImageSrc(m.img) ?? m.img, altEn: m.altEn ?? "", altFi: m.altFi ?? "" } : undefined}
                    onChange={(v) => { void saveMeta(c.id, { img: v?.src, altEn: v?.altEn, altFi: v?.altFi }); }}
                  />
                  <span className="absolute -left-1 -top-1 grid h-5 min-w-[20px] place-items-center rounded-md bg-cherry px-1 text-[10px] font-black text-cream" title="Position on the public menu">
                    {idx + 1}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-display text-base font-black text-cherry">{m.nameEn ?? c.en ?? c.title}</p>
                      <p className="truncate text-[11px] font-bold text-cherry/45">{m.nameFi ?? c.title}</p>
                    </div>
                    <span className={cx("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black", m.hidden ? "bg-brick/10 text-brick" : "bg-[#e6f4e7] text-[#2e7d32]")}>
                      {m.hidden ? "Hidden" : "Live"}
                    </span>
                  </div>
                  <p className="mt-0.5 flex items-center gap-2 text-[10px] font-black uppercase tracking-wide text-cherry/35">
                    <span className="rounded bg-cherry/5 px-1.5 py-0.5">{c.id}</span>
                    <span>{n} item{n === 1 ? "" : "s"}</span>
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-1.5 text-[11px] font-black text-cherry/60">
                      Show
                      <Switch on={!m.hidden} ariaLabel={`${c.title} visible`} onChange={() => { void saveMeta(c.id, { hidden: !m.hidden }); }} />
                    </label>
                    <CatAvailSwitch id={c.id} title={c.title} />
                  </div>
                </div>
              </div>

              <div className="mt-3 space-y-2 border-t border-cherry/10 pt-3">
                <div className="grid gap-1.5 sm:grid-cols-2">
                  <input
                    value={draft?.fi ?? m.nameFi ?? ""}
                    placeholder={c.title}
                    aria-label={`${c.title} Finnish name`}
                    onChange={(e) => updateNameDraft(c.id, { fi: e.target.value })}
                    className="min-h-[34px] w-full rounded-lg border border-cherry/20 bg-cream px-2 text-xs font-bold"
                  />
                  <input
                    value={draft?.en ?? m.nameEn ?? ""}
                    placeholder={c.en ?? c.title}
                    aria-label={`${c.title} English name`}
                    onChange={(e) => updateNameDraft(c.id, { en: e.target.value })}
                    className="min-h-[34px] w-full rounded-lg border border-cherry/20 bg-cream px-2 text-xs font-bold"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  {draft && (
                    <button
                      onClick={() => { void saveNames(c.id); }}
                      disabled={savingNames === c.id}
                      className="min-h-[30px] rounded-lg bg-cherry px-2.5 text-[11px] font-black text-cream disabled:opacity-60"
                    >
                      {savingNames === c.id ? "Saving…" : "Save names"}
                    </button>
                  )}
                  <span className="ml-auto flex gap-1">
                    <button onClick={() => { void move(c.id, -1); }} disabled={idx <= 0} aria-label={`Move ${c.title} up`} className="grid h-8 w-8 place-items-center rounded-lg border border-cherry/25 text-xs font-black text-cherry disabled:opacity-30">↑</button>
                    <button onClick={() => { void move(c.id, 1); }} disabled={idx >= order.length - 1} aria-label={`Move ${c.title} down`} className="grid h-8 w-8 place-items-center rounded-lg border border-cherry/25 text-xs font-black text-cherry disabled:opacity-30">↓</button>
                    {n === 0 && (
                      <button
                        onClick={async () => { if (window.confirm(`Delete empty category “${c.title}”?`)) { if (await deleteCat(c.id)) toast("Category deleted", "ok"); } }}
                        className="h-8 rounded-lg border border-brick/30 px-2 text-[11px] font-black text-brick"
                      >
                        Delete
                      </button>
                    )}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {shown.length === 0 && <p className="rounded-2xl border border-cherry/10 bg-cream py-8 text-center text-sm font-bold text-cherry/50">No categories match “{query}”.</p>}
    </div>
  );
}

/* ── audit log ───────────────────────────────────────── */

export function AuditTab() {
  /* backend-owned activity log (who/when/what) — cannot be bypassed from the client */
  const [rows, setRows] = useState<{ ts: number; who: string; role: string; msg: string }[]>([]);
  useEffect(() => { apiActivity().then(setRows).catch(() => {}); }, []);
  if (!rows.length) return <p className="rounded-xl bg-cream-deep p-8 text-center text-sm font-bold text-cherry/60">No changes logged yet.</p>;
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b-2 border-cherry/15 text-xs font-black uppercase text-cherry/50">
          <th className="py-2 pr-3">When</th><th className="py-2 pr-3">Who</th><th className="py-2">Change</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((a, i) => (
          <tr key={i} className="border-b border-cherry/10">
            <td className="py-2 pr-3 text-xs tabular-nums text-cherry/60">{new Date(a.ts).toLocaleString("fi-FI", { timeZone: "Europe/Helsinki" })}</td>
            <td className="py-2 pr-3 font-bold">{a.who}</td>
            <td className="py-2 text-cherry/80">{a.msg}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
