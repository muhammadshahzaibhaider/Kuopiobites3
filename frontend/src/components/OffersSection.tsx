"use client";
import Link from "next/link";
import { useState } from "react";
import { useLang } from "@/lib/i18n";
import { useShop } from "@/lib/store";
import { offerCards, type OfferCard } from "@/lib/offer-cards";
import { eur } from "@/lib/format";
import { MENU } from "@/lib/menu";
import { SectionHead } from "./ui";

/**
 * Customer-facing offers, rendered right after Today's Specials. Every active,
 * date-valid offer is listed (see lib/offer-cards), including weekday-only ones
 * with the day chip, so an offer created in admin is never invisible.
 */
export default function OffersSection() {
  const { settings, settingsReady, adminItems, effectiveMenu } = useShop();
  const { t, lang, dayName } = useLang();
  /* The bundled defaults contain a demo offer; wait for /api/settings so the
     static HTML never advertises a promotion the shop does not run. */
  if (!settingsReady) return null;
  const menu = effectiveMenu(adminItems.length ? adminItems.filter((item) => !item.archived) : MENU, lang);
  const cards = offerCards(settings, menu, lang, t, (id) => {
    const meta = settings.catMeta[id];
    return (lang === "fi" ? meta?.nameFi : meta?.nameEn) || meta?.nameFi;
  });
  if (!cards.length) return null;

  const shortDate = (value: string) =>
    new Date(`${value}T12:00:00`).toLocaleDateString(lang === "fi" ? "fi-FI" : "en-GB", { day: "numeric", month: "short" });

  return (
    <section className="mt-14" aria-label={t("offers.title")}>
      <div className="container-x">
        <SectionHead kicker={t("offers.kicker")} title={t("offers.title")} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <OfferCardView key={card.id} card={card} shortDate={shortDate} />
          ))}
        </div>
      </div>
    </section>
  );
}

function OfferCardView({ card, shortDate }: { card: OfferCard; shortDate: (value: string) => string }) {
  const { t, dayName } = useLang();
  const [open, setOpen] = useState(false);
  const manyCats = card.scopeCats.length > 1;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-3xl border-2 border-gold/50 bg-cream-deep p-5 shadow-card transition-shadow hover:shadow-lift">
      <span aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gold/15" />
      <span className="relative inline-flex w-fit items-center rounded-full bg-gold px-3 py-1 font-display text-xs font-black uppercase tracking-wide text-cherry-dark">
        {card.badge}
      </span>
      <h3 className="relative mt-3 font-display text-xl font-black leading-tight text-cherry">{card.title}</h3>
      {card.desc && <p className="relative mt-1 text-sm text-cherry/70">{card.desc}</p>}

      <div className="relative mt-3 flex flex-col gap-2">
        {manyCats ? (
          <>
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="inline-flex w-fit min-h-[36px] items-center rounded-full border-2 border-gold/70 bg-gold/20 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wide text-gold-deep transition hover:bg-gold/35 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold"
            >
              {open ? t("offers.hideCats") : t("offers.seeCats")}
            </button>
            {open && (
              <ul className="rounded-2xl border border-cherry/10 bg-cream/80 px-3 py-2 text-sm font-bold text-cherry/80">
                {card.scopeCats.map((name) => (
                  <li key={name} className="border-b border-cherry/10 py-1.5 last:border-0">
                    {name}
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <span className="w-fit rounded-full bg-cherry/10 px-2.5 py-1 text-[11px] font-black text-cherry/70">{card.scopeLabel}</span>
        )}

        <span className="flex flex-wrap gap-1.5 text-[11px] font-black">
          {card.days && (
            <span className="rounded-full bg-gold/25 px-2.5 py-1 text-gold-deep">
              {t("offers.only")} {card.days.map((day) => dayName(day)).join(", ")}
            </span>
          )}
          {card.minOrder !== undefined && (
            <span className="rounded-full bg-cherry/10 px-2.5 py-1 text-cherry/70">
              {t("offers.min")} {eur(card.minOrder)}
            </span>
          )}
          {card.priceNow !== undefined && (
            <span className="rounded-full bg-[#2e7d32]/10 px-2.5 py-1 text-[#2e7d32]">
              <s className="opacity-60">{eur(card.priceWas ?? 0)}</s>
              {" → "}
              {eur(card.priceNow)}
            </span>
          )}
          {card.code && (
            <span className="rounded-full bg-cherry px-2.5 py-1 uppercase tracking-wide text-cream">
              {t("offers.code")} {card.code}
            </span>
          )}
          {card.end && (
            <span className="rounded-full bg-cherry/10 px-2.5 py-1 text-cherry/70">
              {t("offers.until")} {shortDate(card.end)}
            </span>
          )}
        </span>
      </div>

      <Link
        href={card.href}
        className="relative mt-auto pt-4 text-sm font-black text-gold-deep focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold"
      >
        {t("offers.view")} →
      </Link>
    </article>
  );
}
