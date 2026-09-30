"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { cx, eur } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { useShop } from "@/lib/store";
import { offerPrice, optionOff, trDesc, trIng, trLabel, trName } from "@/lib/v3";
import type { MenuItem } from "@/lib/types";
import { QtyStepper, TagBadge } from "./ui";

export default function ItemModal({ item, onClose }: { item: MenuItem | null; onClose: () => void }) {
  const { addLine, toast, settings } = useShop();
  const { t, lang } = useLang();
  const [variant, setVariant] = useState(0);
  const [qty, setQty] = useState(1);
  const [sel, setSel] = useState<Record<string, string[]>>({});

  useEffect(() => {
    setVariant(0);
    setQty(1);
    setSel({});
  }, [item?.id]);

  const isBuilder = !!item?.mods?.some((g) => g.id === "top");

  const valid = useMemo(() => {
    if (!item) return false;
    return (item.mods ?? []).every((g) => {
      const n = (sel[g.id] ?? []).length;
      if (g.type === "single") return g.required ? n === 1 : true;
      if (g.min) return n >= g.min && n <= (g.max ?? 99);
      if (g.exact) return n === g.exact;
      return n <= (g.max ?? 99);
    });
  }, [item, sel]);

  const unit = useMemo(() => {
    if (!item) return 0;
    let p = item.prices[variant]?.value ?? 0;
    for (const g of item.mods ?? []) {
      const picks = sel[g.id] ?? [];
      for (const label of picks) p += g.options.find((o) => o.label === label)?.price ?? 0;
      if (g.perVariantExtra && g.min) p += Math.max(0, picks.length - g.min) * (g.perVariantExtra[variant] ?? 0);
      else if (g.perVariantExtra) p += picks.length * (g.perVariantExtra[variant] ?? 0);
    }
    return Math.round(p * 100) / 100;
  }, [item, variant, sel]);

  if (!item) return null;
  const off = offerPrice(settings, item, variant);

  const optKey = (g: { id: string }) =>
    g.id === "top" ? "topping" : g.id === "dips" ? "dip" : `mod:${item.id}:${g.id}`;

  const toggle = (gid: string, label: string, type: "single" | "multi", max?: number) => {
    setSel((s) => {
      const cur = s[gid] ?? [];
      if (type === "single") return { ...s, [gid]: [label] };
      if (cur.includes(label)) return { ...s, [gid]: cur.filter((x) => x !== label) };
      if (max && cur.length >= max) return s;
      return { ...s, [gid]: [...cur, label] };
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 grid place-items-center bg-cherry-dark/60 p-4 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="max-h-[86vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-cream p-6 shadow-lift"
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.97 }}
          transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={trName(lang, item)}
        >
          {isBuilder && (
            <p className="font-display text-xs font-black uppercase tracking-[0.25em] text-gold-deep">
              {t("menu.selectTopping")}
            </p>
          )}
          <div className="mt-1 flex items-start justify-between gap-4">
            <div>
              <h3 className="font-display text-2xl font-black text-cherry">{trName(lang, item)}</h3>
              {item.desc && <p className="mt-1 text-sm text-cherry/70">{trDesc(lang, item)}</p>}
              <div className="mt-2 flex gap-2">{item.tags?.map((tag) => <TagBadge key={tag} tag={tag} />)}</div>
            </div>
            <button onClick={onClose} aria-label="Close" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-cherry/20 text-cherry hover:bg-cherry hover:text-cream">✕</button>
          </div>

          {item.prices.length > 1 && (
            <div className="mt-5">
              <p className="text-xs font-black uppercase tracking-wide text-cherry/60">{t("menu.size")}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {item.prices.map((p, i) => {
                  const sizeOff = optionOff(settings, `size:${item.id}`, p.label);
                  return (
                    <button
                      key={p.label}
                      disabled={sizeOff}
                      onClick={() => setVariant(i)}
                      className={cx(
                        "min-h-[44px] rounded-full border-2 px-4 text-sm font-black transition",
                        i === variant ? "border-cherry-bright bg-cherry-bright text-cream" : "border-cherry/20 text-cherry hover:border-cherry-bright",
                        sizeOff && "opacity-40 line-through"
                      )}
                    >
                      {trLabel(lang, p.label)} · {eur(p.value)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {(item.mods ?? []).map((g) => {
            const picks = sel[g.id] ?? [];
            const extras = g.min ? Math.max(0, picks.length - g.min) : 0;
            return (
              <div key={g.id} className="mt-5">
                <p className="text-xs font-black uppercase tracking-wide text-cherry/60">
                  {g.id === "top" ? `${t("menu.selectTopping")} — ${g.min}+ ` : g.name}
                  {g.min && (
                    <span className="ml-2 rounded-full bg-gold/20 px-2 py-0.5 text-[11px] text-gold-deep">
                      {picks.length}/{g.min}+ {t("menu.picked")}
                      {extras > 0 && ` · +${extras}`}
                    </span>
                  )}
                </p>
                {g.id === "top" && <p className="mt-1 text-xs text-cherry/60">{t("menu.builder")}</p>}
                <div className="mt-2 flex flex-wrap gap-2">
                  {g.options.map((o) => {
                    const picked = picks.includes(o.label);
                    const oOff = optionOff(settings, optKey(g), o.label);
                    return (
                      <button
                        key={o.label}
                        disabled={oOff}
                        onClick={() => !oOff && toggle(g.id, o.label, g.type, g.max)}
                        className={cx(
                          "min-h-[40px] rounded-full border px-3.5 text-sm font-bold capitalize transition",
                          picked ? "border-cherry bg-cherry text-cream" : "border-cherry/20 bg-cream-deep text-cherry hover:border-cherry",
                          oOff && "cursor-not-allowed opacity-40 line-through"
                        )}
                      >
                        {trIng(lang, o.label)}
                        {o.price > 0 && <span className="ml-1 text-xs opacity-70">+{eur(o.price)}</span>}
                      </button>
                    );
                  })}
                </div>
                {g.min && extras > 0 && (
                  <p className="mt-1 text-xs font-bold text-gold-deep">
                    {t("menu.extras")} → +{eur(extras * (g.perVariantExtra?.[variant] ?? 0))}
                  </p>
                )}
              </div>
            );
          })}

          <div className="mt-6 border-t-2 border-gold/40 pt-5">
            <div className="flex items-center justify-between gap-4">
              <QtyStepper qty={qty} onChange={(q) => setQty(Math.max(1, q))} />
              <p className="text-sm font-black text-cherry/70">
                {t("order.total")}:{" "}
                {off && <span className="mr-1 text-cherry/40 line-through">{eur((off.was) * qty)}</span>}
                <span className="font-display text-xl text-cherry">{eur((off ? off.now : unit) * qty)}</span>
              </p>
            </div>
            <button
              disabled={!valid}
              onClick={() => {
                const gName: Record<string, string> = { top: "Täytteet", spice: "Spice", sauce: "Kastike", dips: "Dipit" };
                const options: string[] = [];
                for (const g of item.mods ?? []) {
                  const p = sel[g.id] ?? [];
                  if (p.length) options.push(`${gName[g.id] ?? g.name}: ${p.join(", ")}`);
                }
                addLine({
                  itemId: item.id,
                  name: item.name,
                  variantLabel: item.prices[variant].label || "—",
                  qty,
                  unitPrice: off ? off.now : unit,
                  options,
                });
                toast(`${trName(lang, item)} ${t("menu.added")}`);
                onClose();
              }}
              className={cx(
                "mt-4 min-h-[52px] w-full rounded-full font-black transition",
                valid ? "bg-cherry-bright text-cream shadow-lift hover:-translate-y-0.5 hover:bg-cherry active:scale-[0.98]" : "cursor-not-allowed bg-cherry/20 text-cream/70"
              )}
            >
              {t("menu.add")} · {eur((off ? off.now : unit) * qty)}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
