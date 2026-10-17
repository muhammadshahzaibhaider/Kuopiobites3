"use client";
import { useEffect, useMemo, useState } from "react";
import { MenuImage } from "@/components/ui";
import ImageUploader from "@/components/ImageUploader";
import { CATEGORY_SLUG } from "@/lib/images";
import { cx, eur } from "@/lib/format";
import { todayStrHelsinki } from "@/lib/hours";
import { MENU } from "@/lib/menu";
import { useShop } from "@/lib/store";
import type { MenuItem, UploadedImg } from "@/lib/types";
import { SpecialsPanel, ToppingsMetaPanel } from "@/app/admin/v3tabs";
import CategoriesManager from "./categories";
import { Ic } from "./icons";
import { Confirm, DataTable, Drawer, EmptyState, Field, GhostBtn, Panel, PanelHead, Pill, PrimaryBtn, SolidBtn, SubTabs, Toolbar, downloadCSV, inputCls, useDelayedReady, type Col, type FilterDef } from "./ui";

const TODAY = () => todayStrHelsinki();

export function MenuCategoriesView() {
  return <CategoriesManager />;
}

/* ══ ITEMS ══ */
export function MenuItemsView() {
  const { settings, saveSettings, effectiveMenu, overrides, removeAdded, categories, toast, logAudit } = useShop();
  const [fCat, setFCat] = useState("all");
  const [fAvail, setFAvail] = useState("all");
  const [editId, setEditId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const ready = useDelayedReady("items");
  const categoryOptions = categories();

  const rows = useMemo(() => effectiveMenu(MENU, "en"), [effectiveMenu, settings]);
  const edit = rows.find((r) => r.id === editId) ?? null;
  const isAdded = (id: string) => Object.values(overrides.added ?? {}).some((list) => list.some((item) => item.id === id));

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

  const catOptions = useMemo(
    () => categoryOptions.filter((c) => rows.some((r) => r.cat === c.id)),
    [categoryOptions, rows]
  );

  const filters: FilterDef[] = [
    { id: "cat", label: "Category", value: fCat, set: setFCat, options: [{ value: "all", label: "All categories" }, ...catOptions.map((c) => ({ value: c.id, label: c.en || c.title }))] },
    { id: "avail", label: "Availability", value: fAvail, set: setFAvail, options: [{ value: "all", label: "All" }, { value: "on", label: "Available" }, { value: "off", label: "Sold out" }] },
  ];

  const soldOutCount = rows.filter((r) => isOff(r.id)).length;

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
          <MenuImage item={r} srcOverride={settings.itemImages[r.id]?.src} className="h-12 w-12 shrink-0 rounded-xl" />
          <span className="min-w-0">
            <span className="block font-black text-cherry">{r.name}</span>
            <span className="block max-w-[320px] truncate text-[11px] font-semibold text-cherry/50">{r.desc}</span>
          </span>
        </span>
      ),
    },
    { key: "cat", label: "Category", sort: (r) => r.cat, render: (r) => <Pill tone="teal">{categoryOptions.find((c) => c.id === r.cat)?.en || r.cat}</Pill> },
    {
      key: "portion", label: "Portions", hideMd: true,
      render: (r) => (
        <span className="flex flex-wrap gap-1">
          {r.prices.map((p, i) => (
            <span key={i} className="rounded-md border border-cherry/10 bg-white/70 px-1.5 py-0.5 text-[10px] font-black text-cherry/60">
              {p.label || "—"} · {eur(p.value)}
            </span>
          ))}
        </span>
      ),
    },
    {
      key: "price", label: "Price", sort: (r) => r.prices[0]?.value ?? 0,
      render: (r) => <span className="font-black tabular-nums text-cherry">{eur(Math.min(...r.prices.map((p) => p.value)))}</span>,
    },
    {
      key: "avail", label: "Available", sort: (r) => (isOff(r.id) ? 1 : 0),
      render: (r) => {
        const off = isOff(r.id);
        return (
          <button
            onClick={(e) => { e.stopPropagation(); setOff([r.id], !off); }}
            className={cx("inline-flex min-h-[28px] items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-black transition", off ? "border-brick/40 bg-brick/10 text-brick" : "border-[#2e7d32]/30 bg-[#e6f4e7] text-[#2e7d32]")}
          >
            <span className={cx("h-1.5 w-1.5 rounded-full", off ? "bg-brick" : "bg-[#2e7d32]")} />
            {off ? "Sold out" : "Available"}
          </button>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Menu items", value: rows.length, icon: "list", tone: "text-cherry" },
          { label: "Categories", value: categoryOptions.length, icon: "group", tone: "text-cherry" },
          { label: "Sold out now", value: soldOutCount, icon: "warn", tone: soldOutCount ? "text-brick" : "text-cherry/45" },
          { label: "With description", value: `${rows.filter((r) => r.desc?.trim()).length}/${rows.length}`, icon: "receipt", tone: "text-[#2e7d32]" },
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

      {/* quick category chips */}
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-0.5">
        <button
          onClick={() => setFCat("all")}
          className={cx("shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-black transition", fCat === "all" ? "border-cherry bg-cherry text-cream" : "border-cherry/15 bg-white/60 text-cherry/60 hover:border-cherry/35 hover:text-cherry")}
        >
          All · {rows.length}
        </button>
        {catOptions.map((c) => {
          const count = rows.filter((r) => r.cat === c.id).length;
          return (
            <button
              key={c.id}
              onClick={() => setFCat(c.id)}
              className={cx("shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-black transition", fCat === c.id ? "border-gold bg-gold text-cherry-dark" : "border-cherry/15 bg-white/60 text-cherry/60 hover:border-cherry/35 hover:text-cherry")}
            >
              {c.en || c.title} · {count}
            </button>
          );
        })}
      </div>

      <Panel>
        <Toolbar
          filters={filters}
          action={<PrimaryBtn onClick={() => setAddOpen(true)}>Add item</PrimaryBtn>}
        >
          <GhostBtn onClick={() => downloadCSV("menu.csv", [["category", "name", "description", "prices"], ...filtered.map((r) => [r.cat, r.name, r.desc ?? "", r.prices.map((p) => `${p.label}:${p.value}`).join("|")])])}><Ic n="csv" size={13} /> Export CSV</GhostBtn>
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
          onRow={(r) => setEditId(r.id)}
          rowMenu={(r) => [
            { label: "Edit item", icon: "edit", onClick: () => setEditId(r.id) },
            { label: isOff(r.id) ? "Make available" : "Mark sold out", icon: "toggle", danger: !isOff(r.id), onClick: () => setOff([r.id], !isOff(r.id)) },
            ...(isAdded(r.id) ? [{ label: "Delete item", icon: "trash", danger: true, onClick: async () => { if (!window.confirm(`Delete ${r.name}?`)) return; await removeAdded(r.id); toast("Item deleted", "err"); } }] : []),
          ]}
          pageSizeDefault={25}
          empty={<EmptyState icon="menu" title="No items in this view" sub="Try another category or add a new item." />}
        />
      </Panel>
      {edit && <ItemEditor item={edit} onClose={() => setEditId(null)} />}
      {addOpen && <NewItemEditor categories={categoryOptions} defaultCategory={fCat !== "all" ? fCat : undefined} onClose={() => setAddOpen(false)} />}
    </div>
  );
}

function NewItemEditor({
  categories,
  defaultCategory,
  onClose,
}: {
  categories: { id: string; title: string; en?: string }[];
  defaultCategory?: string;
  onClose: () => void;
}) {
  const { addItem, toast } = useShop();
  const [cat, setCat] = useState(defaultCategory ?? categories[0]?.id ?? "specials");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
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
    ? { src: imageUrl.trim(), altEn: name.trim(), altFi: name.trim() }
    : image;

  return (
    <Drawer open onClose={onClose} title="Add menu item">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const amount = Number(price);
          const trimmedUrl = imageUrl.trim();
          if (!cat) { setError("Choose a valid category."); return; }
          if (!name.trim()) { setError("Name is required."); return; }
          if (!desc.trim()) { setError("Every item needs a description — it is shown on the menu and in the item sheet."); return; }
          if (!price.trim() || !Number.isFinite(amount) || amount < 0) { setError("Enter a valid price."); return; }
          if (trimmedUrl && !urlIsValid(trimmedUrl)) { setImageError("Enter a valid http(s) image URL."); return; }
          const imageRef = trimmedUrl ? { src: trimmedUrl, altEn: name.trim(), altFi: name.trim() } : image;
          const saved = await addItem(cat, name.trim(), amount, desc.trim(), imageRef);
          if ((saved as unknown) === false) { setError("The item could not be saved. Please try again."); return; }
          toast("Item added");
          onClose();
        }}
      >
        <Field label="Category">
          <select value={cat} onChange={(e) => { setCat(e.target.value); setError(""); }} className={inputCls}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.title}{c.en ? ` · ${c.en}` : ""}</option>)}
          </select>
        </Field>
        <Field label="Name">
          <input autoFocus value={name} onChange={(e) => { setName(e.target.value); setError(""); }} className={inputCls} placeholder="e.g. Chicken biryani" />
        </Field>
        <Field label="Description *">
          <textarea rows={3} value={desc} onChange={(e) => { setDesc(e.target.value); setError(""); }} className={inputCls} placeholder="What is in the dish? Shown on the menu, item sheet and cart." maxLength={500} required />
        </Field>
        <Field label="Price (€)">
          <input type="number" min="0" step="0.1" value={price} onChange={(e) => { setPrice(e.target.value); setError(""); }} className={inputCls} placeholder="0.00" />
        </Field>
        <div className="space-y-2 rounded-xl border border-cherry/10 bg-white/60 p-3">
          <p className="text-xs font-black uppercase tracking-wide text-cherry/60">Image (optional)</p>
          <ImageUploader
            preset="1:1"
            value={previewImage}
            fallbackAlt={name}
            onChange={(next) => { if (!next && imageUrl.trim()) setImageUrl(""); setImage(next ?? undefined); if (next) setImageUrl(""); setImageError(""); }}
          />
          <label className="block text-xs font-bold text-cherry/70">
            Or image URL
            <input value={imageUrl} onChange={(e) => setUrl(e.target.value)} className={inputCls + " mt-1"} placeholder="https://…" inputMode="url" />
          </label>
          {imageError && <p className="text-xs font-bold text-brick">{imageError}</p>}
        </div>
        {error && <p className="rounded-lg border border-brick/25 bg-brick/5 px-3 py-2 text-xs font-bold text-brick">{error}</p>}
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

  const offRec = settings.offItems[item.id];
  const isOff = !!offRec && (offRec.off === true || offRec.offToday === TODAY());
  const textEn = overrides.texts?.en?.[item.id];
  const textFi = overrides.texts?.fi?.[item.id];
  const variantDescsEn = textEn?.descByVariant ?? item.descByVariant ?? [];
  const variantDescsFi = textFi?.descFiByVariant ?? item.descFiByVariant ?? [];

  const saveImage = async (next: UploadedImg | null) => {
    try {
      const itemImages = { ...settings.itemImages };
      if (next) itemImages[item.id] = next;
      else delete itemImages[item.id];
      const saved = await saveSettings({ ...settings, itemImages });
      if ((saved as unknown) === false) throw new Error("save failed");
      toast(next ? "Image applied — site shows it immediately" : "Image removed");
    } catch {
      toast("Upload failed — check the file", "err");
    }
  };

  return (
    <Drawer open onClose={onClose} title={item.name} wide>
      <SubTabs
        tabs={[
          { id: "general", label: "General" },
          { id: "portions", label: item.prices.length > 1 ? `Portions (${item.prices.length})` : "Portion" },
          { id: "pricing", label: "Pricing" },
          { id: "toppings", label: "Toppings" },
          { id: "availability", label: "Availability" },
        ]}
        active={tab}
        onChange={setTab}
      />
      <div className="mt-4 space-y-4">
        {tab === "general" && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name (Finnish)"><input value={textFi?.name ?? item.name} onChange={(e) => setItemText("fi", item.id, { name: e.target.value })} className={inputCls} /></Field>
              <Field label="Name (English)"><input value={textEn?.name ?? item.nameFi ?? item.name} onChange={(e) => setItemText("en", item.id, { name: e.target.value })} className={inputCls} /></Field>
              <Field label="Description (Finnish)"><textarea rows={3} value={textFi?.desc ?? item.descFi ?? item.desc ?? ""} onChange={(e) => setItemText("fi", item.id, { desc: e.target.value })} className={inputCls} /></Field>
              <Field label="Description (English)"><textarea rows={3} value={textEn?.desc ?? item.desc ?? ""} onChange={(e) => setItemText("en", item.id, { desc: e.target.value })} className={inputCls} /></Field>
            </div>
            <p className="rounded-xl border border-gold/40 bg-gold/5 px-3 py-2 text-[11px] font-semibold text-gold-deep">
              Every item keeps a description. For dishes with portions, use the Portions tab to give each portion its own description — the public item sheet swaps it live when the customer picks a size.
            </p>
            <div className="flex items-center gap-3 rounded-xl border border-cherry/10 bg-white/60 p-3">
              <MenuImage item={item} srcOverride={settings.itemImages[item.id]?.src} className="h-20 w-20 rounded-xl" />
              <div className="flex-1">
                <p className="text-xs font-black text-cherry/60">Product image</p>
                <p className="mb-2 text-[11px] text-cherry/40">
                  {settings.itemImages[item.id] ? "Custom uploaded image in use" : `/menu/${CATEGORY_SLUG[item.cat] ?? item.cat}/${item.imageKey ?? item.id}.webp (generated)`}
                </p>
                <ImageUploader
                  preset="1:1"
                  value={settings.itemImages[item.id]}
                  fallbackAlt={item.name}
                  onChange={(next) => { void saveImage(next); }}
                />
                {settings.itemImages[item.id] && <p className="text-[11px] text-cherry/40">Delete / replace above to return to the generated placeholder.</p>}
              </div>
            </div>
          </>
        )}

        {tab === "portions" && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-cherry/55">Each portion has its own price. Descriptions are optional per portion and can be edited below.</p>
            {item.prices.map((p, pi) => (
              <div key={`${p.label}-${pi}`} className="rounded-2xl border border-cherry/10 bg-white/60 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-display text-base font-black text-cherry">{p.label || "Standard"}</p>
                  <span className="rounded-full bg-cherry/5 px-2.5 py-0.5 text-xs font-black tabular-nums text-cherry">{eur(p.value)}</span>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <Field label="Description (English)">
                    <textarea
                      rows={2}
                      value={variantDescsEn[pi] ?? ""}
                      placeholder={item.desc ?? ""}
                      onChange={(e) => {
                        const next = item.prices.map((_, i) => (i === pi ? e.target.value : variantDescsEn[i] ?? ""));
                        setItemText("en", item.id, { descByVariant: next });
                      }}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Description (Finnish)">
                    <textarea
                      rows={2}
                      value={variantDescsFi[pi] ?? ""}
                      placeholder={item.descFi ?? item.desc ?? ""}
                      onChange={(e) => {
                        const next = item.prices.map((_, i) => (i === pi ? e.target.value : variantDescsFi[i] ?? ""));
                        setItemText("fi", item.id, { descFiByVariant: next });
                      }}
                      className={inputCls}
                    />
                  </Field>
                </div>
              </div>
            ))}
            <p className="text-[11px] font-semibold text-cherry/40">The customer sees this text update the moment they switch between portions in the item sheet.</p>
          </div>
        )}

        {tab === "pricing" && (
          <div className="space-y-2">
            {item.prices.map((p, pi) => (
              <label key={pi} className="flex items-center gap-3 text-sm font-bold text-cherry">
                <span className="w-28">{p.label || "Standard"}</span>
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
                <span key={tp} className="rounded-full border border-cherry/20 bg-white/70 px-2.5 py-0.5 text-[11px] font-black text-cherry/70">
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
            <div className="flex items-center justify-between rounded-xl border border-cherry/10 bg-white/60 p-3">
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
    <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
      <Panel>
        <PanelHead icon="pizza" title="Build-your-own topping list" sub={`${draft.length} toppings · used by Fantasia & Pannu`} action={<Pill tone="gold">{draft.length} active</Pill>} />
        <div className="p-4">
          <textarea
            rows={12}
            value={draft.join("\n")}
            onChange={(e) => setDraft(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
            className={inputCls + " font-mono text-xs leading-6"}
          />
          <p className="mt-1 text-[11px] font-semibold text-cherry/40">One topping per line. Removing a topping also removes it from every pizza builder.</p>
          <div className="mt-3 flex justify-end"><PrimaryBtn icon="save" onClick={() => { void save(); }}>Save list</PrimaryBtn></div>
        </div>
      </Panel>
      <Panel>
        <PanelHead icon="tag" title="Names, prices & availability" sub="English / Finnish names and extra-price tiers" />
        <div className="p-4"><ToppingsMetaPanel /></div>
      </Panel>
    </div>
  );
}

/* ══ TODAY'S SPECIAL ══ */
export function SpecialsView() {
  return (
    <div className="space-y-4">
      <Panel className="border-gold/40 bg-gold/5" padded>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold/20 text-gold-deep"><Ic n="star" size={19} /></span>
            <div>
              <p className="text-sm font-black text-cherry">Carousel of 1–6 dishes</p>
              <p className="text-xs font-semibold text-cherry/55">Appears at the top of the public menu and in the “Päivän erikois” strip on Home.</p>
            </div>
          </div>
          <Pill tone="gold">Live preview</Pill>
        </div>
      </Panel>
      <Panel padded>
        <SpecialsPanel />
      </Panel>
    </div>
  );
}
