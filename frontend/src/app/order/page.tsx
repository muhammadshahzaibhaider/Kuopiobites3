"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import AuthForm from "@/components/AuthForm";
import { LineThumb, QtyStepper } from "@/components/ui";
import { cx, eur, fmtDate } from "@/lib/format";
import { computeDiscount, etaLabel, isItemOff, validatePreorder } from "@/lib/v3";
import { orderingInfo } from "@/lib/hours";
import { useLang } from "@/lib/i18n";
import { RESTAURANT } from "@/lib/menu";
import { useShop } from "@/lib/store";

export default function OrderPage() {
  const shop = useShop();
  const router = useRouter();
  const { cart, cartSubtotal, settings, user, setQty, removeLine, clearCart, placeOrder, toast, updateUser, priceCart, serverPricing } = shop;

  const [type, setType] = useState<"pickup" | "delivery">("pickup");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [paying, setPaying] = useState(false);
  const { t, dayName, lang } = useLang();
  const [code, setCode] = useState("");

  const open = orderingInfo(settings);
  const openLabel = open.paused
    ? t("open.paused")
    : open.open
      ? `${t("open.now")} ${open.info.closeAt}`
      : open.info.nextDay === 0
        ? `${t("open.closed")} ${open.info.openAt}`
        : `${t("open.closedDay")} ${open.info.nextDay === 1 ? t("open.tomorrow") : dayName(open.info.nextDay!)} ${open.info.openAt}`;
  const scheduled = cart.find((l) => l.preorder)?.preorder;
  const unavailable = cart.filter((l) => isItemOff(settings, l.itemId));
  const preErr = validatePreorder(settings, cart, scheduled);
  const disc = computeDiscount(settings, cart, cartSubtotal, lang, code);
  const deliveryFee = type === "delivery" && !disc.freeDelivery ? settings.deliveryFee : 0;
  /* local math is display fallback only — the backend is the price authority */
  const localTotal = Math.round((cartSubtotal + deliveryFee - disc.amount) * 100) / 100;
  const total = serverPricing?.total ?? localTotal;
  const vat = serverPricing?.vat ?? Math.round((total * (settings.vatRate / (1 + settings.vatRate))) * 100) / 100;

  useEffect(() => { void priceCart(type, code || undefined); /* server-side reprice on every cart change */ }, [cart, type, code]);

  const postalOk = useMemo(() => {
    if (type !== "delivery") return true;
    const m = address.match(/\b(\d{5})\b/);
    return !!m && m[1].startsWith("70");
  }, [address, type]);
  const minOk = type !== "delivery" || cartSubtotal >= settings.minOrder;
  const canPay = (open.open || !!scheduled) && user && cart.length > 0 && postalOk && minOk && unavailable.length === 0 && !preErr && !paying;

  const pay = async () => {
    if (!user) return;
    setPaying(true);
    // STUB → POST /api/checkout (Stripe hosted checkout session)
    await new Promise((r) => setTimeout(r, 1200));
    if (type === "delivery" && !user.addresses.includes(address)) {
      await updateUser({ addresses: [...user.addresses, address] });
    }
    try {
      const order = await placeOrder({
        type,
        customer: { name: user.name, email: user.email, phone: phone || user.phone || "" },
        address: type === "delivery" ? address : RESTAURANT.address,
        note,
        lines: cart,
        subtotal: cartSubtotal,
        deliveryFee,
        total,
        vat,
        userId: user.id,
        scheduled,
        discount: disc.amount > 0 ? { amount: disc.amount, title: disc.title, offerId: disc.offer?.id } : undefined,
      });
      clearCart();
      toast(t("order.placed"));
      router.push(`/track/${order.id}`);
    } catch (e) {
      toast(t((e as Error).message) ?? (e as Error).message, "err");
    } finally {
      setPaying(false);
    }
  };

  if (cart.length === 0)
    return (
      <div className="container-x pt-32 text-center">
        <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-cream-deep text-cherry/60">
          <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="9" cy="20" r="1.6" /><circle cx="17" cy="20" r="1.6" />
            <path d="M3 4h2.5l2.2 11h9.8l2-8H6.2" />
          </svg>
        </div>
        <h1 className="mt-5 font-display text-3xl font-black text-cherry">{t("cart.empty")}</h1>
        <p className="mt-2 text-cherry/70">Fill it with something hot and delicious first.</p>
        <Link href="/menu" className="mt-6 inline-flex min-h-[48px] items-center rounded-full bg-cherry-bright px-8 font-black text-cream hover:bg-cherry">
          {t("cta.browse")}
        </Link>
      </div>
    );

  return (
    <div className="container-x pt-24 sm:pt-32">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
        <p className="font-script text-2xl text-gold-deep -rotate-1">{t("order.kicker")}</p>
        <h1 className="text-4xl font-black text-cherry">{t("order.title")}</h1>
        <div className="gold-rule mt-4 w-24" />
      </motion.div>

      {!open.open && (
        <div className="mt-6 rounded-2xl border-2 border-cherry-bright/40 bg-cherry-bright/10 p-4 font-bold text-cherry-bright">
          ⏸ {openLabel} — {t("order.closedNote")}.
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          {/* 1 · account */}
          <section>
            <h2 className="mb-3 font-display text-xl font-black text-cherry">
              1 · {user ? `${t("order.account")} — moi, ${user.name.split(" ")[0]}!` : t("nav.signin")}
            </h2>
            {user ? (
              <div className="rounded-3xl border border-cherry/10 bg-cream-deep p-5 text-sm font-bold text-cherry/80 shadow-card">
                {user.name} · {user.email}
                {phone === "" && (
                  <input
                    className="mt-3 min-h-[44px] w-full rounded-2xl border border-cherry/20 bg-cream px-4"
                    placeholder="Phone for order updates"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                )}
              </div>
            ) : (
              <AuthForm />
            )}
          </section>

          {/* 2 · method */}
          <section>
            <h2 className="mb-3 font-display text-xl font-black text-cherry">2 · {t("order.method")}</h2>
            <div className="flex rounded-full bg-cream-deep p-1">
              {(["pickup", "delivery"] as const).map((mth) => (
                <button
                  key={mth}
                  onClick={() => setType(mth)}
                  className={cx("relative min-h-[48px] flex-1 rounded-full font-black capitalize transition", type === mth ? "text-cream" : "text-cherry")}
                >
                  {type === mth && (
                    <motion.span layoutId="method-pill" className="absolute inset-0 rounded-full bg-cherry-bright" transition={{ type: "spring", bounce: 0.25, duration: 0.5 }} />
                  )}
                  <span className="relative">{mth === "pickup" ? `🥡 ${t("order.pickup")}` : `🛵 ${t("order.delivery")}`}</span>
                </button>
              ))}
            </div>
            <div className="mt-4 rounded-3xl border border-cherry/10 bg-cream-deep p-5 shadow-card">
              {type === "pickup" ? (
                <p className="text-sm font-bold text-cherry/80">
                  {t("order.pickupAt")} <span className="text-cherry">{RESTAURANT.address}</span>. {t("order.pickupNote")}
                </p>
              ) : (
                <div className="space-y-3">
                  {user && user.addresses.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {user.addresses.map((a) => (
                        <button key={a} onClick={() => setAddress(a)} className={cx("min-h-[40px] rounded-full border px-3 text-xs font-bold", address === a ? "border-cherry bg-cherry text-cream" : "border-cherry/20 text-cherry")}>
                          {a}
                        </button>
                      ))}
                    </div>
                  )}
                  <textarea
                    rows={2}
                    className="min-h-[64px] w-full rounded-2xl border border-cherry/20 bg-cream px-4 py-3 text-sm font-bold"
                    placeholder="Street, number, postal code (70xxx), city"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                  {!postalOk && address.trim() !== "" && (
                    <p className="text-xs font-bold text-cherry-bright">
                      We deliver within ~{settings.radiusKm} km of Kuopio centre (postal codes 70xxx).
                    </p>
                  )}
                  {!minOk && (
                    <p className="text-xs font-bold text-cherry-bright">
                      Delivery minimum is {eur(settings.minOrder)} — add {eur(settings.minOrder - cartSubtotal)} more.
                    </p>
                  )}
                  <input
                    className="min-h-[44px] w-full rounded-2xl border border-cherry/20 bg-cream px-4 text-sm font-bold"
                    placeholder="Phone for the courier"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              )}
              <textarea
                rows={2}
                className="mt-3 min-h-[56px] w-full rounded-2xl border border-cherry/20 bg-cream px-4 py-3 text-sm font-bold"
                placeholder="Note for the kitchen (allergies, door code…)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </section>
        </div>

        {/* summary */}
        <aside className="h-fit rounded-3xl border-2 border-gold/50 bg-cream-deep p-6 shadow-lift lg:sticky lg:top-28">
          <h2 className="font-display text-xl font-black text-cherry">{t("order.summary")}</h2>
          <ul className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1">
            {cart.map((l) => (
              <li key={l.key} className="flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="font-black text-cherry">{l.name}</p>
                  <p className="text-xs text-cherry/60">{l.variantLabel}{l.options.length ? ` · ${l.options.join(" · ")}` : ""}</p>
                  <div className="mt-1.5 flex items-center gap-3">
                    <QtyStepper small qty={l.qty} onChange={(q) => setQty(l.key, q)} />
                    <button onClick={() => removeLine(l.key)} className="text-xs font-bold text-cherry/50 underline hover:text-cherry-bright">{t("cart.remove")}</button>
                  </div>
                </div>
                <span className="font-black tabular-nums">{eur(l.unitPrice * l.qty)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-5 space-y-1.5 border-t-2 border-gold/40 pt-4 text-sm font-bold text-cherry/80">
            <div className="flex justify-between"><dt>{t("cart.subtotal")}</dt><dd className="tabular-nums">{eur(cartSubtotal)}</dd></div>
            <div className="flex justify-between"><dt>{t("order.fee")}</dt><dd className="tabular-nums">{type === "delivery" && settings.deliveryFee && !disc.freeDelivery ? eur(settings.deliveryFee) : "—"}</dd></div>
            {disc.amount > 0 && (
              <div className="flex justify-between text-[#2e7d32]"><dt>− {disc.title}</dt><dd className="tabular-nums">−{eur(disc.amount)}</dd></div>
            )}
            <div className="flex justify-between text-xs text-cherry/60"><dt>{t("order.vat")} {Math.round(settings.vatRate * 100)}%</dt><dd className="tabular-nums">{eur(vat)}</dd></div>
            <div className="flex justify-between pt-2 font-display text-xl font-black text-cherry"><dt>{t("order.total")}</dt><dd className="tabular-nums">{eur(total)}</dd></div>
          </dl>
          <div className="mt-3 space-y-2">
            <label className="block text-xs font-black uppercase text-cherry/60">{t("order.promo")}</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t("order.promoPh")}
              className="min-h-[44px] w-full rounded-full border border-cherry/20 bg-cream-deep px-4 text-sm font-bold uppercase placeholder:normal-case placeholder:text-cherry/40"
            />
            {disc.offer?.code && <p className="text-xs font-black text-[#2e7d32]">✓ {disc.title}</p>}
          </div>
          <dl className="mt-4 space-y-1 border-t border-cherry/10 pt-3 text-sm">
            {scheduled ? (
              <div className="flex justify-between font-black text-gold-deep"><dt>{t("pre.scheduled")}</dt><dd>{fmtDate(scheduled.date)} {t("pre.at")} {scheduled.time}</dd></div>
            ) : (
              <div className="flex justify-between"><dt>{t("order.eta")}</dt><dd className="font-black text-cherry">{etaLabel(lang, type)}</dd></div>
            )}
          </dl>
          {scheduled && <p className="mt-2 text-xs text-cherry/70">{t("pre.mix")}</p>}
          {unavailable.length > 0 && (
            <p className="mt-2 rounded-xl bg-brick/10 p-3 text-xs font-black text-brick">{t("cart.unavailBlock")} {unavailable.map((l) => l.name).join(", ")}</p>
          )}
          {preErr && <p className="mt-2 rounded-xl bg-brick/10 p-3 text-xs font-black text-brick">{t(preErr)}</p>}
          {(settings.platforms.wolt || settings.platforms.uberEats) && (
            <p className="mt-3 text-xs text-cherry/60">
              {t("order.platforms")}:{" "}
              {settings.platforms.wolt && <a href={settings.platforms.wolt} target="_blank" rel="noreferrer" className="font-black text-gold-deep underline decoration-gold underline-offset-4">Wolt</a>}
              {settings.platforms.wolt && settings.platforms.uberEats && " · "}
              {settings.platforms.uberEats && <a href={settings.platforms.uberEats} target="_blank" rel="noreferrer" className="font-black text-gold-deep underline decoration-gold underline-offset-4">Uber Eats</a>}
            </p>
          )}
          <button
            onClick={pay}
            disabled={!canPay}
            className={cx(
              "mt-5 min-h-[52px] w-full rounded-full font-black text-cream transition",
              canPay ? "bg-cherry-bright shadow-lift hover:-translate-y-0.5 hover:bg-cherry active:scale-[0.98]" : "cursor-not-allowed bg-cherry/25"
            )}
          >
            {paying ? `${t("order.paying")} 🔒` : `${t("order.pay")} · ${eur(total)}`}
          </button>
          <p className="mt-2 text-center text-[11px] text-cherry/50">
            {t("order.secure")}
          </p>
        </aside>
      </div>
    </div>
  );
}
