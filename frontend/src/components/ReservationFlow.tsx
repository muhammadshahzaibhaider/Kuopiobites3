"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { cx } from "@/lib/format";
import { slotsFor } from "@/lib/hours";
import { useLang } from "@/lib/i18n";
import { useShop } from "@/lib/store";

function nextDays(n: number): string[] {
  const out: string[] = [];
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Helsinki",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  for (let i = 0; i < n; i++) {
    const d = new Date(Date.now() + i * 86400000);
    out.push(fmt.format(d));
  }
  return out;
}

export default function ReservationFlow() {
  const { settings, reservations, addReservation, user, toast } = useShop();
  const { t } = useLang();
  const days = useMemo(() => nextDays(14), []);
  const [date, setDate] = useState(days[0]);
  const [party, setParty] = useState(2);
  const [time, setTime] = useState<string | null>(null);
  const [f, setF] = useState({ name: user?.name ?? "", phone: user?.phone ?? "", email: user?.email ?? "", note: "" });
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState<{ id: string; date: string; time: string; party: number } | null>(null);

  const slots = useMemo(
    () => slotsFor(date, settings, reservations),
    [date, settings, reservations]
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!time) return;
    setBusy(true);
    const r = await addReservation({ date, time, party, name: f.name, phone: f.phone, email: f.email, note: f.note });
    setBusy(false);
    setConfirmed({ id: r.id, date, time, party });
    toast(t("res.done"));
  };

  if (confirmed)
    return (
      <div className="rounded-3xl border-2 border-gold/50 bg-cream-deep p-8 text-center shadow-card">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", bounce: 0.4, duration: 0.7 }}
          className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#2e7d32] text-4xl text-cream shadow-lift"
        >
          ✓
        </motion.div>
        <h3 className="mt-5 font-display text-3xl font-black text-cherry">{t("res.done")}</h3>
        <p className="mt-3 text-lg text-cherry/80">
          {confirmed.id} · {confirmed.date} klo {confirmed.time} · {confirmed.party} ‍🍳
        </p>
        <p className="mt-2 text-sm text-cherry/60">{t("res.doneNote")}</p>
        <button
          onClick={() => { setConfirmed(null); setTime(null); }}
          className="mt-6 min-h-[48px] rounded-full border-2 border-cherry px-8 font-black text-cherry hover:bg-cherry hover:text-cream"
        >
          {t("res.again")}
        </button>
      </div>
    );

  const field = "min-h-[48px] w-full rounded-2xl border border-cherry/20 bg-cream px-4 text-sm font-bold placeholder:text-cherry/40 focus:border-gold-deep";

  return (
    <form onSubmit={submit} className="space-y-7">
      <section>
        <h3 className="mb-3 font-display text-lg font-black text-cherry">{t("res.day")}</h3>
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {days.map((d) => {
            const dt = new Date(d + "T12:00:00");
            const closed = !settings.hours[dt.getDay()] || settings.blockedDates.includes(d);
            return (
              <button
                type="button"
                key={d}
                disabled={closed}
                onClick={() => { setDate(d); setTime(null); }}
                className={cx(
                  "min-h-[64px] w-16 shrink-0 rounded-2xl border-2 text-center transition",
                  date === d ? "border-cherry-bright bg-cherry-bright text-cream" : "border-cherry/15 bg-cream text-cherry hover:border-gold-deep",
                  closed && "opacity-40"
                )}
              >
                <span className="block text-[10px] font-black uppercase opacity-70">
                  {dt.toLocaleDateString("en-GB", { weekday: "short" })}
                </span>
                <span className="block font-display text-xl font-black">{dt.getDate()}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="flex flex-wrap items-end gap-6">
        <div>
          <h3 className="mb-3 font-display text-lg font-black text-cherry">{t("res.party")}</h3>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setParty((p) => Math.max(1, p - 1))} className="grid h-11 w-11 place-items-center rounded-full border-2 border-cherry text-lg font-black text-cherry hover:bg-cherry hover:text-cream">−</button>
            <motion.span key={party} initial={{ scale: 1.3 }} animate={{ scale: 1 }} className="min-w-[3rem] text-center font-display text-2xl font-black text-cherry">
              {party}
            </motion.span>
            <button type="button" onClick={() => setParty((p) => Math.min(12, p + 1))} className="grid h-11 w-11 place-items-center rounded-full border-2 border-cherry text-lg font-black text-cherry hover:bg-cherry hover:text-cream">+</button>
          </div>
        </div>
        <p className="text-sm font-bold text-cherry/60">{t("res.partyNote")}</p>
      </section>

      <section>
        <h3 className="mb-3 font-display text-lg font-black text-cherry">{t("res.times")}</h3>
        {slots.length === 0 ? (
          <p className="rounded-2xl bg-cream p-5 text-sm font-bold text-cherry/60">{t("res.noSlots")}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <AnimatePresence>
              {slots.map((s) => (
                <motion.button
                  type="button"
                  key={s}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setTime(s)}
                  className={cx(
                    "min-h-[44px] rounded-full border-2 px-4 text-sm font-black tabular-nums transition",
                    time === s ? "border-cherry-bright bg-cherry-bright text-cream" : "border-cherry/15 bg-cream text-cherry hover:border-gold-deep"
                  )}
                >
                  {s}
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-3 font-display text-lg font-black text-cherry">{t("res.details")}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <input required className={field} placeholder="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <input required className={field} placeholder="Phone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          <input type="email" className={cx(field, "sm:col-span-2")} placeholder="Email (optional)" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          <textarea rows={2} className={cx(field, "sm:col-span-2 min-h-[64px]")} placeholder="Special requests (optional)" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
        </div>
      </section>

      <button
        disabled={!time || busy}
        className={cx(
          "min-h-[52px] w-full rounded-full font-black text-cream transition sm:w-auto sm:px-12",
          time && !busy ? "bg-cherry-bright shadow-lift hover:-translate-y-0.5 hover:bg-cherry" : "cursor-not-allowed bg-cherry/25"
        )}
      >
        {busy ? t("res.busy") : time ? `${t("res.confirm")} · ${time}` : t("res.pick")}
      </button>
    </form>
  );
}
