"use client";
import { useEffect, useState } from "react";
import ImageUploader from "@/components/ImageUploader";
import { cx, eur, fmtDate } from "@/lib/format";
import { resolveImageSrc } from "@/lib/images";
import { todayStrHelsinki } from "@/lib/hours";
import { useLang } from "@/lib/i18n";
import { MENU } from "@/lib/menu";
import { useShop } from "@/lib/store";
import { nextPreorderSundays } from "@/lib/v3";
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

  const set = (mode: "until" | "today" | "on") => {
    const map = { ...settings.offItems };
    if (mode === "on") delete map[id];
    else map[id] = mode === "until" ? { off: true } : { offToday: TODAY() };
    saveSettings({ ...settings, offItems: map });
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
  const { settings, saveSettings, logAudit } = useShop();
  const { t } = useLang();
  const st = settings.offCats[id];
  const off = !!st && (st.off === true || st.offToday === TODAY());
  const set = (mode: "until" | "today" | "on") => {
    const map = { ...settings.offCats };
    if (mode === "on") delete map[id];
    else map[id] = mode === "until" ? { off: true } : { offToday: TODAY() };
    saveSettings({ ...settings, offCats: map });
    logAudit(`${mode === "on" ? "ON" : "OFF"} category ${title} (${mode})`);
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
  const { settings, saveSettings, logAudit } = useShop();
  const { t } = useLang();
  if (!ids.length) return null;
  const apply = (mode: "until" | "today" | "on") => {
    const map = { ...settings.offItems };
    for (const id of ids) {
      if (mode === "on") delete map[id];
      else map[id] = mode === "until" ? { off: true } : { offToday: TODAY() };
    }
    saveSettings({ ...settings, offItems: map });
    logAudit(`bulk ${mode} ×${ids.length} items`);
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
  const { settings, saveSettings, logAudit } = useShop();
  const off = (settings.offOptions[optKey] ?? []).includes(label);
  return (
    <button
      onClick={() => {
        const arr = settings.offOptions[optKey] ?? [];
        const next = off ? arr.filter((x) => x !== label) : [...arr, label];
        saveSettings({ ...settings, offOptions: { ...settings.offOptions, [optKey]: next } });
        logAudit(`${off ? "ON" : "OFF"} option ${optKey}:${label}`);
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
  const pre = settings.preorder;
  const sunday = nextPreorderSundays(settings, 1)[0] ?? "";
  const preOrders = orders.filter((o) => o.scheduled?.date === sunday && !o.refunded);
  const portions = preOrders.reduce((a, o) => a + o.lines.reduce((x, l) => x + l.qty, 0), 0);

  return (
    <div className="rounded-xl border border-gold/60 bg-cream-deep p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-black uppercase text-gold-deep">{t("admin.pre")}</p>
        <Switch
          on={pre.enabled}
          ariaLabel={t("admin.pre")}
          onChange={() => {
            saveSettings({ ...settings, preorder: { ...pre, enabled: !pre.enabled } });
            logAudit(`pre-order ${pre.enabled ? "disabled" : "enabled"}`);
          }}
        />
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="text-xs font-black text-cherry/60">Cutoff day
          <select
            value={pre.cutoffDay}
            onChange={(e) => saveSettings({ ...settings, preorder: { ...pre, cutoffDay: parseInt(e.target.value) } })}
            className="mt-1 min-h-[36px] w-full rounded-lg border border-cherry/20 bg-cream px-2 text-sm font-bold"
          >
            {[0, 1, 2, 3, 4, 5, 6].map((d) => <option key={d} value={d}>{dayName(d)}</option>)}
          </select>
        </label>
        <label className="text-xs font-black text-cherry/60">Cutoff time
          <input type="time" value={pre.cutoffTime} onChange={(e) => saveSettings({ ...settings, preorder: { ...pre, cutoffTime: e.target.value } })} className="mt-1 min-h-[36px] w-full rounded-lg border border-cherry/20 bg-cream px-2 text-sm font-bold" />
        </label>
        <label className="text-xs font-black text-cherry/60">Sunday pickup slots (comma-separated HH:MM)
          <input
            value={pre.slots.join(", ")}
            onChange={(e) => saveSettings({ ...settings, preorder: { ...pre, slots: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) } })}
            className="mt-1 min-h-[36px] w-full rounded-lg border border-cherry/20 bg-cream px-2 text-sm font-bold"
          />
        </label>
        <label className="text-xs font-black text-cherry/60">Capacity per Sunday (optional)
          <input type="number" value={pre.capacity ?? ""} onChange={(e) => saveSettings({ ...settings, preorder: { ...pre, capacity: parseInt(e.target.value) || undefined } })} className="mt-1 min-h-[36px] w-full rounded-lg border border-cherry/20 bg-cream px-2 text-sm font-bold tabular-nums" />
        </label>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <input value={pre.noteEn} onChange={(e) => saveSettings({ ...settings, preorder: { ...pre, noteEn: e.target.value } })} placeholder="Note EN" className="min-h-[36px] rounded-lg border border-cherry/20 bg-cream px-2 text-xs font-bold" />
        <input value={pre.noteFi} onChange={(e) => saveSettings({ ...settings, preorder: { ...pre, noteFi: e.target.value } })} placeholder="Huomautus FI" className="min-h-[36px] rounded-lg border border-cherry/20 bg-cream px-2 text-xs font-bold" />
      </div>

      <div className="mt-3 rounded-lg border border-cherry/15 bg-cream p-3 text-xs">
        <p className="font-black text-cherry">{t("admin.sundayPre")} — {sunday && fmtDate(sunday)}</p>
        <p className="mt-1 text-cherry/70">
          {preOrders.length} {t("admin.orders").toLowerCase()} · <b className="text-gold-deep">{portions} {t("admin.portions")}</b>
          {pre.capacity ? ` / ${pre.capacity}` : ""}
        </p>
        <ul className="mt-1 space-y-0.5 text-cherry/60">
          {preOrders.map((o) => (
            <li key={o.id}>· {o.id} — {o.scheduled?.time} — {o.lines.reduce((x, l) => x + l.qty, 0)}× ({o.customer.name})</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ── today's specials (carousel list) ────────────────── */

export function SpecialsPanel() {
  const { settings, saveSettings, effectiveMenu, toast, logAudit } = useShop();
  const { lang } = useLang();
  const menu = effectiveMenu(MENU, lang);
  const list = [...(settings.todaysSpecials ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);

  const save = (next: SpecialItem[]) => {
    void (async () => {
      try {
        await saveSettings({ ...settings, todaysSpecials: next });
      } catch {
        toast("Special could not be saved", "err");
      }
    })();
  };
  const patch = (id: string, p: Partial<SpecialItem>) => {
    save(list.map((sp) => (sp.id === id ? { ...sp, ...p } : sp)));
  };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    save(next.map((sp, k) => ({ ...sp, sortOrder: k })));
    logAudit("specials reordered");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-cherry/60">Today's Special is a scrollable carousel on Home. Each card links to /menu?item=&lt;id&gt; (scroll + pulse + sheet).</p>
        <button
          onClick={() => {
            if (!menu.length) {
              toast("Add a menu item before creating a special", "err");
              return;
            }
            const sp: SpecialItem = { id: `ts-${Date.now()}`, itemId: menu[0].id, sortOrder: list.length, active: true, textEn: "Today's Special", textFi: "Päivän annos" };
            save([...list, sp]);
            logAudit(`special created ${sp.id}`);
          }}
          className="min-h-[40px] rounded-lg bg-cherry px-4 text-xs font-black text-cream"
        >
          + Add special
        </button>
      </div>
      {list.length === 0 && <p className="rounded-xl bg-cream-deep p-8 text-center text-sm font-bold text-cherry/60">No specials — the carousel is hidden.</p>}
      {list.map((sp, i) => {
        const item = menu.find((m) => m.id === sp.itemId);
        const base = item ? Math.min(...item.prices.map((p) => p.value)) : 0;
        const now = sp.overridePrice ?? (sp.discount ? Math.round(base * (1 - sp.discount / 100) * 100) / 100 : base);
        return (
          <div key={sp.id} className="rounded-xl border border-cherry/15 bg-cream-deep p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex gap-1">
                <button onClick={() => move(i, -1)} disabled={i === 0} className="min-h-[32px] rounded-lg border border-cherry/30 px-2 text-xs font-black text-cherry disabled:opacity-30">↑</button>
                <button onClick={() => move(i, 1)} disabled={i === list.length - 1} className="min-h-[32px] rounded-lg border border-cherry/30 px-2 text-xs font-black text-cherry disabled:opacity-30">↓</button>
              </span>
              <span className="text-sm font-black text-cherry">{item?.name ?? sp.itemId}</span>
              <span className="text-xs text-cherry/60">
                {sp.overridePrice != null ? `override ${eur(sp.overridePrice)}` : sp.discount ? `−${sp.discount}%` : "list price"}{" "}
                {now < base && <s className="text-cherry/40">{eur(base)}</s>} <b className="text-gold-deep">{eur(now)}</b>
              </span>
              <span className="ml-auto flex items-center gap-2">
                <Switch on={sp.active} ariaLabel={`${item?.name ?? ""} active`} onChange={() => { patch(sp.id, { active: !sp.active }); logAudit(`special ${sp.active ? "paused" : "activated"} ${sp.id}`); }} />
                <button
                  onClick={() => { save([...list, { ...sp, id: `ts-${Date.now()}`, active: false, sortOrder: list.length }]); toast("Special duplicated"); }}
                  className="min-h-[32px] rounded-lg border border-cherry/30 px-2 text-xs font-black text-cherry"
                >
                  dup
                </button>
                <button
                  onClick={() => { save(list.filter((x) => x.id !== sp.id)); logAudit(`special deleted ${sp.id}`); }}
                  className="min-h-[32px] rounded-lg border border-brick/50 px-2 text-xs font-black text-brick"
                >
                  del
                </button>
              </span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <label className="text-xs font-black text-cherry/60">Dish
                <select value={sp.itemId} onChange={(e) => patch(sp.id, { itemId: e.target.value })} className="mt-1 min-h-[36px] w-full rounded-lg border border-cherry/20 bg-cream px-2 text-sm font-bold">
                  {menu.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </label>
              <label className="text-xs font-black text-cherry/60">Override price (€)
                <input type="number" step="0.1" value={sp.overridePrice ?? ""} onChange={(e) => patch(sp.id, { overridePrice: parseFloat(e.target.value) || undefined })} className="mt-1 min-h-[36px] w-full rounded-lg border border-cherry/20 bg-cream px-2 text-sm font-bold tabular-nums" />
              </label>
              <label className="text-xs font-black text-cherry/60">…or discount (%)
                <input type="number" step="1" value={sp.discount ?? ""} onChange={(e) => patch(sp.id, { discount: parseFloat(e.target.value) || undefined })} className="mt-1 min-h-[36px] w-full rounded-lg border border-cherry/20 bg-cream px-2 text-sm font-bold tabular-nums" />
              </label>
              <input value={sp.textEn ?? ""} onChange={(e) => patch(sp.id, { textEn: e.target.value })} placeholder="Badge EN" className="min-h-[36px] rounded-lg border border-cherry/20 bg-cream px-2 text-xs font-bold" />
              <input value={sp.textFi ?? ""} onChange={(e) => patch(sp.id, { textFi: e.target.value })} placeholder="Kyltti FI" className={cx("min-h-[36px] rounded-lg border bg-cream px-2 text-xs font-bold", sp.textFi ? "border-cherry/20" : "border-brick")} />
              <span className="self-center text-[10px] font-black text-brick">{!sp.textFi && "Missing Finnish translation"}</span>
              <label className="text-xs font-black text-cherry/60">From
                <input type="date" value={sp.start ?? ""} onChange={(e) => patch(sp.id, { start: e.target.value || undefined })} className="mt-1 min-h-[36px] w-full rounded-lg border border-cherry/20 bg-cream px-2 text-sm font-bold" />
              </label>
              <label className="text-xs font-black text-cherry/60">To
                <input type="date" value={sp.end ?? ""} onChange={(e) => patch(sp.id, { end: e.target.value || undefined })} className="mt-1 min-h-[36px] w-full rounded-lg border border-cherry/20 bg-cream px-2 text-sm font-bold" />
              </label>
              <div className="text-xs font-black text-cherry/60">Card image (optional, overrides category photo)
                <div className="mt-1">
                  <ImageUploader
                    preset="1:1"
                    value={sp.imageUrl ? { src: sp.imageUrl, altEn: item?.name ?? "", altFi: item?.name ?? "" } : undefined}
                    onChange={(v) => { patch(sp.id, { imageUrl: v?.src }); logAudit(`special ${sp.id} image ${v ? "set" : "cleared"}`); }}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
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
    try {
      await saveSettings({ ...settings, toppingMeta: draft });
      toast("Topping settings saved");
    } catch {
      toast("Topping settings could not be saved", "err");
    }
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
  const { settings, saveSettings, categories, overrides, toast, logAudit } = useShop();
  const cats = categories();
  const move = (id: string, dir: -1 | 1) => {
    const order = settings.catOrder?.length ? settings.catOrder : cats.map((c) => c.id);
    const i = order.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    saveSettings({ ...settings, catOrder: next });
    logAudit(`category ${id} moved`);
  };
  const meta = (id: string) => settings.catMeta[id] ?? {};
  const setMeta = (id: string, patch: Partial<(typeof settings.catMeta)[string]>) => {
    saveSettings({ ...settings, catMeta: { ...settings.catMeta, [id]: { ...meta(id), ...patch } } });
  };
  return (
    <div className="space-y-3">
      <p className="text-xs text-cherry/60">Uploads feed the Home circles instantly (≤5 MB, cropped 1:1, WebP). Drag order = circle order. No image → branded placeholder.</p>
      {cats.map((c, idx) => {
        const m = meta(c.id);
        const n = MENU.filter((x) => x.cat === c.id).length + (overrides.added?.[c.id]?.length ?? 0);
        return (
          <div key={c.id} className="flex flex-wrap items-start gap-4 rounded-xl border border-cherry/15 bg-cream-deep p-4">
            <ImageUploader
              preset="1:1"
              value={m.img ? { src: resolveImageSrc(m.img) ?? m.img, altEn: m.altEn ?? "", altFi: m.altFi ?? "" } : undefined}
              onChange={(v) => { setMeta(c.id, { img: v?.src, altEn: v?.altEn, altFi: v?.altFi }); logAudit(`category ${c.id} image ${v ? "uploaded" : "removed"}`); }}
            />
            <div className="min-w-[220px] flex-1 space-y-2">
              <p className="text-xs font-black text-cherry">{c.title} <span className="text-cherry/40">· {n} items · {c.id}</span></p>
              <div className="flex flex-wrap gap-2">
                <input defaultValue={m.nameFi ?? ""} placeholder="Nimi FI (oletus: alkuperäinen)" onBlur={(e) => setMeta(c.id, { nameFi: e.target.value || undefined })} className="min-h-[36px] w-44 rounded-lg border border-cherry/20 bg-cream px-2 text-xs font-bold" />
                <input defaultValue={m.nameEn ?? ""} placeholder="Name EN" onBlur={(e) => setMeta(c.id, { nameEn: e.target.value || undefined })} className="min-h-[36px] w-44 rounded-lg border border-cherry/20 bg-cream px-2 text-xs font-bold" />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-xs font-black text-cherry/60">
                  Show on site
                  <Switch on={!m.hidden} ariaLabel={`${c.title} visible`} onChange={() => setMeta(c.id, { hidden: !m.hidden })} />
                </label>
                <CatAvailSwitch id={c.id} title={c.title} />
                <span className="ml-auto flex gap-1">
                  <button onClick={() => move(c.id, -1)} disabled={idx === 0} className="min-h-[32px] rounded-lg border border-cherry/30 px-2 text-xs font-black text-cherry disabled:opacity-30">↑</button>
                  <button onClick={() => move(c.id, 1)} disabled={idx === cats.length - 1} className="min-h-[32px] rounded-lg border border-cherry/30 px-2 text-xs font-black text-cherry disabled:opacity-30">↓</button>
                </span>
              </div>
            </div>
          </div>
        );
      })}
      <button onClick={() => toast("Category order saved")} className="min-h-[40px] rounded-lg bg-cherry px-4 text-xs font-black text-cream">Done</button>
    </div>
  );
}

/* ── audit log ───────────────────────────────────────── */

export function AuditTab() {
  const { settings } = useShop();
  const rows = settings.audit ?? [];
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
