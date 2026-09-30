import { db, getJSON } from "./db";
import {
  builderUnitPrice, computeDiscount, isItemOff, optionOff, pizzaUnitPrice, validatePreorder,
} from "./lib/v3";
import type { CartLine, Lang, MenuItem, Order, Overrides, Settings } from "./lib/types";

export const loadSettings = (): Settings => getJSON<Settings>("settings");
export const loadOverrides = (): Overrides =>
  getJSON<Overrides>("overrides") ?? { items: {}, order: {} };

/** server mirror of the old client-side effectiveMenu (base + admin overrides) */
export function effectiveItems(): MenuItem[] {
  const ov = loadOverrides();
  const rows = db.prepare(`SELECT data FROM items ORDER BY sort`).all() as { data: string }[];
  const base = rows.map((r) => JSON.parse(r.data) as MenuItem);
  const added = Object.values(ov.added ?? {}).flat();
  return [...base, ...added].map((m) => {
    const o = ov.items[m.id];
    if (!o) return m;
    return {
      ...m,
      name: o.name ?? m.name,
      prices: o.prices ? m.prices.map((p, i) => ({ ...p, value: o.prices![i] ?? p.value })) : m.prices,
    };
  });
}

export function expectedUnitPrice(s: Settings, items: MenuItem[], line: CartLine): number {
  const m = items.find((x) => x.id === line.itemId);
  if (!m) throw new Error("avail.unavailable");
  if (isItemOff(s, m.id)) throw new Error("avail.unavailable");
  const vi = Math.max(0, m.prices.findIndex((p) => p.label === line.variantLabel));
  if (line.pizza) {
    for (const e of line.pizza.extras)
      if (optionOff(s, "topping", e.label)) throw new Error("avail.unavailable");
    return line.pizza.builder
      ? builderUnitPrice(m, vi, line.pizza.extras.reduce((a, e) => a + e.count, 0))
      : pizzaUnitPrice(s, m, vi, line.pizza.extras);
  }
  let price = m.prices[vi]?.value ?? 0;
  for (const opt of line.options) {
    const found = m.mods?.flatMap((g) => g.options).find((o) => o.label === opt);
    price += found?.price ?? 0;
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
export function priceCart(
  s: Settings,
  lines: CartLine[],
  type: "pickup" | "delivery",
  lang: Lang,
  code?: string
): PricedCart {
  const items = effectiveItems();
  const repriced = lines.map((l) => ({
    ...l,
    unitPrice: expectedUnitPrice(s, items, l),
  }));
  const subtotal = Math.round(repriced.reduce((a, l) => a + l.qty * l.unitPrice, 0) * 100) / 100;
  const disc = computeDiscount(s, repriced, subtotal, lang, code);
  let deliveryFee = type === "delivery" ? s.deliveryFee : 0;
  if (disc.freeDelivery) deliveryFee = 0;
  const total = Math.max(0, Math.round((subtotal - disc.amount + deliveryFee) * 100) / 100);
  const vat = Math.round((total - total / (1 + s.vatRate / 100)) * 100) / 100;
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
export function validateOrder(
  s: Settings,
  body: { type: "pickup" | "delivery"; lines: CartLine[]; total: number; scheduled?: { date: string; time: string }; lang?: Lang; code?: string }
): PricedCart {
  if (s.paused) throw new Error("order.paused");
  const preErr = validatePreorder(s, body.lines, body.scheduled);
  if (preErr) throw new Error(preErr);
  const priced = priceCart(s, body.lines, body.type, body.lang ?? "en", body.code);
  if (Math.abs(priced.total - body.total) > 0.02) throw new Error("order.priceChanged");
  return priced;
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
