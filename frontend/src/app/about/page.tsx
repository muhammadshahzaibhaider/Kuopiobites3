"use client";
import { motion } from "framer-motion";
import { useState } from "react";
import { Reveal, SectionHead, Stagger, StaggerItem, Steam } from "@/components/ui";
import { useLang } from "@/lib/i18n";
import { RESTAURANT, WHATSAPP_DISPLAY, whatsappUrl } from "@/lib/menu";
import { useShop } from "@/lib/store";

export default function AboutPage() {
  const { settings, toast } = useShop();
  const { t, dayName } = useLang();
  const [f, setF] = useState({ name: "", email: "", msg: "" });

  return (
    <div className="pt-24 sm:pt-32">
      <div className="container-x">
        <SectionHead
          kicker={t("about.kicker")}
          title={t("about.title")}
          sub={t("about.sub")}
        />
        <div className="grid items-start gap-10 lg:grid-cols-2">
          <Reveal>
            <div className="space-y-4 text-cherry/85">
              <p>
                {t("about.p1")}
              </p>
              <p>
                {t("about.p2")}
              </p>
              <p>
                {t("about.p3")}
              </p>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-4 text-center">
              {[
                ["36+", "pizza recipes"],
                ["10", "kebab dishes"],
                ["7", "days a week"],
              ].map(([n, l]) => (
                <div key={l} className="rounded-3xl bg-cream-deep p-4 shadow-card">
                  <p className="font-display text-3xl font-black text-cherry-bright">{n}</p>
                  <p className="text-xs font-black uppercase tracking-wide text-cherry/60">{l}</p>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.15} className="relative">
            <Steam className="absolute -top-8 left-1/2 z-10 -translate-x-1/2" />
            <div className="absolute -inset-2 rotate-1 rounded-3xl border-2 border-gold/60" aria-hidden />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/hero.jpg" alt="The Kuopio Bites spread" className="relative aspect-[4/3] w-full rounded-3xl object-cover shadow-lift" />
          </Reveal>
        </div>
      </div>

      {/* contact */}
      <div className="container-x mt-20">
        <SectionHead kicker={t("about.write")} title={t("about.contact")} center />
        <Stagger className="grid gap-6 lg:grid-cols-2">
          <StaggerItem className="rounded-3xl border border-cherry/10 bg-cream-deep p-7 shadow-card">
            <h3 className="font-display text-xl font-black text-cherry">{t("about.visit")}</h3>
            <p className="mt-3 font-bold text-cherry/80">{RESTAURANT.address}, Finland</p>
            <a href={RESTAURANT.phoneHref} className="mt-2 block font-display text-3xl font-black text-cherry-bright hover:text-cherry">
              {RESTAURANT.phone}
            </a>
            <a href={whatsappUrl("Hello Kuopio Bites! I have a question.")} target="_blank" rel="noopener noreferrer" className="mt-3 flex min-h-[44px] items-center gap-2 font-black text-[#168c4a] hover:underline">
              <span aria-hidden>◉</span> WhatsApp · {WHATSAPP_DISPLAY}
            </a>
            <p className="mt-1 text-xs font-bold text-cherry/50">{t("about.tap")}</p>
            <ul className="mt-5 space-y-1 text-sm text-cherry/80">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                <li key={d} className="flex justify-between">
                  <span>{dayName(d)}</span>
                  <span className="font-bold tabular-nums">
                    {settings.hours[d] ? `${settings.hours[d]!.open} – ${settings.hours[d]!.close}` : t("hours.closed")}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-5 overflow-hidden rounded-2xl border-2 border-gold/50">
              <iframe title="Map to Kuopio Bites" src={RESTAURANT.mapEmbed} className="h-56 w-full border-0" loading="lazy" />
            </div>
          </StaggerItem>
          <StaggerItem>
            <form
              className="rounded-3xl border border-cherry/10 bg-cream-deep p-7 shadow-card"
              onSubmit={(e) => {
                e.preventDefault();
                /* Contact delivery is intentionally not faked in the browser. Wire
                   this form to the backend mail/ticket provider before launch. */
                setF({ name: "", email: "", msg: "" });
                toast("Contact delivery is not configured yet — please email us.", "err");
              }}
            >
              <h3 className="font-display text-xl font-black text-cherry">{t("about.write")}</h3>
              <div className="mt-4 space-y-3">
                <input required className="min-h-[48px] w-full rounded-2xl border border-cherry/20 bg-cream px-4 text-sm font-bold" placeholder="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
                <input required type="email" className="min-h-[48px] w-full rounded-2xl border border-cherry/20 bg-cream px-4 text-sm font-bold" placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
                <textarea required rows={5} className="w-full rounded-2xl border border-cherry/20 bg-cream px-4 py-3 text-sm font-bold" placeholder="Feedback, feedback, feedback — or just tell us what to add to the menu" value={f.msg} onChange={(e) => setF({ ...f, msg: e.target.value })} />
                <button className="min-h-[48px] w-full rounded-full bg-cherry-bright font-black text-cream shadow-lift hover:-translate-y-0.5 hover:bg-cherry active:scale-[0.98]">
                  {t("about.send")}
                </button>
              </div>
            </form>
          </StaggerItem>
        </Stagger>
      </div>
    </div>
  );
}
