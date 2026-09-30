"use client";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useRef } from "react";
import Banner from "@/components/Banner";
import OffersStrip from "@/components/OffersStrip";
import SpecialsCarousel from "@/components/SpecialsCarousel";
import { BtnGhost, BtnPrimary, MenuImage, OpenBadge, Reveal, SectionHead, Stagger, StaggerItem } from "@/components/ui";
import { eur } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { CATEGORY_IMG, FEATURED, MENU as MENU_ALL, RESTAURANT } from "@/lib/menu";
import { useShop } from "@/lib/store";
import type { Category } from "@/lib/types";

const MARQUEE = [
  "Wood-fired pizzat", "Karachi biryani", "Halwa puri", "Crispy wings",
  "Kebab-annokset", "Shawarma", "Curries & naan", "Falafel", "Burgers",
];

function CategoryCircle({ cat }: { cat: Category }) {
  const id = cat.id;
  const { lang } = useLang();
  const { settings } = useShop();
  const meta = settings.catMeta[id];
  const src = meta?.img ?? CATEGORY_IMG[id];
  const title = lang === "fi" ? cat.title : cat.en ?? cat.title;
  const alt = (meta && (lang === "fi" ? meta.altFi || meta.altEn : meta.altEn || meta.altFi)) || title;
  return (
    <Link href={`/menu?cat=${id}`} className="group flex w-24 shrink-0 flex-col items-center gap-2 sm:w-28">
      <span className="relative block h-24 w-24 overflow-hidden rounded-full border-4 border-cream shadow-card ring-2 ring-gold/50 transition-all duration-300 group-hover:scale-105 group-hover:shadow-lift group-hover:ring-gold motion-reduce:group-hover:scale-100 sm:h-28 sm:w-28">
        {src ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={src}
            alt={alt}
            loading="lazy"
            onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110 motion-reduce:group-hover:scale-100"
          />
        ) : null}
        {/* branded placeholder: cream circle + initial */}
        <span className="absolute inset-0 -z-10 grid place-items-center bg-cream-deep font-display text-3xl font-black text-gold-deep">
          {title.charAt(0)}
        </span>
      </span>
      <span className="text-center text-[11px] font-black uppercase tracking-wider text-gold-deep">
        {title}
      </span>
    </Link>
  );
}

export default function Home() {
  const reduce = useReducedMotion();
  const { settings, categories } = useShop();
  const { t, dayName } = useLang();
  const railRef = useRef<HTMLDivElement>(null);
  const scrollRail = (dir: number) =>
    railRef.current?.scrollBy({ left: dir * 320, behavior: reduce ? "auto" : "smooth" });

  const circleCats = (() => {
    const all = categories().filter((c) => !settings.catMeta[c.id]?.hidden);
    const order = settings.catOrder?.length ? settings.catOrder : null;
    if (!order) return all.filter((c) => CATEGORY_IMG[c.id] || settings.catMeta[c.id]?.img || true);
    return [...all].sort((a, b) => {
      const ia = order.indexOf(a.id), ib = order.indexOf(b.id);
      if (ia < 0 && ib < 0) return 0;
      if (ia < 0) return 1;
      if (ib < 0) return -1;
      return ia - ib;
    });
  })();

  return (
    <div>
      {/* ── BRAND BANNER ── solid cream block; the fixed background only
           appears from the banner's bottom edge downward */}
      <section className="relative bg-cream pt-20 sm:pt-24">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 mix-blend-multiply opacity-[0.14]"
          style={{
            backgroundImage: "url(/brand/doodles.png)",
            backgroundSize: "170px auto",
            backgroundRepeat: "repeat",
            maskImage: "linear-gradient(to bottom, black 0%, black 72%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 72%, transparent 100%)",
          }}
        />
        <div className="container-x relative">
          <Banner />
        </div>
      </section>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden mt-4 sm:mt-8">
        <div aria-hidden className="absolute -right-40 -top-40 h-[480px] w-[480px] rounded-full bg-gold/15 blur-3xl" />
        <div className="container-x grid items-center gap-10">
          <div className="relative z-10 max-w-2xl rounded-[2rem] bg-cream/85 p-6 shadow-card sm:p-8">
            <Reveal><OpenBadge big /></Reveal>
            <motion.p
              className="mt-5 max-w-md text-lg text-cherry/80"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              {t("hero.tag")}
            </motion.p>
            <motion.div
              className="mt-8 flex flex-wrap gap-4"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65, duration: 0.5 }}
            >
              <Link href="/menu"><BtnPrimary pulse className="text-lg">{t("cta.order")} 🍕</BtnPrimary></Link>
              <Link href="/dining"><BtnGhost className="text-lg">{t("cta.dining")}</BtnGhost></Link>
            </motion.div>
            <motion.p className="mt-6 text-sm font-bold text-cherry/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.85 }}>
              {RESTAURANT.address} ·{" "}
              <a href={RESTAURANT.phoneHref} className="text-gold-deep underline decoration-gold underline-offset-4">{RESTAURANT.phone}</a>
            </motion.p>
            <OffersStrip />
          </div>
        </div>
      </section>

      {/* from Today's Specials down: the original solid cream page background
          returns — the fixed collage lives only between banner and specials.
          pb-20 -mb-20: paints cream through the footer's mt-20 gap (which the
          fixed layer would otherwise show through). */}
      <div className="relative -mb-20 bg-cream pb-20">
        <SpecialsCarousel />

      {/* ── MARQUEE ── */}
      <section className="mt-16 -rotate-1 bg-cherry-deep py-3 shadow-card" aria-hidden>
        <div className="flex overflow-hidden">
          <div className="flex min-w-max animate-marquee gap-8 motion-reduce:animate-none">
            {[...MARQUEE, ...MARQUEE].map((m, i) => (
              <span key={i} className="flex items-center gap-8 font-display text-sm font-black uppercase tracking-[0.2em] text-cream">
                {m} <span className="text-gold">✦</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROUND CATEGORY GRID ── */}
      <section className="mt-20 py-10">
        <div className="container-x glass rounded-[2rem] py-10 shadow-card">
          <SectionHead kicker={t("home.browseKicker")} title={t("home.browseTitle")} center />
          <Stagger>
            <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:justify-center sm:gap-6 sm:overflow-visible sm:px-0">
              {circleCats.map((c) => (
                <StaggerItem key={c.id} className="snap-start">
                  <CategoryCircle cat={c} />
                </StaggerItem>
              ))}
            </div>
          </Stagger>
        </div>
      </section>

      {/* ── FEATURED ── */}
      <section className="container-x mt-20">
        <div className="flex items-end justify-between gap-4">
          <SectionHead kicker={t("home.featKicker")} title={t("home.featTitle")} />
          <div className="mb-8 hidden gap-2 sm:flex">
            <button onClick={() => scrollRail(-1)} aria-label="Scroll left" className="grid h-11 w-11 place-items-center rounded-full border-2 border-cherry text-cherry transition hover:bg-cherry hover:text-cream">←</button>
            <button onClick={() => scrollRail(1)} aria-label="Scroll right" className="grid h-11 w-11 place-items-center rounded-full border-2 border-cherry text-cherry transition hover:bg-cherry hover:text-cream">→</button>
          </div>
        </div>
        <Stagger>
          <div ref={railRef} className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4">
            {FEATURED.map((f) => (
              <StaggerItem key={f.title} className="snap-start">
                <Link href={`/menu?item=${f.itemId}`} className="card-tilt block w-[280px] overflow-hidden rounded-3xl border border-cherry/10 bg-cream-deep shadow-card sm:w-[320px]">
                  <div className="relative h-52 overflow-hidden">
                    {(() => {
                      const itm = MENU_ALL.find((m) => m.id === f.itemId);
                      return itm ? (
                        <MenuImage item={itm} sizes="(max-width: 640px) 280px, 320px" className="h-full transition-transform duration-500 hover:scale-105 motion-reduce:hover:scale-100" />
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={f.img} alt={f.title} loading="lazy" className="h-full w-full object-cover" />
                      );
                    })()}
                    <span className="absolute bottom-3 left-3 rounded-full bg-cherry px-3 py-1 text-xs font-black text-cream shadow-card">{t("home.view")}</span>
                  </div>
                  <div className="p-5">
                    <h3 className="font-display text-xl font-black text-cherry">{f.title}</h3>
                    <p className="mt-1 text-sm text-cherry/70">{f.blurb}</p>
                  </div>
                </Link>
              </StaggerItem>
            ))}
          </div>
        </Stagger>
      </section>

      {/* ── STORY TEASER ── */}
      <section className="container-x mt-20">
        <div className="grid items-center gap-10 rounded-[2rem] bg-cream-deep p-8 sm:p-12 lg:grid-cols-2">
          <Reveal>
            <p className="font-script text-2xl text-gold-deep -rotate-1">{t("home.storyKicker")}</p>
            <h2 className="mt-1 text-3xl font-black text-cherry sm:text-4xl">{t("home.storyTitle")}</h2>
            <div className="gold-rule mt-4 w-24" />
            <p className="mt-4 text-cherry/80">{t("home.storyP1")}</p>
            <p className="mt-3 text-cherry/80">{t("home.storyP2")}</p>
            <Link href="/about" className="mt-6 inline-block font-black text-gold-deep underline decoration-gold decoration-2 underline-offset-8 hover:text-cherry">
              {t("home.storyLink")}
            </Link>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="relative">
              <div className="absolute -inset-2 rotate-2 rounded-3xl border-2 border-gold/60" aria-hidden />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/img/kebab.jpg" alt="Kebab plate with fries and salad" loading="lazy" className="relative aspect-[4/3] w-full rounded-3xl object-cover shadow-lift" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── INFO BAND ── */}
      <section className="container-x mt-20">
        <SectionHead kicker={t("home.infoKicker")} title={t("home.infoTitle")} center />
        <Stagger className="grid gap-5 md:grid-cols-3">
          <StaggerItem className="rounded-3xl border border-cherry/10 bg-cream-deep p-6 shadow-card">
            <h3 className="font-display text-lg font-black text-cherry">{t("home.hours")}</h3>
            <ul className="mt-3 space-y-1 text-sm text-cherry/80">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                <li key={d} className="flex justify-between">
                  <span>{dayName(d)}</span>
                  <span className="font-bold tabular-nums">
                    {settings.hours[d] ? `${settings.hours[d]!.open}–${settings.hours[d]!.close}` : t("hours.closed")}
                  </span>
                </li>
              ))}
            </ul>
          </StaggerItem>
          <StaggerItem className="rounded-3xl border border-cherry/10 bg-cream-deep p-6 shadow-card">
            <h3 className="font-display text-lg font-black text-cherry">{t("home.find")}</h3>
            <p className="mt-3 text-sm text-cherry/80">{RESTAURANT.address}, Finland</p>
            <a href={RESTAURANT.mapLink} target="_blank" rel="noreferrer" className="mt-3 inline-block font-black text-gold-deep underline decoration-gold underline-offset-4">{t("home.dirs")}</a>
            <p className="mt-4 text-sm text-cherry/80">
              {t("home.pickup")} {settings.radiusKm} {t("home.km")} {eur(settings.minOrder)}
            </p>
          </StaggerItem>
          <StaggerItem className="rounded-3xl border border-cherry/10 bg-cream-deep p-6 shadow-card">
            <h3 className="font-display text-lg font-black text-cherry">{t("home.call")}</h3>
            <a href={RESTAURANT.phoneHref} className="mt-3 block font-display text-2xl font-black text-gold-deep hover:text-cherry">{RESTAURANT.phone}</a>
            <p className="mt-2 text-sm text-cherry/80">{t("home.phoneNote")}</p>
            <div className="mt-3 flex gap-3">
              <a href={RESTAURANT.instagram} target="_blank" rel="noreferrer" className="font-black text-gold-deep underline decoration-gold underline-offset-4">Instagram</a>
              <a href={RESTAURANT.facebook} target="_blank" rel="noreferrer" className="font-black text-gold-deep underline decoration-gold underline-offset-4">Facebook</a>
            </div>
          </StaggerItem>
        </Stagger>
        <Reveal delay={0.1} className="mt-8 overflow-hidden rounded-3xl border-2 border-gold/50 shadow-lift">
          <iframe title="Map to Kuopio Bites, Jalkasenkatu 7, 70820 Kuopio" src={RESTAURANT.mapEmbed} className="h-72 w-full border-0" loading="lazy" />
        </Reveal>
      </section>
      </div>
    </div>
  );
}
