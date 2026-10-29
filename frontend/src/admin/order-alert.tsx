"use client";
import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { orderLineDetails } from "@/lib/cart-lines";
import { cx, eur, fmtTime } from "@/lib/format";
import { useShop } from "@/lib/store";
import type { Order } from "@/lib/types";
import { useModalA11y } from "@/components/useModalA11y";
import { Ic } from "./icons";

/* Full-screen "new order" takeover. It sits above every other admin surface
   until the kitchen accepts or declines the order. Nothing moves the order
   forward on its own — this is the only place a new ticket leaves "placed". */
export default function NewOrderAlert({
  order,
  queued,
  onResolved,
  onLater,
}: {
  order: Order;
  queued: number;
  onResolved: () => void;
  onLater: () => void;
}) {
  const { setOrderStatus, setOrderReadyTime, settings, toast } = useShop();
  const [minutes, setMinutes] = useState(settings.readyTimeMinutes || 25);
  const [declining, setDeclining] = useState(false);
  const [busy, setBusy] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  useModalA11y(true, onLater, cardRef);

  useEffect(() => {
    setMinutes(settings.readyTimeMinutes || 25);
    setDeclining(false);
    setBusy(false);
  }, [order.id, settings.readyTimeMinutes]);

  const portions = useMemo(() => order.lines.reduce((n, l) => n + l.qty, 0), [order.lines]);

  const accept = async () => {
    setBusy(true);
    try {
      await setOrderReadyTime(order.id, minutes);
      const ok = await setOrderStatus(order.id, "accepted");
      if (ok) toast(`Order ${order.id} accepted · ready in ${minutes} min`);
      onResolved();
    } finally {
      setBusy(false);
    }
  };

  const decline = async () => {
    setBusy(true);
    try {
      const ok = await setOrderStatus(order.id, "cancelled");
      if (ok) toast(`Order ${order.id} declined`, "err");
      onResolved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-cherry-dark/80 p-3 backdrop-blur-md sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      role="dialog"
      aria-modal="true"
      aria-label={`New order ${order.id}`}
    >
      <motion.div
        ref={cardRef}
        tabIndex={-1}
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", bounce: 0.18, duration: 0.45 }}
        className="w-full max-w-2xl overflow-hidden rounded-3xl border border-gold/40 bg-cream shadow-lift"
      >
        {/* banner */}
        <div className="relative overflow-hidden bg-cherry px-5 py-5 text-cream sm:px-7">
          <span className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-gold/15 blur-2xl" />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-gold px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-cherry-dark">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cherry-dark/60 motion-reduce:animate-none" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-cherry-dark" />
                </span>
                New order
              </span>
              <h2 className="mt-2 font-display text-3xl font-black tracking-tight sm:text-4xl">{order.id}</h2>
              <p className="mt-1 text-sm font-bold text-cream/70">
                {fmtTime(order.createdAt)} · {order.type === "delivery" ? "Delivery" : "Pickup"} · {portions} item{portions === 1 ? "" : "s"} ·{" "}
                <span className="font-black text-gold">{eur(order.total)}</span>
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="grid h-12 w-12 place-items-center rounded-2xl border border-cream/20 bg-cream/10">
                <Ic n="bell" size={22} className="text-gold" />
              </div>
              {queued > 0 && <span className="rounded-full bg-cream/15 px-2.5 py-1 text-[10px] font-black text-cream/80">+{queued} waiting</span>}
            </div>
          </div>
        </div>

        <div className="max-h-[58vh] overflow-y-auto px-5 py-5 sm:px-7">
          <div className="grid gap-4 sm:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-3">
              <div className="rounded-2xl border border-cherry/10 bg-white/70 p-3.5">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cherry/40">Customer</p>
                <p className="mt-1 font-display text-lg font-black text-cherry">{order.customer.name}</p>
                <p className="text-xs font-bold text-cherry/60">
                  {order.customer.phone}
                  {order.customer.email ? ` · ${order.customer.email}` : ""}
                </p>
                {order.type === "delivery" && order.address && <p className="mt-2 text-xs font-bold text-cherry/75">{order.address}</p>}
                {order.note && <p className="mt-2 rounded-lg bg-gold/10 px-2 py-1.5 text-xs font-bold text-gold-deep">Note: {order.note}</p>}
              </div>

              <div className="rounded-2xl border border-cherry/10 bg-white/70 p-3.5">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cherry/40">Items</p>
                <ul className="mt-1.5 space-y-1.5">
                  {order.lines.map((l) => (
                    <li key={l.key} className="flex items-start justify-between gap-2 text-sm">
                      <span className="min-w-0">
                        <span className="font-black text-cherry">{l.qty}× {l.name}</span>
                        {orderLineDetails(l).map((row) => (
                          <span key={row} className="block text-[11px] font-semibold text-cherry/55">{row}</span>
                        ))}
                      </span>
                      <span className="shrink-0 font-black tabular-nums text-cherry/80">{eur(l.unitPrice * l.qty)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 flex justify-between border-t border-cherry/10 pt-2 text-sm font-black text-cherry">
                  <span>Total</span>
                  <span className="tabular-nums">{eur(order.total)}</span>
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border-2 border-gold/50 bg-gold/5 p-3.5">
                <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-gold-deep">
                  <Ic n="timer" size={13} /> Promise time
                </p>
                <p className="mt-1 font-display text-4xl font-black tabular-nums text-cherry">
                  {minutes} <span className="text-base font-bold text-cherry/50">min</span>
                </p>
                <p className="text-[11px] font-bold text-cherry/50">Customer sees a live countdown</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[15, 20, 25, 30, 40, 45].map((m) => (
                    <button
                      key={m}
                      onClick={() => setMinutes(m)}
                      className={cx(
                        "min-h-[30px] rounded-lg border px-2.5 text-xs font-black tabular-nums transition",
                        minutes === m ? "border-cherry bg-cherry text-cream" : "border-cherry/20 bg-white/70 text-cherry hover:border-cherry"
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={5}
                  max={240}
                  value={minutes}
                  onChange={(e) => setMinutes(Math.max(5, Math.min(240, parseInt(e.target.value) || 5)))}
                  aria-label="Promise time in minutes"
                  className="mt-2 min-h-[34px] w-full rounded-lg border border-cherry/20 bg-white px-2.5 text-sm font-black tabular-nums text-cherry"
                />
              </div>

              <div className="rounded-2xl border border-cherry/10 bg-white/70 p-3.5">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cherry/40">Payment</p>
                <p className="mt-1 text-sm font-black text-cherry">{order.paymentStatus === "demo_paid" ? "Demo payment" : "Paid online"}</p>
                <p className="text-[11px] font-semibold text-cherry/50">{eur(order.total)} · {order.type === "delivery" ? "delivery" : "pickup"}</p>
              </div>
            </div>
          </div>

          {declining && (
            <div className="mt-4 rounded-2xl border border-brick/30 bg-brick/5 p-3.5">
              <p className="text-xs font-black text-brick">Decline this order?</p>
              <p className="mt-0.5 text-[11px] font-semibold text-brick/70">The order is marked cancelled and the customer sees it on their tracking page.</p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-cherry/10 bg-cream-deep/60 px-5 py-4 sm:px-7">
          {!declining ? (
            <>
              <button onClick={onLater} className="text-xs font-black text-cherry/45 underline decoration-cherry/20 underline-offset-4 hover:text-cherry">
                View later
              </button>
              <span className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => setDeclining(true)}
                  disabled={busy}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-cherry/20 px-3 text-xs font-black text-cherry transition hover:border-brick hover:text-brick disabled:opacity-50"
                >
                  <Ic n="close" size={14} /> Decline
                </button>
                <button
                  onClick={() => void accept()}
                  disabled={busy}
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-[#2e7d32] px-4 text-sm font-black text-cream shadow-card transition hover:bg-[#256428] disabled:opacity-60"
                >
                  <Ic n="check" size={15} /> {busy ? "Saving…" : `Accept · ${minutes} min`}
                </button>
              </span>
            </>
          ) : (
            <>
              <button onClick={() => setDeclining(false)} disabled={busy} className="inline-flex min-h-[40px] items-center rounded-lg border border-cherry/20 px-3 text-xs font-black text-cherry disabled:opacity-50">
                Back
              </button>
              <span className="ml-auto">
                <button
                  onClick={() => void decline()}
                  disabled={busy}
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-brick px-4 text-sm font-black text-cream shadow-card transition hover:bg-[#94301f] disabled:opacity-60"
                >
                  <Ic n="close" size={15} /> {busy ? "Saving…" : "Confirm decline"}
                </button>
              </span>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
