import { listItems } from "./supabase-menu";
import { activeDeliveryRuleName, deliveryEvaluation, evaluateDeliveryRules } from "./delivery";
import { loadSettings as loadSupabaseSettings } from "./supabase-settings";
import {
  builderUnitPrice, computeDiscount, isCatOff, isItemOff, optionOff, pizzaUnitPrice, todayDayH, validatePreorder,
} from "./lib/v3";
import type { CartLine, Lang, MenuItem, Order, Overrides, Settings } from "./lib/types";

export const loadSettings = loadSupabaseSettings;

/** server mirror of the old client-side effectiveMenu (base + admin overrides) */
export async function effectiveItems(): Promise<MenuItem[]> {
  return listItems();
}

export function expectedUnitPrice(s: Settings, items: MenuItem[], line: CartLine): number {
  const m = items.find((x) => x.id === line.itemId);
  if (!m) throw new Error("avail.unavailable");
  if (m.available === false || isItemOff(s, m.id) || isCatOff(s, m.cat)) throw new Error("avail.unavailable");
  if (optionOff(s, `size:${m.id}`, line.variantLabel)) throw new Error("avail.unavailable");
  const vi = m.prices.findIndex((p) => p.label === line.variantLabel);
  if (vi < 0) throw new Error("validation.invalidVariant");
  if (line.pizza) {
    if (line.pizza.sizeLabel !== line.variantLabel) throw new Error("validation.invalidVariant");
    const builderItem = m.cat === "fantasia" || m.cat === "pannu" || Boolean(m.mods?.some((group) => group.id === "top"));
    if (Boolean(line.pizza.builder) !== builderItem) throw new Error("validation.invalidPizzaMode");
    const toppingSet = new Set(s.toppings);
    for (const e of line.pizza.extras) {
      if (!toppingSet.has(e.label) || optionOff(s, "topping", e.label)) throw new Error("avail.unavailable");
    }
    return line.pizza.builder
      ? builderUnitPrice(m, vi, line.pizza.extras.reduce((a, e) => a + e.count, 0))
      : pizzaUnitPrice(s, m, vi, line.pizza.extras);
  }
  const groups = m.mods ?? [];
  const toppingSlug = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const selections = line.selections !== undefined
    ? line.selections
    : line.options.map((optionLabel) => {
        const group = groups.find((candidate) => candidate.options.some((option) => option.label === optionLabel));
        return { groupId: group?.id ?? "", optionLabel };
      });
  const selectedByGroup = new Map<string, Set<string>>();
  let price = m.prices[vi]?.value ?? 0;
  for (const selection of selections) {
    const group = groups.find((candidate) => candidate.id === selection.groupId);
    const found = group?.options.find((option) => option.label === selection.optionLabel);
    if (!group || !found) throw new Error("validation.invalidOption");
    const selected = selectedByGroup.get(group.id) ?? new Set<string>();
    if (selected.has(selection.optionLabel)) throw new Error("validation.duplicateOption");
    selected.add(selection.optionLabel);
    selectedByGroup.set(group.id, selected);
    if (optionOff(s, `mod:${m.id}:${group.id}`, selection.optionLabel) || optionOff(s, "dip", selection.optionLabel)) throw new Error("avail.unavailable");
    let optionPrice = found.priceByVariant?.[vi] ?? found.price;
    if (found.toppingId) {
      const label = Object.keys(s.toppingMeta).find((name) => toppingSlug(name) === found.toppingId);
      if (!label || !s.toppings.some((active) => toppingSlug(active) === found.toppingId)) throw new Error("avail.unavailable");
      if (m.includedToppingIds?.includes(found.toppingId)) optionPrice = 0;
      else if (vi === 0) optionPrice = s.toppingMeta[label].priceMed ?? optionPrice;
      else if (vi === 1) optionPrice = s.toppingMeta[label].pricePerhe ?? optionPrice;
    }
    price += optionPrice;
  }
  for (const group of groups) {
    const count = selectedByGroup.get(group.id)?.size ?? 0;
    const minimum = group.exact ?? (group.required ? (group.min ?? 1) : (group.min ?? 0));
    const maximum = group.exact ?? group.max ?? (group.type === "single" ? 1 : Number.POSITIVE_INFINITY);
    if (count < minimum || count > maximum) throw new Error("validation.invalidOptions");
    const extras = group.perVariantExtra?.[vi] ?? 0;
    if (extras) price += group.min ? Math.max(0, count - group.min) * extras : count * extras;
  }
  return Math.round(price * 100) / 100;
}

export interface PricedCart {
  lines: CartLine[];
  subtotal: number;
  deliveryFee: number;
  discount: { title: string; amount: number; offerId?: string } | undefined;
  total: number;
  vat: number;
  deliveryOffer?: { id: string; nameEn: string; nameFi: string };
  distanceKm?: number;
  orderWeightKg: number;
}

/** THE price authority: recalculates every line, rule, fee, and total; never trusts client numbers. */
export async function priceCart(
  s: Settings,
  lines: CartLine[],
  type: "pickup" | "delivery",
  lang: Lang,
  code?: string,
  knownItems?: MenuItem[],
  address?: string,
): Promise<PricedCart> {
  const items = knownItems ?? await effectiveItems();
  const repriced = lines.map((l) => {
    const m = items.find((x) => x.id === l.itemId);
    return {
      ...l,
      // Name and price come from the server-side menu; the client cannot override either.
      name: m ? (lang === "fi" ? m.nameFi ?? m.name : m.name) : l.name,
      unitPrice: expectedUnitPrice(s, items, l),
    };
  });
  const subtotal = Math.round(repriced.reduce((a, l) => a + l.qty * l.unitPrice, 0) * 100) / 100;
  const orderWeightKg = round2(repriced.reduce((total, line) => {
    const item = items.find((candidate) => candidate.id === line.itemId);
    const variant = item?.prices.find((candidate) => candidate.label === line.variantLabel);
    return total + (variant?.weightKg ?? item?.weightKg ?? 0) * line.qty;
  }, 0));
  const disc = computeDiscount(s, repriced, subtotal, lang, code, items);
  let deliveryFee = 0;
  let deliveryOffer: PricedCart["deliveryOffer"];
  let distanceKm: number | undefined;
  if (type === "delivery") {
    const evaluated = address?.trim()
      ? await deliveryEvaluation(s, { weightKg: orderWeightKg, subtotalEur: subtotal }, address)
      : evaluateDeliveryRules(s, { weightKg: orderWeightKg, subtotalEur: subtotal });
    deliveryFee = evaluated.deliveryFee;
    distanceKm = evaluated.distanceKm;
    deliveryOffer = activeDeliveryRuleName(evaluated.appliedRules[0], lang);
  }
  if (disc.freeDelivery) deliveryFee = 0;
  const total = Math.max(0, Math.round((subtotal - disc.amount + deliveryFee) * 100) / 100);
  // Prices include VAT; vatRate is a fraction, so VAT share is total × r / (1 + r).
  const vat = Math.round(((total * s.vatRate) / (1 + s.vatRate)) * 100) / 100;
  return {
    lines: repriced, subtotal, deliveryFee,
    discount: disc.amount || disc.freeDelivery ? { title: disc.title, amount: disc.amount, offerId: disc.offer?.id } : undefined,
    total, vat, deliveryOffer, distanceKm, orderWeightKg,
  };
}

/** full order validation used by checkout creation */
export async function validateOrder(
  s: Settings,
  body: { type: "pickup" | "delivery"; lines: CartLine[]; address?: string; scheduled?: { date: string; time: string }; lang?: Lang; code?: string }
): Promise<PricedCart> {
  if (s.paused) throw new Error("order.paused");
  const items = await effectiveItems();
  const preorderLines = body.lines.filter((line) => items.find((item) => item.id === line.itemId)?.availability?.mode === "preorder_only");
  for (const line of body.lines) {
    const menuItem = items.find((item) => item.id === line.itemId);
    const serverPreorderOnly = menuItem?.availability?.mode === "preorder_only";
    if (serverPreorderOnly && !line.preorder) throw new Error("pre.errSlot");
    if (!serverPreorderOnly && menuItem?.availability?.days?.length && !menuItem.availability.days.includes(todayDayH()))
      throw new Error("avail.unavailable");
    if (line.preorder && (!body.scheduled || line.preorder.date !== body.scheduled.date || line.preorder.time !== body.scheduled.time))
      throw new Error("pre.errSlot");
  }
  const hasPreorder = preorderLines.length > 0;
  if (body.lines.some((line) => line.preorder) && !hasPreorder) throw new Error("order.scheduledInvalid");
  if (body.scheduled && !hasPreorder) throw new Error("order.scheduledInvalid");
  const preErr = validatePreorder(s, body.lines, body.scheduled);
  if (preErr) throw new Error(preErr);
  /* Deliberately no client-total comparison: totals are recalculated from the
     current menu/settings and the persisted server total is authoritative. */
  const priced = await priceCart(s, body.lines, body.type, body.lang ?? "en", body.code, items, body.address);
  if (body.type === "delivery" && priced.subtotal < s.minOrder) throw new Error("order.minOrder");
  return priced;
}

/** Persisted status is authoritative; estimates never auto-advance orders. */
export function orderStatus(o: Order): string {
  return o.statusOverride ?? "placed";
}

export const round2 = (n: number) => Math.round(n * 100) / 100;
