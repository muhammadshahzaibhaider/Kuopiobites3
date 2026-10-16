"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  apiCreateDeliveryRule,
  apiDeleteDeliveryRule,
  apiGetDeliveryRules,
  apiPreviewDeliveryRules,
  apiUpdateDeliveryRule,
} from "@/lib/api";
import type { DeliveryRule, DeliveryRuleOutcome } from "@/lib/types";
import { eur } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { Field, GhostBtn, PrimaryBtn, inputCls } from "./ui";

type RuleInput = Omit<DeliveryRule, "id">;
type RangeKey = "distanceKm" | "weightKg" | "subtotalEur";
const DAYS = [
  { key: 1, en: "Mon", fi: "Ma" }, { key: 2, en: "Tue", fi: "Ti" },
  { key: 3, en: "Wed", fi: "Ke" }, { key: 4, en: "Thu", fi: "To" },
  { key: 5, en: "Fri", fi: "Pe" }, { key: 6, en: "Sat", fi: "La" }, { key: 0, en: "Sun", fi: "Su" },
] as const;
const blankRule = (): RuleInput => ({
  nameEn: "", nameFi: "", conditionType: "distance", conditions: { distanceKm: { max: 5 } },
  outcome: "fixed_fee", value: 5, active: true, activeDays: [], priority: 0, stackable: false,
});
const labelByOutcome: Record<DeliveryRuleOutcome, { en: string; fi: string }> = {
  free_delivery: { en: "Free delivery", fi: "Ilmainen toimitus" },
  fixed_fee: { en: "Fixed delivery fee", fi: "Kiinteä toimitusmaksu" },
  percent_fee: { en: "Percentage of base fee", fi: "Prosenttiosuus perusmaksusta" },
  fixed_discount: { en: "Discount from delivery fee", fi: "Alennus toimitusmaksusta" },
  no_delivery: { en: "Block delivery", fi: "Estä toimitus" },
};
const conditionLabel: Record<RangeKey, { en: string; fi: string; unit: string }> = {
  distanceKm: { en: "Distance", fi: "Etäisyys", unit: "km" },
  weightKg: { en: "Order weight", fi: "Tilauksen paino", unit: "kg" },
  subtotalEur: { en: "Item subtotal", fi: "Tuotteet yhteensä", unit: "€" },
};

export function DeliveryRulesView() {
  const { lang } = useLang();
  const fi = lang === "fi";
  const w = useCallback((en: string, finnish: string) => fi ? finnish : en, [fi]);
  const [rules, setRules] = useState<DeliveryRule[]>([]);
  const [draft, setDraft] = useState<RuleInput>(blankRule);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [distanceKm, setDistanceKm] = useState("5");
  const [weightKg, setWeightKg] = useState("1");
  const [subtotalEur, setSubtotalEur] = useState("20");
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof apiPreviewDeliveryRules>> | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);

  const loadRules = useCallback(async () => {
    setLoading(true); setError("");
    try { setRules(await apiGetDeliveryRules()); }
    catch { setError(w("Could not load delivery rules. Check your role, API and database.", "Toimitussääntöjä ei voitu ladata. Tarkista rooli, rajapinta ja tietokanta.")); }
    finally { setLoading(false); }
  }, [w]);
  useEffect(() => { void loadRules(); }, [loadRules]);

  const orderedRules = useMemo(() => [...rules].sort((a, b) => b.priority - a.priority || a.nameEn.localeCompare(b.nameEn)), [rules]);
  const changeConditionType = (conditionType: RuleInput["conditionType"]) => {
    const allowed: RangeKey[] = conditionType === "distance" ? ["distanceKm"]
      : conditionType === "weight" ? ["weightKg"]
        : conditionType === "subtotal" ? ["subtotalEur"]
          : ["distanceKm", "weightKg", "subtotalEur"];
    const conditions = { ...draft.conditions };
    for (const key of Object.keys(conditions) as RangeKey[]) if (!allowed.includes(key)) delete conditions[key];
    for (const key of allowed) conditions[key] ??= {};
    setDraft({ ...draft, conditionType, conditions });
  };
  const setRange = (key: RangeKey, edge: "min" | "max", raw: string) => {
    const value = raw === "" ? undefined : Number(raw);
    const conditions = { ...draft.conditions, [key]: { ...draft.conditions[key], [edge]: Number.isFinite(value) ? value : undefined } };
    if (conditions[key]?.min === undefined && conditions[key]?.max === undefined) delete conditions[key];
    setDraft({ ...draft, conditions });
  };
  const startEdit = (rule: DeliveryRule) => {
    const { id, ...values } = rule;
    setDraft(structuredClone(values)); setEditingId(id); setError(""); setNotice("");
  };
  const resetDraft = () => { setDraft(blankRule()); setEditingId(null); setError(""); setNotice(""); };
  const save = async () => {
    setSaving(true); setError(""); setNotice("");
    try {
      if (editingId) await apiUpdateDeliveryRule(editingId, draft);
      else await apiCreateDeliveryRule(draft);
      await loadRules(); resetDraft(); setNotice(w("Delivery rule saved.", "Toimitussääntö tallennettu."));
    } catch {
      setError(w("Could not save. Check that the rule has valid conditions and both EN/FI names.", "Tallennus epäonnistui. Tarkista ehdot sekä suomen- ja englanninkieliset nimet."));
    } finally { setSaving(false); }
  };
  const archive = async (rule: DeliveryRule) => {
    if (!window.confirm(w(`Deactivate “${rule.nameEn}”?`, `Poistetaanko sääntö käytöstä: ”${rule.nameFi}”?`))) return;
    setError(""); setNotice("");
    try { await apiDeleteDeliveryRule(rule.id); await loadRules(); setNotice(w("Rule deactivated; order history is unchanged.", "Sääntö poistettu käytöstä; tilaushistoria säilyy.")); }
    catch { setError(w("Could not deactivate the rule.", "Säännön poistaminen käytöstä epäonnistui.")); }
  };
  const runPreview = async () => {
    setPreviewBusy(true); setError("");
    try {
      setPreview(await apiPreviewDeliveryRules({
        distanceKm: distanceKm === "" ? undefined : Number(distanceKm),
        weightKg: Number(weightKg), subtotalEur: Number(subtotalEur),
      }));
    } catch { setError(w("Server preview failed. Check the inputs and try again.", "Palvelimen esikatselu epäonnistui. Tarkista arvot ja yritä uudelleen.")); }
    finally { setPreviewBusy(false); }
  };

  const outcome = draft.outcome;
  const ranges: RangeKey[] = draft.conditionType === "combined" ? ["distanceKm", "weightKg", "subtotalEur"]
    : draft.conditionType === "distance" ? ["distanceKm"] : draft.conditionType === "weight" ? ["weightKg"] : ["subtotalEur"];
  return <div className="space-y-5">
    <header>
      <h2 className="text-xl font-black text-cherry">{w("Delivery pricing rules", "Toimituksen hinnoittelusäännöt")}</h2>
      <p className="mt-1 max-w-3xl text-sm text-cherry/60">{w("Rules are evaluated and applied by the server at checkout using the verified delivery distance, cart weight and subtotal. Higher priority rules run first.", "Palvelin arvioi säännöt kassalla varmennetun toimitusetäisyyden, ostoskorin painon ja välisumman perusteella. Korkeamman prioriteetin säännöt käsitellään ensin.")}</p>
    </header>

    {error && <p role="alert" className="rounded-xl border border-brick/20 bg-brick/5 p-3 text-sm font-bold text-brick">{error}</p>}
    {notice && <p role="status" className="rounded-xl border border-green/20 bg-green/5 p-3 text-sm font-bold text-green">{notice}</p>}

    <section className="rounded-2xl border border-cherry/10 bg-cream-deep/40 p-4 sm:p-5">
      <h3 className="text-base font-black text-cherry">{editingId ? w("Edit rule", "Muokkaa sääntöä") : w("Add a rule", "Lisää sääntö")}</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label={w("Rule name (English)", "Säännön nimi (englanti)")}><input required maxLength={120} value={draft.nameEn} onChange={(event) => setDraft({ ...draft, nameEn: event.target.value })} className={inputCls} /></Field>
        <Field label={w("Rule name (Finnish)", "Säännön nimi (suomi)")}><input required maxLength={120} value={draft.nameFi} onChange={(event) => setDraft({ ...draft, nameFi: event.target.value })} className={inputCls} /></Field>
        <Field label={w("Condition type", "Ehtotyyppi")}><select value={draft.conditionType} onChange={(event) => changeConditionType(event.target.value as RuleInput["conditionType"])} className={inputCls}>
          <option value="distance">{w("Distance", "Etäisyys")}</option><option value="weight">{w("Order weight", "Tilauksen paino")}</option><option value="subtotal">{w("Item subtotal", "Tuotteet yhteensä")}</option><option value="combined">{w("Combined conditions", "Yhdistelmäehdot")}</option>
        </select></Field>
        <Field label={w("Outcome", "Vaikutus")}><select value={draft.outcome} onChange={(event) => setDraft({ ...draft, outcome: event.target.value as DeliveryRuleOutcome })} className={inputCls}>{Object.entries(labelByOutcome).map(([value, labels]) => <option key={value} value={value}>{fi ? labels.fi : labels.en}</option>)}</select></Field>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {ranges.map((key) => <fieldset key={key} className="rounded-xl border border-cherry/10 bg-cream p-3"><legend className="px-1 text-xs font-black text-cherry">{fi ? conditionLabel[key].fi : conditionLabel[key].en} ({conditionLabel[key].unit})</legend><div className="grid grid-cols-2 gap-2">
          <Field label={w("Minimum", "Vähintään")}><input type="number" min="0" step="0.01" value={draft.conditions[key]?.min ?? ""} onChange={(event) => setRange(key, "min", event.target.value)} className={inputCls} /></Field>
          <Field label={w("Maximum", "Enintään")}><input type="number" min="0" step="0.01" value={draft.conditions[key]?.max ?? ""} onChange={(event) => setRange(key, "max", event.target.value)} className={inputCls} /></Field>
        </div></fieldset>)}
      </div>

      {!["free_delivery", "no_delivery"].includes(outcome) && <div className="mt-3 max-w-xs"><Field label={outcome === "fixed_fee" ? w("Delivery fee (€)", "Toimitusmaksu (€)") : outcome === "percent_fee" ? w("Base fee percentage (%)", "Perusmaksun prosentti (%)") : w("Fee discount (€)", "Maksualennus (€)")}><input type="number" min="0" max="1000" step="0.01" value={draft.value ?? ""} onChange={(event) => setDraft({ ...draft, value: event.target.value === "" ? undefined : Number(event.target.value) })} className={inputCls} /></Field></div>}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Field label={w("Start date (optional)", "Alkupäivä (valinnainen)")}><input type="date" value={draft.startDate ?? ""} onChange={(event) => setDraft({ ...draft, startDate: event.target.value || undefined })} className={inputCls} /></Field>
        <Field label={w("End date (optional)", "Päättymispäivä (valinnainen)")}><input type="date" value={draft.endDate ?? ""} onChange={(event) => setDraft({ ...draft, endDate: event.target.value || undefined })} className={inputCls} /></Field>
        <Field label={w("Start time (optional)", "Alkuaika (valinnainen)")}><input type="time" value={draft.startTime ?? ""} onChange={(event) => setDraft({ ...draft, startTime: event.target.value || undefined, endTime: event.target.value ? draft.endTime : undefined })} className={inputCls} /></Field>
        <Field label={w("End time (optional)", "Päättymisaika (valinnainen)")}><input type="time" value={draft.endTime ?? ""} onChange={(event) => setDraft({ ...draft, endTime: event.target.value || undefined, startTime: event.target.value ? draft.startTime : undefined })} className={inputCls} /></Field>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Field label={w("Priority (higher runs first)", "Prioriteetti (suurempi ensin)")}><input type="number" min="-1000" max="1000" step="1" value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: Number(event.target.value) || 0 })} className={inputCls + " w-40"} /></Field>
        <label className="flex min-h-[42px] items-center gap-2 self-end text-xs font-bold text-cherry"><input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} className="h-4 w-4 accent-[#0F3D3E]" />{w("Active", "Käytössä")}</label>
        <label className="flex min-h-[42px] items-center gap-2 self-end text-xs font-bold text-cherry"><input type="checkbox" checked={draft.stackable} onChange={(event) => setDraft({ ...draft, stackable: event.target.checked })} className="h-4 w-4 accent-[#0F3D3E]" />{w("Stack with lower-priority rules", "Yhdistä alemman prioriteetin sääntöihin")}</label>
      </div>
      <fieldset className="mt-4"><legend className="text-xs font-black text-cherry/70">{w("Active weekdays (leave all clear for every day)", "Voimassaolopäivät (tyhjä = kaikki päivät)")}</legend><div className="mt-2 flex flex-wrap gap-2">{DAYS.map((day) => <label key={day.key} className="flex items-center gap-1.5 rounded-lg border border-cherry/10 bg-cream px-2.5 py-2 text-xs font-bold text-cherry"><input type="checkbox" checked={!!draft.activeDays?.includes(day.key)} onChange={(event) => { const days = new Set(draft.activeDays ?? []); event.target.checked ? days.add(day.key) : days.delete(day.key); setDraft({ ...draft, activeDays: [...days].sort((a, b) => a - b) }); }} className="h-4 w-4 accent-[#0F3D3E]" />{fi ? day.fi : day.en}</label>)}</div></fieldset>
      <div className="mt-5 flex flex-wrap gap-2"><PrimaryBtn icon="save" disabled={saving} onClick={save}>{saving ? w("Saving…", "Tallennetaan…") : editingId ? w("Save changes", "Tallenna muutokset") : w("Add rule", "Lisää sääntö")}</PrimaryBtn>{editingId && <GhostBtn onClick={resetDraft}>{w("Cancel", "Peruuta")}</GhostBtn>}</div>
    </section>

    <section className="overflow-hidden rounded-2xl border border-cherry/10 bg-cream-deep/40">
      <div className="flex items-center justify-between border-b border-cherry/10 px-4 py-3"><h3 className="font-black text-cherry">{w("Saved rules", "Tallennetut säännöt")}</h3><button type="button" onClick={() => void loadRules()} className="text-xs font-black text-cherry/60 underline">{w("Refresh", "Päivitä")}</button></div>
      {loading ? <p role="status" className="p-5 text-sm text-cherry/50">{w("Loading…", "Ladataan…")}</p> : orderedRules.length === 0 ? <p className="p-5 text-sm font-bold text-cherry/50">{w("No delivery rules yet.", "Toimitussääntöjä ei vielä ole.")}</p> : <ul className="divide-y divide-cherry/10">{orderedRules.map((rule) => <li key={rule.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong className="text-sm text-cherry">{fi ? rule.nameFi : rule.nameEn}</strong><span className={rule.active ? "rounded-full bg-green/10 px-2 py-0.5 text-[10px] font-black text-green" : "rounded-full bg-cherry/5 px-2 py-0.5 text-[10px] font-black text-cherry/45"}>{rule.active ? w("ACTIVE", "KÄYTÖSSÄ") : w("INACTIVE", "POIS KÄYTÖSTÄ")}</span></div><p className="mt-1 text-xs text-cherry/60">{labelByOutcome[rule.outcome][fi ? "fi" : "en"]} · {w("priority", "prioriteetti")} {rule.priority}{rule.value !== undefined && !["free_delivery", "no_delivery"].includes(rule.outcome) ? ` · ${rule.outcome === "percent_fee" ? `${rule.value}%` : eur(rule.value)}` : ""}</p></div><div className="flex gap-2"><GhostBtn onClick={() => startEdit(rule)}>{w("Edit", "Muokkaa")}</GhostBtn>{rule.active && <GhostBtn onClick={() => void archive(rule)}>{w("Deactivate", "Poista käytöstä")}</GhostBtn>}</div></li>)}</ul>}
    </section>

    <section className="rounded-2xl border border-gold/30 bg-gold/10 p-4 sm:p-5">
      <h3 className="text-base font-black text-cherry">{w("Server-side preview", "Palvelimen esikatselu")}</h3><p className="mt-1 text-xs text-cherry/60">{w("Preview saved rules with sample cart metrics. Checkout always uses verified server-calculated distance.", "Esikatsele tallennettuja sääntöjä esimerkkitiedoilla. Kassalla käytetään aina palvelimen varmentamaa etäisyyttä.")}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-4"><Field label={w("Distance (km)", "Etäisyys (km)")}><input type="number" min="0" step="0.1" value={distanceKm} onChange={(event) => setDistanceKm(event.target.value)} className={inputCls} /></Field><Field label={w("Weight (kg)", "Paino (kg)")}><input type="number" min="0" step="0.01" value={weightKg} onChange={(event) => setWeightKg(event.target.value)} className={inputCls} /></Field><Field label={w("Subtotal (€)", "Välisummaa (€)")}><input type="number" min="0" step="0.01" value={subtotalEur} onChange={(event) => setSubtotalEur(event.target.value)} className={inputCls} /></Field><div className="flex items-end"><PrimaryBtn disabled={previewBusy} onClick={runPreview}>{previewBusy ? w("Checking…", "Tarkistetaan…") : w("Preview", "Esikatsele")}</PrimaryBtn></div></div>
      {preview && <div role="status" className="mt-4 rounded-xl bg-cream p-3 text-sm"><p className="font-black text-cherry">{preview.deliveryAllowed ? w("Delivery allowed", "Toimitus sallittu") : preview.explanation === "delivery.outOfRange" ? w("Outside delivery radius", "Toimitusalueen ulkopuolella") : w("Blocked by a delivery rule", "Toimitussääntö estää tilauksen")} · {w("Fee", "Maksu")}: {eur(preview.deliveryFee)}</p>{preview.appliedRules.length > 0 && <p className="mt-1 text-xs font-bold text-cherry/60">{w("Applied", "Sovelletut")}: {preview.appliedRules.map((rule) => fi ? rule.nameFi : rule.nameEn).join(", ")}</p>}</div>}
    </section>
  </div>;
}
