import { listItems } from "./supabase-menu";
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
  if (isItemOff(s, m.id) || isCatOff(s, m.cat)) throw new Error("avail.unavailable");
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
  const selected = new Set<string>();
  const groups = m.mods ?? [];
  let price = m.prices[vi]?.value ?? 0;
  for (const opt of line.options) {
    if (selected.has(opt)) throw new Error("validation.duplicateOption");
    selected.add(opt);
    const group = groups.find((g) => g.options.some((o) => o.label === opt));
    const found = group?.options.find((o) => o.label === opt);
    if (!group || !found) throw new Error("validation.invalidOption");
    if (optionOff(s, `mod:${m.id}:${group.id}`, opt) || optionOff(s, "dip", opt)) throw new Error("avail.unavailable");
    price += found.price;
  }
  for (const group of groups) {
    const count = line.options.filter((opt) => group.options.some((o) => o.label === opt)).length;
    const minimum = group.exact ?? (group.required ? (group.min ?? 1) : (group.min ?? 0));
    const maximum = group.exact ?? group.max ?? (group.type === "single" ? 1 : Number.POSITIVE_INFINITY);
    if (count < minimum || count > maximum) throw new Error("validation.invalidOptions");
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
}

/** THE price authority: recalculates every line + totals; never trusts client numbers */
export async function priceCart(
  s: Settings,
  lines: CartLine[],
  type: "pickup" | "delivery",
  lang: Lang,
  code?: string,
  knownItems?: MenuItem[]
): Promise<PricedCart> {
  const items = knownItems ?? await effectiveItems();
  const repriced = lines.map((l) => {
    const m = items.find((x) => x.id === l.itemId);
    return {
      ...l,
      // name comes from the server-side menu (never the client) — receipts, admin + analytics use it
      name: m ? (lang === "fi" ? m.nameFi ?? m.name : m.name) : l.name,
      unitPrice: expectedUnitPrice(s, items, l),
    };
  });
  const subtotal = Math.round(repriced.reduce((a, l) => a + l.qty * l.unitPrice, 0) * 100) / 100;
  const disc = computeDiscount(s, repriced, subtotal, lang, code);
  let deliveryFee = type === "delivery" ? s.deliveryFee : 0;
  if (disc.freeDelivery) deliveryFee = 0;
  const total = Math.max(0, Math.round((subtotal - disc.amount + deliveryFee) * 100) / 100);
  // prices include VAT; vatRate is a fraction (0.135 = 13.5 %), so the VAT share is total × r / (1 + r)
  const vat = Math.round(((total * s.vatRate) / (1 + s.vatRate)) * 100) / 100;
  return {
    lines: repriced,
    subtotal,
    deliveryFee,
    discount: disc.amount || disc.freeDelivery
      ? { title: disc.title, amount: disc.amount, offerId: disc.offer?.id }
      : undefined,
    total,
    vat,
  };
}

/** full order validation used by POST /api/orders */
export async function validateOrder(
  s: Settings,
  body: { type: "pickup" | "delivery"; lines: CartLine[]; scheduled?: { date: string; time: string }; lang?: Lang; code?: string }
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
  return priceCart(s, body.lines, body.type, body.lang ?? "en", body.code, items);
}

/** time-based progression (moved from the old client store) */
export function orderStatus(o: Order): string {
  if (o.statusOverride) return o.statusOverride;
  const el = (Date.now() - o.createdAt) / 1000;
  if (el < 45) return "placed";
  if (el < 120) return "accepted";
  if (el < 300) return "preparing";
  if (el < 720) return "ready";
  return "completed";
}

export const round2 = (n: number) => Math.round(n * 100) / 100;
