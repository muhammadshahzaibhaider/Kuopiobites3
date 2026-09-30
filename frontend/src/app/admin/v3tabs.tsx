"use client";
import { useEffect, useState } from "react";
import ImageUploader from "@/components/ImageUploader";
import { MenuImage } from "@/components/ui";
import { IMAGE_MANIFEST, itemImageKey, itemImagePath } from "@/lib/images";
import { fileToWebp, MAX_BYTES, slugFromFilename } from "@/lib/imgtool";
import { cx, eur, fmtDate } from "@/lib/format";
import { todayStrHelsinki } from "@/lib/hours";
import { DICTS, useLang } from "@/lib/i18n";
import { MENU } from "@/lib/menu";
import { useShop } from "@/lib/store";
import { isPizzaItem, isPreorderItem, nextPreorderSundays, pizzaSlug } from "@/lib/v3";
import type { MenuItem, Offer, SpecialItem, ToppingMeta, UploadedImg } from "@/lib/types";

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

  const save = (next: SpecialItem[]) => saveSettings({ ...settings, todaysSpecials: next });
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
            const sp: SpecialItem = { id: `ts-${Date.now()}`, itemId: menu[0]?.id ?? "", sortOrder: list.length, active: true, textEn: "Today's Special", textFi: "Päivän annos" };
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
  const { settings, saveSettings } = useShop();
  const meta = (label: string) => settings.toppingMeta?.[label] ?? {};
  const setMeta = (label: string, p: Partial<ToppingMeta>) =>
    saveSettings({ ...settings, toppingMeta: { ...settings.toppingMeta, [label]: { ...meta(label), ...p } } });
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
            const m = meta(tp);
            return (
              <tr key={tp} className="border-b border-cherry/5">
                <td className="py-1.5 pr-2 font-bold text-cherry capitalize">{tp}</td>
                <td className="py-1.5 pr-2"><input defaultValue={m.en ?? ""} placeholder="EN" onBlur={(e) => setMeta(tp, { en: e.target.value || undefined })} className="min-h-[32px] w-32 rounded border border-cherry/20 bg-cream px-2 font-bold" /></td>
                <td className="py-1.5 pr-2"><input defaultValue={m.fi ?? ""} placeholder="FI" onBlur={(e) => setMeta(tp, { fi: e.target.value || undefined })} className="min-h-[32px] w-32 rounded border border-cherry/20 bg-cream px-2 font-bold" /></td>
                <td className="py-1.5 pr-2"><input type="number" step="0.1" defaultValue={m.priceMed ?? 1} onBlur={(e) => setMeta(tp, { priceMed: parseFloat(e.target.value) || 1 })} className="min-h-[32px] w-20 rounded border border-cherry/20 bg-cream px-2 font-bold tabular-nums" /></td>
                <td className="py-1.5"><input type="number" step="0.1" defaultValue={m.pricePerhe ?? 2} onBlur={(e) => setMeta(tp, { pricePerhe: parseFloat(e.target.value) || 2 })} className="min-h-[32px] w-20 rounded border border-cherry/20 bg-cream px-2 font-bold tabular-nums" /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </details>
  );
}

/* ── image coverage + bulk import (v3.1 §32) ─────────── */

type Row = { item: MenuItem; key: string; path: string };

function useImageIndex(): Set<string> {
  const [have, setHave] = useState<Set<string>>(new Set());
  useEffect(() => {
    fetch("/menu/index.json")
      .then((r) => (r.ok ? r.json() : []))
      .then((a: string[]) => setHave(new Set(a)))
      .catch(() => setHave(new Set()));
  }, []);
  return have;
}

export function BulkImageImport() {
  const { settings, saveSettings, toast, logAudit, effectiveMenu } = useShop();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const lang = "en" as const;
  const items = effectiveMenu(MENU, lang);

  // slug → items sharing that image key
  const bySlug = new Map<string, MenuItem[]>();
  for (const m of items) {
    const k = itemImageKey(m);
    if (!bySlug.has(k)) bySlug.set(k, []);
    bySlug.get(k)!.push(m);
  }

  const [review, setReview] = useState<{ matched: { file: string; items: MenuItem[]; key: string; data: string }[]; unmatched: string[] } | null>(null);

  const readFiles = async (files: File[]) => {
    setBusy(true);
    const matched: { file: string; items: MenuItem[]; key: string; data: string }[] = [];
    const unmatched: string[] = [];
    for (const f of files) {
      if (f.size > MAX_BYTES) {
        unmatched.push(`${f.name} (>5 MB)`);
        continue;
      }
      const slug = slugFromFilename(f.name);
      const hit = bySlug.get(slug);
      if (!hit) {
        unmatched.push(f.name);
        continue;
      }
      try {
        matched.push({ file: f.name, items: hit, key: slug, data: await fileToWebp(f, "1:1") });
      } catch {
        unmatched.push(`${f.name} (decode failed)`);
      }
    }
    setReview({ matched, unmatched });
    setBusy(false);
  };

  const onFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    const files = Array.from(list);
    const zip = files.find((f) => /\.zip$/i.test(f.name));
    if (!zip) return readFiles(files.filter((f) => !/\.zip$/i.test(f.name)));
    setBusy(true);
    try {
      const JSZip = (await import("jszip")).default;
      const archive = await JSZip.loadAsync(zip);
      const imgs: File[] = [];
      for (const name of Object.keys(archive.files)) {
        const entry = archive.files[name];
        if (entry.dir || !/\.(webp|jpe?g|png|avif)$/i.test(name)) continue;
        const blob = await entry.async("blob");
        imgs.push(new File([blob], name.split("/").pop()!, { type: blob.type }));
      }
      setBusy(false);
      return readFiles(imgs);
    } catch (e) {
      setBusy(false);
      toast(`ZIP failed: ${(e as Error).message}`, "err");
    }
  };

  const apply = () => {
    if (!review) return;
    const map = { ...settings.itemImages };
    let n = 0;
    for (const m of review.matched)
      for (const it of m.items) {
        map[it.id] = { src: m.data, altEn: it.name, altFi: it.name };
        n++;
      }
    saveSettings({ ...settings, itemImages: map });
    logAudit(`bulk image import — ${review.matched.length} files → ${n} items`);
    toast(`${n} item images applied`);
    setReview(null);
    setQ("");
  };

  const replaced = review
    ? review.matched.filter((m) => m.items.some((it) => settings.itemImages[it.id])).length
    : 0;

  return (
    <div className="space-y-3 rounded-xl border border-cherry/15 bg-cream-deep p-4">
      <p className="text-xs font-black uppercase text-cherry/50">Bulk import — ZIP or images named by item slug</p>
      <p className="text-xs text-cherry/60">
        Name files by image key (e.g. <code>tropicana.webp</code>, <code>wings-small</code>). One file covers every variant sharing that key. Max 5 MB each.
      </p>
      <input
        type="file"
        accept=".zip,image/*"
        multiple
        onChange={(e) => onFiles(e.target.files)}
        className="block w-full text-xs font-bold text-cherry file:mr-3 file:min-h-[36px] file:rounded-lg file:border-0 file:bg-cherry file:px-4 file:text-xs file:font-black file:text-cream"
      />
      {busy && <p className="text-xs font-black text-cherry/60">Reading…</p>}

      {review && (
        <div className="space-y-2 rounded-lg border border-cherry/15 bg-cream p-3">
          <p className="text-xs font-black text-cherry">
            Review — <span className="text-[#2e7d32]">{review.matched.length} matched</span>
            {replaced > 0 && <span className="text-gold-deep"> · {replaced} replacing existing</span>}
            {review.unmatched.length > 0 && <span className="text-brick"> · {review.unmatched.length} unmatched</span>}
          </p>
          {review.matched.slice(0, 40).map((m) => (
            <div key={m.file} className="flex items-center gap-3 border-b border-cherry/5 pb-1 text-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.data} alt="" className="h-10 w-10 rounded object-cover" />
              <span className="font-bold text-cherry">{m.file}</span>
              <span className="text-cherry/50">→ {m.items.map((i) => i.name).join(", ")}</span>
              {m.items.some((it) => settings.itemImages[it.id]) && (
                <span className="rounded bg-gold/25 px-1.5 py-0.5 text-[10px] font-black text-gold-deep">REPLACES</span>
              )}
            </div>
          ))}
          {review.unmatched.length > 0 && (
            <p className="text-[11px] font-bold text-brick">Unmatched: {review.unmatched.slice(0, 20).join(", ")}</p>
          )}
          <div className="flex gap-2">
            <button onClick={apply} className="min-h-[36px] rounded-lg bg-cherry px-4 text-xs font-black text-cream">
              Apply {review.matched.length} images
            </button>
            <button onClick={() => setReview(null)} className="min-h-[36px] rounded-lg border border-cherry/30 px-4 text-xs font-black text-cherry">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ImageCoveragePanel() {
  const { settings, saveSettings, logAudit } = useShop();
  const have = useImageIndex();
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const items = MENU.filter((m) => !onlyMissing || !have.has(itemImagePath(m)) || !!settings.itemImages[m.id]);

  const all = MENU;
  const covered = all.filter((m) => settings.itemImages[m.id] || have.has(itemImagePath(m))).length;
  const uniqueKeys = new Set(all.map((m) => itemImageKey(m))).size;
  const list = items.filter(
    (m) => !q.trim() || m.name.toLowerCase().includes(q.toLowerCase()) || m.cat.includes(q.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-cherry/15 bg-cream-deep px-4 py-3">
        <p className="text-sm font-black text-cherry">
          Image coverage — {covered}/{all.length} items · {uniqueKeys} unique photos
        </p>
        <label className="flex items-center gap-2 text-xs font-black text-cherry/60">
          <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} /> only missing
        </label>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter by item or category…"
          className="min-h-[36px] w-52 rounded-lg border border-cherry/20 bg-cream px-2 text-xs font-bold"
        />
      </div>
      <div className="space-y-1">
        {list.map((m) => {
          const uploaded = !!settings.itemImages[m.id];
          const file = have.has(itemImagePath(m));
          const ok = uploaded || file;
          return (
            <div key={m.id} className={cx("rounded-lg border px-3 py-2", ok ? "border-cherry/10 bg-cream-deep" : "border-brick/40 bg-brick/5")}>
              <div className="flex flex-wrap items-center gap-3">
                <MenuImage item={m} sizes="64px" className="h-10 w-10 rounded-lg" />
                <span className="text-xs font-black text-cherry">{m.name}</span>
                <code className="text-[10px] text-cherry/50">{itemImagePath(m)}</code>
                <span
                  className={cx(
                    "rounded px-1.5 py-0.5 text-[10px] font-black",
                    uploaded ? "bg-[#2e7d32]/15 text-[#2e7d32]" : file ? "bg-gold/25 text-gold-deep" : "bg-brick/15 text-brick"
                  )}
                >
                  {uploaded ? "UPLOADED" : file ? "FILE" : "MISSING"}
                </span>
                <button
                  onClick={() => setOpen(open === m.id ? null : m.id)}
                  className="ml-auto min-h-[32px] rounded-lg border border-cherry/30 px-2 text-xs font-black text-cherry"
                >
                  {open === m.id ? "close" : uploaded ? "replace" : "upload"}
                </button>
              </div>
              {open === m.id && (
                <div className="mt-3">
                  <ImageUploader
                    preset="1:1"
                    value={settings.itemImages[m.id]}
                    onChange={(v) => {
                      const map = { ...settings.itemImages };
                      if (v) map[m.id] = v;
                      else delete map[m.id];
                      saveSettings({ ...settings, itemImages: map });
                      logAudit(`item image ${v ? "uploaded" : "cleared"} ${m.name}`);
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── offers ──────────────────────────────────────────── */

const EMPTY: Offer = {
  id: "", type: "percent", value: 10, scope: { whole: true }, active: true, priority: 0,
  titleEn: "", titleFi: "",
};

export function OffersTab() {
  const { settings, saveSettings, categories, logAudit, toast } = useShop();
  const allCats = categories();
  const [editing, setEditing] = useState<string | null>(null);

  const patch = (o: Offer, p: Partial<Offer>) => {
    const offers = settings.offers.map((x) => (x.id === o.id ? { ...x, ...p } : x));
    saveSettings({ ...settings, offers });
  };
  const add = () => {
    const o = { ...EMPTY, id: `off-${Date.now()}` };
    saveSettings({ ...settings, offers: [...settings.offers, o] });
    logAudit(`offer created ${o.id}`);
    setEditing(o.id);
  };
  const remove = (id: string) => {
    saveSettings({ ...settings, offers: settings.offers.filter((o) => o.id !== id) });
    logAudit(`offer deleted ${id}`);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-cherry/60">Best single discount wins by default. Server computes — clients only display.</p>
        <button onClick={add} className="min-h-[40px] rounded-lg bg-cherry px-4 text-xs font-black text-cream">+ New offer</button>
      </div>
      {settings.offers.length === 0 && <p className="rounded-xl bg-cream-deep p-8 text-center text-sm font-bold text-cherry/60">No offers yet.</p>}
      {settings.offers.map((o) => (
        <div key={o.id} className={cx("rounded-xl border bg-cream-deep", editing === o.id ? "border-gold" : "border-cherry/15")}>
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
            <span className="rounded-full bg-gold px-2 py-0.5 text-xs font-black text-cherry-dark">{o.badgeEn ?? o.titleEn}</span>
            <span className="font-black text-cherry">{o.titleEn} / {o.titleFi || "⚠ FI missing"}</span>
            <span className="text-xs text-cherry/60">
              {o.type} {o.type === "percent" ? `${o.value}%` : eur(o.value)} · {o.scope.whole ? "whole order" : o.scope.category ?? o.scope.itemIds?.join(",")}
              {o.code ? ` · code ${o.code}` : ""}
              {o.maxUses ? ` · ${o.uses ?? 0}/${o.maxUses}` : ""}
            </span>
            <span className="ml-auto flex items-center gap-2">
              <Switch on={o.active} ariaLabel={`${o.titleEn} active`} onChange={() => { patch(o, { active: !o.active }); logAudit(`offer ${o.active ? "paused" : "resumed"} ${o.id}`); }} />
              <button onClick={() => setEditing(editing === o.id ? null : o.id)} className="min-h-[32px] rounded-lg border border-cherry/30 px-2 text-xs font-black text-cherry">{editing === o.id ? "close" : "edit"}</button>
              <button
                onClick={() => {
                  const c = { ...o, id: `off-${Date.now()}`, active: false };
                  saveSettings({ ...settings, offers: [...settings.offers, c] });
                  toast("Offer duplicated");
                }}
                className="min-h-[32px] rounded-lg border border-cherry/30 px-2 text-xs font-black text-cherry"
              >
                dup
              </button>
              <button onClick={() => remove(o.id)} className="min-h-[32px] rounded-lg border border-brick/50 px-2 text-xs font-black text-brick">del</button>
            </span>
          </div>
          {editing === o.id && (
            <div className="grid gap-2 border-t border-cherry/10 p-4 sm:grid-cols-3">
              <label className="text-xs font-black text-cherry/60">Type
                <select value={o.type} onChange={(e) => patch(o, { type: e.target.value as Offer["type"] })} className="mt-1 min-h-[36px] w-full rounded-lg border border-cherry/20 bg-cream px-2 text-sm font-bold">
                  {["percent", "fixed", "override", "bundle", "freeItem", "freeDelivery"].map((tp) => <option key={tp} value={tp}>{tp}</option>)}
                </select>
              </label>
              <label className="text-xs font-black text-cherry/60">Value ({o.type === "percent" ? "%" : "€"})
                <input type="number" step="0.5" value={o.value} onChange={(e) => patch(o, { value: parseFloat(e.target.value) || 0 })} className="mt-1 min-h-[36px] w-full rounded-lg border border-cherry/20 bg-cream px-2 text-sm font-bold tabular-nums" />
              </label>
              <label className="text-xs font-black text-cherry/60">Scope
                <select
                  value={o.scope.whole ? "whole" : o.scope.category ? `cat:${o.scope.category}` : "items"}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "whole") patch(o, { scope: { whole: true } });
                    else if (v === "items") patch(o, { scope: { itemIds: [] } });
                    else patch(o, { scope: { category: v.slice(4) } });
                  }}
                  className="mt-1 min-h-[36px] w-full rounded-lg border border-cherry/20 bg-cream px-2 text-sm font-bold"
                >
                  <option value="whole">Whole order</option>
                  {allCats.map((c) => <option key={c.id} value={`cat:${c.id}`}>Category: {c.title}</option>)}
                  <option value="items">Specific items…</option>
                </select>
              </label>
              {o.scope.itemIds && (
                <label className="text-xs font-black text-cherry/60 sm:col-span-3">Item ids (comma-separated)
                  <input value={o.scope.itemIds.join(",")} onChange={(e) => patch(o, { scope: { itemIds: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) } })} className="mt-1 min-h-[36px] w-full rounded-lg border border-cherry/20 bg-cream px-2 text-sm font-bold" />
                </label>
              )}
              <label className="text-xs font-black text-cherry/60">Min order (€)
                <input type="number" value={o.minOrder ?? ""} onChange={(e) => patch(o, { minOrder: parseFloat(e.target.value) || undefined })} className="mt-1 min-h-[36px] w-full rounded-lg border border-cherry/20 bg-cream px-2 text-sm font-bold tabular-nums" />
              </label>
              <label className="text-xs font-black text-cherry/60">Promo code (optional)
                <input value={o.code ?? ""} onChange={(e) => patch(o, { code: e.target.value.toUpperCase() || undefined })} className="mt-1 min-h-[36px] w-full rounded-lg border border-cherry/20 bg-cream px-2 text-sm font-bold uppercase" />
              </label>
              <label className="text-xs font-black text-cherry/60">Max redemptions
                <input type="number" value={o.maxUses ?? ""} onChange={(e) => patch(o, { maxUses: parseInt(e.target.value) || undefined })} className="mt-1 min-h-[36px] w-full rounded-lg border border-cherry/20 bg-cream px-2 text-sm font-bold tabular-nums" />
              </label>
              <label className="text-xs font-black text-cherry/60">Valid from
                <input type="date" value={o.start ?? ""} onChange={(e) => patch(o, { start: e.target.value || undefined })} className="mt-1 min-h-[36px] w-full rounded-lg border border-cherry/20 bg-cream px-2 text-sm font-bold" />
              </label>
              <label className="text-xs font-black text-cherry/60">Valid to
                <input type="date" value={o.end ?? ""} onChange={(e) => patch(o, { end: e.target.value || undefined })} className="mt-1 min-h-[36px] w-full rounded-lg border border-cherry/20 bg-cream px-2 text-sm font-bold" />
              </label>
              <label className="text-xs font-black text-cherry/60">Priority
                <input type="number" value={o.priority} onChange={(e) => patch(o, { priority: parseInt(e.target.value) || 0 })} className="mt-1 min-h-[36px] w-full rounded-lg border border-cherry/20 bg-cream px-2 text-sm font-bold tabular-nums" />
              </label>
              <div className="text-xs font-black text-cherry/60 sm:col-span-3">
                Days active:{" "}
                {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                  <button
                    key={d}
                    onClick={() => {
                      const cur = o.days ?? [];
                      patch(o, { days: cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].length === 7 ? undefined : [...cur, d] });
                    }}
                    className={cx("mx-0.5 min-h-[30px] rounded-full border px-2", (o.days ?? []).includes(d) ? "border-cherry bg-cherry text-cream" : "border-cherry/20 text-cherry/60")}
                  >
                    {d === 0 ? "Su" : d === 1 ? "Mo" : d === 2 ? "Tu" : d === 3 ? "We" : d === 4 ? "Th" : d === 5 ? "Fr" : "Sa"}
                  </button>
                ))}
              </div>
              <input value={o.titleEn} onChange={(e) => patch(o, { titleEn: e.target.value })} placeholder="Title EN *" className="min-h-[36px] rounded-lg border border-cherry/20 bg-cream px-2 text-xs font-bold" />
              <input value={o.titleFi} onChange={(e) => patch(o, { titleFi: e.target.value })} placeholder="Otsikko FI *" className={cx("min-h-[36px] rounded-lg border bg-cream px-2 text-xs font-bold", o.titleFi ? "border-cherry/20" : "border-brick")} />
              <span className="self-center text-[10px] font-black text-brick">{!o.titleFi && "Missing Finnish translation"}</span>
              <input value={o.descEn ?? ""} onChange={(e) => patch(o, { descEn: e.target.value })} placeholder="Description EN" className="min-h-[36px] rounded-lg border border-cherry/20 bg-cream px-2 text-xs font-bold" />
              <input value={o.descFi ?? ""} onChange={(e) => patch(o, { descFi: e.target.value })} placeholder="Kuvaus FI" className="min-h-[36px] rounded-lg border border-cherry/20 bg-cream px-2 text-xs font-bold" />
              <input value={o.badgeEn ?? ""} onChange={(e) => patch(o, { badgeEn: e.target.value })} placeholder="Badge EN (−10%)" className="min-h-[36px] rounded-lg border border-cherry/20 bg-cream px-2 text-xs font-bold" />
              <input value={o.badgeFi ?? ""} onChange={(e) => patch(o, { badgeFi: e.target.value })} placeholder="Kyltti FI" className="min-h-[36px] rounded-lg border border-cherry/20 bg-cream px-2 text-xs font-bold" />
            </div>
          )}
        </div>
      ))}
    </div>
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
              value={m.img ? { src: m.img, altEn: m.altEn ?? "", altFi: m.altFi ?? "" } : undefined}
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

/* ── translations audit ──────────────────────────────── */

export function TranslationsTab() {
  const { overrides, setItemText, toast } = useShop();
  const [onlyGaps, setOnlyGaps] = useState(true);
  const missingName = MENU.filter((m) => !m.nameFi && !overrides.texts?.fi?.[m.id]?.name);
  const missingDesc = MENU.filter((m) => (m.desc && !m.descFi && !overrides.texts?.fi?.[m.id]?.desc) ?? false);
  const dictGapsEn = Object.keys(DICTS.en).filter((k) => !(k in DICTS.fi));
  const dictGapsFi = Object.keys(DICTS.fi).filter((k) => !(k in DICTS.en));
  const rows = onlyGaps ? Array.from(new Set([...missingName, ...missingDesc])) : MENU;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm font-black text-cherry">
          {missingName.length + missingDesc.length === 0 ? "✅ No gaps" : `⚠ ${missingName.length} names, ${missingDesc.length} descriptions missing Finnish`}
        </p>
        <label className="flex items-center gap-2 text-xs font-black text-cherry/60">
          <input type="checkbox" checked={onlyGaps} onChange={(e) => setOnlyGaps(e.target.checked)} /> only show gaps
        </label>
      </div>
      {dictGapsEn.length + dictGapsFi.length > 0 && (
        <p className="rounded-lg bg-brick/10 p-3 text-xs font-black text-brick">
          Dictionary key mismatch — en-only: {dictGapsEn.join(", ") || "—"} · fi-only: {dictGapsFi.join(", ") || "—"}
        </p>
      )}
      <div className="space-y-2">
        {rows.map((m) => {
          const tx = overrides.texts?.fi?.[m.id];
          const nameGap = !m.nameFi && !tx?.name;
          const descGap = m.desc && !m.descFi && !tx?.desc;
          return (
            <div key={m.id} className={cx("rounded-xl border p-3", nameGap || descGap ? "border-brick/40 bg-brick/5" : "border-cherry/15 bg-cream-deep")}>
              <p className="text-xs font-black text-cherry">
                {m.name} {nameGap && <span className="ml-2 rounded bg-brick px-1.5 py-0.5 text-[10px] text-cream">Missing Finnish translation</span>}
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <input
                  defaultValue={tx?.name ?? ""}
                  placeholder="Nimi (FI)"
                  onBlur={(e) => { setItemText("fi", m.id, { name: e.target.value || undefined }); toast("FI copy saved"); }}
                  className="min-h-[36px] rounded-lg border border-cherry/20 bg-cream px-2 text-xs font-bold"
                />
                <input
                  defaultValue={tx?.desc ?? ""}
                  placeholder="Kuvaus (FI)"
                  onBlur={(e) => { setItemText("fi", m.id, { desc: e.target.value || undefined }); toast("FI copy saved"); }}
                  className="min-h-[36px] rounded-lg border border-cherry/20 bg-cream px-2 text-xs font-bold"
                />
              </div>
              {descGap && <p className="mt-1 text-[10px] font-black text-brick">FI description missing</p>}
            </div>
          );
        })}
      </div>
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

export { isPreorderItem };
