"use client";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { eur, fmtDate, vatPct } from "@/lib/format";
import { isItemOff } from "@/lib/v3";
import { useLang } from "@/lib/i18n";
import { useShop } from "@/lib/store";
import { LineThumb, QtyStepper } from "./ui";

export default function CartDrawer() {
  const { cart, cartOpen, setCartOpen, setQty, removeLine, cartSubtotal, settings } = useShop();
  const { t } = useLang();
  const router = useRouter();
  const scheduled = cart.find((l) => l.preorder)?.preorder;
  const unavailable = cart.filter((l) => isItemOff(settings, l.itemId));

  return (
    <AnimatePresence>
      {cartOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-cherry-dark/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCartOpen(false)}
          />
          <motion.aside
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-cream shadow-lift"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.45 }}
            aria-label="Shopping cart"
          >
            <div className="flex items-center justify-between border-b-2 border-gold/40 p-5">
              <h2 className="font-display text-2xl font-black text-cherry">{t("cart.title")}</h2>
              <button
                onClick={() => setCartOpen(false)}
                aria-label="Close cart"
                className="grid h-11 w-11 place-items-center rounded-full border border-cherry/20 text-cherry hover:bg-cherry hover:text-cream"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {cart.length === 0 ? (
                <div className="mt-16 text-center">
                  <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-cream-deep text-4xl"></div>
                  <p className="mt-4 font-display text-xl font-black text-cherry">{t("cart.empty")}</p>
                  <p className="mt-1 text-sm text-cherry/70">{t("cart.emptyNote")}</p>
                  <Link
                    href="/menu"
                    onClick={() => setCartOpen(false)}
                    className="mt-5 inline-flex min-h-[44px] items-center rounded-full bg-cherry-bright px-6 font-bold text-cream hover:bg-cherry"
                  >
                    {t("cta.browse")}
                  </Link>
                </div>
              ) : (
                <ul className="space-y-4">
                  <AnimatePresence initial={false}>
                    {cart.map((l) => (
                      <motion.li
                        key={l.key}
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 40 }}
                        className="rounded-2xl border border-cherry/10 bg-cream-deep p-4 shadow-card"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <LineThumb itemId={l.itemId} name={l.name} size={56} />
                            <div className="min-w-0">
                            <p className="font-display font-black text-cherry">{l.name}</p>
                            <p className="text-xs font-bold text-cherry/60">{l.variantLabel}</p>
                            {l.preorder && (
                              <p className="mt-1 inline-flex rounded-full bg-gold/20 px-2 py-0.5 text-[11px] font-black text-gold-deep">
                                {t("pre.chip")} · {fmtDate(l.preorder.date)} {t("pre.at")} {l.preorder.time}
                              </p>
                            )}
                            {isItemOff(settings, l.itemId) && (
                              <p className="mt-1 rounded-lg bg-brick/10 px-2 py-1 text-[11px] font-black text-brick">
                                {t("avail.unavailable")} — {t("cart.unavailNote")}
                              </p>
                            )}
                            {l.options.length > 0 && (
                              <ul className="mt-1 space-y-0.5 text-xs text-cherry/70">
                                {l.options.map((o, i) => (
                                  <li key={i}>· {o}</li>
                                ))}
                              </ul>
                            )}
                            </div>
                          </div>
                          <button
                            onClick={() => removeLine(l.key)}
                            aria-label={`Remove ${l.name}`}
                            className="text-cherry/50 transition hover:text-cherry-bright"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <QtyStepper small qty={l.qty} onChange={(q) => setQty(l.key, q)} />
                          <span className="font-black tabular-nums text-cherry">
                            {eur(l.unitPrice * l.qty)}
                          </span>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t-2 border-gold/40 p-5">
                <div className="flex justify-between text-sm text-cherry/80">
                  <span>{t("cart.subtotal")}</span>
                  <span className="font-black text-cherry">{eur(cartSubtotal)}</span>
                </div>
                {scheduled && (
                  <p className="mt-1 text-sm font-black text-gold-deep">
                    {t("pre.scheduled")} {fmtDate(scheduled.date)} {t("pre.at")} {scheduled.time}
                  </p>
                )}
                <p className="mt-1 text-xs text-cherry/60">
                  {t("cart.vat")} {vatPct(settings.vatRate)} · {t("cart.deliveryNote")}
                </p>
                {unavailable.length > 0 && (
                  <p className="mt-2 rounded-xl bg-brick/10 p-3 text-xs font-black text-brick">
                    {t("cart.unavailBlock")} {unavailable.map((l) => l.name).join(", ")}
                  </p>
                )}
                <button
                  disabled={unavailable.length > 0}
                  onClick={() => {
                    setCartOpen(false);
                    router.push("/order");
                  }}
                  className="mt-4 w-full min-h-[52px] rounded-full bg-cherry-bright font-black text-cream shadow-lift transition hover:-translate-y-0.5 hover:bg-cherry active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-cherry/20 disabled:shadow-none"
                >
                  {t("cart.checkout")}
                </button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
