"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { eur, fmtDate, vatPct } from "@/lib/format";
import { lineErrorKey } from "@/lib/cart-errors";
import { cartOptionLabel, isItemOff } from "@/lib/v3";
import { whatsappUrl } from "@/lib/menu";
import { useLang } from "@/lib/i18n";
import { useShop } from "@/lib/store";
import { LineThumb, QtyStepper } from "./ui";
import WhatsAppIcon from "./WhatsAppIcon";

export default function CartDrawer() {
  const {
    cart, cartOpen, setCartOpen, setQty, removeLine, cartSubtotal, settings, adminItems,
    priceCart, serverPricing, cartIssuesDismissed, dismissCartIssues,
  } = useShop();
  const { t, lang } = useLang();
  const router = useRouter();
  const pathname = usePathname();

  /* The order page owns the quote while it is mounted (it knows pickup/delivery
     and the postcode). Everywhere else, quote once when the drawer opens so a
     stale row is flagged before the customer reaches checkout. */
  useEffect(() => {
    if (!cartOpen || !cart.length || pathname === "/order") return;
    const timer = window.setTimeout(() => { void priceCart("pickup", undefined, undefined, lang); }, 250);
    return () => window.clearTimeout(timer);
  }, [cartOpen, cart.length, pathname, lang, priceCart]);

  const invalidCount = serverPricing?.invalidCount ?? 0;
  const subtotalShown = serverPricing?.subtotal ?? cartSubtotal;
  const lineErrors = serverPricing?.lineErrors ?? {};
  /* Per-line share of the live offer, sent by the server with the quote — the
     drawer can then show the reduced price next to each dish. */
  const lineDiscounts = serverPricing?.lineDiscounts ?? {};
  const activeDiscount = serverPricing?.discount;
  const lineNet = (key: string, gross: number) =>
    Math.max(0, Math.round((gross - (lineDiscounts[key] ?? 0)) * 100) / 100);
  const showIssues = invalidCount > 0 && !cartIssuesDismissed;
  const scheduled = cart.find((l) => l.preorder)?.preorder;
  const unavailable = cart.filter((l) => isItemOff(settings, l.itemId));
  const whatsappMessage = [
    "Hello Kuopio Bites! I'd like to order:",
    ...cart.map((l) => `- ${l.name} | ${l.variantLabel || "standard"} | ${l.options.length ? l.options.map((option) => cartOptionLabel(adminItems.find((item) => item.id === l.itemId), settings, lang, option)).join(", ") : "no options"} | qty ${l.qty} | ${eur(l.unitPrice * l.qty)}`),
    `Total: ${eur(cartSubtotal)}`,
  ].join("\n");

  if (pathname.startsWith("/admin")) return null;

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
                <>
                {showIssues && (
                  <div role="status" className="mb-4 flex items-start gap-3 rounded-2xl border border-gold-deep/30 bg-gold/15 p-3 text-xs text-cherry">
                    <div className="min-w-0">
                      <p className="font-black">{t("cart.issuesTitle")}</p>
                      <p className="mt-1 leading-snug text-cherry/80">{t("cart.issuesBody")}</p>
                    </div>
                    <button
                      type="button"
                      onClick={dismissCartIssues}
                      aria-label={t("cart.issuesDismiss")}
                      className="ml-auto shrink-0 rounded-full px-1.5 text-base leading-none text-cherry/60 hover:text-cherry"
                    >
                      ✕
                    </button>
                  </div>
                )}
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
                            {lineErrors[l.key] && !isItemOff(settings, l.itemId) && (
                              <div className="mt-1 flex flex-wrap items-center gap-2 rounded-lg bg-brick/10 px-2 py-1 text-[11px] font-black text-brick">
                                <span>{t(lineErrorKey(lineErrors[l.key]))}</span>
                                <button
                                  type="button"
                                  onClick={() => removeLine(l.key)}
                                  className="rounded-full border border-brick/40 px-2 py-0.5 underline-offset-2 hover:bg-brick hover:text-cream"
                                >
                                  {t("cart.removeBtn")}
                                </button>
                              </div>
                            )}
                            {l.options.length > 0 && (
                              <ul className="mt-1 space-y-0.5 text-xs text-cherry/70">
                                {l.options.map((o, i) => (
                                  <li key={i}>· {cartOptionLabel(adminItems.find((item) => item.id === l.itemId), settings, lang, o)}</li>
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
                          <span className="text-right font-black tabular-nums text-cherry">
                            {lineErrors[l.key] ? "—" : (
                              <>
                                {(lineDiscounts[l.key] ?? 0) > 0 && (
                                  <span className="mr-1 text-xs font-bold text-cherry/40 line-through">{eur(l.unitPrice * l.qty)}</span>
                                )}
                                {eur(lineNet(l.key, l.unitPrice * l.qty))}
                              </>
                            )}
                          </span>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
                </>
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t-2 border-gold/40 p-5">
                <div className="flex justify-between text-sm text-cherry/80">
                  <span>{t("cart.subtotal")}</span>
                  <span className="font-black text-cherry">{eur(subtotalShown)}</span>
                </div>
                {activeDiscount && activeDiscount.amount > 0 && (
                  <div className="mt-1 flex justify-between text-sm font-black text-[#2e7d32]">
                    <span className="min-w-0 truncate">− {activeDiscount.title}</span>
                    <span className="tabular-nums">−{eur(activeDiscount.amount)}</span>
                  </div>
                )}
                {activeDiscount && activeDiscount.amount > 0 && serverPricing && (
                  <div className="mt-1 flex justify-between text-sm font-black text-cherry">
                    <span>{t("order.total")}</span>
                    <span className="tabular-nums">{eur(serverPricing.total)}</span>
                  </div>
                )}
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
                <a href={whatsappUrl(whatsappMessage)} target="_blank" rel="noopener noreferrer" className="mt-4 flex min-h-[48px] w-full items-center justify-center rounded-full border-2 border-[#168c4a] font-black text-[#168c4a] transition hover:bg-[#168c4a] hover:text-cream">
                  <WhatsAppIcon />
                  Chat on WhatsApp
                </a>
                {invalidCount > 0 && (
                  <p className="mt-2 rounded-xl bg-brick/10 p-3 text-xs font-black text-brick">
                    {t("cart.issuesBlock")}
                  </p>
                )}
                <button
                  disabled={unavailable.length > 0 || invalidCount > 0}
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
