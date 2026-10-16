"use client";
import { useMemo, useState } from "react";
import ImageUploader from "@/components/ImageUploader";
import { eur } from "@/lib/format";
import { newId } from "@/lib/api";
import { useLang } from "@/lib/i18n";
import { useShop } from "@/lib/store";
import type { Category, MenuItem, ModGroup, PriceVariant, Tag, UploadedImg } from "@/lib/types";
import { Confirm, Drawer, Field, PrimaryBtn, inputCls } from "./ui";

const words = (lang: "en" | "fi", en: string, fi: string) => lang === "fi" ? fi : en;
const slug = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const emptyVariant = (): PriceVariant => ({ label: "", labelEn: "Default", labelFi: "Oletus", value: 0 });
const emptyGroup = (): ModGroup => ({
  id: newId("group").toLowerCase(), name: "Options", nameFi: "Valinnat", type: "single", required: false,
  options: [{ label: "option-1", labelEn: "Option 1", labelFi: "Vaihtoehto 1", price: 0 }],
});

function newItem(categoryId: string): MenuItem {
  return {
    id: newId("custom").toLowerCase(), cat: categoryId, name: "", nameFi: "", desc: "", descFi: "",
    prices: [emptyVariant()], tags: [], mods: [], weightKg: 0, featured: false, special: false,
    showToppings: false, toppingIds: [], includedToppingIds: [], available: true, archived: false,
  };
}

export default function ProductEditor({
  item, categories, defaultCategory, onSave, onClose,
}: {
  item: MenuItem | null;
  categories: Category[];
  defaultCategory?: string;
  onSave: (item: MenuItem) => Promise<boolean>;
  onClose: () => void;
}) {
  const { lang } = useLang();
  const { settings } = useShop();
  const activeCategories = categories.filter((category) => !category.archived);
  const [draft, setDraft] = useState<MenuItem>(() => item
    ? JSON.parse(JSON.stringify(item)) as MenuItem
    : newItem(defaultCategory ?? activeCategories[0]?.id ?? "specials"));
  const [image, setImage] = useState<UploadedImg | undefined>(() => item?.imageUrl
    ? { src: item.imageUrl, altEn: item.imageAltEn ?? item.name, altFi: item.imageAltFi ?? item.nameFi ?? item.name }
    : undefined);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [archiveConfirm, setArchiveConfirm] = useState(false);
  const isNew = !item;
  const l = (en: string, fi: string) => words(lang, en, fi);
  const selectedToppings = useMemo(() => new Set([...(draft.toppingIds ?? []), ...(draft.includedToppingIds ?? [])]), [draft.toppingIds, draft.includedToppingIds]);

  const patch = (update: Partial<MenuItem>) => setDraft((current) => ({ ...current, ...update }));
  const patchVariant = (index: number, update: Partial<PriceVariant>) => patch({ prices: draft.prices.map((variant, i) => i === index ? { ...variant, ...update } : variant) });
  const patchGroup = (id: string, update: Partial<ModGroup>) => patch({ mods: (draft.mods ?? []).map((group) => group.id === id ? { ...group, ...update } : group) });
  const configurableGroups = (draft.mods ?? []).filter((group) => group.id !== "product-toppings");
  const toggleTag = (tag: Tag) => patch({ tags: draft.tags?.includes(tag) ? draft.tags.filter((value) => value !== tag) : [...(draft.tags ?? []), tag] });
  const setToppingSelected = (label: string, selected: boolean) => {
    const id = slug(label);
    const nextIncluded = new Set(draft.includedToppingIds ?? []);
    const nextIds = new Set(draft.toppingIds ?? []);
    if (!selected) { nextIncluded.delete(id); nextIds.delete(id); }
    else if (!nextIncluded.has(id)) nextIds.add(id);
    patch({ includedToppingIds: [...nextIncluded], toppingIds: [...nextIds] });
  };
  const setToppingIncluded = (label: string, included: boolean) => {
    const id = slug(label);
    const nextIncluded = new Set(draft.includedToppingIds ?? []);
    const nextIds = new Set(draft.toppingIds ?? []);
    if (included) { nextIncluded.add(id); nextIds.delete(id); }
    else { nextIncluded.delete(id); if (selectedToppings.has(id)) nextIds.add(id); }
    patch({ includedToppingIds: [...nextIncluded], toppingIds: [...nextIds] });
  };

  const save = async (archive = false, source: MenuItem = draft) => {
    setError("");
    if (!source.cat || !source.name.trim() || !source.nameFi?.trim()) {
      setError(l("Add the product name in both languages.", "Lisää tuotteen nimi molemmilla kielillä."));
      return;
    }
    if (!source.prices.length || source.prices.some((variant) => !Number.isFinite(variant.value) || variant.value < 0)) {
      setError(l("Enter a valid non-negative price for every variant.", "Anna jokaiselle vaihtoehdolle kelvollinen vähintään nollan hinta."));
      return;
    }
    if (source.prices.some((variant) => !variant.labelEn?.trim() || !variant.labelFi?.trim())) {
      setError(l("Every variant needs an English and Finnish label.", "Jokainen vaihtoehto tarvitsee englannin- ja suomenkielisen nimen."));
      return;
    }
    const variantKeys = source.prices.map((variant) => variant.label.trim());
    if (source.prices.length > 1 && (variantKeys.some((key) => !key) || new Set(variantKeys).size !== variantKeys.length)) {
      setError(l("For multiple variants, add a unique internal key to every option.", "Usealle vaihtoehdolle on annettava yksilöllinen sisäinen tunniste."));
      return;
    }
    const toppingIds = Array.from(new Set([...(source.toppingIds ?? []), ...(source.includedToppingIds ?? [])]));
    const includedToppings = new Set(source.includedToppingIds ?? []);
    const toppingGroup: ModGroup | undefined = source.showToppings && toppingIds.length ? {
      id: "product-toppings", name: "Additional toppings", nameFi: "Lisätäytteet", type: "multi", max: 30,
      options: toppingIds.map((id) => {
        const entry = Object.entries(settings.toppingMeta).find(([label]) => slug(label) === id);
        const toppingLabel = entry?.[0] ?? id;
        const meta = entry?.[1] ?? {};
        const isIncluded = includedToppings.has(id);
        const priceByVariant = source.prices.map((_, index) => isIncluded ? 0 : index === 1 ? (meta.pricePerhe ?? meta.priceMed ?? 1) : (meta.priceMed ?? 1));
        return { label: id, toppingId: id, labelEn: meta.en ?? toppingLabel, labelFi: meta.fi ?? toppingLabel, price: priceByVariant[0] ?? 0, priceByVariant };
      }),
    } : undefined;
    const savedGroups = [...(source.mods ?? []).filter((group) => group.id !== "product-toppings"), ...(toppingGroup ? [toppingGroup] : [])];
    const submitted: MenuItem = {
      ...source,
      name: source.name.trim(), nameFi: source.nameFi?.trim(),
      desc: source.desc?.trim() || undefined, descFi: source.descFi?.trim() || undefined,
      imageUrl: image?.src, imageAltEn: image?.altEn, imageAltFi: image?.altFi,
      archived: archive ? true : (source.archived ?? false),
      available: archive ? false : (source.available ?? true),
      prices: source.prices.map((variant) => ({ ...variant, value: Math.round(variant.value * 100) / 100 })),
      mods: savedGroups.map((group) => ({
        ...group,
        name: group.name.trim() || "Options", nameFi: group.nameFi?.trim() || "Valinnat",
        options: group.options.map((option) => ({
          ...option,
          price: Math.round(option.price * 100) / 100,
          priceByVariant: option.priceByVariant?.map((value) => Math.round(value * 100) / 100),
        })),
      })),
    };
    setBusy(true);
    try {
      const saved = await onSave(submitted);
      if (!saved) { setError(l("The product could not be saved. Check the fields and try again.", "Tuotetta ei voitu tallentaa. Tarkista kentät ja yritä uudelleen.")); return; }
      onClose();
    } catch (saveError) {
      setError((saveError as Error).message || l("The product could not be saved.", "Tuotetta ei voitu tallentaa."));
    } finally { setBusy(false); }
  };

  const tabs = [
    { id: "general", label: l("Details", "Tiedot") },
    { id: "variants", label: l("Variants", "Vaihtoehdot") },
    { id: "options", label: l("Option groups", "Lisävalinnat") },
    { id: "availability", label: l("Availability", "Saatavuus") },
    { id: "image", label: l("Image", "Kuva") },
  ] as const;
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("general");

  return (
    <Drawer open onClose={onClose} title={isNew ? l("Add product", "Lisää tuote") : `${l("Edit", "Muokkaa")} · ${item?.name}`} wide>
      <div className="min-w-0 space-y-4">
        <div className="no-scrollbar flex gap-1 overflow-x-auto border-b border-cherry/15 pb-1">
          {tabs.map((entry) => <button key={entry.id} type="button" onClick={() => setTab(entry.id)} className={`min-h-10 shrink-0 rounded-full px-3 text-xs font-black ${tab === entry.id ? "bg-[#0F3D3E] text-cream" : "text-cherry/60 hover:bg-cream-deep"}`}>{entry.label}</button>)}
        </div>

        {tab === "general" && (
          <div className="min-w-0 space-y-4">
            <Field label={l("Category", "Kategoria")}>
              <select value={draft.cat} onChange={(event) => patch({ cat: event.target.value })} className={inputCls}>
                {activeCategories.map((category) => <option key={category.id} value={category.id}>{category.title} · {category.en ?? category.id}</option>)}
              </select>
            </Field>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <Field label={l("Product name · English", "Tuotteen nimi · englanti")}><input value={draft.name} maxLength={120} onChange={(event) => patch({ name: event.target.value })} className={inputCls} /></Field>
              <Field label={l("Product name · Finnish", "Tuotteen nimi · suomi")}><input value={draft.nameFi ?? ""} maxLength={120} onChange={(event) => patch({ nameFi: event.target.value })} className={inputCls} /></Field>
              <Field label={l("Description · English", "Kuvaus · englanti")}><textarea rows={3} value={draft.desc ?? ""} maxLength={500} onChange={(event) => patch({ desc: event.target.value })} className={inputCls} /></Field>
              <Field label={l("Description · Finnish", "Kuvaus · suomi")}><textarea rows={3} value={draft.descFi ?? ""} maxLength={500} onChange={(event) => patch({ descFi: event.target.value })} className={inputCls} /></Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={l("Weight per item (kg)", "Yhden tuotteen paino (kg)")}><input type="number" step="0.001" min="0" max="100" value={draft.weightKg ?? 0} onChange={(event) => patch({ weightKg: Math.max(0, Number(event.target.value) || 0) })} className={inputCls} /></Field>
              <label className="flex min-h-11 items-center gap-2 rounded-xl border border-cherry/10 bg-cream px-3 text-sm font-bold text-cherry"><input type="checkbox" checked={draft.available !== false} onChange={(event) => patch({ available: event.target.checked, archived: false })} className="h-4 w-4 accent-[#0F3D3E]" />{l("Available for ordering", "Tilattavissa")}</label>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2 rounded-xl border border-cherry/10 bg-cream p-3">
              {(["featured", "special", "showToppings"] as const).map((key) => (
                <label key={key} className="flex items-center gap-2 text-xs font-bold text-cherry">
                  <input type="checkbox" checked={Boolean(draft[key])} onChange={(event) => patch({ [key]: event.target.checked } as Partial<MenuItem>)} className="h-4 w-4 accent-[#0F3D3E]" />
                  {key === "featured" ? l("Featured", "Nostettu") : key === "special" ? l("Special", "Erikoistuote") : l("Offer topping choices", "Näytä täytevalinnat")}
                </label>
              ))}
            </div>
            <Field label={l("Tags", "Tunnisteet")}>
              <div className="flex flex-wrap gap-2">{(["veg", "spicy", "popular"] as Tag[]).map((tag) => (
                <button key={tag} type="button" aria-pressed={draft.tags?.includes(tag)} onClick={() => toggleTag(tag)} className={`min-h-9 rounded-full border px-3 text-xs font-black ${draft.tags?.includes(tag) ? "border-[#0F3D3E] bg-[#0F3D3E] text-cream" : "border-cherry/20 text-cherry"}`}>
                  {tag === "veg" ? l("Vegetarian", "Kasvis") : tag === "spicy" ? l("Spicy", "Tulinen") : l("Popular", "Suosittu")}
                </button>
              ))}</div>
            </Field>
          </div>
        )}

        {tab === "variants" && (
          <div className="space-y-3">
            <p className="text-xs text-cherry/70">{l("Each variant is priced on the server. The stable key is stored on orders; labels are shown in the selected language.", "Palvelin määrittää jokaisen vaihtoehdon hinnan. Tunniste tallennetaan tilaukseen ja nimi näytetään valitulla kielellä.")}</p>
            {draft.prices.map((variant, index) => (
              <section key={`${variant.label}-${index}`} className="min-w-0 space-y-3 rounded-xl border border-cherry/15 bg-cream-deep p-3">
                <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <Field label={l("Internal key", "Sisäinen tunniste")}><input value={variant.label} maxLength={60} onChange={(event) => patchVariant(index, { label: event.target.value })} placeholder={l("blank for a single-size item", "tyhjä yksikokoiselle tuotteelle")} className={inputCls} /></Field>
                  <Field label={l("Price (€)", "Hinta (€)")}><input type="number" min="0" step="0.01" value={variant.value} onChange={(event) => patchVariant(index, { value: Math.max(0, Number(event.target.value) || 0) })} className={inputCls} /></Field>
                  <Field label={l("Label · English", "Nimi · englanti")}><input value={variant.labelEn ?? ""} maxLength={80} onChange={(event) => patchVariant(index, { labelEn: event.target.value })} className={inputCls} /></Field>
                  <Field label={l("Label · Finnish", "Nimi · suomi")}><input value={variant.labelFi ?? ""} maxLength={80} onChange={(event) => patchVariant(index, { labelFi: event.target.value })} className={inputCls} /></Field>
                  <Field label={l("Weight override (kg, optional)", "Painon poikkeus (kg, valinnainen)")}><input type="number" min="0" step="0.001" value={variant.weightKg ?? ""} onChange={(event) => patchVariant(index, { weightKg: event.target.value === "" ? undefined : Math.max(0, Number(event.target.value) || 0) })} className={inputCls} /></Field>
                  <Field label={l("Variant image URL (optional)", "Vaihtoehdon kuvan URL (valinnainen)")}><input value={variant.imageUrl ?? ""} onChange={(event) => patchVariant(index, { imageUrl: event.target.value || undefined })} className={inputCls} /></Field>
                </div>
                <button type="button" disabled={draft.prices.length < 2} onClick={() => patch({ prices: draft.prices.filter((_, i) => i !== index) })} className="min-h-8 text-xs font-black text-brick underline disabled:opacity-40">{l("Remove variant", "Poista vaihtoehto")}</button>
              </section>
            ))}
            <button type="button" onClick={() => patch({ prices: [...draft.prices, { ...emptyVariant(), label: newId("variant").toLowerCase(), labelEn: "New variant", labelFi: "Uusi vaihtoehto" }] })} className="min-h-10 rounded-lg border border-[#0F3D3E]/30 px-3 text-xs font-black text-[#0F3D3E]">+ {l("Add variant", "Lisää vaihtoehto")}</button>
            {draft.prices.length > 1 && <p className="text-xs font-bold text-cherry/60">{l("Starting at", "Alkaen")} {eur(Math.min(...draft.prices.map((variant) => variant.value)))}</p>}
          </div>
        )}

        {tab === "options" && (
          <div className="space-y-3">
            <p className="text-xs text-cherry/70">{l("Option groups are validated and priced by the API at checkout.", "Rajapinta tarkistaa lisävalinnat ja niiden hinnat kassalla.")}</p>
            {configurableGroups.map((group) => (
              <section key={group.id} className="min-w-0 space-y-3 rounded-xl border border-cherry/15 bg-cream-deep p-3">
                <div className="grid min-w-0 gap-2 sm:grid-cols-2">
                  <Field label={l("Group name · English", "Ryhmän nimi · englanti")}><input value={group.name} maxLength={120} onChange={(event) => patchGroup(group.id, { name: event.target.value })} className={inputCls} /></Field>
                  <Field label={l("Group name · Finnish", "Ryhmän nimi · suomi")}><input value={group.nameFi ?? ""} maxLength={120} onChange={(event) => patchGroup(group.id, { nameFi: event.target.value })} className={inputCls} /></Field>
                  <Field label={l("Selection", "Valinta")}><select value={group.type} onChange={(event) => patchGroup(group.id, { type: event.target.value as ModGroup["type"] })} className={inputCls}><option value="single">{l("Choose one", "Valitse yksi")}</option><option value="multi">{l("Choose multiple", "Valitse useita")}</option></select></Field>
                  <Field label={l("Minimum selections", "Valintojen vähimmäismäärä")}><input type="number" min="0" max="30" value={group.min ?? (group.required ? 1 : 0)} onChange={(event) => patchGroup(group.id, { min: Number(event.target.value) || 0, required: Number(event.target.value) > 0 })} className={inputCls} /></Field>
                  <Field label={l("Maximum selections", "Valintojen enimmäismäärä")}><input type="number" min="0" max="30" value={group.max ?? (group.type === "single" ? 1 : "")} onChange={(event) => patchGroup(group.id, { max: event.target.value === "" ? undefined : Number(event.target.value) })} className={inputCls} /></Field>
                  <label className="flex items-center gap-2 rounded-xl border border-cherry/10 bg-cream px-3 text-xs font-bold text-cherry"><input type="checkbox" checked={Boolean(group.required)} onChange={(event) => patchGroup(group.id, { required: event.target.checked, min: event.target.checked ? Math.max(1, group.min ?? 0) : 0 })} className="h-4 w-4 accent-[#0F3D3E]" />{l("Required group", "Pakollinen valintaryhmä")}</label>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-black uppercase text-cherry/60">{l("Choices", "Valinnat")}</p>
                  {group.options.map((option, optionIndex) => (
                    <div key={`${option.label}-${optionIndex}`} className="grid min-w-0 gap-2 rounded-lg border border-cherry/10 bg-cream p-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_7rem_2rem]">
                      <input aria-label={l("Option name · English", "Valinnan nimi · englanti")} value={option.labelEn ?? option.label} maxLength={100} onChange={(event) => patchGroup(group.id, { options: group.options.map((value, i) => i === optionIndex ? { ...value, label: event.target.value, labelEn: event.target.value } : value) })} placeholder={l("English label", "Nimi englanniksi")} className={inputCls} />
                      <input aria-label={l("Option name · Finnish", "Valinnan nimi · suomi")} value={option.labelFi ?? option.label} maxLength={100} onChange={(event) => patchGroup(group.id, { options: group.options.map((value, i) => i === optionIndex ? { ...value, labelFi: event.target.value } : value) })} placeholder={l("Finnish label", "Nimi suomeksi")} className={inputCls} />
                      <input aria-label={l("Option price in euros", "Valinnan hinta euroina")} type="number" min="0" step="0.01" value={option.price} onChange={(event) => patchGroup(group.id, { options: group.options.map((value, i) => i === optionIndex ? { ...value, price: Math.max(0, Number(event.target.value) || 0) } : value) })} className={inputCls} />
                      <button type="button" aria-label={l("Remove choice", "Poista valinta")} onClick={() => patchGroup(group.id, { options: group.options.filter((_, i) => i !== optionIndex) })} className="min-h-10 rounded-lg border border-brick/20 text-brick">×</button>
                      {draft.prices.length > 1 && <div className="space-y-2 sm:col-span-4">
                        <label className="flex items-center gap-2 text-[11px] font-bold text-cherry/70"><input type="checkbox" checked={Boolean(option.priceByVariant)} onChange={(event) => patchGroup(group.id, { options: group.options.map((value, i) => i === optionIndex ? { ...value, priceByVariant: event.target.checked ? draft.prices.map(() => value.price) : undefined } : value) })} className="h-4 w-4 accent-[#0F3D3E]" />{l("Set a separate add-on price for each product variant", "Aseta lisävalinnalle eri hinta jokaiselle tuotevaihtoehdolle")}</label>
                        {option.priceByVariant && <div className="grid gap-2 sm:grid-cols-2">{draft.prices.map((variant, variantIndex) => <label key={variant.label || variantIndex} className="text-[10px] font-black text-cherry/60">{variant.labelEn ?? (variantIndex === 0 ? l("Default", "Oletus") : variant.label)} (€)<input type="number" min="0" step="0.01" value={option.priceByVariant?.[variantIndex] ?? option.price} onChange={(event) => patchGroup(group.id, { options: group.options.map((value, i) => i === optionIndex ? { ...value, priceByVariant: draft.prices.map((_, priceIndex) => priceIndex === variantIndex ? Math.max(0, Number(event.target.value) || 0) : value.priceByVariant?.[priceIndex] ?? value.price) } : value) })} className={inputCls} /></label>)}</div>}
                      </div>}
                    </div>
                  ))}
                  <button type="button" onClick={() => patchGroup(group.id, { options: [...group.options, { label: newId("choice").toLowerCase(), labelEn: "New choice", labelFi: "Uusi valinta", price: 0 }] })} className="min-h-9 text-xs font-black text-[#0F3D3E] underline">+ {l("Add choice", "Lisää valinta")}</button>
                </div>
                <button type="button" onClick={() => patch({ mods: (draft.mods ?? []).filter((entry) => entry.id !== group.id) })} className="min-h-8 text-xs font-black text-brick underline">{l("Remove option group", "Poista valintaryhmä")}</button>
              </section>
            ))}
            <button type="button" onClick={() => patch({ mods: [...(draft.mods ?? []), emptyGroup()] })} className="min-h-10 rounded-lg border border-[#0F3D3E]/30 px-3 text-xs font-black text-[#0F3D3E]">+ {l("Add option group", "Lisää valintaryhmä")}</button>

            <section className="space-y-3 rounded-xl border border-cherry/15 bg-cream-deep p-3">
              <label className="flex items-center gap-2 text-sm font-black text-cherry"><input type="checkbox" checked={Boolean(draft.showToppings)} onChange={(event) => patch({ showToppings: event.target.checked })} className="h-4 w-4 accent-[#0F3D3E]" />{l("Enable product-specific topping picker", "Ota käyttöön tuotekohtaiset täytteet")}</label>
              {draft.showToppings && <div className="grid gap-2 sm:grid-cols-2">
                {settings.toppings.map((topping) => {
                  const id = slug(topping);
                  const included = draft.includedToppingIds?.includes(id) ?? false;
                  const selected = selectedToppings.has(id);
                  return <div key={id} className="flex min-w-0 items-center gap-2 rounded-lg border border-cherry/10 bg-cream p-2 text-xs">
                    <input type="checkbox" checked={selected} onChange={(event) => setToppingSelected(topping, event.target.checked)} className="h-4 w-4 accent-[#0F3D3E]" />
                    <span className="min-w-0 flex-1 font-bold text-cherry">{settings.toppingMeta[topping]?.en ?? topping}</span>
                    {selected && <label className="flex shrink-0 items-center gap-1 text-[10px] font-bold"><input type="checkbox" checked={included} onChange={(event) => setToppingIncluded(topping, event.target.checked)} className="h-3.5 w-3.5 accent-[#0F3D3E]" />{l("Included", "Sisältyy")}</label>}
                  </div>;
                })}
              </div>}
            </section>
          </div>
        )}

        {tab === "availability" && (
          <div className="space-y-4">
            <label className="flex items-center gap-2 rounded-xl border border-cherry/10 bg-cream p-3 text-sm font-bold"><input type="checkbox" checked={draft.available !== false} onChange={(event) => patch({ available: event.target.checked })} className="h-4 w-4 accent-[#0F3D3E]" />{l("Available for new orders", "Saatavilla uusiin tilauksiin")}</label>
            <label className="flex items-center gap-2 rounded-xl border border-cherry/10 bg-cream p-3 text-sm font-bold"><input type="checkbox" checked={draft.availability?.mode === "preorder_only"} onChange={(event) => patch({ availability: { ...draft.availability, mode: event.target.checked ? "preorder_only" : "normal" } })} className="h-4 w-4 accent-[#0F3D3E]" />{l("Pre-order only", "Vain ennakkotilauksena")}</label>
            <Field label={l("Available days (leave empty for every day)", "Saatavilla viikonpäivinä (tyhjä = joka päivä)")}>
              <div className="flex flex-wrap gap-2">{[0, 1, 2, 3, 4, 5, 6].map((day) => {
                const selected = draft.availability?.days?.includes(day) ?? false;
                const enDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                const fiDays = ["Su", "Ma", "Ti", "Ke", "To", "Pe", "La"];
                return <button key={day} type="button" aria-pressed={selected} onClick={() => {
                  const days = new Set(draft.availability?.days ?? []);
                  selected ? days.delete(day) : days.add(day);
                  patch({ availability: { ...draft.availability, days: [...days].sort((a, b) => a - b) } });
                }} className={`min-h-9 min-w-10 rounded-lg border px-2 text-xs font-black ${selected ? "border-[#0F3D3E] bg-[#0F3D3E] text-cream" : "border-cherry/20 text-cherry"}`}>{lang === "fi" ? fiDays[day] : enDays[day]}</button>;
              })}</div>
            </Field>
            {draft.archived && <div role="status" className="rounded-xl border border-brick/20 bg-brick/5 p-3 text-sm font-bold text-brick">{l("This product is archived and hidden from the customer menu.", "Tämä tuote on arkistoitu ja piilotettu asiakasvalikosta.")}</div>}
          </div>
        )}

        {tab === "image" && (
          <div className="space-y-3">
            <p className="text-xs text-cherry/70">{l("Uploaded images are stored through the authenticated API and shown immediately.", "Kuvat ladataan todennetun rajapinnan kautta ja näytetään heti.")}</p>
            <ImageUploader preset="1:1" value={image} fallbackAlt={draft.name} onChange={(value) => setImage(value ?? undefined)} />
          </div>
        )}

        {error && <p role="alert" className="rounded-lg bg-brick/10 p-3 text-sm font-bold text-brick">{error}</p>}
        <div className="sticky bottom-0 z-10 -mx-5 mt-5 flex flex-wrap items-center gap-2 border-t border-cherry/10 bg-cream/95 px-5 py-3 backdrop-blur">
          {!isNew && !draft.archived && <button type="button" onClick={() => setArchiveConfirm(true)} className="min-h-10 rounded-lg border border-brick/30 px-3 text-xs font-black text-brick">{l("Archive product", "Arkistoi tuote")}</button>}
          {draft.archived && <button type="button" disabled={busy} onClick={() => { const restored = { ...draft, archived: false, available: true }; patch({ archived: false, available: true }); void save(false, restored); }} className="min-h-10 rounded-lg border border-[#0F3D3E]/30 px-3 text-xs font-black text-[#0F3D3E]">{l("Restore", "Palauta")}</button>}
          <button type="button" onClick={onClose} className="ml-auto min-h-10 rounded-lg border border-cherry/20 px-3 text-xs font-black text-cherry">{l("Cancel", "Peruuta")}</button>
          <PrimaryBtn disabled={busy} onClick={() => { void save(); }}>{busy ? l("Saving…", "Tallennetaan…") : l("Save product", "Tallenna tuote")}</PrimaryBtn>
        </div>
      </div>
      <Confirm open={archiveConfirm} title={l("Archive this product?", "Arkistoidaanko tuote?")} body={l("It will be removed from the public menu, while existing orders and history are retained.", "Tuote poistuu julkisesta valikosta, mutta aiemmat tilaukset ja historia säilyvät.")} danger onNo={() => setArchiveConfirm(false)} onYes={() => { setArchiveConfirm(false); void save(true); }} />
    </Drawer>
  );
}
