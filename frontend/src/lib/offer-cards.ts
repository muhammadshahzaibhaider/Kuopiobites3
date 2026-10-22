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
import { activeOffers, applyOfferToPrice, offerBadge, offerCategoryIds } from "./v3";

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
  /** cheapest dish in scope, before/after this offer (percent & override only) */
  priceWas?: number;
  priceNow?: number;
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
    const cats = offerCategoryIds(o.scope);
    const href = cats.length === 1
      ? `/menu?cat=${cats[0]}`
      : item
        ? `/menu?item=${item.id}`
        : "/menu";
    const scopeLabel = cats.length
      ? cats.map((id) => categoryLabel(id) ?? id).join(", ")
      : item
        ? item.name
        : t("offers.all");
    const desc = lang === "fi" ? o.descFi ?? o.descEn : o.descEn ?? o.descFi;
    /* A concrete price makes an offer believable: the cheapest dish in its
       scope with the discount already applied. */
    const scoped = o.scope.whole
      ? menu
      : cats.length
        ? menu.filter((entry) => cats.includes(entry.cat))
        : menu.filter((entry) => (o.scope.itemIds ?? []).includes(entry.id));
    const cheapest = scoped.reduce<number | undefined>((lowest, entry) => {
      const value = Math.min(...entry.prices.map((price) => price.value));
      return lowest === undefined || value < lowest ? value : lowest;
    }, undefined);
    const reduced = cheapest === undefined || o.code ? null : applyOfferToPrice(o, cheapest);
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
      ...(cheapest !== undefined && reduced !== null && reduced < cheapest
        ? { priceWas: cheapest, priceNow: reduced }
        : {}),
    };
  });
}
