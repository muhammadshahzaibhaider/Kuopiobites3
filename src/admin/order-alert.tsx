"use client";
import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { clockLabel, cx, eur } from "@/lib/format";
import { useShop } from "@/lib/store";
import type { Order } from "@/lib/types";
import { Ic } from "./icons";
import { GhostBtn, SolidBtn } from "./ui";
import { useModalA11y } from "@/components/useModalA11y";

/* Full-screen "new order" takeover. It sits above every other admin surface
   until the kitchen accepts or declines the order. */
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
  const { acceptOrder, declineOrder, settings, toast } = useShop();
  const [minutes, setMinutes] = useState(settings.prepTimeMinutes || 25);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  useModalA11y(true, onLater, cardRef);

  useEffect(() => {
    setMinutes(settings.prepTimeMinutes || 25);
    setDeclining(false);
    setReason("");
    setBusy(false);
  }, [order.id, settings.prepTimeMinutes]);

  const portions = useMemo(
    () => order.lines.reduce((n, l) => n + l.qty, 0),
    [order.lines]
  );

  const accept = async () => {
    setBusy(true);
    try {
      await acceptOrder(order.id, minutes);
      toast(`Order ${order.id} accepted · ready in ${minutes} min`);
      onResolved();
    } finally {
      setBusy(false);
    }
  };

  const decline = async () => {
    setBusy(true);
    try {
      await declineOrder(order.id, reason.trim() || "Declined by kitchen");
      toast(`Order ${order.id} declined`, "err");
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
        initial={{ opacity: 0, y: 34, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", bounce: 0.18, duration: 0.5 }}
        className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-gold/40 bg-cream shadow-lift"
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
                {clockLabel(order.createdAt)} · {order.type === "delivery" ? "Delivery" : "Pickup"} · {portions} item{portions === 1 ? "" : "s"} · <span className="font-black text-gold-soft">{eur(order.total)}</span>
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="grid h-12 w-12 place-items-center rounded-2xl border border-cream/20 bg-cream/10">
                <Ic n="bell" size={22} className="text-gold-soft" />
              </div>
              {queued > 0 && (
                <span className="rounded-full bg-cream/15 px-2.5 py-1 text-[10px] font-black text-cream/80">+{queued} waiting</span>
              )}
            </div>
          </div>
        </div>

        <div className="max-h-[62vh] overflow-y-auto px-5 py-5 sm:px-7">
          <div className="grid gap-5 sm:grid-cols-[1.15fr_0.85fr]">
            {/* customer */}
            <div className="space-y-3">
              <div className="rounded-2xl border border-cherry/10 bg-white/60 p-3.5">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cherry/40">Customer</p>
                <p className="mt-1 font-display text-lg font-black text-cherry">{order.customer.name}</p>
                <p className="text-xs font-bold text-cherry/60">{order.customer.phone}{order.customer.email ? ` · ${order.customer.email}` : ""}</p>
                {order.type === "delivery" && order.address && (
                  <p className="mt-2 flex items-start gap-1.5 text-xs font-bold text-cherry/75">
                    <Ic n="mapPin" size={13} className="mt-0.5 shrink-0 text-gold-deep" /> {order.address}
                  </p>
                )}
                {order.note && (
                  <p className="mt-2 rounded-xl border border-gold/40 bg-gold/10 px-2.5 py-1.5 text-xs font-bold text-gold-deep">
                    Note: {order.note}
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-cherry/10 bg-white/60 p-3.5">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cherry/40">Order</p>
                <ul className="mt-2 space-y-1.5">
                  {order.lines.map((l, i) => (
                    <li key={i} className="flex justify-between gap-3 text-sm">
                      <span className="font-bold text-cherry/80">
                        <span className="mr-1 inline-block min-w-[24px] rounded-md bg-cherry/10 px-1 text-center text-xs font-black text-cherry">{l.qty}×</span>
                        {l.name}
                        {l.variantLabel && l.variantLabel !== "—" && <span className="text-xs font-bold text-cherry/45"> · {l.variantLabel}</span>}
                        {l.options.length > 0 && <span className="block pl-8 text-[11px] font-semibold text-cherry/45">{l.options.join(" · ")}</span>}
                      </span>
                      <span className="shrink-0 text-xs font-black tabular-nums text-cherry/60">{eur(l.unitPrice * l.qty)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* promise time */}
            <div className="space-y-3">
              <div className="rounded-2xl border-2 border-gold/50 bg-gold/5 p-3.5">
                <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-gold-deep">
                  <Ic n="timer" size={13} /> Promise time
                </p>
                <p className="mt-1 font-display text-3xl font-black tabular-nums text-cherry">
                  {minutes} <span className="text-base font-bold text-cherry/50">min</span>
                </p>
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {[10, 15, 20, 25, 30, 45].map((m) => (
                    <button
                      key={m}
                      onClick={() => setMinutes(m)}
                      className={cx(
                        "min-h-[34px] rounded-lg border text-xs font-black tabular-nums transition",
                        minutes === m ? "border-cherry bg-cherry text-cream" : "border-cherry/20 bg-white/70 text-cherry hover:border-cherry"
                      )}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
                <label className="mt-2 flex items-center gap-2 text-[11px] font-bold text-cherry/60">
                  Custom
                  <input
                    type="number"
                    min={1}
                    max={240}
                    value={minutes}
                    onChange={(e) => setMinutes(Math.max(1, Math.min(240, parseInt(e.target.value) || 1)))}
                    className="h-9 w-20 rounded-lg border border-cherry/20 bg-white/80 px-2 text-sm font-black tabular-nums text-cherry"
                  />
                  min · ready at {clockLabel(Date.now() + minutes * 60000)}
                </label>
                <p className="mt-1 text-[10px] font-semibold text-cherry/45">Shown to the customer as a live countdown on their tracking page.</p>
              </div>

              <div className="rounded-2xl border border-cherry/10 bg-white/60 p-3.5">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cherry/40">Payment</p>
                <p className="mt-1 text-sm font-black text-cherry">{order.paymentId}</p>
                <p className="text-[11px] font-semibold text-cherry/50">Paid online · {eur(order.total)}</p>
              </div>
            </div>
          </div>

          {declining && (
            <div className="mt-4 rounded-2xl border border-brick/30 bg-brick/5 p-3.5">
              <p className="text-xs font-black text-brick">Decline this order?</p>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason (optional — logged for the team)"
                className="mt-2 min-h-[38px] w-full rounded-lg border border-brick/25 bg-white px-3 text-sm font-bold text-cherry"
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-cherry/10 bg-cream-deep/60 px-5 py-4 sm:px-7">
          {!declining ? (
            <>
              <button
                onClick={onLater}
                className="text-xs font-black text-cherry/45 underline decoration-cherry/20 underline-offset-4 hover:text-cherry"
              >
                View later
              </button>
              <span className="ml-auto flex items-center gap-2">
                <GhostBtn onClick={() => setDeclining(true)}>
                  <Ic n="xCircle" size={14} /> Decline
                </GhostBtn>
                <SolidBtn tone="green" icon="checkCircle" onClick={() => { void accept(); }} disabled={busy}>
                  {busy ? "Saving…" : `Accept · ${minutes} min`}
                </SolidBtn>
              </span>
            </>
          ) : (
            <>
              <GhostBtn onClick={() => { setDeclining(false); setReason(""); }}>Back</GhostBtn>
              <span className="ml-auto flex items-center gap-2">
                <SolidBtn tone="danger" icon="xCircle" onClick={() => { void decline(); }} disabled={busy}>
                  {busy ? "Saving…" : "Confirm decline"}
                </SolidBtn>
              </span>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
