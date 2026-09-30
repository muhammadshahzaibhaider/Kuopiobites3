"use client";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cx, eur } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { MENU } from "@/lib/menu";
import { useShop } from "@/lib/store";
import { isPreorderItem, trName } from "@/lib/v3";
import { MenuImage } from "./ui";
import type { MenuItem, SpecialItem } from "@/lib/types";

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Helsinki" });

function cardPrice(sp: SpecialItem, m: MenuItem) {
  const base = Math.min(...m.prices.map((p) => p.value));
  const now = sp.overridePrice ?? (sp.discount ? Math.round(base * (1 - sp.discount / 100) * 100) / 100 : base);
  return { base, now, struck: now < base };
}

export default function SpecialsCarousel() {
  const reduce = useReducedMotion();
  const { settings, effectiveMenu } = useShop();
  const { t, lang } = useLang();
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const drag = useRef({ x: 0, active: false, moved: false });
  const suppress = useRef(false);
  const paused = useRef(false);

  const d = today();
  const specials = (settings.todaysSpecials ?? [])
    .filter((sp) => sp.active && (!sp.start || sp.start <= d) && (!sp.end || sp.end >= d))
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const menu = effectiveMenu(MENU, lang);
  const cards = specials
    .map((sp) => ({ sp, item: menu.find((m) => m.id === sp.itemId) }))
    .filter((c): c is { sp: SpecialItem; item: MenuItem } => !!c.item);

  const cardsCount = cards.length;
  const step = () => {
    const first = trackRef.current?.firstElementChild as HTMLElement | undefined;
    return first ? first.offsetWidth + 16 : 300;
  };
  const scrollToIdx = (i: number) =>
    trackRef.current?.scrollTo({ left: i * step(), behavior: reduce ? "auto" : "smooth" });

  useEffect(() => {
    const tr = trackRef.current;
    if (!tr) return;
    const onScroll = () => setActive(Math.round(tr.scrollLeft / step()));
    tr.addEventListener("scroll", onScroll, { passive: true });
    return () => tr.removeEventListener("scroll", onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardsCount]);

  /* slow ticker auto-scroll — pauses on hover/focus/touch; off under reduced motion */
  useEffect(() => {
    if (reduce || cardsCount < 2) return;
    let endSince = 0;
    const id = setInterval(() => {
      const tr = trackRef.current;
      if (!tr || paused.current) return;
      if (tr.scrollLeft >= tr.scrollWidth - tr.clientWidth - 2) {
        if (!endSince) endSince = Date.now();
        if (Date.now() - endSince > 1800) {
          endSince = 0;
          tr.scrollTo({ left: 0, behavior: "smooth" });
        }
      } else {
        endSince = 0;
        tr.scrollLeft += 1;
      }
    }, 30);
    return () => clearInterval(id);
  }, [reduce, cardsCount]);

  if (!cards.length) return null;

  return (
    <section className="mt-14">
      <div className="container-x">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="font-script text-2xl text-gold-deep -rotate-1">{t("hero.special")}</p>
            <h2 className="font-display text-3xl font-black tracking-tight text-cherry sm:text-4xl">{t("specials.title")}</h2>
          </div>
          {cardsCount > 1 && (
            <div className="mb-2 hidden gap-2 sm:flex">
              <button
                onClick={() => scrollToIdx(Math.max(0, active - 1))}
                aria-label={t("nav.prev")}
                className="grid h-11 w-11 place-items-center rounded-full border-2 border-cherry text-cherry transition hover:bg-cherry hover:text-cream"
              >
                ←
              </button>
              <button
                onClick={() => scrollToIdx(Math.min(cardsCount - 1, active + 1))}
                aria-label={t("nav.next")}
                className="grid h-11 w-11 place-items-center rounded-full border-2 border-cherry text-cherry transition hover:bg-cherry hover:text-cream"
              >
                →
              </button>
            </div>
          )}
        </div>

        <div
          ref={trackRef}
          role="region"
          aria-label={t("specials.title")}
          tabIndex={0}
          onMouseEnter={() => (paused.current = true)}
          onMouseLeave={() => (paused.current = false)}
          onFocus={() => (paused.current = true)}
          onBlur={() => (paused.current = false)}
          onTouchStart={() => (paused.current = true)}
          onTouchEnd={() => setTimeout(() => (paused.current = false), 2500)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") scrollToIdx(Math.min(cardsCount - 1, active + 1));
            if (e.key === "ArrowLeft") scrollToIdx(Math.max(0, active - 1));
          }}
          onClickCapture={(e) => {
            if (suppress.current) {
              e.preventDefault();
              e.stopPropagation();
              suppress.current = false;
            }
          }}
          onPointerDown={(e) => {
            drag.current = { x: e.clientX, active: true, moved: false };
          }}
          onPointerMove={(e) => {
            if (!drag.current.active) return;
            const dx = e.clientX - drag.current.x;
            if (!drag.current.moved && Math.abs(dx) > 6) drag.current.moved = true;
            if (drag.current.moved && trackRef.current) {
              suppress.current = true; // only cancel the click if the pointer really moved
              trackRef.current.scrollLeft -= dx;
              drag.current.x = e.clientX;
            }
          }}
          onPointerUp={() => {
            drag.current.active = false;
            setTimeout(() => (suppress.current = false), 0);
          }}
          onPointerCancel={() => (drag.current.active = false)}
          className="no-scrollbar mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none]"
        >
          {cards.map(({ sp, item }) => {
            const { base, now, struck } = cardPrice(sp, item);
            const name = trName(lang, item);
            const badge = (lang === "fi" ? sp.textFi : sp.textEn) || t("hero.special");
            return (
              <motion.div key={sp.id} className="w-[260px] shrink-0 snap-start sm:w-[290px]" whileHover={reduce ? {} : { y: -4 }}>
                <Link
                  href={`/menu?item=${item.id}`}
                  aria-label={`${t("specials.view")} ${name} ${t("specials.inMenu")}`}
                  className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-3xl border border-cherry/10 bg-cream-deep shadow-card transition-shadow hover:shadow-lift focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold"
                >
                  <div className="relative h-40 overflow-hidden bg-[#F4F4F2]">
                    <MenuImage
                      item={item}
                      srcOverride={sp.imageUrl}
                      sizes="(max-width: 640px) 260px, 290px"
                      className="h-full transition-transform duration-500 group-hover:scale-105"
                    />
                    <span className="absolute inset-x-2 top-2 flex flex-wrap items-start gap-1.5">
                      <span className="rounded-full bg-cherry px-3 py-1 text-[11px] font-black uppercase tracking-wide text-cream shadow-card">
                        {badge}
                      </span>
                      {isPreorderItem(item) && (
                        <span className="whitespace-nowrap rounded-full bg-gold px-2.5 py-1 text-[10px] font-black text-cherry-dark shadow-card">
                          {t("pre.badge")}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="font-display text-lg font-black leading-tight text-cherry">{name}</h3>
                    <p className="mt-auto pt-2 font-display text-xl font-black text-gold-deep">
                      {struck && <span className="mr-2 text-sm font-bold text-cherry/40 line-through">{eur(base)}</span>}
                      {eur(now)}
                    </p>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {cardsCount > 1 && (
          <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
            {cards.map((_, i) => (
              <button
                key={i}
                onClick={() => scrollToIdx(i)}
                tabIndex={-1}
                aria-hidden
                className={cx("h-2 rounded-full transition-all", i === active ? "w-5 bg-cherry-bright" : "w-2 bg-cherry/25")}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
