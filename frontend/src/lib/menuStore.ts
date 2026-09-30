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
  __setLiveMenu(items, cats);
  hydrated = true;
}

export function useMenuData(): { items: MenuItem[]; cats: Category[]; hydrated: boolean } {
  return { items: MENU, cats: CATEGORIES, hydrated };
}
