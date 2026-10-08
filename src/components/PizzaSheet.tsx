"use client";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { cx, eur } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { useShop } from "@/lib/store";
import {
  builderUnitPrice, optionOff, pizzaIncluded,
  pizzaUnitPrice, toppingExtraPrice, toppingLabel, trLabel, trName,
} from "@/lib/v3";
import type { MenuItem } from "@/lib/types";
import { PizzaImage, QtyStepper } from "./ui";
import { useModalA11y } from "./useModalA11y";

/**
 * Wolt-style pizza sheet: size + extra toppings with live total.
 * Bottom sheet on mobile, centered modal on desktop.
 * Classic pizzas: included toppings shown (never double-charged, can be doubled as extras).
 * Fantasia/Pannu: SELECT TOPPING tier logic (extras beyond the tier min).
 */
export default function PizzaSheet({ item, onClose }: { item: MenuItem | null; onClose: () => void }) {
  const { settings, addLine, toast } = useShop();
  const { t, lang } = useLang();
  const [variant, setVariant] = useState(0); // default Med.
  const [qty, setQty] = useState(1);
  const [extras, setExtras] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalA11y(!!item, onClose, dialogRef);

  useEffect(() => {
    setVariant(0);
    setQty(1);
    setExtras({});
    setNote("");
  }, [item?.id]);

  const isBuilder = !!item?.mods?.some((g) => g.id === "top");
  const included = useMemo(() => (item && !isBuilder ? pizzaIncluded(item) : []), [item, isBuilder]);

  if (!item) return null;

  const extraList = Object.entries(extras).filter(([, c]) => c > 0).map(([label, count]) => ({ label, count }));
  const count = extraList.reduce((a, e) => a + e.count, 0);
  const min = item.mods?.find((g) => g.id === "top")?.min ?? 0;
  const unit = isBuilder ? builderUnitPrice(item, variant, count) : pizzaUnitPrice(settings, item, variant, extraList);
  const valid = !isBuilder || count >= min;
  const incLabels = included.map((l) => toppingLabel(settings, lang, l));

  const toggleExtra = (label: string) => {
    if (optionOff(settings, "topping", label)) return;
    setExtras((e) => {
      const c = (e[label] ?? 0) + 1;
      const next = { ...e, [label]: c };
      if (c > 3) delete next[label]; // cap doubles/triples
      return next;
    });
  };

  const add = () => {
    const sizeLabel = item.prices[variant].label;
    const opt: string[] = [];
    if (incLabels.length) opt.push(`Sisältää: ${incLabels.join(", ")}`);
    if (extraList.length)
      opt.push(
        `${isBuilder ? "Täytteet" : "Lisätäytteet"}: ` +
          extraList
            .map((e) => `${e.label}${e.count > 1 ? ` ×${e.count}` : ""}${isBuilder ? "" : ` (+${eur(toppingExtraPrice(settings, e.label, variant) * e.count)})`}`)
            .join(", ")
      );
    if (note.trim()) opt.push(`Note: ${note.trim()}`);
    addLine({
      itemId: item.id,
      name: item.name,
      variantLabel: sizeLabel || "—",
      qty,
      unitPrice: unit,
      options: opt,
      note: note.trim() || undefined,
      pizza: {
        sizeLabel: sizeLabel || "—",
        included: isBuilder ? [] : included,
        extras: extraList,
        builder: isBuilder,
      },
    });
    toast(`${trName(lang, item)} ${t("menu.added")}`);
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
          className="absolute inset-x-0 bottom-0 flex max-h-[92vh] flex-col rounded-t-3xl bg-cream shadow-lift sm:static sm:max-h-[88vh] sm:w-full sm:max-w-lg sm:rounded-3xl"
          initial={{ y: 120, opacity: 0.5 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={trName(lang, item)}
        >
          {/* header */}
          <div className="relative shrink-0 border-b-2 border-gold/40 p-5 pb-4">
            <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full border border-cherry/20 bg-cream text-cherry hover:bg-cherry hover:text-cream">✕</button>
            <div className="flex items-start gap-4">
              <div className="w-24 shrink-0 sm:w-28">
                <PizzaImage item={item} className="rounded-2xl" />
              </div>
              <div className="min-w-0">
                <h3 className="font-display text-xl font-black leading-tight text-cherry">{trName(lang, item)}</h3>
                {incLabels.length > 0 && (
                  <p className="mt-1 text-xs font-bold text-cherry/70">
                    {t("pizza.included")}: {incLabels.join(", ")}
                  </p>
                )}
                {isBuilder && (
                  <p className="mt-1 font-display text-xs font-black uppercase tracking-[0.2em] text-gold-deep">
                    {t("menu.selectTopping")} — {min}+ · {t("menu.builder")}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {/* size */}
            <p className="text-xs font-black uppercase tracking-wide text-cherry/60">{t("pizza.size")} *</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {item.prices.map((p, i) => (
                <button
                  key={p.label || i}
                  onClick={() => setVariant(i)}
                  aria-pressed={variant === i}
                  className={cx(
                    "min-h-[44px] flex-1 rounded-2xl border-2 px-4 text-sm font-black transition sm:flex-none",
                    variant === i ? "border-cherry-bright bg-cherry-bright text-cream" : "border-cherry/20 text-cherry hover:border-cherry-bright"
                  )}
                >
                  {trLabel(lang, p.label)} · {eur(p.value)}
                </button>
              ))}
            </div>

            {/* toppings */}
            <p className="mt-5 text-xs font-black uppercase tracking-wide text-cherry/60">
              {isBuilder ? t("menu.selectTopping") : t("pizza.extras")}
              <span className="ml-2 rounded-full bg-gold/20 px-2 py-0.5 text-[11px] normal-case text-gold-deep">
                {count} {t("pizza.toppingsCount")}
                {isBuilder && ` / ${min}+`}
              </span>
            </p>
            {!isBuilder && (
              <p className="mt-1 text-xs text-cherry/60">
                +{eur(toppingExtraPrice(settings, settings.toppings[0] ?? "", variant))} / {lang === "fi" ? "kpl (Med / Perhe)" : "each (Med / Perhe)"}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {settings.toppings.map((tp) => {
                const n = extras[tp] ?? 0;
                const off = optionOff(settings, "topping", tp);
                const inc = included.includes(tp.toLowerCase());
                return (
                  <button
                    key={tp}
                    disabled={off}
                    onClick={() => toggleExtra(tp)}
                    aria-pressed={n > 0}
                    className={cx(
                      "relative min-h-[40px] rounded-full border px-3.5 text-sm font-bold capitalize transition",
                      n > 0 ? "border-cherry bg-cherry text-cream" : "border-cherry/20 bg-cream-deep text-cherry hover:border-cherry",
                      off && "cursor-not-allowed opacity-40 line-through"
                    )}
                  >
                    {toppingLabel(settings, lang, tp)}
                    {n > 0 && <span className="ml-1.5 rounded-full bg-cream px-1.5 text-xs font-black text-cherry">{n > 1 ? `×${n} ${t("pizza.double")}` : `+${eur(toppingExtraPrice(settings, tp, variant))}`}</span>}
                    {n === 0 && inc && !off && (
                      <span className="ml-1.5 text-[10px] font-black uppercase text-gold-deep">{t("pizza.included")}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* note */}
            <label className="mt-5 block text-xs font-black uppercase tracking-wide text-cherry/60">
              {t("pizza.note")}
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={140}
                className="mt-1 min-h-[44px] w-full rounded-xl border border-cherry/20 bg-cream-deep px-3 text-sm font-bold normal-case placeholder:text-cherry/40"
                placeholder={lang === "fi" ? "esim. ilman sipulia" : "e.g. no onions"}
              />
            </label>
          </div>

          {/* sticky footer */}
          <div className="shrink-0 border-t-2 border-gold/40 bg-cream p-4">
            <div className="flex items-center justify-between gap-3">
              <QtyStepper qty={qty} onChange={(q) => setQty(Math.max(1, q))} />
              {!valid && <span className="text-xs font-black text-brick">{min - count} {t("menu.selectTopping").toLowerCase()}…</span>}
            </div>
            <button
              disabled={!valid}
              onClick={add}
              className={cx(
                "mt-3 flex min-h-[52px] w-full items-center justify-between rounded-full px-6 font-black transition",
                valid ? "bg-cherry-bright text-cream shadow-lift hover:bg-cherry active:scale-[0.98]" : "cursor-not-allowed bg-cherry/20 text-cream/70"
              )}
            >
              <span>{t("pizza.add")}</span>
              <span className="font-display text-lg tabular-nums">{eur(unit * qty)}</span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export { Image };
