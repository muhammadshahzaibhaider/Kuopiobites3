import { eur } from "./format";
import { helsinkiNow, todayStrHelsinki, toMin } from "./hours";
import { MENU } from "./menu";
import type { CartLine, Lang, MenuItem, ModGroup, ModOption, Offer, Settings } from "./types";

/* ── ingredient glossary (fi key → en) ── */
export const ING: Record<string, string> = {
  jauheliha: "ground beef", salami: "salami", kinkku: "ham", ananas: "pineapple",
  tonnikala: "tuna", herkkusieni: "mushroom", pepperoni: "pepperoni", sipuli: "onion",
  aurajuusto: "blue cheese", katkarapu: "shrimp", simpukka: "mussel", paprika: "bell pepper",
  oliivi: "olive", kana: "chicken", tomaatti: "tomato", fetajuusto: "feta", kebab: "kebab",
  jalapeno: "jalapeno", majoneesi: "mayonnaise", BBQ: "BBQ", pekoni: "bacon",
  valkosipulimajoneesi: "garlic mayo", mozzarella: "mozzarella", edamjuusto: "edam",
  cheddarjuusto: "cheddar", feta: "feta",
  Kurkkumajoneesi: "cucumber mayo", Currymajoneesi: "curry mayo",
  "Makea Chili Majoneesi": "sweet chili mayo",
  "Chipotle-Ranchmajoneesi": "chipotle ranch mayo",
  "Tulinen Kastike": "hot sauce", "Las Vegas BBQ Kastike": "Las Vegas BBQ sauce",
  "Raita/Jogurttikastike": "raita / yogurt sauce", Valkosipulimajoneesi: "garlic mayo",
};

/* ── prose descriptions en↔fi ── */
export const DESC: Record<string, { en: string; fi: string }> = {
  "Served with raita": { en: "Served with raita", fi: "Tarjoillaan raitan kanssa" },
  "Add-on": { en: "Add-on", fi: "Lisäke" },
  "Biryani + cold drink + chicken shami + raita + salad": {
    en: "Biryani + cold drink + chicken shami + raita + salad",
    fi: "Biryani + limu + kana-shami + raita + salaatti",
  },
  "Served with ketchup & raita": { en: "Served with ketchup & raita", fi: "Tarjoillaan ketsupin ja raitan kanssa" },
  Meal: { en: "Meal", fi: "Ateria" },
  "Meal: drink + fries + dip": { en: "Meal: drink + fries + dip", fi: "Ateria: juoma, ranskalaiset ja dippi" },
  "Kebab sauce, salad, tomato, pickle, mayo": {
    en: "Kebab sauce, salad, tomato, pickle, mayo",
    fi: "Kebabkastike, salaatti, tomaatti, kurkkusäilyke, majoneesi",
  },
  "Tomato, salt cucumber, salad, mayo": {
    en: "Tomato, salt cucumber, salad, mayo",
    fi: "Tomaatti, suolakurkku, salaatti, majoneesi",
  },
  "Includes raita and salad": { en: "Includes raita and salad", fi: "Sisältää raitan ja salaatin" },
  "Includes one naan + salad": { en: "Includes one naan + salad", fi: "Sisältää naanleivän ja salaatin" },
  "Lentils · includes one naan + salad": { en: "Lentils · includes one naan + salad", fi: "Linssit · sisältää naanleivän ja salaatin" },
  "Butter naan": { en: "Butter naan", fi: "Voinaan" },
  "Garlic naan": { en: "Garlic naan", fi: "Valkosipulinaan" },
  Milk: { en: "Milk", fi: "Maito" },
  Coffee: { en: "Coffee", fi: "Kahvi" },
  Fries: { en: "Fries", fi: "Ranskalaiset" },
  "Kala & ranska": { en: "Fish & fries", fi: "Kala & ranska" },
  "Each dip €1.00": { en: "Each dip €1.00", fi: "Jokainen dippi €1.00" },
  "2× pihvi, 2× juusto": { en: "2× patty, 2× cheese", fi: "2× pihvi, 2× juusto" },
  "2× pihvi, kananmuna": { en: "2× patty, egg", fi: "2× pihvi, kananmuna" },
  "3× pihvi, 3× juusto": { en: "3× patty, 3× cheese", fi: "3× pihvi, 3× juusto" },
};

/* item names per language */
export const NAME_FI: Record<string, string> = {
  "Boiled Rice": "Keitetty riisi",
  "Egg Fried Rice": "Kananmunariisi",
  "Vegetable Fried Rice": "Kasvispaistettu riisi",
  "Chicken Biryani": "Kana-biryani",
  Tea: "Tee",
  "Vegetarian Samosa": "Kasvissamosa",
  "Onion Rings": "Sipulirenkaat",
  "Mozzarella Sticks": "Mozzarellatikut",
  "Fish & Chips + juoma 0.33l": "Fish & Chips + juoma 0.33l",
  "Paistettua Jauhelihamakaronia": "Paistettua jauhelihamakaronia",
};
export const NAME_EN: Record<string, string> = {
  Maito: "Milk",
  Kahvi: "Coffee",
  Ranskalaiset: "Fries",
  "Paistettua Jauhelihamakaronia": "Fried minced-meat macaroni",
  "Vegetables Chow Mein": "Vegetable Chow Mein",
};

/* size/variant labels per language */
const VLABEL: Record<Lang, Record<string, string>> = {
  en: { Med: "Medium", Perhe: "Family", Pelkkä: "Single", Ateria: "Meal", Half: "Half plate", Full: "Full plate", Meal: "Meal", "3pc": "3 pc", "6pc": "6 pc", "1pc": "1 pc", "2pc": "2 pc", Large: "Large" },
  fi: { Med: "Med", Perhe: "Perhe", Pelkkä: "Pelkkä", Ateria: "Ateria", Half: "Puolikas", Full: "Kokonainen", Meal: "Ateria", "3pc": "3 kpl", "6pc": "6 kpl", "1pc": "1 kpl", "2pc": "2 kpl", Large: "Large" },
};

export function trLabel(lang: Lang, label: string): string {
  return VLABEL[lang][label] ?? label;
}

export function trIng(lang: Lang, s: string): string {
  if (lang === "en") return ING[s] ?? s;
  return s;
}

function looksLikeIngredients(desc: string): boolean {
  const first = desc.split(",")[0].trim();
  return first in ING;
}

export function trDesc(lang: Lang, m: MenuItem): string | undefined {
  const raw = m.desc;
  if (!raw) return undefined;
  if (lang === "fi") {
    if (m.descFi) return m.descFi;
    if (DESC[raw]) return DESC[raw].fi;
    if (/^Build-your-own/.test(raw)) return raw.replace("Build-your-own", "Kasaa itse").replace("topping included", "täyte sisältyy").replace("toppings included", "täytettä sisältyy");
    if (/^Pan pizza/.test(raw)) return raw.replace("Pan pizza", "Pannupizza").replace("topping included", "täyte sisältyy").replace("toppings included", "täytettä sisältyy");
    if (looksLikeIngredients(raw)) return raw; // already Finnish
    return raw; // flagged elsewhere if English
  }
  if (DESC[raw]) return DESC[raw].en;
  if (looksLikeIngredients(raw))
    return raw.split(",").map((p) => ING[p.trim()] ?? p.trim()).join(", ");
  return raw;
}

export function trName(lang: Lang, m: MenuItem): string {
  if (lang === "fi") return m.nameFi ?? NAME_FI[m.name] ?? m.name;
  return NAME_EN[m.name] ?? m.name;
}

/* ── availability ── */
export function todayDayH(): number {
  return helsinkiNow().day;
}

export function isItemOff(s: Settings, id: string): boolean {
  const st = s.offItems[id];
  if (!st) return false;
  if (st.off) return true;
  if (st.offToday && st.offToday === todayStrHelsinki()) return true;
  return false;
}

export function isCatOff(s: Settings, cat: string): boolean {
  const st = s.offCats[cat];
  if (!st) return false;
  if (st.off) return true;
  if (st.offToday && st.offToday === todayStrHelsinki()) return true;
  return false;
}

export function optionOff(s: Settings, key: string, label: string): boolean {
  return (s.offOptions[key] ?? []).includes(label);
}

/* ── topping availability (single source of truth) ─────────────────────
   A topping "exists" when it is in the master list (settings.toppings) and
   "is sellable" when it is also not switched off (offOptions.topping).
   Both the customer-facing selectors and the admin editor use these so a
   removed or switched-off topping can never linger in a pizza dialog. */
export function activeToppings(s: Settings): string[] {
  return s.toppings.filter((label) => !optionOff(s, "topping", label));
}

/** Options a topping-fed group may offer. Builder (`top`) and per-item
    (`topping`) groups hold a copy of the master list, so their stored options
    can outlive a topping — filter them at render time. */
export function visibleToppingOptions(s: Settings, group: ModGroup): ModGroup["options"] {
  if (group.id !== "top" && group.id !== "topping") return group.options;
  const allowed = new Set(activeToppings(s));
  return group.options.filter((option) => allowed.has(option.label));
}

/**
 * Drop topping options that no longer exist and clamp the selection limits to
 * what is left. Pure: returns the same array when nothing changes.
 *
 * Only toppings *removed* from the master list are deleted — a topping that is
 * merely switched off stays in the item data (hidden at render time), so
 * switching it back on restores it everywhere.
 *
 * Builder (`top`) groups are left alone: their options are filled from the
 * master list at render time and their tier (`min`) is part of the product
 * (Fantasia 3 / 4 / 5 täytettä). Lowering a tier here because the list is
 * temporarily short would permanently damage the menu.
 */
export function sanitizeToppingGroups(s: Settings, mods: ModGroup[] | undefined): ModGroup[] | undefined {
  if (!mods) return mods;
  const allowed = new Set(s.toppings);
  let changed = false;
  const next = mods.map((group) => {
    if (group.id !== "topping") return group;
    const options = group.options.filter((option) => allowed.has(option.label));
    const maxAvailable = Math.max(options.length, group.required || group.exact ? 1 : 0);
    const min = group.min === undefined ? undefined : Math.min(group.min, maxAvailable);
    const max = group.max === undefined ? undefined : Math.max(Math.min(group.max, Math.max(options.length, 1)), min ?? 0);
    if (options.length === group.options.length && min === group.min && max === group.max) return group;
    changed = true;
    return { ...group, options, ...(min !== undefined ? { min } : {}), ...(max !== undefined ? { max } : {}) };
  });
  return changed ? next : mods;
}

export const isPreorderItem = (m: MenuItem) => m.availability?.mode === "preorder_only";

/* ── pre-order Sundays (Europe/Helsinki) ── */
export function nextPreorderSundays(s: Settings, count = 2): string[] {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Helsinki", year: "numeric", month: "2-digit", day: "2-digit" });
  const wd = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Helsinki", weekday: "short" });
  const now = new Date();
  const todayStr = fmt.format(now);
  const { minutes } = helsinkiNow();
  const out: string[] = [];
  for (let add = 1; add <= 28 && out.length < count; add++) {
    const d = new Date(now.getTime() + add * 86400000);
    if (wd.format(d) !== "Sun") continue;
    const gap = (6 - s.preorder.cutoffDay + 7) % 7 || 7; // days before Sunday when cutoff hits
    const cutoffStr = fmt.format(new Date(d.getTime() - gap * 86400000));
    const cutoffMin = toMin(s.preorder.cutoffTime);
    const ok =
      todayStr < cutoffStr ||
      (todayStr === cutoffStr && minutes < cutoffMin);
    if (ok) out.push(fmt.format(d));
  }
  return out;
}

export function validatePreorder(s: Settings, lines: CartLine[], scheduled?: { date: string; time: string }): string | null {
  const hasPre = lines.some((l) => l.preorder);
  if (!hasPre) return null;
  if (!s.preorder.enabled) return "pre.errClosed";
  if (!scheduled) return "pre.errSlot";
  const d = new Date(scheduled.date + "T12:00:00");
  if (d.getDay() !== 0) return "pre.errSunday";
  if (!nextPreorderSundays(s, 3).includes(scheduled.date)) return "pre.errCutoff";
  return null;
}

/* ── offers & discounts ── */
export function liveOffers(s: Settings): Offer[] {
  const today = todayStrHelsinki();
  const day = todayDayH();
  return s.offers
    .filter((o) => o.active)
    .filter((o) => (!o.start || o.start <= today) && (!o.end || o.end >= today))
    .filter((o) => !o.days?.length || o.days.includes(day));
}

/* Offers the customer pages advertise: switched on and inside their date
   window. `liveOffers` additionally drops offers that only apply on other
   weekdays (correct for pricing), but the home page still lists those and
   states the day — an offer created in admin must never be invisible. */
export function activeOffers(s: Settings): Offer[] {
  const today = todayStrHelsinki();
  return s.offers
    .filter((o) => o.active)
    .filter((o) => (!o.start || o.start <= today) && (!o.end || o.end >= today))
    .sort((a, b) => b.priority - a.priority);
}

/** Badge shown on a customer-facing offer card. Uses the owner's badge text
 *  when set, otherwise a label derived from the offer type and value. */
export function offerBadge(o: Offer, lang: Lang, t: (key: string) => string): string {
  const own = lang === "fi" ? o.badgeFi ?? o.badgeEn : o.badgeEn ?? o.badgeFi;
  if (own) return own;
  if (o.type === "percent") return `−${o.value}%`;
  if (o.type === "override") return eur(o.value);
  if (o.type === "freeDelivery") return t("offers.freeDelivery");
  if (o.type === "freeItem") return t("offers.freeItem");
  return `−${eur(o.value)}`;
}

export interface DiscountResult {
  amount: number;
  title: string;
  freeDelivery: boolean;
  offer?: Offer;
}

export function computeDiscount(
  s: Settings,
  lines: CartLine[],
  subtotal: number,
  lang: Lang,
  code?: string
): DiscountResult {
  const live = liveOffers(s).filter((o) => !o.code || (code ?? "").toUpperCase() === o.code.toUpperCase());
  let best: DiscountResult = { amount: 0, title: "", freeDelivery: false };
  for (const o of live) {
    const scoped = lines.filter((l) =>
      o.scope.whole
        ? true
        : o.scope.category
          ? MENU.find((m) => m.id === l.itemId)?.cat === o.scope.category
          : (o.scope.itemIds ?? []).includes(l.itemId)
    );
    const scopedTotal = scoped.reduce((a, l) => a + l.qty * l.unitPrice, 0);
    if (o.minOrder && subtotal < o.minOrder) continue;
    if (o.maxUses && (o.uses ?? 0) >= o.maxUses) continue;
    const title = lang === "fi" ? o.titleFi : o.titleEn;
    if (o.type === "freeDelivery") {
      if (!best.freeDelivery) best = { amount: 0, title, freeDelivery: true, offer: o };
      continue;
    }
    let amount = 0;
    if (o.type === "percent") amount = (scopedTotal * o.value) / 100;
    if (o.type === "fixed") amount = Math.min(o.value, scopedTotal);
    if (o.type === "override") {
      const l = lines.find((x) => (o.scope.itemIds ?? []).includes(x.itemId));
      if (l) amount = Math.max(0, (l.unitPrice - o.value) * l.qty);
    }
    if (o.type === "bundle") {
      const ids = o.scope.itemIds ?? [];
      if (ids.length && ids.every((id) => lines.some((l) => l.itemId === id))) amount = o.value;
    }
    if (o.type === "freeItem") {
      const l = lines.find((x) => (o.scope.itemIds ?? []).includes(x.itemId));
      if (l) amount = l.unitPrice;
    }
    amount = Math.round(amount * 100) / 100;
    if (amount > best.amount) best = { amount, title, freeDelivery: best.freeDelivery, offer: o };
  }
  return best;
}

/** struck-through price for an item when an override/percent offer is live */
export function offerPrice(s: Settings, m: MenuItem, variant: number): { now: number; was: number } | null {
  const live = liveOffers(s);
  for (const o of live.sort((a, b) => b.priority - a.priority)) {
    const hit = o.scope.itemIds?.includes(m.id);
    if (!hit) continue;
    const was = m.prices[variant]?.value ?? 0;
    if (o.type === "override") return { now: o.value, was };
    if (o.type === "percent") return { now: Math.round(was * (1 - o.value / 100) * 100) / 100, was };
  }
  return null;
}

export function etaLabel(lang: Lang, type: "pickup" | "delivery"): string {
  return type === "pickup"
    ? lang === "fi" ? "Arvio: 20–30 min" : "Est. 20–30 min"
    : lang === "fi" ? "Arvio: 35–50 min" : "Est. 35–50 min";
}

/* ── v3.1 pizza engine ─────────────────────────────────── */

export const PIZZA_CATS = ["pizza1", "pizza2", "pizza3", "pizza4", "pizza5", "fantasia", "pannu"];
export const isPizzaItem = (m: MenuItem) => PIZZA_CATS.includes(m.cat);

export function pizzaSlug(m: MenuItem): string {
  return m.name
    .toLowerCase()
    .replace(/ä/g, "a").replace(/ö/g, "o")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** public src for a pizza image: admin upload → /menu/pizza/<slug>.webp (component falls back to placeholder on 404) */
export function pizzaImageSrc(s: Settings, m: MenuItem): string {
  const up = s.itemImages[m.id];
  if (up?.src) return up.src;
  if (m.cat === "fantasia") return "/menu/pizza/fantasia.webp";
  if (m.cat === "pannu") return "/menu/pizza/pannu.webp";
  return `/menu/pizza/${pizzaSlug(m)}.webp`;
}

const TOP_ALIAS: Record<string, string> = {
  feta: "fetajuusto",
  edam: "edamjuusto",
  cheddar: "cheddarjuusto",
};

/** toppings included in a classic pizza (never charged again unless doubled) */
export function pizzaIncluded(m: MenuItem): string[] {
  if (m.cat === "pizza1") {
    if (m.name.toLowerCase().startsWith("margareta")) return ["mozzarella"];
    const l = m.name.toLowerCase();
    return TOP_ALIAS[l] ? [TOP_ALIAS[l]] : [l];
  }
  if (!m.desc) return [];
  return m.desc
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .map((s) => TOP_ALIAS[s] ?? s);
}

/** Localized display for a modifier, while the cart/API retain its canonical raw label. */
export function modOptionLabel(lang: Lang, group: Pick<ModGroup, "id">, option: ModOption, settings: Settings): string {
  if (group.id === "topping") return toppingLabel(settings, lang, option.label);
  return (lang === "fi" ? option.labelFi : option.labelEn)?.trim() || trIng(lang, option.label);
}

/** Translate a raw CartLine option for customer display without changing its stored value. */
export function cartOptionLabel(item: MenuItem | undefined, settings: Settings, lang: Lang, rawLabel: string): string {
  for (const group of item?.mods ?? []) {
    const option = group.options.find((candidate) => candidate.label === rawLabel);
    if (option) return modOptionLabel(lang, group, option, settings);
  }
  return trIng(lang, rawLabel);
}

/** admin-editable topping label in the current language */
export function toppingLabel(s: Settings, lang: Lang, label: string): string {
  const meta = s.toppingMeta?.[label];
  const v = lang === "fi" ? meta?.fi : meta?.en;
  if (v) return v;
  return trIng(lang, label);
}

/** extra topping price for a size variant (0 = Med, 1 = Perhe) */
export function toppingExtraPrice(s: Settings, label: string, variantIdx: number): number {
  const meta = s.toppingMeta?.[label];
  return (variantIdx === 0 ? meta?.priceMed : meta?.pricePerhe) ?? (variantIdx === 0 ? 1 : 2);
}

/** live/server price for a classic pizza: base + Σ extras × per-size price */
export function pizzaUnitPrice(
  s: Settings,
  m: MenuItem,
  variantIdx: number,
  extras: { label: string; count: number }[]
): number {
  const base = m.prices[variantIdx]?.value ?? 0;
  let sum = 0;
  for (const e of extras) sum += toppingExtraPrice(s, e.label, variantIdx) * e.count;
  return Math.round((base + sum) * 100) / 100;
}

/** builder (Fantasia/Pannu) price: base + toppings beyond the tier min × per-variant extra */
export function builderUnitPrice(m: MenuItem, variantIdx: number, count: number): number {
  const g = m.mods?.find((x) => x.id === "top");
  const base = m.prices[variantIdx]?.value ?? 0;
  const min = g?.min ?? 0;
  const per = g?.perVariantExtra?.[variantIdx] ?? (variantIdx === 0 ? 1 : 2);
  return Math.round((base + Math.max(0, count - min) * per) * 100) / 100;
}
