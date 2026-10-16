"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import { cx, eur, fmtTime } from "@/lib/format";
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
  const { orders, orderStatus } = useShop();
  const { t } = useLang();
  useTick(2000); // re-derive time-based status

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
  const idx = STEPS.findIndex((s) => s.id === status);
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

      <div className="mt-8 rounded-3xl border-2 border-gold/50 bg-cream-deep p-6 sm:p-8 shadow-lift">
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
