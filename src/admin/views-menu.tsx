"use client";
import { useMemo, useState } from "react";
import { MenuImage } from "@/components/ui";
import ImageUploader from "@/components/ImageUploader";
import { cx, eur } from "@/lib/format";
import { todayStrHelsinki } from "@/lib/hours";
import { MENU } from "@/lib/menu";
import { useLang } from "@/lib/i18n";
import { useShop } from "@/lib/store";
import { apiSetItemAvailability } from "@/lib/api";
import type { Category, MenuItem } from "@/lib/types";
import { SpecialsPanel, ToppingsMetaPanel } from "@/app/admin/v3tabs";
import ProductEditor from "./ProductEditor";
import { Ic } from "./icons";
import { DataTable, GhostBtn, Pill, PrimaryBtn, Toolbar, downloadCSV, useDelayedReady, type Col, type FilterDef } from "./ui";

const words = (fi: boolean, en: string, translatedFi: string) => fi ? translatedFi : en;
const TODAY = () => todayStrHelsinki();
const isArchivedItem = (item: MenuItem) => item.archived === true;
const isOffMenuItem = (item: MenuItem, offItems: ReturnType<typeof useShop>["settings"]["offItems"]) => {
  if (isArchivedItem(item)) return false;
  const status = offItems[item.id];
  return item.available === false || (!!status && (status.off === true || status.offToday === TODAY()));
};

export function MenuCategoriesView() {
  const { settings, saveSettings, categories, addCat, patchCategory, archiveCategory, restoreCategory, toast, logAudit } = useShop();
  const { lang } = useLang();
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [newFi, setNewFi] = useState("");
  const [newEn, setNewEn] = useState("");
  const [busy, setBusy] = useState(false);
  const fi = lang === "fi";
  const all = categories();
  const rows = all.filter((category) => Boolean(category.archived) === showArchived)
    .filter((category) => `${category.title} ${category.en ?? ""} ${category.id}`.toLowerCase().includes(search.toLowerCase()));

  const saveMeta = async (id: string, patch: Partial<(typeof settings.catMeta)[string]>) => {
    const saved = await saveSettings({ ...settings, catMeta: { ...settings.catMeta, [id]: { ...(settings.catMeta[id] ?? {}), ...patch } } });
    return saved !== false;
  };
  const move = async (id: string, direction: -1 | 1) => {
    const activeOrder = (settings.catOrder?.length ? settings.catOrder : all.filter((category) => !category.archived).map((category) => category.id)).filter((categoryId) => !all.find((category) => category.id === categoryId)?.archived);
    const index = activeOrder.indexOf(id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= activeOrder.length) return;
    [activeOrder[index], activeOrder[nextIndex]] = [activeOrder[nextIndex], activeOrder[index]];
    const saved = await saveSettings({ ...settings, catOrder: activeOrder });
    if (saved !== false) { logAudit(`category ${id} moved`); toast(words(fi, "Category order saved", "Kategorioiden järjestys tallennettu")); }
  };
  const create = async () => {
    const title = newFi.trim();
    const en = newEn.trim();
    if (!title || !en) { toast(words(fi, "Enter the category name in English and Finnish.", "Anna kategorian nimi englanniksi ja suomeksi."), "err"); return; }
    setBusy(true);
    try {
      const saved = await addCat(title, en);
      if (saved) { setNewFi(""); setNewEn(""); toast(words(fi, "Category added", "Kategoria lisätty")); }
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-cherry/10 bg-cream-deep/40 p-4">
        <label className="min-w-0 flex-1 text-xs font-black text-cherry/65">{words(fi, "Finnish category name", "Kategorian nimi · suomi")}<input value={newFi} maxLength={60} onChange={(event) => setNewFi(event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-cherry/20 bg-cream px-3 text-sm font-bold text-cherry" /></label>
        <label className="min-w-0 flex-1 text-xs font-black text-cherry/65">{words(fi, "English category name", "Kategorian nimi · englanti")}<input value={newEn} maxLength={60} onChange={(event) => setNewEn(event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-cherry/20 bg-cream px-3 text-sm font-bold text-cherry" /></label>
        <PrimaryBtn disabled={busy} onClick={() => { void create(); }}>{busy ? words(fi, "Saving…", "Tallennetaan…") : words(fi, "Add category", "Lisää kategoria")}</PrimaryBtn>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={words(fi, "Search categories…", "Hae kategorioita…")} className="min-h-10 min-w-0 flex-1 rounded-lg border border-cherry/20 bg-cream px-3 text-sm font-bold" />
        <button type="button" onClick={() => setShowArchived((value) => !value)} className="min-h-10 rounded-lg border border-cherry/20 px-3 text-xs font-black text-cherry">{showArchived ? words(fi, "Show active", "Näytä aktiiviset") : words(fi, "Archived", "Arkistoidut")}</button>
      </div>
      {rows.length === 0 && <p className="rounded-xl bg-cream-deep p-6 text-center text-sm font-bold text-cherry/60">{words(fi, "No categories found.", "Kategorioita ei löytynyt.")}</p>}
      <div className="space-y-3">
        {rows.map((category) => <CategoryCard key={category.id} category={category} position={all.filter((entry) => !entry.archived).findIndex((entry) => entry.id === category.id)} total={all.filter((entry) => !entry.archived).length} meta={settings.catMeta[category.id] ?? {}} settings={settings} onSaveMeta={saveMeta} onPatch={patchCategory} onArchive={archiveCategory} onRestore={restoreCategory} onMove={move} toast={toast} />)}
      </div>
    </div>
  );
}

function CategoryCard({ category, position, total, meta, settings, onSaveMeta, onPatch, onArchive, onRestore, onMove, toast }: {
  category: Category;
  position: number;
  total: number;
  meta: NonNullable<ReturnType<typeof useShop>["settings"]["catMeta"][string]>;
  settings: ReturnType<typeof useShop>["settings"];
  onSaveMeta: (id: string, patch: Partial<typeof meta>) => Promise<boolean>;
  onPatch: (id: string, patch: { title?: string; en?: string }) => Promise<boolean>;
  onArchive: (id: string) => Promise<boolean>;
  onRestore: (id: string) => Promise<boolean>;
  onMove: (id: string, direction: -1 | 1) => Promise<void>;
  toast: (message: string, kind?: "ok" | "err") => void;
}) {
  const { lang } = useLang();
  const fi = lang === "fi";
  const { saveSettings } = useShop();
  const [title, setTitle] = useState(category.title);
  const [en, setEn] = useState(category.en ?? "");
  const [saving, setSaving] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const itemCount = MENU.filter((item) => item.cat === category.id && !item.archived).length;
  const saveNames = async () => {
    if (!title.trim() || !en.trim()) { toast(words(fi, "Both category names are required.", "Molemmat kategorian nimet vaaditaan."), "err"); return; }
    setSaving(true);
    try {
      const saved = await onPatch(category.id, { title: title.trim(), en: en.trim() });
      if (saved) toast(words(fi, "Category saved", "Kategoria tallennettu"));
    } finally { setSaving(false); }
  };
  const toggleVisibility = async () => {
    const saved = await onSaveMeta(category.id, { hidden: !meta.hidden });
    if (saved) toast(words(fi, meta.hidden ? "Category is visible on the site" : "Category hidden from the site", meta.hidden ? "Kategoria näkyy verkkosivulla" : "Kategoria piilotettu verkkosivulta"));
  };
  const setAvailability = async () => {
    const next = { ...settings.offCats };
    const off = Boolean(next[category.id]?.off || next[category.id]?.offToday === TODAY());
    if (off) delete next[category.id]; else next[category.id] = { off: true };
    const saved = await saveSettings({ ...settings, offCats: next });
    if (saved !== false) toast(words(fi, off ? "Category back on menu" : "Category marked unavailable", off ? "Kategoria palautettu valikkoon" : "Kategoria merkitty pois käytöstä"), off ? "ok" : "err");
  };
  const doArchive = async () => {
    const saved = await onArchive(category.id);
    setConfirmArchive(false);
    if (saved) toast(words(fi, "Category archived; items and order history are retained.", "Kategoria arkistoitu; tuotteet ja tilaushistoria säilytetään."));
  };

  return (
    <article className="min-w-0 rounded-2xl border border-cherry/10 bg-cream-deep/40 p-4">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row">
        <div className="w-full shrink-0 sm:w-32">
          <ImageUploaderWrapper category={category} meta={meta} onSaveMeta={onSaveMeta} />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2"><Pill tone="teal">{category.id}</Pill><span className="text-xs font-bold text-cherry/50">{itemCount} {words(fi, "active products", "aktiivista tuotetta")}</span>{category.archived && <Pill tone="red">{words(fi, "Archived", "Arkistoitu")}</Pill>}</div>
          <div className="grid min-w-0 gap-2 sm:grid-cols-2">
            <label className="min-w-0 text-[11px] font-black text-cherry/60">{words(fi, "Name · Finnish", "Nimi · suomi")}<input value={title} maxLength={60} onChange={(event) => setTitle(event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-cherry/20 bg-cream px-3 text-sm font-bold" /></label>
            <label className="min-w-0 text-[11px] font-black text-cherry/60">{words(fi, "Name · English", "Nimi · englanti")}<input value={en} maxLength={60} onChange={(event) => setEn(event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-cherry/20 bg-cream px-3 text-sm font-bold" /></label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <GhostBtn disabled={saving} onClick={() => { void saveNames(); }}>{words(fi, "Save names", "Tallenna nimet")}</GhostBtn>
            {!category.archived && <>
              <button type="button" onClick={() => { void toggleVisibility(); }} className="min-h-9 rounded-lg border border-cherry/20 px-2 text-[11px] font-black text-cherry">{meta.hidden ? words(fi, "Show on site", "Näytä sivustolla") : words(fi, "Hide from site", "Piilota sivustolta")}</button>
              <button type="button" onClick={() => { void setAvailability(); }} className="min-h-9 rounded-lg border border-cherry/20 px-2 text-[11px] font-black text-cherry">{settings.offCats[category.id]?.off ? words(fi, "Restore availability", "Palauta saatavuus") : words(fi, "Mark unavailable", "Merkitse poissa käytöstä")}</button>
              <button type="button" onClick={() => { void onMove(category.id, -1); }} disabled={position <= 0} aria-label={words(fi, "Move category up", "Siirrä kategoriaa ylöspäin")} className="min-h-9 rounded-lg border border-cherry/20 px-3 text-sm font-black disabled:opacity-40">↑</button>
              <button type="button" onClick={() => { void onMove(category.id, 1); }} disabled={position < 0 || position >= total - 1} aria-label={words(fi, "Move category down", "Siirrä kategoriaa alaspäin")} className="min-h-9 rounded-lg border border-cherry/20 px-3 text-sm font-black disabled:opacity-40">↓</button>
            </>}
            {category.archived
              ? <PrimaryBtn onClick={() => { void onRestore(category.id); }}>{words(fi, "Restore", "Palauta")}</PrimaryBtn>
              : <button type="button" onClick={() => setConfirmArchive(true)} className="min-h-9 rounded-lg border border-brick/40 px-3 text-[11px] font-black text-brick">{words(fi, "Archive", "Arkistoi")}</button>}
          </div>
        </div>
      </div>
      <ConfirmArchive open={confirmArchive} category={category} onCancel={() => setConfirmArchive(false)} onConfirm={() => { void doArchive(); }} fi={fi} />
    </article>
  );
}

function ImageUploaderWrapper({ category, meta, onSaveMeta }: {
  category: Category;
  meta: ReturnType<typeof useShop>["settings"]["catMeta"][string];
  onSaveMeta: (id: string, patch: Partial<ReturnType<typeof useShop>["settings"]["catMeta"][string]>) => Promise<boolean>;
}) {
  const { lang } = useLang();
  const { toast } = useShop();
  const current = meta.img ? { src: meta.img, altEn: meta.altEn ?? category.en ?? category.id, altFi: meta.altFi ?? category.title } : undefined;
  return <ImageUploader preset="1:1" value={current} fallbackAlt={lang === "fi" ? category.title : category.en ?? category.title} onChange={(image) => {
    void onSaveMeta(category.id, { img: image?.src, altEn: image?.altEn, altFi: image?.altFi }).then((saved) => {
      if (saved) toast(words(lang === "fi", "Category image saved", "Kategorian kuva tallennettu"), "ok");
    });
  }} />;
}

function ConfirmArchive({ open, category, onCancel, onConfirm, fi }: { open: boolean; category: Category; onCancel: () => void; onConfirm: () => void; fi: boolean }) {
  if (!open) return null;
  return <div role="alertdialog" aria-modal="true" className="fixed inset-0 z-[70] grid place-items-center bg-cherry-dark/40 p-4" onClick={onCancel}><div className="w-full max-w-md rounded-2xl bg-cream p-5 shadow-lift" onClick={(event) => event.stopPropagation()}><h3 className="font-display text-lg font-black text-cherry">{words(fi, "Archive this category?", "Arkistoidaanko kategoria?")}</h3><p className="mt-2 text-sm text-cherry/70">{words(fi, "The category and its products will leave the public menu. Existing order records remain unchanged; you can restore it later.", "Kategoria ja sen tuotteet poistuvat julkisesta valikosta. Aiemmat tilaukset säilyvät, ja kategorian voi palauttaa myöhemmin.")}</p><p className="mt-2 font-black">{category.title} · {category.en}</p><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={onCancel} className="min-h-10 rounded-lg border border-cherry/20 px-3 text-xs font-black">{words(fi, "Cancel", "Peruuta")}</button><button type="button" onClick={onConfirm} className="min-h-10 rounded-lg bg-brick px-3 text-xs font-black text-cream">{words(fi, "Archive", "Arkistoi")}</button></div></div></div>;
}

export function MenuItemsView({ initialAvailability = "all" }: { initialAvailability?: "all" | "off" }) {
  const { settings, overrides, addItem, removeAdded, patchItem, categories, toast, logAudit, staffRole, refresh } = useShop();
  const { lang } = useLang();
  const fi = lang === "fi";
  const [fCat, setFCat] = useState("all");
  const [fAvail, setFAvail] = useState(initialAvailability);
  const [edit, setEdit] = useState<MenuItem | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const ready = useDelayedReady("items");
  const categoryOptions = categories();

  const rows = useMemo(() => {
    const byId = new Map<string, MenuItem>();
    for (const item of MENU) byId.set(item.id, item);
    for (const list of Object.values(overrides.added ?? {})) for (const item of list) if (!byId.has(item.id)) byId.set(item.id, item);
    return [...byId.values()];
  }, [overrides.added]);
  const filtered = useMemo(() => {
    let list = rows;
    if (fCat !== "all") list = list.filter((item) => item.cat === fCat);
    if (fAvail === "off") list = list.filter((item) => isOffMenuItem(item, settings.offItems));
    else if (fAvail === "on") list = list.filter((item) => !isOffMenuItem(item, settings.offItems) && !isArchivedItem(item));
    else if (fAvail === "archived") list = list.filter(isArchivedItem);
    return list;
  }, [rows, fCat, fAvail, settings.offItems]);
  const catIds = useMemo(() => Array.from(new Set(rows.map((item) => item.cat))), [rows]);
  const filters: FilterDef[] = [
    { id: "category", label: words(fi, "Category", "Kategoria"), value: fCat, set: setFCat, options: [{ value: "all", label: words(fi, "All categories", "Kaikki kategoriat") }, ...catIds.map((id) => ({ value: id, label: categoryOptions.find((category) => category.id === id)?.en ?? id }))] },
    { id: "availability", label: words(fi, "Availability", "Saatavuus"), value: fAvail, set: setFAvail, options: [
      { value: "all", label: words(fi, "All items", "Kaikki tuotteet") }, { value: "on", label: words(fi, "Available", "Saatavilla") },
      { value: "off", label: words(fi, "Off-menu", "Pois valikosta") }, { value: "archived", label: words(fi, "Archived", "Arkistoitu") },
    ] },
  ];
  const setOff = async (ids: string[], off: boolean) => {
    const eligible = ids.filter((id) => !rows.find((item) => item.id === id)?.archived);
    if (!eligible.length) return;
    try {
      await Promise.all(eligible.map((id) => apiSetItemAvailability(id, off)));
      await refresh();
      logAudit(`${off ? "OFF" : "ON"} ×${eligible.length} items`);
      toast(words(fi, off ? `${eligible.length} item(s) marked off menu` : `${eligible.length} item(s) restored`, off ? `${eligible.length} tuotetta poistettu valikosta` : `${eligible.length} tuotetta palautettu`), off ? "err" : "ok");
    } catch {
      toast(words(fi, "Availability could not be updated", "Saatavuutta ei voitu päivittää"), "err");
    }
  };
  const restoreItem = async (item: MenuItem) => {
    const saved = await patchItem(item.id, { archived: false, available: true });
    if (saved) toast(words(fi, "Product restored", "Tuote palautettu"));
  };
  const archiveItem = async (item: MenuItem) => {
    if (!window.confirm(words(fi, `Archive ${item.name}? Existing order history will be retained.`, `Arkistoidaanko ${item.name}? Tilaushistoria säilyy.`))) return;
    const saved = await removeAdded(item.id);
    if (saved) toast(words(fi, "Product archived", "Tuote arkistoitu"));
  };
  const saveProduct = async (next: MenuItem) => edit ? patchItem(next.id, next) : addItem(next);

  const cols: Col<MenuItem>[] = [
    { key: "item", label: words(fi, "Item", "Tuote"), sort: (item) => item.name, render: (item) => <span className="flex min-w-0 items-center gap-3"><MenuImage item={item} srcOverride={settings.itemImages[item.id]?.src} className="h-11 w-11 shrink-0 rounded-xl" /><span className="min-w-0"><span className="block truncate font-black text-cherry">{fi ? item.nameFi ?? item.name : item.name}</span><span className="block max-w-[240px] truncate text-[11px] text-cherry/50">{fi ? item.descFi ?? item.desc : item.desc}</span></span></span> },
    { key: "category", label: words(fi, "Category", "Kategoria"), sort: (item) => item.cat, render: (item) => <Pill tone="teal">{categoryOptions.find((category) => category.id === item.cat)?.[fi ? "title" : "en"] ?? item.cat}</Pill> },
    { key: "price", label: words(fi, "Price", "Hinta"), sort: (item) => item.prices[0]?.value ?? 0, render: (item) => <span className="tabular-nums">{item.prices.map((price) => eur(price.value)).join(" / ")}</span> },
    { key: "availability", label: words(fi, "Availability", "Saatavuus"), sort: (item) => isArchivedItem(item) ? 2 : isOffMenuItem(item, settings.offItems) ? 1 : 0, render: (item) => {
      const archived = isArchivedItem(item); const off = isOffMenuItem(item, settings.offItems);
      return archived ? <Pill tone="red">{words(fi, "Archived", "Arkistoitu")}</Pill> : <button type="button" onClick={(event) => { event.stopPropagation(); void setOff([item.id], !off); }} className={cx("inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-black", off ? "border-brick/40 bg-brick/10 text-brick" : "border-[#2e7d32]/30 bg-[#e6f4e7] text-[#2e7d32]")}><span className={cx("h-1.5 w-1.5 rounded-full", off ? "bg-brick" : "bg-[#2e7d32]")} />{off ? words(fi, "Off menu", "Pois valikosta") : words(fi, "Available", "Saatavilla")}</button>;
    } },
  ];

  return <div className="overflow-hidden rounded-2xl border border-cherry/10 bg-cream-deep/40">
    <Toolbar filters={filters} action={staffRole === "kitchen" ? undefined : <PrimaryBtn onClick={() => setAddOpen(true)}>{words(fi, "Add product", "Lisää tuote")}</PrimaryBtn>}>
      <GhostBtn onClick={() => downloadCSV("menu.csv", [["category", "name", "prices"], ...filtered.map((item) => [item.cat, item.name, item.prices.map((price) => price.value.toFixed(2)).join("|")])])}><Ic n="csv" size={13} /> {words(fi, "Export CSV", "Vie CSV")}</GhostBtn>
    </Toolbar>
    <DataTable rows={filtered} cols={cols} id={(item) => item.id} loading={!ready} search={(item, query) => `${item.name} ${item.nameFi ?? ""} ${item.desc ?? ""} ${item.descFi ?? ""}`.toLowerCase().includes(query)} selectable={staffRole !== "kitchen"}
      bulk={staffRole === "kitchen" ? undefined : (ids, clear) => <><span className="text-xs font-black text-cherry">{ids.length} {words(fi, "selected", "valittu")}</span><GhostBtn onClick={() => { void setOff(ids, true); clear(); }}>{words(fi, "Mark off menu", "Poista valikosta")}</GhostBtn><GhostBtn onClick={() => { void setOff(ids, false); clear(); }}>{words(fi, "Restore availability", "Palauta saatavuus")}</GhostBtn></>}
      onRow={staffRole === "kitchen" ? undefined : (item) => setEdit(item)} rowMenu={(item) => staffRole === "kitchen"
        ? (item.archived ? [] : [{ label: isOffMenuItem(item, settings.offItems) ? words(fi, "Restore availability", "Palauta saatavuus") : words(fi, "Mark off menu", "Poista valikosta"), icon: "toggle", danger: !isOffMenuItem(item, settings.offItems), onClick: () => { void setOff([item.id], !isOffMenuItem(item, settings.offItems)); } }])
        : [
          { label: words(fi, "Edit product", "Muokkaa tuotetta"), icon: "edit", onClick: () => setEdit(item) },
          ...(item.archived ? [{ label: words(fi, "Restore product", "Palauta tuote"), icon: "toggle", onClick: () => { void restoreItem(item); } }] : [{ label: isOffMenuItem(item, settings.offItems) ? words(fi, "Restore availability", "Palauta saatavuus") : words(fi, "Mark off menu", "Poista valikosta"), icon: "toggle", danger: !isOffMenuItem(item, settings.offItems), onClick: () => { void setOff([item.id], !isOffMenuItem(item, settings.offItems)); } }, { label: words(fi, "Archive product", "Arkistoi tuote"), icon: "trash", danger: true, onClick: () => { void archiveItem(item); } }]),
        ]} pageSizeDefault={25} />
    {edit && <ProductEditor item={edit} categories={categoryOptions} onClose={() => setEdit(null)} onSave={saveProduct} />}
    {addOpen && <ProductEditor item={null} categories={categoryOptions} defaultCategory={fCat !== "all" ? fCat : undefined} onClose={() => setAddOpen(false)} onSave={saveProduct} />}
  </div>;
}

export function ToppingsMasterView() {
  const { settings, saveSettings, toast } = useShop();
  const { lang } = useLang();
  const fi = lang === "fi";
  const [draft, setDraft] = useState(settings.toppings);
  const [newTopping, setNewTopping] = useState("");
  const [newToppingEn, setNewToppingEn] = useState("");
  const [busy, setBusy] = useState(false);
  const archived = Object.keys(settings.toppingMeta).filter((label) => !settings.toppings.includes(label));
  const save = async (nextDraft = draft, restoreLabel?: string) => {
    setBusy(true);
    try {
      const next = { ...settings, toppings: nextDraft, offOptions: { ...settings.offOptions, topping: (settings.offOptions.topping ?? []).filter((label) => nextDraft.includes(label)) } };
      const saved = await saveSettings(next);
      if (saved !== false) toast(restoreLabel ? words(fi, "Topping restored", "Täyte palautettu") : words(fi, "Topping list saved", "Täytelista tallennettu"));
    } finally { setBusy(false); }
  };
  const add = () => {
    const fiName = newTopping.trim(); const enName = newToppingEn.trim();
    if (!fiName || !enName) { toast(words(fi, "Enter topping names in both languages.", "Anna täytteen nimi molemmilla kielillä."), "err"); return; }
    if (draft.some((label) => label.toLowerCase() === fiName.toLowerCase())) { toast(words(fi, "That topping is already active.", "Täyte on jo aktiivinen."), "err"); return; }
    const next = [...draft, fiName];
    const meta = { ...(settings.toppingMeta ?? {}), [fiName]: { fi: fiName, en: enName, priceMed: 1, pricePerhe: 2 } };
    setDraft(next);
    void (async () => {
      setBusy(true);
      try {
        const saved = await saveSettings({ ...settings, toppings: next, toppingMeta: meta, offOptions: { ...settings.offOptions, topping: (settings.offOptions.topping ?? []).filter((label) => label !== fiName) } });
        if (saved !== false) { setNewTopping(""); setNewToppingEn(""); toast(words(fi, "Topping added", "Täyte lisätty")); }
      } finally { setBusy(false); }
    })();
  };
  const restore = (label: string) => { const next = [...draft, label]; setDraft(next); void save(next, label); };

  return <div className="space-y-4">
    <section className="rounded-2xl border border-cherry/10 bg-cream-deep/40 p-4">
      <h3 className="font-display text-lg font-black text-cherry">{words(fi, "Topping availability", "Täytteiden saatavuus")}</h3>
      <p className="mt-1 text-xs text-cherry/60">{words(fi, "Archive a topping to hide it from new orders. Existing order lines are never changed; archived toppings can be restored below.", "Arkistoi täyte piilottaaksesi sen uusista tilauksista. Aiemmat tilausrivit eivät muutu; arkistoidut täytteet voi palauttaa alta.")}</p>
      <label className="mt-3 block text-xs font-black text-cherry/60">{words(fi, "Active toppings (one Finnish name per line)", "Aktiiviset täytteet (yksi suomenkielinen nimi rivillä)")}<textarea rows={8} value={draft.join("\n")} onChange={(event) => setDraft(event.target.value.split("\n").map((value) => value.trim()).filter(Boolean))} className="mt-1 min-h-40 w-full rounded-lg border border-cherry/20 bg-cream p-3 text-sm font-bold" /></label>
      <p className="mt-1 text-[11px] text-cherry/45">{words(fi, "Saving a removed topping archives it; data remains in the database.", "Poistetun täytteen tallentaminen arkistoi sen; tiedot säilyvät tietokannassa.")}</p>
      <div className="mt-3 flex justify-end"><PrimaryBtn disabled={busy} onClick={() => { void save(); }}>{busy ? words(fi, "Saving…", "Tallennetaan…") : words(fi, "Save list", "Tallenna lista")}</PrimaryBtn></div>
      <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-cherry/10 pt-4">
        <label className="min-w-0 flex-1 text-[11px] font-black text-cherry/60">{words(fi, "New topping · Finnish", "Uusi täyte · suomi")}<input value={newTopping} onChange={(event) => setNewTopping(event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-cherry/20 bg-cream px-3 text-sm" /></label>
        <label className="min-w-0 flex-1 text-[11px] font-black text-cherry/60">{words(fi, "New topping · English", "Uusi täyte · englanti")}<input value={newToppingEn} onChange={(event) => setNewToppingEn(event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-cherry/20 bg-cream px-3 text-sm" /></label>
        <GhostBtn onClick={add}>+ {words(fi, "Add topping", "Lisää täyte")}</GhostBtn>
      </div>
    </section>
    <section className="overflow-x-auto rounded-2xl border border-cherry/10 bg-cream-deep/40 p-3"><ToppingsMetaPanel /></section>
    {archived.length > 0 && <section className="rounded-2xl border border-cherry/10 bg-cream-deep/40 p-4"><h3 className="font-display text-lg font-black text-cherry">{words(fi, "Archived toppings", "Arkistoidut täytteet")}</h3><div className="mt-3 flex flex-wrap gap-2">{archived.map((label) => <button key={label} type="button" onClick={() => restore(label)} className="min-h-9 rounded-full border border-[#0F3D3E]/30 px-3 text-xs font-black text-[#0F3D3E]">+ {settings.toppingMeta[label]?.en ?? label} / {label} · {words(fi, "Restore", "Palauta")}</button>)}</div></section>}
  </div>;
}

export function SpecialsView() {
  const { lang } = useLang();
  const fi = lang === "fi";
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-gold bg-gold/10 px-4 py-3"><p className="text-xs font-bold text-gold-deep">{words(fi, "Carousel of 1–6 dishes — appears on the menu and links to the product.", "1–6 annoksen karuselli — näkyy valikossa ja linkittää tuotteeseen.")}</p><a href="/menu" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-black text-cherry underline"><Ic n="eye" size={13} /> {words(fi, "Preview", "Esikatselu")}</a></div>
    <div className="overflow-hidden rounded-2xl border border-cherry/10 bg-cream-deep/40"><SpecialsPanel /></div>
  </div>;
}
