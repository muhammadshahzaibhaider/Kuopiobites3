"use client";
import Link from "next/link";
import { useLang } from "@/lib/i18n";
import { useShop } from "@/lib/store";
import { liveOffers } from "@/lib/v3";
import { MENU } from "@/lib/menu";
import { MenuImage } from "./ui";

export default function OffersStrip() {
  const { settings } = useShop();
  const { lang } = useLang();
  const offers = liveOffers(settings);
  if (!offers.length) return null;
  return (
    <div className="no-scrollbar -mx-4 mt-6 flex gap-3 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      {offers.map((o) => {
        const href = o.scope.category
          ? `/menu?cat=${o.scope.category}`
          : o.scope.itemIds?.[0]
            ? `/menu?item=${o.scope.itemIds[0]}`
            : "/menu";
        return (
          <Link
            key={o.id}
            href={href}
            className="card-tilt flex shrink-0 items-center gap-3 rounded-2xl border-2 border-gold/60 bg-cream-deep px-4 py-3 shadow-card"
          >
            {o.scope.itemIds?.[0] && (() => {
              const itm = MENU.find((m) => m.id === o.scope.itemIds![0]);
              return itm ? <MenuImage item={itm} sizes="80px" className="h-11 w-11 shrink-0 rounded-xl" /> : null;
            })()}
            <span className="grid h-9 min-w-[36px] place-items-center rounded-full bg-gold px-1 font-display text-sm font-black text-cherry-dark">
              {lang === "fi" ? o.badgeFi ?? o.badgeEn : o.badgeEn ?? o.badgeFi}
            </span>
            <span>
              <span className="block font-display text-sm font-black text-cherry">
                {lang === "fi" ? o.titleFi : o.titleEn}
              </span>
              <span className="block text-xs text-cherry/60">
                {lang === "fi" ? o.descFi ?? o.descEn : o.descEn ?? o.descFi}
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
