"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { cx, eur } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { useShop } from "@/lib/store";
import { activeToppings, modOptionLabel, offerPrice, optionOff, trDesc, trLabel, trName, visibleToppingOptions } from "@/lib/v3";
import type { MenuItem } from "@/lib/types";
import { MenuImage, QtyStepper, TagBadge } from "./ui";
import { useModalA11y } from "./useModalA11y";
import FavoriteButton from "./FavoriteButton";

export default function ItemModal({ item, onClose }: { item: MenuItem | null; onClose: () => void }) {
  const { addLine, toast, settings } = useShop();
  const { t, lang } = useLang();
  const [variant, setVariant] = useState(0);
  const [qty, setQty] = useState(1);
  const [sel, setSel] = useState<Record<string, string[]>>({});
  const [note, setNote] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalA11y(!!item, onClose, dialogRef);

  useEffect(() => {
    setVariant(0);
    setQty(1);
    setSel({});
    setNote("");
  }, [item?.id]);

  const isBuilder = !!item?.mods?.some((group) => group.id === "top");
  /* A topping group can outlive the topping itself (options are copied from the
     master list when the group is created). Only offer what is still sellable,
     and hide a topping group entirely when nothing is left. */
  const availableToppings = useMemo(() => new Set(activeToppings(settings)), [settings]);
  const groups = useMemo(() => {
    const total = availableToppings.size;
    const mapped = (item?.mods ?? []).map((group) => {
      const options = visibleToppingOptions(settings, group);
      /* Builder (`top`) groups keep their options at runtime, so their tier
         minimum is bounded by the master list; per-item groups by what is left
         in the group itself. A minimum above what can be picked would make the
         item impossible to order after a topping is removed. */
      const pickable = group.id === "top" ? total : group.id === "topping" ? options.length : Number.POSITIVE_INFINITY;
      const bound = (value: number | undefined) => value === undefined ? undefined : Math.min(value, pickable);
      return { ...group, options, min: bound(group.min), exact: bound(group.exact) };
    });
    return mapped.filter((group) => group.id !== "topping" || group.options.length > 0);
  }, [item, settings, availableToppings]);

  /* Live settings refresh while the dialog is open (drops an ingredient from
     the catalogue): forget picks that are no longer offerable, so a hidden
     label can never be submitted with the line. */
  useEffect(() => {
    setSel((current) => {
      let changed = false;
      const next: Record<string, string[]> = { ...current };
      for (const group of groups) {
        const picks = current[group.id] ?? [];
        const kept = picks.filter((label) => group.options.some((option) => option.label === label));
        if (kept.length !== picks.length) { next[group.id] = kept; changed = true; }
      }
      for (const id of Object.keys(next)) {
        if (!groups.some((group) => group.id === id) && next[id].length) { next[id] = []; changed = true; }
      }
      return changed ? next : current;
    });
  }, [groups]);

  const valid = useMemo(() => {
    if (!item) return false;
    return groups.every((group) => {
      const count = (sel[group.id] ?? []).length;
      const min = group.exact ?? (group.required ? group.min ?? 1 : group.min ?? 0);
      const max = group.exact ?? group.max ?? (group.type === "single" ? 1 : 99);
      return count >= min && count <= max;
    });
  }, [groups, item, sel]);

  const unit = useMemo(() => {
    if (!item) return 0;
    let price = item.prices[variant]?.value ?? 0;
    for (const group of groups) {
      const picks = sel[group.id] ?? [];
      for (const label of picks) price += group.options.find((option) => option.label === label)?.price ?? 0;
      if (group.perVariantExtra) {
        const included = group.exact ?? group.min ?? (group.required ? 1 : 0);
        price += Math.max(0, picks.length - included) * (group.perVariantExtra[variant] ?? 0);
      }
    }
    return Math.round(price * 100) / 100;
  }, [groups, item, variant, sel]);

  if (!item) return null;
  const description = trDesc(lang, item);
  const offer = offerPrice(settings, item, variant);
  const itemName = trName(lang, item);

  const optKey = (group: { id: string }) =>
    group.id === "top" || group.id === "topping" ? "topping" : group.id === "dips" ? "dip" : `mod:${item.id}:${group.id}`;

  const toggle = (gid: string, label: string, type: "single" | "multi", max?: number, required?: boolean) => {
    setSel((current) => {
      const picks = current[gid] ?? [];
      if (type === "single") {
        if (picks.includes(label) && !required) return { ...current, [gid]: [] };
        return { ...current, [gid]: [label] };
      }
      if (picks.includes(label)) return { ...current, [gid]: picks.filter((value) => value !== label) };
      if (max !== undefined && picks.length >= max) return current;
      return { ...current, [gid]: [...picks, label] };
    });
  };

  const add = () => {
    /* Keep option labels raw, with no display prefixes. Notes have their own field. */
    const options: string[] = [];
    for (const group of groups) {
      const picks = sel[group.id] ?? [];
      if (picks.length) options.push(...picks);
    }
    addLine({
      itemId: item.id,
      name: itemName,
      variantLabel: item.prices[variant]?.label ?? "",
      qty,
      unitPrice: offer ? offer.now : unit,
      options,
      note: note.trim() || undefined,
      img: settings.itemImages[item.id]?.src,
    });
    toast(`${itemName} ${t("menu.added")}`);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-cherry-dark/60 backdrop-blur-sm sm:grid sm:place-items-center sm:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          ref={dialogRef}
          tabIndex={-1}
          className="absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col rounded-t-3xl bg-cream shadow-lift sm:static sm:max-h-[86vh] sm:w-full sm:max-w-lg sm:rounded-3xl"
          initial={{ y: 60, opacity: 0.6, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 40, opacity: 0, scale: 0.98 }}
          transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={itemName}
        >
          <header className="relative shrink-0 border-b-2 border-gold/40 p-4 sm:p-5">
            {isBuilder && <p className="mb-1 font-display text-xs font-black uppercase tracking-[0.2em] text-gold-deep">{t("menu.selectTopping")}</p>}
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <MenuImage item={item} sizes="80px" className="h-20 w-20 shrink-0 rounded-2xl sm:h-24 sm:w-24" />
                <div className="min-w-0">
                  <h2 className="font-display text-xl font-black leading-tight text-cherry sm:text-2xl">{itemName}</h2>
                  {description && <p className="mt-1 line-clamp-3 text-sm text-cherry/70">{description}</p>}
                  <div className="mt-2 flex flex-wrap gap-2">{item.tags?.map((tag) => <TagBadge key={tag} tag={tag} />)}</div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <FavoriteButton itemId={item.id} />
                <button onClick={onClose} aria-label="Close item details" className="grid h-10 w-10 place-items-center rounded-full border border-cherry/20 text-cherry hover:bg-cherry hover:text-cream">✕</button>
              </div>
            </div>
          </header>

          <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
            {item.prices.length > 1 && (
              <section>
                <p className="text-xs font-black uppercase tracking-wide text-cherry/60">{item.id === "specials-6" ? t("menu.quantity") : item.id === "specials-3" ? t("menu.sizeMeal") : t("menu.size")}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {item.prices.map((price, index) => {
                    const sizeOff = optionOff(settings, `size:${item.id}`, price.label);
                    return (
                      <button
                        key={`${price.label}-${index}`}
                        disabled={sizeOff}
                        aria-pressed={index === variant}
                        onClick={() => setVariant(index)}
                        className={cx(
                          "min-h-[44px] rounded-full border-2 px-4 text-sm font-black transition",
                          index === variant ? "border-cherry-bright bg-cherry-bright text-cream" : "border-cherry/20 text-cherry hover:border-cherry-bright",
                          sizeOff && "cursor-not-allowed opacity-40 line-through"
                        )}
                      >
                        {trLabel(lang, price.label)} · {eur(price.value)}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {groups.map((group) => {
              const picks = sel[group.id] ?? [];
              const minimum = group.exact ?? (group.required ? group.min ?? 1 : group.min ?? 0);
              const extraCount = Math.max(0, picks.length - minimum);
              return (
                <section key={group.id} className="mt-5">
                  <p className="text-xs font-black uppercase tracking-wide text-cherry/60">
                    {group.id === "top" ? `${t("menu.selectTopping")} — ${minimum}+` : lang === "fi" ? group.nameFi ?? group.name : group.nameEn ?? group.name}
                    {(group.min !== undefined || group.exact !== undefined) && <span className="ml-2 rounded-full bg-gold/20 px-2 py-0.5 text-[11px] text-gold-deep">{picks.length}/{minimum}+ {t("menu.picked")}{extraCount > 0 && ` · +${extraCount}`}</span>}
                  </p>
                  {group.id === "top" && <p className="mt-1 text-xs text-cherry/60">{t("menu.builder")}</p>}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {group.options.map((option, optionIndex) => {
                      const picked = picks.includes(option.label);
                      const disabled = optionOff(settings, optKey(group), option.label);
                      return (
                        <button
                          key={`${option.label}-${optionIndex}`}
                          disabled={disabled}
                          aria-pressed={picked}
                          onClick={() => !disabled && toggle(group.id, option.label, group.type, group.max, group.required)}
                          className={cx(
                            "min-h-[40px] rounded-full border px-3.5 text-sm font-bold capitalize transition",
                            picked ? "border-cherry bg-cherry text-cream" : "border-cherry/20 bg-cream-deep text-cherry hover:border-cherry",
                            disabled && "cursor-not-allowed opacity-40 line-through"
                          )}
                        >
                          {modOptionLabel(lang, group, option, settings)}
                          {option.price > 0 && <span className="ml-1 text-xs opacity-70">+{eur(option.price)}</span>}
                        </button>
                      );
                    })}
                  </div>
                  {group.perVariantExtra && extraCount > 0 && <p className="mt-1 text-xs font-bold text-gold-deep">{t("menu.extras")} → +{eur(extraCount * (group.perVariantExtra[variant] ?? 0))}</p>}
                </section>
              );
            })}

            <label className="mt-5 block text-xs font-black uppercase tracking-wide text-cherry/60">
              {t("pizza.note")}
              <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={140} className="mt-1 min-h-[44px] w-full rounded-xl border border-cherry/20 bg-cream-deep px-3 text-sm font-bold normal-case placeholder:text-cherry/40" placeholder={lang === "fi" ? "esim. ilman sipulia" : "e.g. no onions"} />
            </label>
          </div>

          <footer className="shrink-0 border-t-2 border-gold/40 bg-cream px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
            <div className="flex items-center justify-between gap-3">
              <QtyStepper qty={qty} onChange={(next) => setQty(Math.max(1, next))} />
              <p className="text-sm font-black text-cherry/70">{t("order.total")}: {offer && <span className="mr-1 text-cherry/40 line-through">{eur(offer.was * qty)}</span>}<span className="font-display text-xl text-cherry">{eur((offer ? offer.now : unit) * qty)}</span></p>
            </div>
            <button
              disabled={!valid}
              onClick={add}
              className={cx("mt-3 min-h-[50px] w-full rounded-full font-black transition", valid ? "bg-cherry-bright text-cream shadow-lift hover:bg-cherry active:scale-[0.98]" : "cursor-not-allowed bg-cherry/20 text-cream/70")}
            >
              {t("menu.add")} · {eur((offer ? offer.now : unit) * qty)}
            </button>
          </footer>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
