"use client";
import { eur } from "@/lib/format";
import { useEffect, useRef, useState } from "react";
import { useShop } from "@/lib/store";
import { applyOfferToPrice } from "@/lib/v3";
import type { DeliveryRule, Offer } from "@/lib/types";
import * as api from "@/lib/api";
import { Drawer, Field, GhostBtn, Pill, PrimaryBtn, inputCls } from "./ui";
import { Ic } from "./icons";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
type OfferDraft = Omit<Offer, "id" | "uses"> & { id?: string; uses?: number };
const numberOrUndefined = (value: string) => value === "" ? undefined : Number(value);
const numInput = (value: number | undefined, onChange: (value: number | undefined) => void, step = "0.1") => (
  <input type="number" min="0" step={step} value={value ?? ""} onChange={(event) => onChange(numberOrUndefined(event.target.value))} className={inputCls} />
);
const newOffer = (): OfferDraft => ({
  type: "percent", value: 10, scope: { whole: true }, titleEn: "", titleFi: "", active: true, priority: 10,
});

export function OffersView() {
  const { settings, categories, adminItems, refresh, toast } = useShop();
  const [selected, setSelected] = useState<OfferDraft | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const openNew = () => { setSelected(newOffer()); setIsNew(true); setError(""); };
  const openEdit = (offer: Offer) => { setSelected({ ...offer, scope: { ...offer.scope } }); setIsNew(false); setError(""); };
  const patch = (next: Partial<OfferDraft>) => setSelected((current) => current ? { ...current, ...next } : current);
  const setScope = (next: Partial<Offer["scope"]>) => setSelected((current) => current ? { ...current, scope: { ...current.scope, ...next } } : current);

  const save = async () => {
    if (!selected) return;
    if (!selected.titleEn?.trim() || !selected.titleFi?.trim()) { setError("Add both English and Finnish offer titles."); return; }
    if (selected.end && selected.start && selected.end < selected.start) { setError("End date must be on or after the start date."); return; }
    if (selected.scope.minDistanceKm !== undefined && selected.scope.maxDistanceKm !== undefined && selected.scope.minDistanceKm > selected.scope.maxDistanceKm) { setError("Maximum distance must be at least minimum distance."); return; }
    if (selected.scope.minWeightKg !== undefined && selected.scope.maxWeightKg !== undefined && selected.scope.minWeightKg > selected.scope.maxWeightKg) { setError("Maximum weight must be at least minimum weight."); return; }
    if (["override", "bundle", "freeItem"].includes(selected.type) && !selected.scope.itemIds?.length) { setError("Choose at least one item for this offer type."); return; }
    setSaving(true); setError("");
    try {
      const { id, uses: _uses, ...body } = selected;
      if (isNew || !id) await api.apiPostPromotion(body);
      else await api.apiPutPromotion(id, body);
      await refresh();
      toast(isNew ? "Offer saved" : "Offer updated");
      setSelected(null);
    } catch {
      setError("Offer could not be saved. Check your connection and the selected values.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (offer: Offer) => {
    if (offer.uses) { toast("An offer with recorded uses cannot be deleted; turn it off instead.", "err"); return; }
    if (!window.confirm(`Delete offer “${offer.titleEn}”?`)) return;
    try { await api.apiDeletePromotion(offer.id); await refresh(); toast("Offer deleted", "err"); }
    catch { toast("Offer could not be deleted", "err"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold/50 bg-gold/10 p-4">
        <div><h2 className="font-display text-lg font-black text-cherry">Promotions and delivery offers</h2><p className="text-xs text-cherry/60">Active offers are listed for customers on the home page right after Today&rsquo;s Specials (and on the menu page), including weekday-only offers, which show the day they apply. Offers are repriced and validated by the backend; distance targeting requires the optional server-only distance provider key.</p></div>
        <PrimaryBtn onClick={openNew}>Create offer</PrimaryBtn>
      </div>
      {settings.offers.length === 0 ? <div className="rounded-2xl border border-cherry/10 bg-cream-deep/40 p-6 text-sm text-cherry/60">No offers yet.</div> : (
        <div className="grid gap-3 xl:grid-cols-2">
          {settings.offers.map((offer) => (
            <article key={offer.id} className="rounded-2xl border border-cherry/10 bg-cream-deep/50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><div className="flex flex-wrap items-center gap-2"><h3 className="font-display text-base font-black text-cherry">{offer.titleEn}</h3><Pill tone={offer.active ? "green" : "orange"}>{offer.active ? "Active" : "Paused"}</Pill></div><p className="mt-1 text-xs text-cherry/60">{offer.titleFi} · {offer.type} · priority {offer.priority}</p></div>
                <div className="flex gap-2"><GhostBtn onClick={() => openEdit(offer)}>Edit</GhostBtn><GhostBtn onClick={() => void remove(offer)}>Delete</GhostBtn></div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-bold text-cherry/70">
                <Pill tone="teal">{offer.scope.whole ? "Whole order" : offer.scope.category ? `Category: ${offer.scope.category}` : `${offer.scope.itemIds?.length ?? 0} selected items`}</Pill>
                {offer.scope.deliveryOnly && <Pill tone="orange">Delivery only</Pill>}
                {(offer.scope.minDistanceKm !== undefined || offer.scope.maxDistanceKm !== undefined) && <Pill tone="teal">{offer.scope.minDistanceKm ?? 0}–{offer.scope.maxDistanceKm ?? "∞"} km</Pill>}
                {(offer.scope.minWeightKg !== undefined || offer.scope.maxWeightKg !== undefined) && <Pill tone="teal">{offer.scope.minWeightKg ?? 0}–{offer.scope.maxWeightKg ?? "∞"} kg</Pill>}
                {offer.code && <Pill tone="orange">Code: {offer.code}</Pill>}
                <Pill tone="teal">Uses {offer.uses ?? 0}{offer.maxUses ? ` / ${offer.maxUses}` : ""}</Pill>
              </div>
              {(offer.descEn || offer.descFi) && <p className="mt-3 text-xs text-cherry/60">{offer.descEn}{offer.descFi ? ` · ${offer.descFi}` : ""}</p>}
            </article>
          ))}
        </div>
      )}
      {selected && (
        <Drawer open onClose={() => setSelected(null)} title={isNew ? "Create promotion" : "Edit promotion"} wide>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Offer type"><select value={selected.type} onChange={(e) => patch({ type: e.target.value as Offer["type"] })} className={inputCls}>
                <option value="percent">Percent discount</option><option value="fixed">Fixed amount off</option><option value="override">Set selected item price</option><option value="bundle">Bundle discount</option><option value="freeItem">Free selected item</option><option value="freeDelivery">Free delivery</option>
              </select></Field>
              <Field label="Value (€ or percent)"><input type="number" min="0" step="0.01" disabled={selected.type === "freeDelivery"} value={selected.value} onChange={(e) => patch({ value: Number(e.target.value) })} className={inputCls} /></Field>
              <Field label="Title (English)"><input maxLength={160} value={selected.titleEn} onChange={(e) => patch({ titleEn: e.target.value })} className={inputCls} /></Field>
              <Field label="Title (Finnish)"><input maxLength={160} value={selected.titleFi} onChange={(e) => patch({ titleFi: e.target.value })} className={inputCls} /></Field>
              <Field label="Description (English)"><textarea maxLength={500} value={selected.descEn ?? ""} onChange={(e) => patch({ descEn: e.target.value })} className={inputCls} /></Field>
              <Field label="Description (Finnish)"><textarea maxLength={500} value={selected.descFi ?? ""} onChange={(e) => patch({ descFi: e.target.value })} className={inputCls} /></Field>
            </div>
            <section className="space-y-3 rounded-xl border border-cherry/10 bg-cream p-3">
              <h3 className="text-xs font-black uppercase tracking-wide text-cherry/60">Offer scope</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Applies to"><select value={selected.scope.whole ? "whole" : selected.scope.category ? "category" : "items"} onChange={(e) => setScope(e.target.value === "whole" ? { whole: true, category: undefined, itemIds: undefined } : e.target.value === "category" ? { whole: false, category: categories()[0]?.id, itemIds: undefined } : { whole: false, category: undefined, itemIds: [] })} className={inputCls}><option value="whole">Whole order</option><option value="category">One category</option><option value="items">Selected items</option></select></Field>
                {!selected.scope.whole && selected.scope.category && <Field label="Category"><select value={selected.scope.category} onChange={(e) => setScope({ category: e.target.value })} className={inputCls}>{categories().map((category) => <option key={category.id} value={category.id}>{category.title} · {category.en}</option>)}</select></Field>}
                {(!selected.scope.whole && !selected.scope.category) && <Field label="Selected items"><select multiple value={selected.scope.itemIds ?? []} onChange={(e) => setScope({ itemIds: Array.from(e.target.selectedOptions, (option) => option.value) })} className={inputCls + " min-h-32"}>{adminItems.filter((item) => !item.archived).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.cat}</option>)}</select></Field>}
                <label className="flex min-h-[42px] items-center gap-2 text-sm font-bold"><input type="checkbox" checked={!!selected.scope.deliveryOnly} onChange={(e) => setScope({ deliveryOnly: e.target.checked })} /> Delivery orders only</label>
              </div>
              <div className="grid gap-3 sm:grid-cols-4">
                <Field label="Min distance (km)">{numInput(selected.scope.minDistanceKm, (value) => setScope({ minDistanceKm: value }))}</Field>
                <Field label="Max distance (km)">{numInput(selected.scope.maxDistanceKm, (value) => setScope({ maxDistanceKm: value }))}</Field>
                <Field label="Min cart weight (kg)">{numInput(selected.scope.minWeightKg, (value) => setScope({ minWeightKg: value }))}</Field>
                <Field label="Max cart weight (kg)">{numInput(selected.scope.maxWeightKg, (value) => setScope({ maxWeightKg: value }))}</Field>
              </div>
              <p className="text-[11px] text-cherry/50">Distance-limited offers only apply when the server can resolve driving distance. Weight limits use each menu item’s configured weight.</p>
            </section>
            <section className="space-y-2 rounded-xl border border-gold/40 bg-gold/10 p-3">
              <h3 className="text-xs font-black uppercase tracking-wide text-cherry/60">Customer prices in this scope</h3>
              {(() => {
                const scopedItems = adminItems.filter((item) => !item.archived && (
                  selected.scope.whole
                    ? true
                    : selected.scope.category
                      ? item.cat === selected.scope.category
                      : (selected.scope.itemIds ?? []).includes(item.id)
                ));
                const sample = scopedItems.slice(0, 4);
                if (!["percent", "override"].includes(selected.type)) {
                  return <p className="text-xs font-bold text-cherry/60">This offer type is deducted from the cart total at checkout, so shelf prices stay unchanged.</p>;
                }
                if (!sample.length) return <p className="text-xs font-bold text-cherry/60">Choose a scope to preview the reduced prices.</p>;
                return (
                  <>
                    <ul className="space-y-1 text-xs font-bold text-cherry/80">
                      {sample.map((item) => {
                        const was = Math.min(...item.prices.map((price) => price.value));
                        const now = applyOfferToPrice(selected, was);
                        return (
                          <li key={item.id} className="flex items-center justify-between gap-3">
                            <span className="min-w-0 truncate">{item.name}</span>
                            <span className="shrink-0 tabular-nums">
                              {now !== null && now < was ? (<><s className="mr-1 text-cherry/40">{eur(was)}</s><b className="text-gold-deep">{eur(now)}</b></>) : eur(was)}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                    <p className="text-[11px] text-cherry/50">
                      {scopedItems.length} item{scopedItems.length === 1 ? "" : "s"} in scope. {selected.scope.itemIds ? "" : "Every item in this scope shows the reduced price on the menu, in the item sheet and in the cart."}
                    </p>
                  </>
                );
              })()}
            </section>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Minimum order (€)">{numInput(selected.minOrder, (value) => patch({ minOrder: value }), "0.01")}</Field>
              <Field label="Start date"><input type="date" value={selected.start ?? ""} onChange={(e) => patch({ start: e.target.value || undefined })} className={inputCls} /></Field>
              <Field label="End date"><input type="date" value={selected.end ?? ""} onChange={(e) => patch({ end: e.target.value || undefined })} className={inputCls} /></Field>
              <Field label="Promo code"><input maxLength={40} value={selected.code ?? ""} onChange={(e) => patch({ code: e.target.value.toUpperCase() || undefined })} className={inputCls} placeholder="Optional" /></Field>
              <Field label="Maximum uses">{numInput(selected.maxUses, (value) => patch({ maxUses: value }), "1")}</Field>
              <Field label="Priority"><input type="number" min="-1000" max="1000" step="1" value={selected.priority} onChange={(e) => patch({ priority: Number(e.target.value) })} className={inputCls} /></Field>
            </div>
            <div className="flex flex-wrap gap-2">{DAYS.map((day, index) => <label key={day} className="inline-flex items-center gap-1.5 rounded-full border border-cherry/10 bg-cream px-3 py-2 text-xs font-bold"><input type="checkbox" checked={selected.days?.includes(index) ?? false} onChange={(e) => {
              const activeDays = selected.days ?? [];
              const days = e.target.checked ? [...new Set([...activeDays, index])].sort() : activeDays.filter((value) => value !== index);
              patch({ days: days.length === 0 || days.length === 7 ? undefined : days });
            }} />{day}</label>)}</div>
            <p className="text-[11px] font-bold text-cherry/50">
              {selected.days?.length
                ? `Applies only on ${selected.days.map((index) => DAYS[index]).join(", ")} — customers see this in the offer's day chip.`
                : "No day ticked = the offer applies every day."}
            </p>
            <label className="flex items-center gap-2 text-sm font-black"><input type="checkbox" checked={selected.active} onChange={(e) => patch({ active: e.target.checked })} /> Offer is active</label>
            {error && <p role="alert" className="rounded-xl bg-brick/10 p-3 text-xs font-bold text-brick">{error}</p>}
            <div className="sticky bottom-[-1.25rem] -mx-5 flex justify-end gap-2 border-t border-cherry/10 bg-cream/95 px-5 py-4 backdrop-blur"><button type="button" onClick={() => setSelected(null)} className="min-h-[42px] rounded-lg border border-cherry/20 px-4 text-xs font-black">Cancel</button><PrimaryBtn icon="save" disabled={saving} onClick={() => { void save(); }}>{saving ? "Saving…" : "Save offer"}</PrimaryBtn></div>
          </div>
        </Drawer>
      )}
    </div>
  );
}

const cloneRules = (rules: DeliveryRule[]) => rules.map((rule) => ({ ...rule }));

export function DeliveryRulesView() {
  const { settings, saveSettings, toast } = useShop();
  const [draft, setDraft] = useState<DeliveryRule[]>(cloneRules(settings.deliveryRules));
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  /* The store re-reads settings in the background (window focus, another admin
     tab). A plain reset effect therefore wiped a rule the manager had just
     added — and the next "Save rules" wrote the empty draft back to the
     database, which is why the new rule card vanished. Only sync when there is
     nothing unsaved; the ref keeps the effect from reading a stale flag. */
  const dirtyRef = useRef(false);
  const markDirty = () => { dirtyRef.current = true; setDirty(true); };
  useEffect(() => {
    if (!dirtyRef.current) setDraft(cloneRules(settings.deliveryRules));
  }, [settings.deliveryRules]);

  const update = (index: number, patch: Partial<DeliveryRule>) => {
    markDirty();
    setDraft((current) => current.map((rule, i) => i === index ? { ...rule, ...patch } : rule));
  };
  const add = () => {
    markDirty();
    setDraft((current) => [...current, { id: `delivery-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, name: "New delivery zone", fee: settings.deliveryFee, active: true }]);
  };
  const remove = (index: number) => {
    markDirty();
    setDraft((current) => current.filter((_, i) => i !== index));
  };
  const move = (index: number, offset: -1 | 1) => {
    markDirty();
    setDraft((current) => {
      const next = [...current]; const target = index + offset;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };
  const reload = () => {
    dirtyRef.current = false;
    setDirty(false);
    setDraft(cloneRules(settings.deliveryRules));
    toast("Draft reloaded from the database");
  };
  const save = async () => {
    for (const rule of draft) {
      if (rule.minDistanceKm !== undefined && rule.maxDistanceKm !== undefined && rule.minDistanceKm > rule.maxDistanceKm) { toast(`Check distance range for “${rule.name}”.`, "err"); return; }
      if (rule.minWeightKg !== undefined && rule.maxWeightKg !== undefined && rule.minWeightKg > rule.maxWeightKg) { toast(`Check weight range for “${rule.name}”.`, "err"); return; }
    }
    const snapshot = cloneRules(draft);
    setSaving(true);
    const ok = await saveSettings({ ...settings, deliveryRules: snapshot });
    setSaving(false);
    if (ok) {
      dirtyRef.current = false;
      setDirty(false);
      setDraft(snapshot);
      toast("Delivery rules saved and reloaded from the database");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-gold/50 bg-gold/10 p-4">
        <div><h2 className="font-display text-lg font-black text-cherry">Distance and weight delivery pricing</h2><p className="mt-1 max-w-2xl text-xs text-cherry/60">The first active matching rule is used; otherwise the flat delivery fee applies. Distance ranges require the optional backend-only Google Distance Matrix key. Weight ranges work without it.</p><p className="mt-2 text-xs font-black text-cherry">Current fallback: {eur(settings.deliveryFee)} · delivery radius {settings.radiusKm} km</p></div>
        <div className="flex flex-wrap items-center gap-2">
          {dirty && <span className="inline-flex min-h-[32px] items-center rounded-full bg-gold/25 px-3 text-[11px] font-black uppercase tracking-wide text-gold-deep">Unsaved changes</span>}
          {dirty && <button type="button" onClick={reload} className="min-h-[40px] rounded-lg border border-cherry/20 px-3 text-xs font-black text-cherry">Reload draft</button>}
          <GhostBtn onClick={add}><Ic n="plus" size={13} /> Add rule</GhostBtn>
          <PrimaryBtn icon="save" disabled={saving} onClick={() => { void save(); }}>{saving ? "Saving…" : "Save rules"}</PrimaryBtn>
        </div>
      </div>
      {draft.length === 0 && <div className="rounded-2xl border border-dashed border-cherry/20 p-6 text-sm text-cherry/60">No overrides: deliveries use the fallback fee.</div>}
      <div className="space-y-3">
        {draft.map((rule, index) => (
          <article key={rule.id} className="space-y-3 rounded-2xl border border-cherry/10 bg-cream-deep/50 p-4">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px_auto] sm:items-end">
              <Field label="Rule name"><input maxLength={120} value={rule.name} onChange={(e) => update(index, { name: e.target.value })} className={inputCls} /></Field>
              <Field label="Delivery fee (€)"><input type="number" min="0" step="0.01" value={rule.fee} onChange={(e) => update(index, { fee: Number(e.target.value) })} className={inputCls} /></Field>
              <div className="flex flex-wrap gap-1"><GhostBtn onClick={() => move(index, -1)}>↑ Priority</GhostBtn><GhostBtn onClick={() => move(index, 1)}>↓</GhostBtn><GhostBtn onClick={() => remove(index)}>Remove</GhostBtn></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <Field label="Min distance (km)">{numInput(rule.minDistanceKm, (value) => update(index, { minDistanceKm: value }))}</Field>
              <Field label="Max distance (km)">{numInput(rule.maxDistanceKm, (value) => update(index, { maxDistanceKm: value }))}</Field>
              <Field label="Min cart weight (kg)">{numInput(rule.minWeightKg, (value) => update(index, { minWeightKg: value }))}</Field>
              <Field label="Max cart weight (kg)">{numInput(rule.maxWeightKg, (value) => update(index, { maxWeightKg: value }))}</Field>
            </div>
            <label className="flex items-center gap-2 text-xs font-black text-cherry"><input type="checkbox" checked={rule.active} onChange={(e) => update(index, { active: e.target.checked })} /> Active</label>
          </article>
        ))}
      </div>
    </div>
  );
}
