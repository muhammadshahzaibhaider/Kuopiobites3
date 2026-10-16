"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { cx, eur } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { useShop } from "@/lib/store";
import { offerPrice, optionOff, trDesc, trIng, trLabel, trName } from "@/lib/v3";
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
    const defaults: Record<string, string[]> = {};
    for (const group of item?.mods ?? []) {
      const included = group.options.filter((option) => option.toppingId && item?.includedToppingIds?.includes(option.toppingId)).map((option) => option.label);
      if (included.length) defaults[group.id] = included;
    }
    setSel(defaults);
    setNote("");
  }, [item?.id, item?.includedToppingIds, item?.mods]);

  const isBuilder = !!item?.mods?.some((g) => g.id === "top");

  const valid = useMemo(() => {
    if (!item) return false;
    return (item.mods ?? []).every((g) => {
      const n = (sel[g.id] ?? []).length;
      if (g.exact) return n === g.exact;
      const min = g.min ?? (g.required ? 1 : 0);
      return n >= min && n <= (g.max ?? (g.type === "single" ? 1 : 99));
    });
  }, [item, sel]);

  const unit = useMemo(() => {
    if (!item) return 0;
    let p = item.prices[variant]?.value ?? 0;
    for (const g of item.mods ?? []) {
      const picks = sel[g.id] ?? [];
      for (const label of picks) {
        const option = g.options.find((entry) => entry.label === label);
        p += option?.priceByVariant?.[variant] ?? option?.price ?? 0;
      }
      if (g.perVariantExtra && g.min) p += Math.max(0, picks.length - g.min) * (g.perVariantExtra[variant] ?? 0);
      else if (g.perVariantExtra) p += picks.length * (g.perVariantExtra[variant] ?? 0);
    }
    return Math.round(p * 100) / 100;
  }, [item, variant, sel]);

  if (!item) return null;
  const description = trDesc(lang, item);
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
        className="fixed inset-0 z-50 grid place-items-center bg-cherry-dark/60 p-2 backdrop-blur-sm sm:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          ref={dialogRef}
          tabIndex={-1}
          className="max-h-[92dvh] w-full max-w-lg overflow-x-hidden overflow-y-auto overscroll-contain rounded-3xl bg-cream p-4 shadow-lift sm:p-6"
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.97 }}
          transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="item-modal-title"
        >
          {isBuilder && (
            <p className="font-display text-xs font-black uppercase tracking-[0.25em] text-gold-deep">
              {t("menu.selectTopping")}
            </p>
          )}
          <div className="mt-1 flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <MenuImage item={item} sizes="96px" className="h-24 w-24 shrink-0 rounded-2xl" />
              <div className="min-w-0">
                <h3 id="item-modal-title" className="break-words [overflow-wrap:anywhere] font-display text-2xl font-black text-cherry">{trName(lang, item)}</h3>
                {description && <p className="mt-1 text-sm text-cherry/70">{description}</p>}
                <div className="mt-2 flex flex-wrap gap-2">{item.tags?.map((tag) => <TagBadge key={tag} tag={tag} />)}</div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <FavoriteButton itemId={item.id} />
              <button onClick={onClose} aria-label={t("menu.close")} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-cherry/20 text-cherry hover:bg-cherry hover:text-cream">✕</button>
            </div>
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
                      {trLabel(lang, p.label, p.labelEn, p.labelFi)} · {eur(p.value)}
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
                  {g.id === "top" ? `${t("menu.selectTopping")} — ${g.min}+ ` : (lang === "fi" ? g.nameFi ?? g.name : g.name)}
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
                          "min-h-[40px] max-w-full break-words rounded-full border px-3.5 text-left text-sm font-bold capitalize transition [overflow-wrap:anywhere]",
                          picked ? "border-cherry bg-cherry text-cream" : "border-cherry/20 bg-cream-deep text-cherry hover:border-cherry",
                          oOff && "cursor-not-allowed opacity-40 line-through"
                        )}
                      >
                        {(lang === "fi" ? o.labelFi : o.labelEn)?.trim() || trIng(lang, o.label)}
                        {(o.priceByVariant?.[variant] ?? o.price) > 0 && <span className="ml-1 text-xs opacity-70">+{eur(o.priceByVariant?.[variant] ?? o.price)}</span>}
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

          <label className="mt-5 block text-xs font-black uppercase tracking-wide text-cherry/60">
            Special instructions (optional)
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={140}
              className="mt-1 min-h-[44px] w-full rounded-xl border border-cherry/20 bg-cream-deep px-3 text-sm font-bold normal-case placeholder:text-cherry/40"
              placeholder="e.g. no onions"
            />
          </label>

          <div className="sticky bottom-0 z-10 -mx-4 mt-6 border-t-2 border-gold/40 bg-cream/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur sm:-mx-6 sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <QtyStepper qty={qty} onChange={(q) => setQty(Math.max(1, q))} />
              <p className="min-w-0 break-words text-right text-sm font-black text-cherry/70">
                {t("order.total")}:{" "}
                {off && <span className="mr-1 text-cherry/40 line-through">{eur((off.was) * qty)}</span>}
                <span className="font-display text-xl text-cherry">{eur((off ? off.now : unit) * qty)}</span>
              </p>
            </div>
            <button
              disabled={!valid}
              onClick={() => {
                const selections = (item.mods ?? []).flatMap((group) => (sel[group.id] ?? []).map((optionLabel) => ({ groupId: group.id, optionLabel })));
                const options = (item.mods ?? []).flatMap((group) => (sel[group.id] ?? []).map((optionLabel) => {
                  const option = group.options.find((entry) => entry.label === optionLabel);
                  const groupName = lang === "fi" ? group.nameFi ?? group.name : group.name;
                  const optionName = (lang === "fi" ? option?.labelFi : option?.labelEn)?.trim() || trIng(lang, option?.label ?? optionLabel);
                  return `${groupName}: ${optionName}`;
                }));
                addLine({
                  itemId: item.id,
                  name: item.name,
                  variantLabel: item.prices[variant].label || "—",
                  qty,
                  unitPrice: off ? off.now : unit,
                  options,
                  selections,
                  note: note.trim() || undefined,
                  img: settings.itemImages[item.id]?.src,
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
