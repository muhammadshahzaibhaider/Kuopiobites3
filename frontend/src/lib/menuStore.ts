"use client";
/**
 * Hydration bridge: backend menu data is written IN PLACE into lib/menu.ts's
 * exported arrays (offline fallback → live data). Re-renders are driven by the
 * ShopProvider state change that follows every hydrate/refresh.
 */
import { CATEGORIES, MENU, __setLiveMenu } from "./menu";
import type { Category, MenuItem } from "./types";

let hydrated = false;
export const menuHydrated = () => hydrated;

export function hydrateMenu(items: MenuItem[], cats: Category[]) {
  const seedFlags = new Map(MENU.map((item) => [item.id, item.excludeFromCategoryOffers]));
  const merged = items.map((item) =>
    seedFlags.get(item.id) && !item.excludeFromCategoryOffers
      ? { ...item, excludeFromCategoryOffers: true }
      : item
  );
  __setLiveMenu(merged, cats);
  hydrated = true;
}

export function useMenuData(): { items: MenuItem[]; cats: Category[]; hydrated: boolean } {
  return { items: MENU, cats: CATEGORIES, hydrated };
}
