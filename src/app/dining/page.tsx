"use client";
import { motion } from "framer-motion";
import { useRef } from "react";
import ReservationFlow from "@/components/ReservationFlow";
import { Reveal, Steam } from "@/components/ui";
import { useLang } from "@/lib/i18n";
import { RESTAURANT } from "@/lib/menu";
import { useShop } from "@/lib/store";

export default function DiningPage() {
  const { t, dayName } = useLang();
  const { settings } = useShop();
  const flowRef = useRef<HTMLDivElement>(null);

  return (
    <div className="container-x max-w-4xl pt-24 sm:pt-32">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
        <p className="font-script text-2xl text-gold-deep -rotate-1">{t("dining.kicker")}</p>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-cherry">{t("dining.title")}</h1>
        <div className="gold-rule mt-4 w-24" />
        <p className="mt-4 max-w-2xl text-lg text-cherry/80">{t("dining.lead")}</p>
      </motion.div>

      <Reveal className="relative mt-10">
        <Steam className="absolute -top-8 left-1/2 z-10 -translate-x-1/2" />
        <div className="absolute -inset-2 rotate-1 rounded-3xl border-2 border-gold/60" aria-hidden />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/hero.jpg" alt="Dining spread at Kuopio Bites" className="relative aspect-[16/9] w-full rounded-3xl object-cover shadow-lift" />
      </Reveal>

      <div className="mt-10 grid gap-5 sm:grid-cols-3">
        {[
          ["🪑", t("dining.seats")],
          ["🍛", t("dining.amb")],
          ["🕰", t("dining.hoursNote")],
        ].map(([icon, txt], i) => (
          <Reveal key={i} delay={i * 0.08} className="rounded-3xl border border-cherry/10 bg-cream-deep p-6 shadow-card">
            <span className="text-3xl">{icon}</span>
            <p className="mt-3 text-sm text-cherry/80">{txt}</p>
          </Reveal>
        ))}
      </div>

      <Reveal className="mt-8 rounded-3xl border border-cherry/10 bg-cream-deep p-6 shadow-card">
        <h3 className="font-display text-lg font-black text-cherry">{t("home.hours")}</h3>
        <ul className="mt-3 grid gap-x-8 gap-y-1 text-sm text-cherry/80 sm:grid-cols-2">
          {[1, 2, 3, 4, 5, 6, 0].map((d) => (
            <li key={d} className="flex justify-between">
              <span>{dayName(d)}</span>
              <span className="font-bold tabular-nums">
                {settings.hours[d] ? `${settings.hours[d]!.open}–${settings.hours[d]!.close}` : t("hours.closed")}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm font-bold text-cherry/60">
          {RESTAURANT.address} · <a className="text-gold-deep underline decoration-gold underline-offset-4" href={RESTAURANT.phoneHref}>{RESTAURANT.phone}</a>
        </p>
      </Reveal>

      <div className="mt-12" id="reserve">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-display text-3xl font-black text-cherry">{t("res.title")}</h2>
          <button
            onClick={() => flowRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="min-h-[48px] rounded-full bg-cherry-bright px-8 font-black text-cream shadow-lift transition hover:-translate-y-0.5 hover:bg-cherry motion-safe:animate-pulseSoft"
          >
            {t("dining.reserveCta")} ↓
          </button>
        </div>
        <div ref={flowRef} className="scroll-mt-28 rounded-3xl border-2 border-gold/50 bg-cream-deep p-6 sm:p-8 shadow-lift">
          <ReservationFlow />
        </div>
      </div>
    </div>
  );
}
