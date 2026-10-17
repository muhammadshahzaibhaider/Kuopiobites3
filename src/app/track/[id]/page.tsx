"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import { clockLabel, countdownLabel, cx, eur, fmtTime, readyAtOf } from "@/lib/format";
import { RESTAURANT } from "@/lib/menu";
import { fmtDate } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { useShop, useTick } from "@/lib/store";
import type { OrderStatus } from "@/lib/types";

const STEPS: { id: OrderStatus; icon: string }[] = [
  { id: "placed", icon: "🧾" },
  { id: "accepted", icon: "✅" },
  { id: "preparing", icon: "👨‍🍳" },
  { id: "ready", icon: "🛵" },
  { id: "completed", icon: "😋" },
];

export default function TrackPage() {
  const { id } = useParams<{ id: string }>();
  const { orders, orderStatus, settings } = useShop();
  const { t } = useLang();
  useTick(1000); // live promise-time countdown

  const order = orders.find((o) => o.id === id);
  if (!order)
    return (
      <div className="container-x pt-32 text-center">
        <h1 className="font-display text-3xl font-black text-cherry">Order not found</h1>
        <p className="mt-2 text-cherry/70">We couldn't find order “{id}” on this device.</p>
        <Link href="/menu" className="mt-6 inline-flex min-h-[48px] items-center rounded-full bg-cherry-bright px-8 font-black text-cream">Back to menu</Link>
      </div>
    );

  const status = orderStatus(order);
  const cancelled = status === "cancelled";
  const idx = STEPS.findIndex((s) => s.id === status);
  const promiseAt = readyAtOf({ createdAt: order.createdAt, etaMinutes: order.etaMinutes ?? settings.prepTimeMinutes, readyAt: order.readyAt });
  const msLeft = promiseAt - Date.now();
  const etaMinutes = order.etaMinutes ?? settings.prepTimeMinutes;
  const statusLine =
    status === "placed" ? "Waiting for the kitchen to confirm your order" :
    status === "accepted" ? "Kitchen confirmed — we've started on it" :
    status === "preparing" ? "Your food is being prepared right now" :
    status === "ready" ? (order.type === "delivery" ? "Out for delivery" : "Ready for pickup") :
    status === "completed" ? "Order completed — enjoy!" : "This order was cancelled";
  const label = (s: OrderStatus) =>
    s === "ready"
      ? order.type === "delivery"
        ? "Out for delivery"
        : "Ready for pickup"
      : (s[0].toUpperCase() + s.slice(1));

  return (
    <div className="container-x max-w-3xl pt-24 sm:pt-32">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
        <p className="font-script text-2xl text-gold-deep -rotate-1">{t("track.kicker")}</p>
        <h1 className="text-3xl sm:text-4xl font-black text-cherry">
          Order {order.id}
          {order.refunded && (
            <span className="ml-3 rounded-full bg-cherry-bright/15 px-3 py-1 text-sm font-black text-cherry-bright">REFUNDED</span>
          )}
        </h1>
        <p className="mt-1 text-sm font-bold text-cherry/60">
          Placed {fmtTime(order.createdAt)} · {order.type === "delivery" ? `Delivery to ${order.address}` : `Pickup at ${RESTAURANT.address}`}
        </p>
      </motion.div>

      {/* live promise timer */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className={cx(
          "mt-6 overflow-hidden rounded-3xl border-2 shadow-card",
          cancelled ? "border-brick/40 bg-brick/5" : status === "completed" ? "border-[#2e7d32]/40 bg-[#e6f4e7]" : "border-gold/60 bg-cherry-deep text-cream"
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
          <div>
            <p className={cx("flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.22em]", cancelled ? "text-brick" : status === "completed" ? "text-[#2e7d32]" : "text-gold-soft")}>
              <span className={cx("grid h-6 w-6 place-items-center rounded-full", cancelled ? "bg-brick/10" : status === "completed" ? "bg-[#2e7d32]/10" : "bg-gold/15")}>
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l3 2M9 2h6" /></svg>
              </span>
              {t("order.eta")}
            </p>
            <p className={cx("mt-1 font-display text-4xl font-black tabular-nums sm:text-5xl", cancelled ? "text-brick" : status === "completed" ? "text-[#2e7d32]" : "text-cream")}>
              {cancelled ? "—" : status === "completed" ? "Enjoy!" : msLeft <= 0 ? "Any minute" : countdownLabel(msLeft)}
            </p>
            <p className={cx("mt-1 text-sm font-bold", cancelled ? "text-brick/70" : status === "completed" ? "text-[#2e7d32]/75" : "text-cream/65")}>
              {cancelled
                ? order.cancelledReason || "Please call us if you have any questions."
                : `Promise time ${clockLabel(promiseAt)} · about ${etaMinutes} min`}
            </p>
          </div>
          <span className={cx(
            "rounded-full px-3 py-1.5 text-[11px] font-black",
            cancelled ? "bg-brick text-cream" : status === "completed" ? "bg-[#2e7d32] text-cream" : "bg-gold text-cherry-dark"
          )}>
            {statusLine}
          </span>
        </div>
        {!cancelled && (
          <div className={cx("h-1.5 w-full", status === "completed" ? "bg-[#2e7d32]/15" : "bg-cream/10")}>
            <motion.div
              className={cx("h-full", status === "completed" ? "bg-[#2e7d32]" : "bg-gold")}
              initial={{ width: 0 }}
              animate={{ width: `${status === "completed" ? 100 : Math.max(4, Math.min(100, (1 - msLeft / (etaMinutes * 60000)) * 100))}%` }}
              transition={{ duration: 0.6 }}
            />
          </div>
        )}
      </motion.div>

      <div className="mt-6 rounded-3xl border-2 border-gold/50 bg-cream-deep p-6 sm:p-8 shadow-lift">
        {cancelled ? (
          <div className="py-4 text-center">
            <p className="text-3xl">😔</p>
            <p className="mt-2 font-display text-xl font-black text-brick">This order was cancelled</p>
            <p className="mt-1 text-sm font-bold text-cherry/55">If this looks wrong, call us on {RESTAURANT.phone} and we'll sort it out.</p>
          </div>
        ) : (
        <ol className="relative space-y-7">
          {STEPS.map((s, i) => {
            const done = i <= idx;
            const current = i === idx;
            return (
              <li key={s.id} className="relative flex items-center gap-4">
                {i < STEPS.length - 1 && (
                  <span className="absolute left-[23px] top-12 h-[calc(100%-24px)] w-1 rounded bg-cherry/10" aria-hidden>
                    <motion.span
                      className="block w-full origin-top bg-gold"
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: i < idx ? 1 : 0 }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      style={{ height: "100%" }}
                    />
                  </span>
                )}
                <motion.span
                  animate={current ? { scale: [1, 1.12, 1] } : {}}
                  transition={{ duration: 1.4, repeat: current && status !== "completed" ? Infinity : 0 }}
                  className={cx(
                    "z-10 grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 text-xl",
                    done ? "border-cherry-bright bg-cherry-bright text-cream" : "border-cherry/20 bg-cream text-cherry/40"
                  )}
                >
                  {s.icon}
                </motion.span>
                <div>
                  <p className={cx("font-display text-lg font-black", done ? "text-cherry" : "text-cherry/40")}>
                    {label(s.id)}
                  </p>
                  <p className="text-xs font-bold text-cherry/50">
                    {i === idx && status !== "completed"
                      ? "happening now…"
                      : i < idx
                        ? "done"
                        : "up next"}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
        )}
      </div>

      <div className="mt-6 rounded-3xl border border-cherry/10 bg-cream-deep p-6 shadow-card">
        <h2 className="font-display text-lg font-black text-cherry">{t("track.contents")}</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {order.lines.map((l, i) => (
            <li key={i} className="flex justify-between gap-4">
              <span className="font-bold text-cherry/80">
                {l.qty}× {l.name}
                {l.options.length > 0 && <span className="block text-xs text-cherry/50">{l.options.join(" · ")}</span>}
              </span>
              <span className="font-black tabular-nums">{eur(l.unitPrice * l.qty)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1 border-t-2 border-gold/40 pt-3 text-sm font-bold text-cherry/80">
          <div className="flex justify-between"><dt>{t("cart.subtotal")}</dt><dd>{eur(order.subtotal)}</dd></div>
          <div className="flex justify-between"><dt>{t("order.fee")}</dt><dd>{order.deliveryFee ? eur(order.deliveryFee) : "—"}</dd></div>
          {order.discount && order.discount.amount > 0 && (
            <div className="flex justify-between text-[#2e7d32]"><dt>− {order.discount.title}</dt><dd>−{eur(order.discount.amount)}</dd></div>
          )}
          <div className="flex justify-between font-display text-lg font-black text-cherry"><dt>{t("order.total")} ({t("order.vat")})</dt><dd>{eur(order.total)}</dd></div>
          {order.scheduled && (
            <div className="flex justify-between text-gold-deep"><dt>{t("pre.scheduled")}</dt><dd>{fmtDate(order.scheduled.date)} {t("pre.at")} {order.scheduled.time}</dd></div>
          )}
        </dl>
        {order.note && <p className="mt-3 text-xs text-cherry/60">{t("track.note")} {order.note}</p>}
      </div>

      <p className="mt-6 text-center text-sm font-bold text-cherry/60">
        {t("track.questions")}{" "}
        <a href={RESTAURANT.phoneHref} className="text-cherry-bright underline decoration-gold underline-offset-4">{RESTAURANT.phone}</a>
      </p>
    </div>
  );
}
