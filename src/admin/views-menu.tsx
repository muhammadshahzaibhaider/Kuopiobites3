"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { fileToWebp } from "@/lib/imgtool";
import { MenuImage } from "@/components/ui";
import { CATEGORY_SLUG } from "@/lib/images";
import { eur, cx } from "@/lib/format";
import { todayStrHelsinki } from "@/lib/hours";
import { MENU } from "@/lib/menu";
import { useShop } from "@/lib/store";
import type { MenuItem } from "@/lib/types";
import { CatsTab, SpecialsPanel, ToppingsMetaPanel } from "@/app/admin/v3tabs";
import { Ic } from "./icons";
import { Confirm, DataTable, Drawer, EmptyState, Field, GhostBtn, Pill, PrimaryBtn, SubTabs, Toolbar, downloadCSV, inputCls, useDelayedReady, type Col, type FilterDef } from "./ui";

const TODAY = () => todayStrHelsinki();

export function MenuCategoriesView() {
  return (
    <div className="overflow-hidden rounded-2xl border border-cherry/10 bg-cream-deep/40">
      <CatsTab />
    </div>
  );
}

/* ══ ITEMS ══ */
export function MenuItemsView() {
  const { settings, saveSettings, overrides, addItem, removeAdded, categories, toast, logAudit } = useShop();
  const [fCat, setFCat] = useState("all");
  const [fAvail, setFAvail] = useState("all");
  const [edit, setEdit] = useState<MenuItem | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const ready = useDelayedReady("items");
  const categoryOptions = categories();

  const rows = useMemo(() => {
    const added = Object.values(overrides.added ?? {}).flat();
    return [...MENU, ...added];
  }, [overrides.added, settings]);

  const isOff = (id: string) => {
    const st = settings.offItems[id];
    return !!st && (st.off === true || st.offToday === TODAY());
  };

  const filtered = useMemo(() => {
    let list = rows;
    if (fCat !== "all") list = list.filter((r) => r.cat === fCat);
    if (fAvail === "off") list = list.filter((r) => isOff(r.id));
    else if (fAvail === "on") list = list.filter((r) => !isOff(r.id));
    return list;
  }, [rows, fCat, fAvail, settings.offItems]);

  const cats = useMemo(() => Array.from(new Set(rows.map((r) => r.cat))), [rows]);
  const isAdded = (id: string) => id.startsWith("custom-") || Object.values(overrides.added ?? {}).some((list) => list.some((item) => item.id === id));

  const filters: FilterDef[] = [
    { id: "cat", label: "Category", value: fCat, set: setFCat, options: [{ value: "all", label: "All categories" }, ...cats.map((c) => ({ value: c, label: c }))] },
    { id: "avail", label: "Availability", value: fAvail, set: setFAvail, options: [{ value: "all", label: "All" }, { value: "on", label: "Available" }, { value: "off", label: "Sold out" }] },
  ];

  const setOff = (ids: string[], off: boolean) => {
    const map = { ...settings.offItems };
    for (const id of ids) {
      if (off) map[id] = { off: true };
      else delete map[id];
    }
    saveSettings({ ...settings, offItems: map });
    logAudit(`${off ? "OFF" : "ON"} ×${ids.length} items (bulk)`);
    toast(off ? `${ids.length} marked sold out` : `${ids.length} back on menu`, off ? "err" : "ok");
  };

  const cols: Col<MenuItem>[] = [
    {
      key: "item", label: "Item", sort: (r) => r.name,
      render: (r) => (
        <span className="flex items-center gap-3">
          <MenuImage item={r} srcOverride={settings.itemImages[r.id]?.src} className="h-11 w-11 shrink-0 rounded-xl" />
          <span>
            <span className="block font-black text-cherry">{r.name}</span>
            <span className="block max-w-[240px] truncate text-[11px] text-cherry/50">{r.desc}</span>
          </span>
        </span>
      ),
    },
    { key: "cat", label: "Category", sort: (r) => r.cat, render: (r) => <Pill tone="teal">{r.cat}</Pill> },
    {
      key: "price", label: "Price", sort: (r) => r.prices[0]?.value ?? 0,
      render: (r) => <span className="tabular-nums">{r.prices.map((p) => eur(p.value)).join(" / ")}</span>,
    },
    {
      key: "avail", label: "Available", sort: (r) => (isOff(r.id) ? 1 : 0),
      render: (r) => {
        const off = isOff(r.id);
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOff([r.id], !off);
            }}
            className={cx("inline-flex min-h-[28px] items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-black", off ? "border-brick/40 bg-brick/10 text-brick" : "border-[#2e7d32]/30 bg-[#e6f4e7] text-[#2e7d32]")}
          >
            <span className={cx("h-1.5 w-1.5 rounded-full", off ? "bg-brick" : "bg-[#2e7d32]")} />
            {off ? "Sold out" : "Available"}
          </button>
        );
      },
    },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-cherry/10 bg-cream-deep/40">
      <Toolbar
        filters={filters}
        action={<PrimaryBtn onClick={() => setAddOpen(true)}>Add item</PrimaryBtn>}
      >
        <GhostBtn onClick={() => downloadCSV("menu.csv", [["category", "name", "prices"], ...filtered.map((r) => [r.cat, r.name, r.prices.map((p) => p.value).join("|")])])}><Ic n="csv" size={13} /> Export CSV</GhostBtn>
      </Toolbar>
      <DataTable
        rows={filtered}
        cols={cols}
        id={(r) => r.id}
        loading={!ready}
        search={(r, q) => r.name.toLowerCase().includes(q) || (r.desc ?? "").toLowerCase().includes(q)}
        selectable
        bulk={(ids, clear) => (
          <>
            <span className="text-xs font-black text-cherry">{ids.length} selected</span>
            <GhostBtn onClick={() => { setOff(ids, true); clear(); }}>Mark sold out</GhostBtn>
            <GhostBtn onClick={() => { setOff(ids, false); clear(); }}>Make available</GhostBtn>
          </>
        )}
        onRow={(r) => setEdit(r)}
        rowMenu={(r) => [
          { label: "Edit item", icon: "edit", onClick: () => setEdit(r) },
          { label: isOff(r.id) ? "Make available" : "Mark sold out", icon: "toggle", danger: !isOff(r.id), onClick: () => setOff([r.id], !isOff(r.id)) },
          ...(isAdded(r.id) ? [{ label: "Delete item", icon: "trash", danger: true, onClick: async () => { if (!window.confirm(`Delete ${r.name}?`)) return; await removeAdded(r.id); toast("Item deleted", "err"); } }] : []),
        ]}
        pageSizeDefault={25}
      />
      {edit && <ItemEditor item={edit} onClose={() => setEdit(null)} />}
      {addOpen && <NewItemEditor categories={categoryOptions} defaultCategory={fCat !== "all" ? fCat : undefined} addItem={addItem} toast={toast} onClose={() => setAddOpen(false)} />}
    </div>
  );
}

function NewItemEditor({
  categories,
  defaultCategory,
  addItem,
  onClose,
  toast,
}: {
  categories: { id: string; title: string; en?: string }[];
  defaultCategory?: string;
  addItem: (cat: string, name: string, price: number) => void | Promise<void>;
  onClose: () => void;
  toast: (msg: string, kind?: "ok" | "err") => void;
}) {
  const [cat, setCat] = useState(defaultCategory ?? categories[0]?.id ?? "specials");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState("");

  return (
    <Drawer open onClose={onClose} title="Add menu item">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const amount = Number(price);
          if (!cat || !name.trim() || !Number.isFinite(amount) || amount < 0) {
            setError("Choose a category, enter a name, and enter a valid price.");
            return;
          }
          try {
            await addItem(cat, name.trim(), amount);
            toast("Item added");
            onClose();
          } catch {
            setError("The item could not be saved. Please try again.");
          }
        }}
      >
        <Field label="Category">
          <select value={cat} onChange={(e) => setCat(e.target.value)} className={inputCls}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.title}{c.en ? ` · ${c.en}` : ""}</option>)}
          </select>
        </Field>
        <Field label="Name">
          <input autoFocus value={name} onChange={(e) => { setName(e.target.value); setError(""); }} className={inputCls} placeholder="e.g. Chicken biryani" />
        </Field>
        <Field label="Price (€)">
          <input type="number" min="0" step="0.1" value={price} onChange={(e) => { setPrice(e.target.value); setError(""); }} className={inputCls} placeholder="0.00" />
        </Field>
        {error && <p className="text-xs font-bold text-brick">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="min-h-[36px] rounded-lg border border-cherry/20 px-3 text-xs font-black text-cherry">Cancel</button>
          <PrimaryBtn icon="save">Save item</PrimaryBtn>
        </div>
      </form>
    </Drawer>
  );
}

function ItemEditor({ item, onClose }: { item: MenuItem; onClose: () => void }) {
  const { settings, saveSettings, overrides, setItemText, patchItem, toast } = useShop();
  const [tab, setTab] = useState("general");
  const [confirmOff, setConfirmOff] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const offRec = settings.offItems[item.id];
  const isOff = !!offRec && (offRec.off === true || offRec.offToday === TODAY());
  const textEn = overrides.texts?.en?.[item.id];
  const textFi = overrides.texts?.fi?.[item.id];

  const onUpload = async (f: File) => {
    try {
      const dataUrl = await fileToWebp(f, "1:1", 1200);
      saveSettings({ ...settings, itemImages: { ...settings.itemImages, [item.id]: { src: dataUrl, altEn: item.name, altFi: item.name } } });
      toast("Image applied — site shows it immediately");
    } catch {
      toast("Upload failed — check the file", "err");
    }
  };

  return (
    <Drawer open onClose={onClose} title={item.name} wide>
      <SubTabs
        tabs={[{ id: "general", label: "General" }, { id: "pricing", label: "Pricing" }, { id: "toppings", label: "Toppings" }, { id: "availability", label: "Availability" }, { id: "translation", label: "Translation" }]}
        active={tab}
        onChange={setTab}
      />
      <div className="mt-4 space-y-4">
        {(tab === "general" || tab === "translation") && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name (FI)"><input value={textFi?.name ?? item.name} onChange={(e) => setItemText("fi", item.id, { name: e.target.value })} className={inputCls} /></Field>
              <Field label="Name (EN)"><input value={textEn?.name ?? item.nameFi ?? item.name} onChange={(e) => setItemText("en", item.id, { name: e.target.value })} className={inputCls} /></Field>
              <Field label="Description (FI)"><textarea rows={3} value={textFi?.desc ?? item.descFi ?? item.desc ?? ""} onChange={(e) => setItemText("fi", item.id, { desc: e.target.value })} className={inputCls} /></Field>
              <Field label="Description (EN)"><textarea rows={3} value={textEn?.desc ?? item.desc ?? ""} onChange={(e) => setItemText("en", item.id, { desc: e.target.value })} className={inputCls} /></Field>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-cherry/10 bg-cream p-3">
              <MenuImage item={item} srcOverride={settings.itemImages[item.id]?.src} className="h-20 w-20 rounded-xl" />
              <div className="flex-1">
                <p className="text-xs font-black text-cherry/60">Product image</p>
                <p className="mb-2 text-[11px] text-cherry/40">
                  {settings.itemImages[item.id] ? "Custom uploaded image in use" : `/menu/${CATEGORY_SLUG[item.cat] ?? item.cat}/${item.imageKey ?? item.id}.webp (generated)`}
                </p>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
                <GhostBtn onClick={() => fileRef.current?.click()}>Upload / replace…</GhostBtn>
                {settings.itemImages[item.id] && (
                  <GhostBtn className="ml-2" onClick={() => { const m = { ...settings.itemImages }; delete m[item.id]; saveSettings({ ...settings, itemImages: m }); }}>Revert to generated</GhostBtn>
                )}
              </div>
            </div>
          </>
        )}
        {tab === "pricing" && (
          <div className="space-y-2">
            {item.prices.map((p, pi) => (
              <label key={pi} className="flex items-center gap-3 text-sm font-bold text-cherry">
                <span className="w-28">{p.label}</span>
                <input
                  type="number" step="0.5" value={p.value}
                  onChange={(e) => {
                    const values = item.prices.map((z, zi) => (zi === pi ? parseFloat(e.target.value) || 0 : z.value));
                    patchItem(item.id, { prices: values });
                  }}
                  className={inputCls + " w-24"}
                /> €
              </label>
            ))}
            <p className="text-[11px] text-cherry/40">Changes apply to both languages and are used for price revalidation at checkout.</p>
          </div>
        )}
        {tab === "toppings" && (
          <div className="space-y-3">
            <p className="text-xs text-cherry/60">Global topping list used by every build-your-own pizza (Fantasia & Pannu). €-prices are set per topping in Menu ▸ Toppings master.</p>
            <div className="flex flex-wrap gap-1.5">
              {settings.toppings.map((tp) => (
                <span key={tp} className="rounded-full border border-cherry/20 bg-cream px-2.5 py-0.5 text-[11px] font-black text-cherry/70">
                  {tp}
                  {settings.toppingMeta[tp] ? ` · €${(settings.toppingMeta[tp].priceMed ?? 0).toFixed(2)}` : ""}
                </span>
              ))}
            </div>
            <ToppingsMetaPanel />
          </div>
        )}
        {tab === "availability" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-cherry/10 bg-cream p-3">
              <span>
                <span className="block font-black text-cherry">Sold out</span>
                <span className="text-xs text-cherry/60">Hidden from ordering with a “sold out” tag</span>
              </span>
              <button
                onClick={() => (isOff ? restore() : setConfirmOff(true))}
                className={cx("relative h-7 w-12 rounded-full transition-colors", isOff ? "bg-brick" : "bg-[#2e7d32]")}
                aria-label="Sold out toggle"
              >
                <span className={cx("absolute top-1 h-5 w-5 rounded-full bg-cream transition-all", isOff ? "left-1" : "left-6")} />
              </button>
            </div>
            <Confirm
              open={confirmOff}
              title="Mark sold out?"
              body={`“${item.name}” will stop accepting orders until you turn it back on.`}
              danger
              onNo={() => setConfirmOff(false)}
              onYes={() => { setOffUntil(); setConfirmOff(false); }}
            />
            <GhostBtn onClick={setOffToday}>Sold out — today only (auto-resets)</GhostBtn>
          </div>
        )}
      </div>
    </Drawer>
  );

  function setOffUntil() {
    saveSettings({ ...settings, offItems: { ...settings.offItems, [item.id]: { off: true } } });
    toast("Marked sold out", "err");
  }
  function setOffToday() {
    saveSettings({ ...settings, offItems: { ...settings.offItems, [item.id]: { offToday: TODAY() } } });
    toast("Sold out for today", "err");
  }
  function restore() {
    const m = { ...settings.offItems };
    delete m[item.id];
    saveSettings({ ...settings, offItems: m });
    toast("Back on menu");
  }
}

/* ══ TOPPINGS MASTER ══ */
export function ToppingsMasterView() {
  const { settings, saveSettings, toast } = useShop();
  const [draft, setDraft] = useState(settings.toppings);
  useEffect(() => setDraft(settings.toppings), [settings.toppings]);

  const save = async () => {
    try {
      await saveSettings({ ...settings, toppings: draft });
      toast("Topping list saved");
    } catch {
      toast("Topping list could not be saved", "err");
    }
  };

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-cherry/10 bg-cream-deep/40 p-4">
        <p className="mb-2 text-xs font-black uppercase tracking-wide text-cherry/50">Topping list (build-your-own pizzas)</p>
        <textarea
          rows={8}
          value={draft.join("\n")}
          onChange={(e) => setDraft(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
          className={inputCls}
        />
        <p className="mt-1 text-[11px] text-cherry/40">One topping per line. Removing a topping also removes it from every pizza builder.</p>
        <div className="mt-3 flex justify-end"><PrimaryBtn icon="save" onClick={() => { void save(); }}>Save list</PrimaryBtn></div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-cherry/10 bg-cream-deep/40">
        <ToppingsMetaPanel />
      </div>
    </div>
  );
}

/* ══ TODAY'S SPECIAL ══ */
export function SpecialsView() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-gold bg-gold/10 px-4 py-3">
        <p className="text-xs font-bold text-gold-deep">Carousel of 1–6 dishes — appears at the top of the public menu + footer “Päivän erikois” strip.</p>
        <a href="/menu" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-black text-cherry underline"><Ic n="eye" size={13} /> Preview on site</a>
      </div>
      <div className="overflow-hidden rounded-2xl border border-cherry/10 bg-cream-deep/40">
        <SpecialsPanel />
      </div>
    </div>
  );
}
