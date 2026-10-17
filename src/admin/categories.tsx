"use client";
import { useMemo, useState } from "react";
import ImageUploader from "@/components/ImageUploader";
import { CatAvailSwitch, Switch } from "@/app/admin/v3tabs";
import { resolveImageSrc } from "@/lib/images";
import { CATEGORY_IMG, MENU } from "@/lib/menu";
import { todayStrHelsinki } from "@/lib/hours";
import { useShop } from "@/lib/store";
import type { CatMeta } from "@/lib/types";
import { cx } from "@/lib/format";
import { Ic } from "./icons";
import { Drawer, Field, GhostBtn, Panel, Pill, PrimaryBtn, SolidBtn, inputCls } from "./ui";

/* ══ CATEGORIES MANAGER ═════════════════════════════════════════════════════
   A card-based workspace instead of a long strip of tiny controls:
   cover image, bilingual names, visibility, availability and ordering are
   all directly on the card. Drag a card (or use the arrows) to re-order. */

export default function CategoriesManager() {
  const { settings, saveSettings, categories, overrides, addCat, toast, logAudit } = useShop();
  const cats = categories();
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [imageFor, setImageFor] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const order = useMemo(() => {
    const base = settings.catOrder?.length ? [...settings.catOrder] : cats.map((c) => c.id);
    cats.forEach((c) => { if (!base.includes(c.id)) base.push(c.id); });
    return base;
  }, [settings.catOrder, cats]);

  const moveTo = (id: string, index: number) => {
    const next = order.filter((x) => x !== id);
    const bounded = Math.max(0, Math.min(next.length, index));
    next.splice(bounded, 0, id);
    saveSettings({ ...settings, catOrder: next });
    logAudit(`category ${id} moved`);
  };

  const catItems = (id: string) =>
    MENU.filter((m) => m.cat === id).length + (overrides.added?.[id]?.length ?? 0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cats;
    return cats.filter((c) => c.id.toLowerCase().includes(q) || c.title.toLowerCase().includes(q) || (c.en ?? "").toLowerCase().includes(q));
  }, [cats, query]);

  const visibleCount = cats.filter((c) => !settings.catMeta[c.id]?.hidden).length;
  const totalItems = cats.reduce((n, c) => n + catItems(c.id), 0);

  return (
    <div className="space-y-4">
      {/* summary + search */}
      <div className="grid gap-2.5 sm:grid-cols-3">
        {[
          { label: "Categories", value: cats.length, icon: "group", tone: "text-cherry" },
          { label: "Visible on site", value: visibleCount, icon: "eye", tone: "text-[#2e7d32]" },
          { label: "Items across menus", value: totalItems, icon: "list", tone: "text-gold-deep" },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-3 rounded-2xl border border-cherry/10 bg-white/70 p-3.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-cherry/5 text-cherry/55"><Ic n={s.icon} size={18} /></span>
            <span>
              <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-cherry/40">{s.label}</span>
              <span className={cx("block font-display text-xl font-black tabular-nums", s.tone)}>{s.value}</span>
            </span>
          </div>
        ))}
      </div>

      <Panel>
        <div className="flex flex-wrap items-center gap-2 border-b border-cherry/10 px-4 py-3">
          <label className="relative min-w-[180px] flex-1 sm:max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cherry/35"><Ic n="search" size={15} /></span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search categories…"
              className="min-h-[38px] w-full rounded-xl border border-cherry/15 bg-white pl-9 pr-3 text-sm font-bold text-cherry placeholder:text-cherry/35 focus:border-gold focus:outline-none"
            />
          </label>
          <span className="hidden items-center gap-1.5 rounded-full border border-cherry/10 bg-white/60 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-cherry/40 sm:inline-flex">
            <Ic n="drag" size={12} /> Drag to re-order
          </span>
          <span className="ml-auto"><PrimaryBtn onClick={() => setAddOpen(true)} icon="plus">New category</PrimaryBtn></span>
        </div>

        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c, idx) => {
            const fullIdx = order.indexOf(c.id);
            const meta = settings.catMeta[c.id] ?? {};
            const n = catItems(c.id);
            const img = resolveImageSrc(meta.img) ?? CATEGORY_IMG[c.id] ?? "/img/pizza.jpg";
            const isOff = !!settings.offCats[c.id] && (settings.offCats[c.id].off === true || settings.offCats[c.id].offToday === todayStrHelsinki());
            return (
              <div
                key={c.id}
                draggable
                onDragStart={() => setDragId(c.id)}
                onDragEnd={() => { setDragId(null); setOverId(null); }}
                onDragOver={(e) => { e.preventDefault(); setOverId(c.id); }}
                onDragLeave={() => setOverId((x) => (x === c.id ? null : x))}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragId && dragId !== c.id) moveTo(dragId, fullIdx);
                  setDragId(null);
                  setOverId(null);
                }}
                className={cx(
                  "group rounded-3xl border bg-white/80 p-3.5 shadow-[0_10px_24px_-24px_rgba(6,32,31,0.55)] transition",
                  dragId === c.id ? "opacity-50" : "hover:-translate-y-0.5 hover:border-gold/60 hover:shadow-card",
                  overId === c.id && dragId !== c.id ? "border-gold ring-2 ring-gold/30" : "border-cherry/10",
                  meta.hidden && "bg-cherry/[0.03]"
                )}
              >
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setImageFor((v) => (v === c.id ? null : c.id))}
                    className="group/img relative h-[92px] w-[92px] shrink-0 overflow-hidden rounded-2xl border border-cherry/10 bg-cream-deep"
                    title="Change category image"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img}
                      alt={meta.altEn ?? c.title}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/img/pizza.jpg"; }}
                      className="h-full w-full object-cover transition group-hover/img:scale-105"
                    />
                    <span className="absolute inset-0 grid place-items-center bg-cherry-dark/55 text-[10px] font-black uppercase tracking-wide text-cream opacity-0 transition group-hover/img:opacity-100">
                      <span className="flex flex-col items-center gap-1"><Ic n="image" size={16} /> Change</span>
                    </span>
                    <span className="absolute left-1.5 top-1.5 grid h-5 min-w-[20px] place-items-center rounded-md bg-cherry-dark/75 px-1 text-[10px] font-black text-cream">{fullIdx + 1}</span>
                    {meta.hidden && <span className="absolute inset-x-1.5 bottom-1.5 rounded-md bg-brick/90 py-0.5 text-center text-[9px] font-black uppercase text-cream">Hidden</span>}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-display text-base font-black text-cherry">{meta.nameEn || c.en || c.title}</p>
                        <p className="truncate text-[11px] font-semibold text-cherry/45">{meta.nameFi || c.title} · {c.id}</p>
                      </div>
                      <span className="cursor-grab rounded-lg p-1 text-cherry/25 transition group-hover:text-cherry/45" title="Drag to re-order"><Ic n="drag" size={15} /></span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      <Pill tone="teal">{n} items</Pill>
                      {meta.hidden ? <Pill tone="red">hidden</Pill> : <Pill tone="green">live</Pill>}
                      {isOff && <Pill tone="orange">sold out</Pill>}
                    </div>
                    <div className="mt-2 grid gap-1.5">
                      <input
                        defaultValue={meta.nameEn ?? ""}
                        placeholder={`English name — ${c.en ?? c.title}`}
                        aria-label={`${c.id} English name`}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          saveSettings({ ...settings, catMeta: { ...settings.catMeta, [c.id]: { ...meta, nameEn: v || undefined } } });
                          if (v) logAudit(`category ${c.id} English name set`);
                        }}
                        className="min-h-[32px] w-full rounded-lg border border-cherry/15 bg-white px-2 text-[11px] font-bold text-cherry focus:border-gold focus:outline-none"
                      />
                      <input
                        defaultValue={meta.nameFi ?? ""}
                        placeholder={`Suomenkielinen nimi — ${c.title}`}
                        aria-label={`${c.id} Finnish name`}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          saveSettings({ ...settings, catMeta: { ...settings.catMeta, [c.id]: { ...meta, nameFi: v || undefined } } });
                          if (v) logAudit(`category ${c.id} Finnish name set`);
                        }}
                        className="min-h-[32px] w-full rounded-lg border border-cherry/15 bg-white px-2 text-[11px] font-bold text-cherry focus:border-gold focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-cherry/10 pt-2.5">
                  <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-cherry/50">
                    Show on site
                    <Switch
                      on={!meta.hidden}
                      ariaLabel={`${c.title} visible`}
                      onChange={() => {
                        const next = { ...meta, hidden: !meta.hidden };
                        saveSettings({ ...settings, catMeta: { ...settings.catMeta, [c.id]: next } });
                        logAudit(`category ${c.id} ${meta.hidden ? "shown" : "hidden"}`);
                      }}
                    />
                  </label>
                  <span className="h-5 w-px bg-cherry/10" />
                  <CatAvailSwitch id={c.id} title={c.title} />
                  <span className="ml-auto flex items-center gap-1">
                    <button
                      onClick={() => moveTo(c.id, fullIdx - 1)}
                      disabled={fullIdx <= 0}
                      aria-label={`Move ${c.title} up`}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-cherry/15 text-cherry/60 transition hover:border-cherry hover:text-cherry disabled:opacity-25"
                    >
                      <Ic n="arrowUp" size={14} />
                    </button>
                    <button
                      onClick={() => moveTo(c.id, fullIdx + 1)}
                      disabled={fullIdx >= order.length - 1}
                      aria-label={`Move ${c.title} down`}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-cherry/15 text-cherry/60 transition hover:border-cherry hover:text-cherry disabled:opacity-25"
                    >
                      <Ic n="arrowDown" size={14} />
                    </button>
                  </span>
                </div>

                {imageFor === c.id && (
                  <div className="mt-3 rounded-2xl border border-gold/40 bg-gold/[0.06] p-3">
                    <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-gold-deep">Category image</p>
                    <ImageUploader
                      preset="1:1"
                      value={meta.img ? { src: meta.img, altEn: meta.altEn ?? c.title, altFi: meta.altFi ?? c.title } : undefined}
                      fallbackAlt={meta.nameEn || c.en || c.title}
                      onChange={(v) => {
                        const patch: Partial<CatMeta> = { img: v?.src, altEn: v?.altEn, altFi: v?.altFi };
                        saveSettings({ ...settings, catMeta: { ...settings.catMeta, [c.id]: { ...meta, ...patch } } });
                        logAudit(`category ${c.id} image ${v ? "uploaded" : "removed"}`);
                        if (!v) setImageFor(null);
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-cherry/20 px-4 py-12 text-center">
              <p className="font-display text-lg font-black text-cherry">No categories match</p>
              <p className="mt-1 text-sm font-semibold text-cherry/50">Try a different search, or create a new category.</p>
            </div>
          )}
        </div>
      </Panel>

      <AddCategoryDrawer open={addOpen} onClose={() => setAddOpen(false)} onAdd={(fi, en) => {
        addCat(fi, en);
        logAudit(`category created ${fi}`);
        toast("Category created — add items to it from Menu ▸ Items");
        setAddOpen(false);
      }} />
    </div>
  );
}

function AddCategoryDrawer({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (fi: string, en: string) => void }) {
  const [fi, setFi] = useState("");
  const [en, setEn] = useState("");
  return (
    <Drawer open={open} onClose={onClose} title="New category">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!fi.trim()) return;
          onAdd(fi.trim(), en.trim() || fi.trim());
          setFi(""); setEn("");
        }}
      >
        <Field label="Name (Finnish) *">
          <input value={fi} onChange={(e) => setFi(e.target.value)} className={inputCls} placeholder="e.g. Uudet erikoisuudet" autoFocus />
        </Field>
        <Field label="Name (English)">
          <input value={en} onChange={(e) => setEn(e.target.value)} className={inputCls} placeholder="e.g. New specials" />
        </Field>
        <p className="rounded-xl border border-cherry/10 bg-white/60 px-3 py-2 text-[11px] font-semibold text-cherry/50">
          The category appears on the public menu immediately. Upload a 1:1 image and add items once it exists.
        </p>
        <div className="flex justify-end gap-2">
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <SolidBtn type="submit" tone="gold" icon="plus">Create category</SolidBtn>
        </div>
      </form>
    </Drawer>
  );
}
