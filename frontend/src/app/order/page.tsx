"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import AuthForm from "@/components/AuthForm";
import { LineThumb, QtyStepper } from "@/components/ui";
import { cx, eur, fmtDate, vatPct } from "@/lib/format";
import { lineErrorKey } from "@/lib/cart-errors";
import { cartOptionLabel, computeDiscount, etaLabel, isItemOff, validatePreorder } from "@/lib/v3";
import { orderingInfo } from "@/lib/hours";
import { useLang } from "@/lib/i18n";
import { RESTAURANT } from "@/lib/menu";
import { useShop } from "@/lib/store";
import OrderStreak from "@/components/OrderStreak";
import { apiAccountStreak } from "@/lib/api";

export default function OrderPage() {
  const shop = useShop();
  const router = useRouter();
  const { cart, cartSubtotal, settings, settingsReady, user, setQty, removeLine, clearCart, startCheckout, toast, updateUser, priceCart, serverPricing } = shop;

  const [type, setType] = useState<"pickup" | "delivery">("pickup");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [paying, setPaying] = useState(false);
  const { t, dayName, lang } = useLang();
  const [code, setCode] = useState("");
  const [redeemStreak, setRedeemStreak] = useState(false);
  const [streakReady, setStreakReady] = useState(false);

  /* Opening hours are time-of-day data: never render them during prerender or
     the first client pass (#418), and never from the bundled defaults while the
     real settings are still loading. `hoursReady` keeps both passes identical;
     the text stays hidden until it is true, so nothing wrong ever flashes. */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const hoursReady = mounted && settingsReady;
  const open = useMemo(() => orderingInfo(settings), [settings, mounted, settingsReady]);
  const openLabel = !hoursReady
    ? ""
    : open.paused
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
  const serverDiscount = serverPricing?.discount;
  const activeDiscount = serverDiscount ?? disc;
  const deliveryFee = serverPricing?.deliveryFee ?? (type === "delivery" && !activeDiscount.freeDelivery ? settings.deliveryFee : 0);
  /* local math is a first-paint fallback only — checkout and the live quote use server pricing */
  const localTotal = Math.round((cartSubtotal + deliveryFee - activeDiscount.amount) * 100) / 100;
  const total = serverPricing?.total ?? localTotal;
  /* When rows are excluded the local sum is stale — show the quoted subtotal. */
  const subtotalShown = serverPricing?.subtotal ?? cartSubtotal;
  const vat = serverPricing?.vat ?? Math.round((total * (settings.vatRate / (1 + settings.vatRate))) * 100) / 100;

  useEffect(() => {
    setPhone(user?.phone ?? "");
  }, [user?.phone]);
  useEffect(() => {
    if (!user || !settings.orderStreak?.enabled) { setStreakReady(false); return; }
    let live = true;
    apiAccountStreak().then((row) => { if (live) setStreakReady(Boolean(row.rewardReady)); }).catch(() => { if (live) setStreakReady(false); });
    return () => { live = false; };
  }, [user, settings.orderStreak?.enabled]);
  const rewardId = settings.orderStreak?.rewardItemId;
  const canRedeem = streakReady && Boolean(rewardId) && cart.some((line) => line.itemId === rewardId);

  useEffect(() => {
    if (type !== "delivery" || address.trim()) return;
    const saved = user?.addresses?.find((item) => item.trim());
    if (saved) setAddress(saved);
  }, [type, user?.addresses, address]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void priceCart(type, code || undefined, address || undefined, lang); }, 350);
    return () => window.clearTimeout(timer);
  }, [cart, type, code, address, lang, priceCart]);

  const kuopioPostcode = /\b70\s?\d{3}\b/.test(address);
  const postalOk = type !== "delivery" || kuopioPostcode;
  const deliveryTotal = serverPricing?.total ?? localTotal;
  const minOk = type !== "delivery" || deliveryTotal >= settings.minOrder;
  const tooFar = type === "delivery" && serverPricing?.deliveryDistanceKm !== undefined && settings.radiusKm > 0 && serverPricing.deliveryDistanceKm > settings.radiusKm;
  const phoneDigits = phone.replace(/\D/g, "").length;
  const phoneOk = phoneDigits >= 9;
  const invalidCount = serverPricing?.invalidCount ?? 0;
  const lineErrors = serverPricing?.lineErrors ?? {};
  /* The server splits the live offer over the covered lines, so each dish can
     show its reduced price instead of one discount row at the very bottom. */
  const lineDiscounts = serverPricing?.lineDiscounts ?? {};
  const lineNet = (key: string, gross: number) =>
    Math.max(0, Math.round((gross - (lineDiscounts[key] ?? 0)) * 100) / 100);
  /* `mounted` keeps the SSR/first-client button state identical; `invalidCount`
     blocks checkout until the affected rows are removed (server stays strict). */
  const payBlockers = useMemo(() => {
    const reasons: string[] = [];
    if (!hoursReady) return reasons;
    if (!user) reasons.push(t("order.needLogin"));
    if (!phoneOk) reasons.push(t("order.needPhone"));
    if (type === "delivery" && !address.trim()) reasons.push(t("order.needAddress"));
    else if (!postalOk) reasons.push(t("order.needPostcode"));
    if (!minOk) reasons.push(`Delivery minimum is ${eur(settings.minOrder)} — add ${eur(Math.max(0, settings.minOrder - deliveryTotal))} more.`);
    if (tooFar) reasons.push(t("order.deliveryRadius"));
    if (!(open.open || !!scheduled)) reasons.push(t("order.closedNote"));
    if (unavailable.length > 0) reasons.push(`${t("cart.unavailBlock")} ${unavailable.map((l) => l.name).join(", ")}`);
    if (invalidCount > 0) reasons.push(t("cart.issuesBlock"));
    if (preErr) reasons.push(t(preErr));
    return reasons;
  }, [hoursReady, user, phoneOk, type, address, postalOk, minOk, settings.minOrder, deliveryTotal, tooFar, open.open, scheduled, unavailable, invalidCount, preErr, t]);
  const canPay = hoursReady && payBlockers.length === 0 && !paying && cart.length > 0;

  const pay = async () => {
    if (!canPay) {
      if (payBlockers[0]) toast(payBlockers[0], "err");
      return;
    }
    if (!user) return;
    setPaying(true);
    if (type === "delivery" && !user.addresses.includes(address)) {
      await updateUser({ addresses: [...user.addresses, address] });
    }
    const digits = (phone || "").replace(/\D/g, "");
    if (digits.length >= 9 && phone.trim() !== (user.phone ?? "").trim()) {
      await updateUser({ phone: phone.trim() });
    }
    try {
      const checkout = await startCheckout({
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
        lang,
        code: code || undefined,
        redeemStreak: canRedeem && redeemStreak,
        discount: disc.amount > 0 ? { amount: disc.amount, title: disc.title, offerId: disc.offer?.id } : undefined,
      });
      if (checkout.mode === "stripe" && checkout.url) {
        window.location.assign(checkout.url);
        return;
      }
      if (!checkout.order) throw new Error("payment.unavailable");
      clearCart();
      toast(t("order.placed"));
      router.push(`/track/${checkout.order.id}`);
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

      {hoursReady && !open.open && (
        <div className="mt-6 rounded-2xl border-2 border-cherry-bright/40 bg-cherry-bright/10 p-4 font-bold text-cherry-bright">
          ⏸ {openLabel} — {t("order.closedNote")}.
        </div>
      )}
      {invalidCount > 0 && (
        <div role="status" className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border-2 border-gold-deep/40 bg-gold/15 p-4 text-sm font-bold text-cherry">
          <div className="min-w-0">
            <p className="font-black">{t("cart.issuesTitle")}</p>
            <p className="mt-1 text-cherry/80">{t("cart.issuesBody")}</p>
          </div>
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
                <OrderStreak compact />
                <p className="mt-4">{user.name} · {user.email}</p>
                {canRedeem && (
                  <label className="mt-4 flex items-center gap-3 rounded-2xl bg-gold/20 px-4 py-3 text-cherry">
                    <input type="checkbox" checked={redeemStreak} onChange={(e) => setRedeemStreak(e.target.checked)} className="h-5 w-5 accent-[#0F3D3E]" />
                    {t("streak.use")}
                  </label>
                )}
                <label className="mt-3 block text-xs font-black uppercase tracking-wide text-cherry/50">{t("order.phone")}</label>
                <input
                  type="tel"
                  autoComplete="tel"
                  className="mt-1 min-h-[44px] w-full rounded-2xl border border-cherry/20 bg-cream px-4"
                  placeholder="Phone for order updates (required)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
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
                  {serverPricing?.deliveryDistanceKm !== undefined && (
                    <p className="text-xs font-bold text-cherry/60">{t("order.drivingDistance")}: {serverPricing.deliveryDistanceKm.toFixed(1)} km</p>
                  )}
                  {tooFar && <p className="text-xs font-black text-cherry-bright">{t("order.deliveryRadius")}</p>}
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
                  <p className="text-xs text-cherry/60">{l.variantLabel}{l.options.length ? ` · ${l.options.map((option) => cartOptionLabel(shop.adminItems.find((item) => item.id === l.itemId), settings, lang, option)).join(" · ")}` : ""}</p>
                  <div className="mt-1.5 flex items-center gap-3">
                    <QtyStepper small qty={l.qty} onChange={(q) => setQty(l.key, q)} />
                    <button onClick={() => removeLine(l.key)} className="text-xs font-bold text-cherry/50 underline hover:text-cherry-bright">{t("cart.remove")}</button>
                  </div>
                  {lineErrors[l.key] && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 rounded-lg bg-brick/10 px-2 py-1 text-[11px] font-black text-brick">
                      <span>{t(lineErrorKey(lineErrors[l.key]))}</span>
                      <button type="button" onClick={() => removeLine(l.key)} className="rounded-full border border-brick/40 px-2 py-0.5 hover:bg-brick hover:text-cream">
                        {t("cart.removeBtn")}
                      </button>
                    </div>
                  )}
                </div>
                <span className="text-right font-black tabular-nums">
                  {lineErrors[l.key] ? "—" : (
                    <>
                      {(lineDiscounts[l.key] ?? 0) > 0 && (
                        <span className="mr-1 text-xs font-bold text-cherry/40 line-through">{eur(l.unitPrice * l.qty)}</span>
                      )}
                      {eur(lineNet(l.key, l.unitPrice * l.qty))}
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <dl className="mt-5 space-y-1.5 border-t-2 border-gold/40 pt-4 text-sm font-bold text-cherry/80">
            <div className="flex justify-between"><dt>{t("cart.subtotal")}</dt><dd className="tabular-nums">{eur(subtotalShown)}</dd></div>
            <div className="flex justify-between"><dt>{t("order.fee")}</dt><dd className="tabular-nums">{type === "delivery" ? (activeDiscount.freeDelivery ? t("order.free") : eur(deliveryFee)) : "—"}</dd></div>
            {activeDiscount.amount > 0 && (
              <div className="flex justify-between text-[#2e7d32]"><dt>− {activeDiscount.title}</dt><dd className="tabular-nums">−{eur(activeDiscount.amount)}</dd></div>
            )}
            <div className="flex justify-between text-xs text-cherry/60"><dt>{t("order.vat")} {vatPct(settings.vatRate)}</dt><dd className="tabular-nums">{eur(vat)}</dd></div>
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
          {invalidCount > 0 && (
            <p className="mt-2 rounded-xl bg-brick/10 p-3 text-xs font-black text-brick">{t("cart.issuesBlock")}</p>
          )}
          {(settings.platforms.wolt || settings.platforms.uberEats) && (
            <p className="mt-3 text-xs text-cherry/60">
              {t("order.platforms")}:{" "}
              {settings.platforms.wolt && <a href={settings.platforms.wolt} target="_blank" rel="noopener noreferrer" className="font-black text-gold-deep underline decoration-gold underline-offset-4">Wolt</a>}
              {settings.platforms.wolt && settings.platforms.uberEats && " · "}
              {settings.platforms.uberEats && <a href={settings.platforms.uberEats} target="_blank" rel="noopener noreferrer" className="font-black text-gold-deep underline decoration-gold underline-offset-4">Uber Eats</a>}
            </p>
          )}
          {payBlockers.length > 0 && (
            <ul className="mt-4 space-y-1 rounded-xl bg-brick/10 p-3 text-xs font-black text-brick">
              {payBlockers.map((reason) => <li key={reason}>{reason}</li>)}
            </ul>
          )}
          <button
            onClick={() => { void pay(); }}
            aria-disabled={!canPay}
            className={cx(
              "mt-5 min-h-[52px] w-full rounded-full font-black text-cream transition",
              canPay ? "bg-cherry-bright shadow-lift hover:-translate-y-0.5 hover:bg-cherry active:scale-[0.98]" : "bg-cherry/40 hover:bg-cherry/50"
            )}
          >
            {paying ? `${t("order.paying")} 🔒` : `${t("order.pay")} · ${eur(total)}`}
          </button>
          <p className="mt-2 text-center text-[11px] text-cherry/50">
            {canPay ? t("order.secure") : t("order.payBlocked")}
          </p>
        </aside>
      </div>
    </div>
  );
}
