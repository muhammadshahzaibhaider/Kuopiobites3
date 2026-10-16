"use client";
import { useEffect, useMemo, useState } from "react";
import { apiArchivePromotion, apiCreatePromotion, apiUpdatePromotion } from "@/lib/api";
import { eur, uid } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { useShop } from "@/lib/store";
import type { Offer } from "@/lib/types";
import { Field, GhostBtn, Pill, PrimaryBtn, inputCls } from "./ui";

type OfferInput = Omit<Offer, "id" | "uses">;
type ScopeMode = "whole" | "category" | "item";
const freshOffer = (): OfferInput => ({
  type: "percent", value: 10, scope: { whole: true }, titleEn: "", titleFi: "", active: true, priority: 0,
});
const offerTypes: { value: Offer["type"]; en: string; fi: string }[] = [
  { value: "percent", en: "Percentage discount", fi: "Prosenttialennus" },
  { value: "fixed", en: "Fixed discount", fi: "Kiinteä alennus" },
  { value: "override", en: "Special item price", fi: "Tuotteen tarjoushinta" },
  { value: "bundle", en: "Bundle discount", fi: "Pakettialennus" },
  { value: "freeItem", en: "Free item", fi: "Ilmainen tuote" },
  { value: "freeDelivery", en: "Free delivery", fi: "Ilmainen toimitus" },
];
const WEEK = [{ day: 1, en: "Mon", fi: "Ma" }, { day: 2, en: "Tue", fi: "Ti" }, { day: 3, en: "Wed", fi: "Ke" }, { day: 4, en: "Thu", fi: "To" }, { day: 5, en: "Fri", fi: "Pe" }, { day: 6, en: "Sat", fi: "La" }, { day: 0, en: "Sun", fi: "Su" }];

export function PromotionsView() {
  const { settings, refresh, toast } = useShop();
  const { lang } = useLang();
  const fi = lang === "fi";
  const w = (en: string, finnish: string) => fi ? finnish : en;
  const [offers, setOffers] = useState<Offer[]>(settings.offers);
  const [draft, setDraft] = useState<OfferInput>(freshOffer());
  const [scopeMode, setScopeMode] = useState<ScopeMode>("whole");
  const [scopeValue, setScopeValue] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const itemScopeRequired = ["override", "bundle", "freeItem"].includes(draft.type);
  const scopeLockedToWhole = draft.type === "freeDelivery";
  const valueDisabled = draft.type === "freeDelivery" || draft.type === "freeItem";
  useEffect(() => setOffers(settings.offers), [settings.offers]);
  const sorted = useMemo(() => [...offers].sort((a, b) => b.priority - a.priority || a.titleEn.localeCompare(b.titleEn)), [offers]);

  const reset = () => { setDraft(freshOffer()); setScopeMode("whole"); setScopeValue(""); setEditing(null); setError(""); };
  const edit = (offer: Offer) => {
    const { id: _id, uses: _uses, ...values } = offer;
    setDraft(values);
    if (offer.scope.whole) { setScopeMode("whole"); setScopeValue(""); }
    else if (offer.scope.category) { setScopeMode("category"); setScopeValue(offer.scope.category); }
    else { setScopeMode("item"); setScopeValue(offer.scope.itemIds?.join(", ") ?? ""); }
    setEditing(offer.id); setError(""); setNotice("");
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    const scope = scopeMode === "whole" ? { whole: true }
      : scopeMode === "category" ? { category: scopeValue.trim() }
        : { itemIds: scopeValue.split(",").map((part) => part.trim()).filter(Boolean) };
    const body: OfferInput = { ...draft, scope };
    try {
      if (editing) await apiUpdatePromotion(editing, body);
      else await apiCreatePromotion({ ...body, priority: Number(body.priority) || 0 });
      await refresh();
      setNotice(w("Offer saved. Pricing is recalculated by the server.", "Tarjous tallennettu. Palvelin laskee hinnat uudelleen."));
      reset();
    } catch {
      setError(w("Could not save this offer. Check the bilingual titles, date range, value and scope.", "Tarjousta ei voitu tallentaa. Tarkista kaksikieliset otsikot, päivämäärät, arvo ja kohdistus."));
    } finally { setBusy(false); }
  };
  const archive = async (offer: Offer) => {
    if (!window.confirm(w(`Deactivate “${offer.titleEn}”? Existing orders will be retained.`, `Poistetaanko ”${offer.titleFi}” käytöstä? Aiemmat tilaukset säilyvät.`))) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await apiArchivePromotion(offer.id);
      await refresh();
      setNotice(w("Offer deactivated; order history is unchanged.", "Tarjous poistettu käytöstä; tilaushistoria säilyy."));
    } catch { setError(w("Could not deactivate this offer.", "Tarjousta ei voitu poistaa käytöstä.")); }
    finally { setBusy(false); }
  };

  return <div className="space-y-5">
    <header><h2 className="text-xl font-black text-cherry">{w("Offers & promotions", "Tarjoukset ja kampanjat")}</h2><p className="mt-1 max-w-3xl text-sm text-cherry/60">{w("Manage bilingual offers. Deactivation is soft: historical order prices and usage records remain intact.", "Hallinnoi kaksikielisiä tarjouksia. Käytöstä poistaminen on turvallinen: tilausten hinnat ja käyttöhistoria säilyvät.")}</p></header>
    {error && <p role="alert" className="rounded-xl border border-brick/20 bg-brick/5 p-3 text-sm font-bold text-brick">{error}</p>}
    {notice && <p role="status" className="rounded-xl border border-green/20 bg-green/5 p-3 text-sm font-bold text-green">{notice}</p>}

    <form onSubmit={save} className="space-y-4 rounded-2xl border border-cherry/10 bg-cream-deep/40 p-4 sm:p-5">
      <h3 className="font-black text-cherry">{editing ? w("Edit offer", "Muokkaa tarjousta") : w("Create offer", "Luo tarjous")}</h3>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Field label={w("Title · English", "Otsikko · englanti")}><input required maxLength={160} value={draft.titleEn} onChange={(event) => setDraft({ ...draft, titleEn: event.target.value })} className={inputCls} /></Field>
        <Field label={w("Title · Finnish", "Otsikko · suomi")}><input required maxLength={160} value={draft.titleFi} onChange={(event) => setDraft({ ...draft, titleFi: event.target.value })} className={inputCls} /></Field>
        <Field label={w("Offer type", "Tarjouksen tyyppi")}><select value={draft.type} onChange={(event) => {
          const type = event.target.value as Offer["type"];
          setDraft({ ...draft, type, ...(type === "freeDelivery" || type === "freeItem" ? { value: 0 } : {}) });
          if (["override", "bundle", "freeItem"].includes(type)) setScopeMode("item");
          else if (type === "freeDelivery") { setScopeMode("whole"); setScopeValue(""); }
        }} className={inputCls}>{offerTypes.map((type) => <option key={type.value} value={type.value}>{fi ? type.fi : type.en}</option>)}</select></Field>
        <Field label={draft.type === "percent" ? w("Discount (%)", "Alennus (%)") : draft.type === "override" ? w("Special price (€)", "Tarjoushinta (€)") : draft.type === "freeDelivery" || draft.type === "freeItem" ? w("No value needed", "Ei arvoa") : w("Discount (€)", "Alennus (€)")}><input type="number" required min="0" max={draft.type === "percent" ? 100 : 10000} step="0.01" value={draft.value} disabled={valueDisabled} onChange={(event) => setDraft({ ...draft, value: Math.max(0, Number(event.target.value) || 0) })} className={inputCls} /></Field>
        <Field label={w("Discount scope", "Tarjouksen kohde")}><select value={scopeMode} onChange={(event) => setScopeMode(event.target.value as ScopeMode)} className={inputCls}><option value="whole" disabled={itemScopeRequired || scopeLockedToWhole}>{w("Whole order", "Koko tilaus")}</option><option value="category" disabled={itemScopeRequired || scopeLockedToWhole}>{w("Category ID", "Kategorian tunnus")}</option><option value="item">{w("Menu item ID(s)", "Tuotetunnus/-tunnukset")}</option></select></Field>
        {scopeMode !== "whole" && <Field label={scopeMode === "category" ? w("Category identifier", "Kategorian tunnus") : w("Item identifiers (comma separated)", "Tuotetunnukset (pilkuin erotettuna)")}><input required maxLength={500} value={scopeValue} onChange={(event) => setScopeValue(event.target.value)} className={inputCls} placeholder={scopeMode === "item" ? "item-1, item-2" : "pizzas"} /></Field>}
        <Field label={w("Minimum order (€)", "Tilauksen vähimmäissumma (€)")}><input type="number" min="0" step="0.01" value={draft.minOrder ?? ""} onChange={(event) => setDraft({ ...draft, minOrder: event.target.value === "" ? undefined : Number(event.target.value) })} className={inputCls} /></Field>
        <Field label={w("Promo code (optional)", "Kampanjakoodi (valinnainen)")}><input maxLength={40} value={draft.code ?? ""} onChange={(event) => setDraft({ ...draft, code: event.target.value.toUpperCase() || undefined })} className={inputCls} /></Field>
        <Field label={w("Starts on (optional)", "Alkaa (valinnainen)")}><input type="date" value={draft.start ?? ""} onChange={(event) => setDraft({ ...draft, start: event.target.value || undefined })} className={inputCls} /></Field>
        <Field label={w("Expires on (optional)", "Päättyy (valinnainen)")}><input type="date" value={draft.end ?? ""} onChange={(event) => setDraft({ ...draft, end: event.target.value || undefined })} className={inputCls} /></Field>
        <Field label={w("Maximum uses (optional)", "Käyttökertojen enimmäismäärä (valinnainen)")}><input type="number" min="1" step="1" value={draft.maxUses ?? ""} onChange={(event) => setDraft({ ...draft, maxUses: event.target.value === "" ? undefined : Number(event.target.value) })} className={inputCls} /></Field>
        <Field label={w("Priority", "Prioriteetti")}><input type="number" min="-1000" max="1000" step="1" value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: Number(event.target.value) || 0 })} className={inputCls} /></Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2"><Field label={w("Description · English", "Kuvaus · englanti")}><textarea rows={2} maxLength={500} value={draft.descEn ?? ""} onChange={(event) => setDraft({ ...draft, descEn: event.target.value || undefined })} className={inputCls} /></Field><Field label={w("Description · Finnish", "Kuvaus · suomi")}><textarea rows={2} maxLength={500} value={draft.descFi ?? ""} onChange={(event) => setDraft({ ...draft, descFi: event.target.value || undefined })} className={inputCls} /></Field></div>
      <div className="flex flex-wrap items-center gap-3"><Field label={w("Badge · English", "Tunnus · englanti")}><input maxLength={80} value={draft.badgeEn ?? ""} onChange={(event) => setDraft({ ...draft, badgeEn: event.target.value || undefined })} className={inputCls} /></Field><Field label={w("Badge · Finnish", "Tunnus · suomi")}><input maxLength={80} value={draft.badgeFi ?? ""} onChange={(event) => setDraft({ ...draft, badgeFi: event.target.value || undefined })} className={inputCls} /></Field><label className="flex min-h-[42px] items-center gap-2 self-end text-xs font-bold text-cherry"><input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} className="h-4 w-4 accent-[#0F3D3E]" />{w("Active", "Käytössä")}</label></div>
      <fieldset><legend className="text-xs font-black text-cherry/70">{w("Active weekdays (leave empty for every day)", "Voimassaolopäivät (tyhjä = kaikki päivät)")}</legend><div className="mt-2 flex flex-wrap gap-2">{WEEK.map((day) => <label key={day.day} className="flex items-center gap-1.5 rounded-lg border border-cherry/10 bg-cream px-2.5 py-2 text-xs font-bold text-cherry"><input type="checkbox" checked={!!draft.days?.includes(day.day)} onChange={(event) => { const days = new Set(draft.days ?? []); event.target.checked ? days.add(day.day) : days.delete(day.day); setDraft({ ...draft, days: [...days].sort((a, b) => a - b) }); }} className="h-4 w-4 accent-[#0F3D3E]" />{fi ? day.fi : day.en}</label>)}</div></fieldset>
      <div className="flex flex-wrap gap-2"><PrimaryBtn icon="save" disabled={busy}>{busy ? w("Saving…", "Tallennetaan…") : editing ? w("Save changes", "Tallenna muutokset") : w("Create offer", "Luo tarjous")}</PrimaryBtn>{editing && <GhostBtn onClick={reset}>{w("Cancel", "Peruuta")}</GhostBtn>}</div>
    </form>

    <section className="overflow-hidden rounded-2xl border border-cherry/10 bg-cream-deep/40"><h3 className="border-b border-cherry/10 px-4 py-3 font-black text-cherry">{w("Saved offers", "Tallennetut tarjoukset")}</h3>{sorted.length === 0 ? <p className="p-5 text-sm text-cherry/50">{w("No offers created yet.", "Tarjouksia ei ole vielä luotu.")}</p> : <ul className="divide-y divide-cherry/10">{sorted.map((offer) => <li key={offer.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong className="text-sm text-cherry">{fi ? offer.titleFi : offer.titleEn}</strong><Pill tone={offer.active ? "green" : "gray"}>{offer.active ? w("ACTIVE", "KÄYTÖSSÄ") : w("INACTIVE", "POIS KÄYTÖSTÄ")}</Pill><Pill tone="teal">{offerTypes.find((entry) => entry.value === offer.type)?.[fi ? "fi" : "en"]}</Pill></div><p className="mt-1 text-xs text-cherry/60">{offer.type === "percent" ? `${offer.value}%` : offer.type === "freeDelivery" ? w("No fee", "Maksuton") : eur(offer.value)} · {offer.code ? `${w("Code", "Koodi")}: ${offer.code}` : offer.scope.whole ? w("Whole order", "Koko tilaus") : offer.scope.category ?? offer.scope.itemIds?.join(", ") ?? "—"} · {w("Uses", "Käytetty")} {offer.uses ?? 0}{offer.maxUses ? ` / ${offer.maxUses}` : ""}</p></div><div className="flex gap-2"><GhostBtn onClick={() => edit(offer)}>{w("Edit", "Muokkaa")}</GhostBtn>{offer.active && <GhostBtn disabled={busy} onClick={() => void archive(offer)}>{w("Deactivate", "Poista käytöstä")}</GhostBtn>}</div></li>)}</ul>}</section>
  </div>;
}
