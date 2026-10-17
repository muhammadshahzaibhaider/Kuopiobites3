"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MenuImage } from "@/components/ui";
import ImageUploader from "@/components/ImageUploader";
import { CATEGORY_SLUG } from "@/lib/images";
import { eur, cx } from "@/lib/format";
import { todayStrHelsinki } from "@/lib/hours";
import { MENU } from "@/lib/menu";
import { useShop } from "@/lib/store";
import type { MenuItem, ModGroup, UploadedImg } from "@/lib/types";
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
export function MenuItemsView({ initialAvailability = "all" }: { initialAvailability?: "all" | "off" }) {
  const { settings, saveSettings, adminItems, addItem, removeAdded, archiveMenuItem, categories, toast, logAudit } = useShop();
  const [fCat, setFCat] = useState("all");
  const [fAvail, setFAvail] = useState<string>(initialAvailability);
  const [edit, setEdit] = useState<MenuItem | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [fArchived, setFArchived] = useState("active");
  const ready = useDelayedReady("items");
  const categoryOptions = categories();
  useEffect(() => setFAvail(initialAvailability), [initialAvailability]);

  const rows = useMemo(() => adminItems.length ? adminItems : MENU, [adminItems]);

  const isOff = useCallback((id: string) => {
    const st = settings.offItems[id];
    return !!st && (st.off === true || st.offToday === TODAY());
  }, [settings.offItems]);

  const filtered = useMemo(() => {
    let list = rows;
    if (fCat !== "all") list = list.filter((r) => r.cat === fCat);
    if (fArchived === "active") list = list.filter((r) => !r.archived);
    else if (fArchived === "archived") list = list.filter((r) => r.archived);
    if (fAvail === "off") list = list.filter((r) => !r.archived && isOff(r.id));
    else if (fAvail === "on") list = list.filter((r) => !r.archived && !isOff(r.id));
    return list;
  }, [rows, fCat, fAvail, fArchived, isOff]);

  const cats = useMemo(() => Array.from(new Set(rows.map((r) => r.cat))), [rows]);

  const filters: FilterDef[] = [
    { id: "cat", label: "Category", value: fCat, set: setFCat, options: [{ value: "all", label: "All categories" }, ...cats.map((c) => ({ value: c, label: c }))] },
    { id: "avail", label: "Availability", value: fAvail, set: setFAvail, options: [{ value: "all", label: "All" }, { value: "on", label: "Available" }, { value: "off", label: "Sold out" }] },
    { id: "archived", label: "Archive", value: fArchived, set: setFArchived, options: [{ value: "active", label: "Active items" }, { value: "archived", label: "Archived items" }, { value: "all", label: "All items" }] },
  ];

  const setOff = async (ids: string[], off: boolean) => {
    const map = { ...settings.offItems };
    for (const id of ids) {
      if (off) map[id] = { off: true };
      else delete map[id];
    }
    if (!await saveSettings({ ...settings, offItems: map })) return;
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
        if (r.archived) return <Pill tone="orange">Archived</Pill>;
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
            <GhostBtn onClick={() => { void setOff(ids, true); clear(); }}>Mark sold out</GhostBtn>
            <GhostBtn onClick={() => { void setOff(ids, false); clear(); }}>Make available</GhostBtn>
          </>
        )}
        onRow={(r) => setEdit(r)}
        rowMenu={(r) => [
          { label: "Edit item", icon: "edit", onClick: () => setEdit(r) },
          ...(r.archived
            ? [{ label: "Restore item", icon: "toggle", danger: false, onClick: async () => { if (await archiveMenuItem(r.id, false)) toast("Item restored"); } }]
            : [
                { label: isOff(r.id) ? "Make available" : "Mark sold out", icon: "toggle", danger: !isOff(r.id), onClick: () => setOff([r.id], !isOff(r.id)) },
                { label: "Archive item", icon: "trash", danger: true, onClick: async () => { if (!window.confirm(`Archive ${r.name}? It will be removed from the customer menu; existing orders stay intact.`)) return; if (await archiveMenuItem(r.id, true)) toast("Item archived", "err"); } },
              ]),
          ...(r.id.startsWith("custom-") ? [{ label: "Delete permanently", icon: "trash", danger: true, onClick: async () => { if (!window.confirm(`Permanently delete ${r.name}? Order history keeps its saved item snapshot, but this cannot be undone.`)) return; if (await removeAdded(r.id)) toast("Item permanently deleted"); } }] : []),
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
  addItem: (item: Omit<MenuItem, "id">) => Promise<boolean>;
  onClose: () => void;
  toast: (msg: string, kind?: "ok" | "err") => void;
}) {
  const [cat, setCat] = useState(defaultCategory ?? categories[0]?.id ?? "specials");
  const [nameFi, setNameFi] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [descFi, setDescFi] = useState("");
  const [descEn, setDescEn] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState<UploadedImg | undefined>();
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState("");
  const [imageError, setImageError] = useState("");
  const urlIsValid = (value: string) => {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

  const setUrl = (value: string) => {
    setImageUrl(value);
    setImageError(value.trim() && !urlIsValid(value.trim()) ? "Enter a valid http(s) image URL." : "");
    if (value.trim()) setImage(undefined);
  };
  const previewImage = imageUrl.trim() && urlIsValid(imageUrl.trim())
    ? { src: imageUrl.trim(), altEn: nameEn.trim(), altFi: nameFi.trim() }
    : image;

  return (
    <Drawer open onClose={onClose} title="Add menu item">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const amount = Number(price);
          const trimmedUrl = imageUrl.trim();
          if (!cat) {
            setError("Choose a valid category.");
            return;
          }
          if (!nameFi.trim() || !nameEn.trim()) {
            setError("Both Finnish and English names are required.");
            return;
          }
          if (!price.trim() || !Number.isFinite(amount) || amount < 0) {
            setError("Enter a valid price.");
            return;
          }
          if (trimmedUrl && !urlIsValid(trimmedUrl)) {
            setImageError("Enter a valid http(s) image URL.");
            return;
          }
          const imageRef = trimmedUrl
            ? { src: trimmedUrl, altEn: nameEn.trim(), altFi: nameFi.trim() }
            : image;
          const saved = await addItem({
            cat,
            name: nameEn.trim(),
            nameFi: nameFi.trim(),
            desc: descEn.trim() || undefined,
            descFi: descFi.trim() || undefined,
            prices: [{ label: "", value: amount }],
            imageUrl: imageRef?.src,
          });
          if (!saved) {
            setError("The item could not be saved. Please try again.");
            return;
          }
          toast("Item added");
          onClose();
        }}
      >
        <Field label="Category">
          <select value={cat} onChange={(e) => { setCat(e.target.value); setError(""); }} className={inputCls}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.title}{c.en ? ` · ${c.en}` : ""}</option>)}
          </select>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name (Finnish)">
            <input autoFocus value={nameFi} onChange={(e) => { setNameFi(e.target.value); setError(""); }} className={inputCls} placeholder="e.g. Kanaa biryanilla" maxLength={120} />
          </Field>
          <Field label="Name (English)">
            <input value={nameEn} onChange={(e) => { setNameEn(e.target.value); setError(""); }} className={inputCls} placeholder="e.g. Chicken biryani" maxLength={120} />
          </Field>
          <Field label="Description (Finnish)">
            <textarea rows={3} value={descFi} onChange={(e) => { setDescFi(e.target.value); setError(""); }} className={inputCls} placeholder="Lyhyt kuvaus tai ainesosat" maxLength={500} />
          </Field>
          <Field label="Description (English)">
            <textarea rows={3} value={descEn} onChange={(e) => { setDescEn(e.target.value); setError(""); }} className={inputCls} placeholder="Short description or ingredients" maxLength={500} />
          </Field>
        </div>
        <Field label="Price (€)">
          <input type="number" min="0" step="0.1" value={price} onChange={(e) => { setPrice(e.target.value); setError(""); }} className={inputCls} placeholder="0.00" />
        </Field>
        <div className="space-y-2 rounded-xl border border-cherry/10 bg-cream p-3">
          <p className="text-xs font-black uppercase tracking-wide text-cherry/60">Image (optional)</p>
          <ImageUploader
            preset="1:1"
            value={previewImage}
            fallbackAlt={nameEn || nameFi}
            onChange={(next) => { if (!next && imageUrl.trim()) setImageUrl(""); setImage(next ?? undefined); if (next) setImageUrl(""); setImageError(""); }}
          />
          <label className="block text-xs font-bold text-cherry/70">
            Or image URL
            <input value={imageUrl} onChange={(e) => setUrl(e.target.value)} className={inputCls + " mt-1"} placeholder="https://…" inputMode="url" />
          </label>
          {imageError && <p className="text-xs font-bold text-brick">{imageError}</p>}
        </div>
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
  const { settings, saveSettings, saveMenuItem, toast } = useShop();
  const [tab, setTab] = useState("general");
  const [draft, setDraft] = useState<MenuItem>(() => structuredClone(item));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmOff, setConfirmOff] = useState(false);

  useEffect(() => setDraft(structuredClone(item)), [item]);
  const offRec = settings.offItems[item.id];
  const isOff = !!offRec && (offRec.off === true || offRec.offToday === TODAY());
  const update = (patch: Partial<MenuItem>) => setDraft((current) => ({ ...current, ...patch }));

  const saveImage = async (next: UploadedImg | null) => {
    try {
      const itemImages = { ...settings.itemImages };
      if (next) itemImages[item.id] = next;
      else delete itemImages[item.id];
      if (await saveSettings({ ...settings, itemImages })) toast(next ? "Image applied — site shows it immediately" : "Image removed");
    } catch {
      toast("Upload failed — check the file", "err");
    }
  };

  const save = async () => {
    const trimmed = {
      ...draft,
      name: draft.name.trim(),
      nameFi: (draft.nameFi ?? draft.name).trim(),
      prices: draft.prices.map((price) => ({ label: price.label, value: Number(price.value) })),
      mods: draft.mods?.filter((group) => group.id === "top" || group.options.length > 0).map((group) => ({
        ...group,
        nameFi: group.nameFi ?? group.name,
        nameEn: group.nameEn ?? group.name,
        options: group.options.map((option) => ({ ...option, labelFi: option.labelFi ?? option.label, labelEn: option.labelEn ?? option.label })),
      })),
      weightKg: draft.weightKg === undefined ? undefined : Number(draft.weightKg),
    };
    if (!trimmed.name || !trimmed.nameFi) { setError("Both English and Finnish names are required."); return; }
    if (!trimmed.prices.length || trimmed.prices.some((price) => !Number.isFinite(price.value) || price.value < 0)) { setError("Enter at least one valid non-negative price."); return; }
    if (trimmed.prices.length === 1 && trimmed.prices[0].label !== "") { setError("Single-price items must keep their variant label empty."); return; }
    if (trimmed.prices.length > 1 && trimmed.prices.some((price) => !price.label)) { setError("Every size/variant needs its exact customer-facing label."); return; }
    if (new Set(trimmed.prices.map((price) => price.label)).size !== trimmed.prices.length) { setError("Variant labels must be unique."); return; }
    const modifierLabels = (trimmed.mods ?? []).flatMap((group) => group.options.map((option) => option.label.trim()));
    if (new Set(modifierLabels).size !== modifierLabels.length) { setError("Raw modifier option labels must be unique across all groups for this item."); return; }
    if (trimmed.weightKg !== undefined && (!Number.isFinite(trimmed.weightKg) || trimmed.weightKg < 0 || trimmed.weightKg > 100)) { setError("Weight must be between 0 and 100 kg."); return; }
    for (const group of trimmed.mods ?? []) {
      if (group.id === "top") continue; // build-your-own pizza options are populated from settings at checkout
      const minimum = group.exact ?? (group.required ? group.min ?? 1 : group.min ?? 0);
      const maximum = group.exact ?? group.max ?? (group.type === "single" ? 1 : Number.POSITIVE_INFINITY);
      if (minimum > maximum || (group.required && minimum < 1) || (group.type === "single" && minimum > 1)) { setError(`Check the selection limits for “${group.nameEn ?? group.name}”.`); return; }
      if (!group.name.trim() || !group.nameFi?.trim() || !group.nameEn?.trim() || !group.options.length) { setError("Each option group needs Finnish and English names and at least one option."); return; }
      const hasMissingCustomerLabel = group.id !== "topping" && group.options.some((option) => !option.labelFi?.trim() || !option.labelEn?.trim());
      if (new Set(group.options.map((option) => option.label.trim())).size !== group.options.length || group.options.some((option) => !option.label.trim() || !Number.isFinite(option.price) || option.price < 0) || hasMissingCustomerLabel) {
        setError("Option labels must be unique, Finnish and English customer labels are required, and modifier prices must be valid."); return;
      }
      if (group.id === "topping" && group.options.some((option) => !settings.toppings.includes(option.label))) {
        setError("Topping options must come from the active shop topping list."); return;
      }
    }
    setSaving(true); setError("");
    const ok = await saveMenuItem(trimmed);
    setSaving(false);
    if (ok) { toast("Item saved and reloaded from the database"); onClose(); }
    else setError("The item could not be saved. Check the connection and try again.");
  };

  const updatePrice = (index: number, patch: { label?: string; value?: number }) =>
    update({ prices: draft.prices.map((price, i) => i === index ? { ...price, ...patch } : price) });
  const updateGroup = (groupIndex: number, patch: Partial<ModGroup>) =>
    update({ mods: (draft.mods ?? []).map((group, i) => i === groupIndex ? { ...group, ...patch } : group) });
  const addOptionGroup = (toppings = false) => {
    const id = toppings ? "topping" : `extra-${Math.random().toString(36).slice(2, 8)}`;
    if ((draft.mods ?? []).some((group) => group.id === id)) { setError("This topping option group already exists."); return; }
    const options = toppings ? settings.toppings.map((label) => ({ label, price: 0 })) : [{ label: "", labelFi: "", labelEn: "", price: 0 }];
    update({ mods: [...(draft.mods ?? []), { id, name: toppings ? "Toppings" : "Extras", nameEn: toppings ? "Toppings" : "Extras", nameFi: toppings ? "Täytteet" : "Lisät", type: "multi", required: false, min: 0, max: toppings ? settings.toppings.length : 1, options }] });
    setError("");
  };
  const setOffMode = async (mode: "on" | "until" | "today") => {
    const offItems = { ...settings.offItems };
    if (mode === "on") delete offItems[item.id];
    else offItems[item.id] = mode === "until" ? { off: true } : { offToday: TODAY() };
    if (await saveSettings({ ...settings, offItems }))
      toast(mode === "on" ? "Back on menu" : mode === "today" ? "Sold out for today" : "Marked sold out", mode === "on" ? "ok" : "err");
  };

  return (
    <Drawer open onClose={onClose} title={draft.name || item.name} wide>
      <SubTabs
        tabs={[{ id: "general", label: "General" }, { id: "pricing", label: "Sizes & prices" }, { id: "options", label: "Toppings & options" }, { id: "availability", label: "Availability" }]}
        active={tab}
        onChange={setTab}
      />
      <div className="mt-4 space-y-4 pb-2">
        {tab === "general" && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name (Finnish)"><input value={draft.nameFi ?? draft.name} onChange={(e) => update({ nameFi: e.target.value })} className={inputCls} maxLength={120} /></Field>
              <Field label="Name (English)"><input value={draft.name} onChange={(e) => update({ name: e.target.value })} className={inputCls} maxLength={120} /></Field>
              <Field label="Description (Finnish)"><textarea rows={3} value={draft.descFi ?? draft.desc ?? ""} onChange={(e) => update({ descFi: e.target.value })} className={inputCls} maxLength={500} /></Field>
              <Field label="Description (English)"><textarea rows={3} value={draft.desc ?? ""} onChange={(e) => update({ desc: e.target.value })} className={inputCls} maxLength={500} /></Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Weight per item (kg; optional)">
                <input type="number" min="0" max="100" step="0.001" value={draft.weightKg ?? ""} onChange={(e) => update({ weightKg: e.target.value === "" ? undefined : Number(e.target.value) })} className={inputCls} placeholder="e.g. 0.45" />
              </Field>
              <div className="space-y-2">
                <span className="block text-xs font-black uppercase text-cherry/60">Tags</span>
                <div className="flex flex-wrap gap-3 pt-2 text-sm font-bold">
                  {(["veg", "spicy", "popular"] as const).map((tag) => (
                    <label key={tag} className="inline-flex items-center gap-2"><input type="checkbox" checked={(draft.tags ?? []).includes(tag)} onChange={(e) => update({ tags: e.target.checked ? [...new Set([...(draft.tags ?? []), tag])] : (draft.tags ?? []).filter((value) => value !== tag) })} />{tag}</label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-cherry/10 bg-cream p-3">
              <MenuImage item={draft} srcOverride={settings.itemImages[item.id]?.src} className="h-20 w-20 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-cherry/60">Product image</p>
                <p className="mb-2 break-all text-[11px] text-cherry/40">
                  {settings.itemImages[item.id] ? "Custom uploaded image in use" : `/menu/${CATEGORY_SLUG[item.cat] ?? item.cat}/${item.imageKey ?? item.id}.webp (generated)`}
                </p>
                <ImageUploader preset="1:1" value={settings.itemImages[item.id]} fallbackAlt={draft.name} onChange={(next) => { void saveImage(next); }} />
              </div>
            </div>
          </>
        )}
        {tab === "pricing" && (
          <div className="space-y-3">
            <p className="text-xs text-cherry/60">The label is saved exactly and shown in the cart. A single-price item keeps its variant label empty.</p>
            {draft.prices.map((price, index) => (
              <div key={`${index}-${price.label}`} className="grid grid-cols-[minmax(0,1fr)_110px_auto] items-end gap-2 rounded-xl border border-cherry/10 bg-cream p-3">
                <Field label={`Variant ${index + 1} label`}>
                  <input value={price.label} onChange={(e) => updatePrice(index, { label: e.target.value })} className={inputCls} placeholder={draft.prices.length === 1 ? "(leave blank for single price)" : "e.g. Large"} maxLength={40} />
                </Field>
                <Field label="Price (€)"><input type="number" min="0" step="0.01" value={price.value} onChange={(e) => updatePrice(index, { value: Number(e.target.value) })} className={inputCls} /></Field>
                {draft.prices.length > 1 && <button type="button" onClick={() => update({ prices: draft.prices.filter((_, i) => i !== index) })} className="min-h-[42px] rounded-lg border border-brick/30 px-3 text-xs font-black text-brick">Remove</button>}
              </div>
            ))}
            <GhostBtn onClick={() => {
              const prices = draft.prices.map((price, index) => ({ ...price, label: price.label || (index === 0 ? "Small" : `Size ${index + 1}`) }));
              update({ prices: [...prices, { label: "Large", value: prices[prices.length - 1]?.value ?? 0 }] });
            }}><Ic n="plus" size={13} /> Add size/variant</GhostBtn>
          </div>
        )}
        {tab === "options" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <GhostBtn onClick={() => addOptionGroup(false)}><Ic n="plus" size={13} /> Add option group</GhostBtn>
              <GhostBtn onClick={() => addOptionGroup(true)}><Ic n="plus" size={13} /> Add shop toppings</GhostBtn>
            </div>
            <p className="text-xs text-cherry/60">Modifier option labels are stored and returned raw; price and option validity are checked by the API. Shop-topping selections are checked against the active settings list.</p>
            {(draft.mods ?? []).filter((group) => group.id !== "top").map((group) => {
              const groupIndex = draft.mods?.findIndex((entry) => entry.id === group.id) ?? -1;
              return (
                <section key={group.id} className="space-y-3 rounded-xl border border-cherry/15 bg-cream p-3">
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_150px_auto] sm:items-end">
                    <Field label="Group name (Finnish)"><input value={group.nameFi ?? group.name} onChange={(e) => updateGroup(groupIndex, { nameFi: e.target.value })} className={inputCls} maxLength={120} /></Field>
                    <Field label="Group name (English)"><input value={group.nameEn ?? group.name} onChange={(e) => updateGroup(groupIndex, { nameEn: e.target.value, name: e.target.value })} className={inputCls} maxLength={120} /></Field>
                    <Field label="Selection type"><select value={group.type} onChange={(e) => updateGroup(groupIndex, { type: e.target.value as "single" | "multi" })} className={inputCls}><option value="single">Choose one</option><option value="multi">Choose several</option></select></Field>
                    <button type="button" onClick={() => update({ mods: (draft.mods ?? []).filter((_, i) => i !== groupIndex) })} className="min-h-[42px] rounded-lg border border-brick/30 px-3 text-xs font-black text-brick">Remove group</button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Field label="Minimum selections"><input type="number" min="0" max={group.options.length} value={group.exact ?? group.min ?? (group.required ? 1 : 0)} onChange={(e) => updateGroup(groupIndex, { min: Number(e.target.value), exact: undefined, required: Number(e.target.value) > 0 })} className={inputCls} /></Field>
                    <Field label="Maximum selections"><input type="number" min="1" max="100" value={group.exact ?? group.max ?? (group.type === "single" ? 1 : group.options.length || 1)} onChange={(e) => updateGroup(groupIndex, { max: Number(e.target.value), exact: undefined })} className={inputCls} /></Field>
                    <label className="flex min-h-[42px] items-center gap-2 text-xs font-bold"><input type="checkbox" checked={!!group.required} onChange={(e) => updateGroup(groupIndex, { required: e.target.checked, min: e.target.checked ? Math.max(1, group.min ?? 0) : 0 })} /> Required</label>
                  </div>
                  {group.id === "topping" ? (
                    <div className="space-y-2">
                      <p className="text-xs font-black text-cherry/70">Choose which active shop toppings appear for this item (modifier price €0.00).</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {settings.toppings.map((label) => {
                          const selectedOption = group.options.find((option) => option.label === label);
                          const selected = !!selectedOption;
                          return (
                            <div key={label} className="grid grid-cols-[minmax(0,1fr)_110px] items-center gap-2 rounded-lg bg-cream p-2">
                              <label className="flex min-h-[40px] items-center gap-2 text-sm"><input type="checkbox" checked={selected} onChange={(e) => {
                                const options = e.target.checked ? [...group.options, { label, price: 0 }] : group.options.filter((option) => option.label !== label);
                                updateGroup(groupIndex, { options, max: Math.max(1, options.length), min: Math.min(group.min ?? 0, options.length) });
                              }} />{label}</label>
                              <Field label="Extra (€)"><input type="number" min="0" step="0.01" disabled={!selected} value={selectedOption?.price ?? 0} onChange={(e) => updateGroup(groupIndex, { options: group.options.map((option) => option.label === label ? { ...option, price: Number(e.target.value) } : option) })} className={inputCls + " disabled:opacity-40"} /></Field>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {group.options.map((option, optionIndex) => (
                        <div key={`${optionIndex}-${option.label}`} className="grid gap-2 rounded-lg border border-cherry/10 p-2 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_110px_auto]">
                          <Field label={`Raw label ${optionIndex + 1} (API/cart)`}><input value={option.label} onChange={(e) => updateGroup(groupIndex, { options: group.options.map((value, i) => i === optionIndex ? { ...value, label: e.target.value } : value) })} className={inputCls} maxLength={100} /></Field>
                          <Field label="Customer label (Finnish)"><input value={option.labelFi ?? option.label} onChange={(e) => updateGroup(groupIndex, { options: group.options.map((value, i) => i === optionIndex ? { ...value, labelFi: e.target.value } : value) })} className={inputCls} maxLength={100} /></Field>
                          <Field label="Customer label (English)"><input value={option.labelEn ?? option.label} onChange={(e) => updateGroup(groupIndex, { options: group.options.map((value, i) => i === optionIndex ? { ...value, labelEn: e.target.value } : value) })} className={inputCls} maxLength={100} /></Field>
                          <Field label="Extra (€)"><input type="number" min="0" step="0.01" value={option.price} onChange={(e) => updateGroup(groupIndex, { options: group.options.map((value, i) => i === optionIndex ? { ...value, price: Number(e.target.value) } : value) })} className={inputCls} /></Field>
                          <button type="button" onClick={() => updateGroup(groupIndex, { options: group.options.filter((_, i) => i !== optionIndex), max: Math.max(1, (group.max ?? group.options.length) - 1), min: Math.min(group.min ?? 0, group.options.length - 1) })} className="min-h-[42px] self-end rounded-lg border border-brick/30 px-3 text-xs font-black text-brick">Remove</button>
                        </div>
                      ))}
                      <GhostBtn onClick={() => updateGroup(groupIndex, { options: [...group.options, { label: "", labelFi: "", labelEn: "", price: 0 }], max: Math.max(group.max ?? 1, group.options.length + 1) })}><Ic n="plus" size={13} /> Add option</GhostBtn>
                    </div>
                  )}
                </section>
              );
            })}
            {!(draft.mods ?? []).some((group) => group.id !== "top") && <p className="rounded-xl border border-dashed border-cherry/20 p-4 text-sm text-cherry/60">No configurable options yet. Add a size group or a shop-topping group above.</p>}
          </div>
        )}
        {tab === "availability" && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cherry/10 bg-cream p-3">
              <span><span className="block font-black text-cherry">Customer menu availability</span><span className="text-xs text-cherry/60">Sold-out status is saved to settings and can be restored any time.</span></span>
              <span className={cx("rounded-full px-3 py-1 text-xs font-black", isOff ? "bg-brick/10 text-brick" : "bg-[#e6f4e7] text-[#2e7d32]")}>{isOff ? "Sold out" : "Available"}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {isOff ? <PrimaryBtn onClick={() => setOffMode("on")}>Make available</PrimaryBtn> : <>
                <button type="button" onClick={() => setConfirmOff(true)} className="min-h-[40px] rounded-lg border border-brick/40 px-3 text-xs font-black text-brick">Sold out until restored</button>
                <button type="button" onClick={() => setOffMode("today")} className="min-h-[40px] rounded-lg border border-brick/30 px-3 text-xs font-black text-brick/80">Sold out today only</button>
              </>}
            </div>
            <Confirm open={confirmOff} title="Mark sold out?" body={`“${item.name}” will stop accepting orders until you turn it back on.`} danger onNo={() => setConfirmOff(false)} onYes={() => { setOffMode("until"); setConfirmOff(false); }} />
            <p className="text-xs text-cherry/60">To hide an item permanently without deleting order history, use Archive item in the item list. Archived items can be restored.</p>
          </div>
        )}
        {error && <p role="alert" className="rounded-xl bg-brick/10 p-3 text-xs font-bold text-brick">{error}</p>}
        <div className="sticky bottom-[-1.25rem] -mx-5 mt-6 flex flex-wrap justify-end gap-2 border-t border-cherry/10 bg-cream/95 px-5 py-4 backdrop-blur">
          <button type="button" onClick={onClose} className="min-h-[42px] rounded-lg border border-cherry/20 px-4 text-xs font-black text-cherry">Cancel</button>
          <PrimaryBtn icon="save" disabled={saving} onClick={() => { void save(); }}>{saving ? "Saving…" : "Save item changes"}</PrimaryBtn>
        </div>
      </div>
    </Drawer>
  );
}

/* ══ TOPPINGS MASTER ══ */
export function ToppingsMasterView() {
  const { settings, saveSettings, toast } = useShop();
  const [draft, setDraft] = useState(settings.toppings);
  useEffect(() => setDraft(settings.toppings), [settings.toppings]);

  const save = async () => {
    if (await saveSettings({ ...settings, toppings: draft })) toast("Topping list saved");
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
