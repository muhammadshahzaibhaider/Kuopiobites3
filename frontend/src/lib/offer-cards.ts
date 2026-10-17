/**
 * Pure view-model for the customer-facing offer cards, so the home section and
 * the menu strip can share one rule set (and it can be tested without a DOM).
 *
 * Rule: every offer that is switched on and inside its date window is shown.
 * Offers limited to specific weekdays stay visible and carry the day list —
 * pricing still uses `liveOffers` (today only), so the chip is what tells the
 * customer the offer is not usable right now.
 */
import type { Lang, MenuItem, Settings } from "./types";
import { activeOffers, offerBadge } from "./v3";

export interface OfferCard {
  id: string;
  href: string;
  badge: string;
  title: string;
  desc?: string;
  scopeLabel: string;
  days: number[] | null;
  minOrder?: number;
  code?: string;
  end?: string;
}

export function offerCards(
  settings: Settings,
  menu: MenuItem[],
  lang: Lang,
  t: (key: string) => string,
  categoryLabel: (id: string) => string | undefined,
): OfferCard[] {
  return activeOffers(settings).map((o) => {
    const item = o.scope.itemIds?.[0] ? menu.find((entry) => entry.id === o.scope.itemIds![0]) : undefined;
    const href = o.scope.category
      ? `/menu?cat=${o.scope.category}`
      : item
        ? `/menu?item=${item.id}`
        : "/menu";
    const scopeLabel = o.scope.category
      ? categoryLabel(o.scope.category) ?? o.scope.category
      : item
        ? item.name
        : t("offers.all");
    const desc = lang === "fi" ? o.descFi ?? o.descEn : o.descEn ?? o.descFi;
    return {
      id: o.id,
      href,
      badge: offerBadge(o, lang, t),
      title: lang === "fi" ? o.titleFi : o.titleEn,
      ...(desc ? { desc } : {}),
      scopeLabel,
      days: o.days?.length && o.days.length < 7 ? [...o.days].sort((a, b) => a - b) : null,
      ...(o.minOrder !== undefined ? { minOrder: o.minOrder } : {}),
      ...(o.code ? { code: o.code } : {}),
      ...(o.end ? { end: o.end } : {}),
    };
  });
}
