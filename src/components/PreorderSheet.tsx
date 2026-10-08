"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState } from "react";
import { cx, eur, fmtDate } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { MENU } from "@/lib/menu";
import { useShop } from "@/lib/store";
import { nextPreorderSundays } from "@/lib/v3";
import type { MenuItem } from "@/lib/types";
import { MenuImage, QtyStepper } from "./ui";
import { useModalA11y } from "./useModalA11y";

export default function PreorderSheet({ item, onClose }: { item: MenuItem | null; onClose: () => void }) {
  const { settings, addLine, toast } = useShop();
  const { t, dayName, lang } = useLang();
  const sundays = nextPreorderSundays(settings, 3);
  const [date, setDate] = useState<string>(sundays[0] ?? "");
  const [time, setTime] = useState<string>("");
  const [qty, setQty] = useState(1);
  const [extraPuri, setExtraPuri] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalA11y(!!item, onClose, dialogRef);

  if (!item) return null;
  const pre = settings.preorder;
  const extraItem = MENU.find((m) => m.name === "Extra Puri");
  const unit = item.prices[0].value;
  const total = unit * qty + (extraItem?.prices[0].value ?? 0.7) * extraPuri;
  const valid = pre.enabled && date && time;

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
          ref={dialogRef}
          tabIndex={-1}
          className="max-h-[86vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-cream p-6 shadow-lift"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={item.name}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <MenuImage item={item} sizes="96px" className="h-24 w-24 shrink-0 rounded-2xl" />
              <div>
                <p className="font-display text-xs font-black uppercase tracking-[0.25em] text-gold-deep">{t("pre.title")}</p>
                <h3 className="mt-1 font-display text-2xl font-black text-cherry">{item.name}</h3>
                {item.desc && <p className="mt-1 text-sm text-cherry/70">{item.desc}</p>}
                <p className="mt-1 inline-flex rounded-full bg-gold/20 px-3 py-1 text-xs font-black text-gold-deep">{t("pre.badge")}</p>
              </div>
            </div>
            <button onClick={onClose} aria-label="Close item details" className="grid h-11 w-11 place-items-center rounded-full border border-cherry/20 text-cherry hover:bg-cherry hover:text-cream">✕</button>
          </div>

          {!pre.enabled ? (
            <p className="mt-6 rounded-2xl bg-brick/10 p-4 font-bold text-brick">{t("pre.closed")}</p>
          ) : (
            <>
              <p className="mt-4 rounded-2xl bg-cream-deep p-3 text-sm font-bold text-cherry/80">
                {lang === "fi" ? pre.noteFi : pre.noteEn} · {t("pre.orderBy")} {dayName(pre.cutoffDay)} {pre.cutoffTime}
              </p>

              <div className="mt-5">
                <p className="text-xs font-black uppercase text-cherry/60">{t("pre.next")}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {sundays.map((d) => (
                    <button key={d} onClick={() => { setDate(d); setTime(""); }} className={cx("min-h-[44px] rounded-full border-2 px-4 text-sm font-black", date === d ? "border-cherry-bright bg-cherry-bright text-cream" : "border-cherry/20 text-cherry")}>
                      {fmtDate(d)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs font-black uppercase text-cherry/60">{t("pre.slot")}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {pre.slots.map((s) => (
                    <button key={s} onClick={() => setTime(s)} className={cx("min-h-[44px] rounded-full border-2 px-4 text-sm font-black tabular-nums", time === s ? "border-cherry-bright bg-cherry-bright text-cream" : "border-cherry/20 text-cherry")}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-6">
                <div>
                  <p className="text-xs font-black uppercase text-cherry/60">{t("pre.qty")}</p>
                  <div className="mt-2"><QtyStepper qty={qty} onChange={(q) => setQty(Math.max(1, q))} /></div>
                </div>
                {extraItem && (
                  <div>
                    <p className="text-xs font-black uppercase text-cherry/60">{t("pre.addon")} · {eur(extraItem.prices[0].value)}</p>
                    <div className="mt-2"><QtyStepper qty={extraPuri} onChange={(q) => setExtraPuri(Math.max(0, q))} /></div>
                  </div>
                )}
              </div>

              <button
                disabled={!valid}
                onClick={() => {
                  const po = { date, time };
                  addLine({ itemId: item.id, name: item.name, variantLabel: "—", qty, unitPrice: unit, options: [], preorder: po });
                  if (extraPuri > 0 && extraItem)
                    addLine({ itemId: extraItem.id, name: extraItem.name, variantLabel: "—", qty: extraPuri, unitPrice: extraItem.prices[0].value, options: [], preorder: po });
                  toast(`${item.name} ${t("menu.added")}`);
                  onClose();
                }}
                className={cx("mt-6 min-h-[52px] w-full rounded-full font-black transition", valid ? "bg-cherry-bright text-cream shadow-lift hover:bg-cherry" : "cursor-not-allowed bg-cherry/20 text-cream/70")}
              >
                {t("pre.btn")} · {eur(total)}
              </button>
              <p className="mt-2 text-xs text-cherry/60">{t("pre.mix")}</p>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
