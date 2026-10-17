import { listItems } from "./supabase-menu";
import { cartWeightKg, deliveryFeeFor, resolveDeliveryDistanceKm } from "./delivery";
import { loadSettings as loadSupabaseSettings } from "./supabase-settings";
import { computeDiscount, todayDayH, validatePreorder } from "./lib/v3";
import { expectedUnitPrice, priceEachLine, type LineErrorCode, type PricedLine } from "./lib/line-pricing";
import type { CartLine, Lang, MenuItem, Order, Overrides, Settings } from "./lib/types";

export const loadSettings = loadSupabaseSettings;

/** server mirror of the old client-side effectiveMenu (base + admin overrides) */
export async function effectiveItems(): Promise<MenuItem[]> {
  return listItems();
}

export { expectedUnitPrice };

export interface PricedCart {
  lines: CartLine[];
  subtotal: number;
  deliveryFee: number;
  deliveryDistanceKm?: number;
  weightKg: number;
  discount: { title: string; amount: number; offerId?: string; freeDelivery?: boolean } | undefined;
  total: number;
  vat: number;
}

export type PricedCartLine = Omit<CartLine, "unitPrice"> & {
  unitPrice: number | null;
  error: LineErrorCode | null;
};

export interface PricedLines {
  lines: PricedCartLine[];
  subtotal: number;
  deliveryFee: number;
  deliveryDistanceKm?: number;
  weightKg: number;
  discount: { title: string; amount: number; offerId?: string; freeDelivery?: boolean } | undefined;
  total: number;
  vat: number;
  /** how many lines could not be priced (the UI blocks checkout while > 0) */
  invalidCount: number;
}

/** Totals over already priced lines. Shared by the strict and lenient paths. */
async function totalsFor(
  s: Settings,
  items: MenuItem[],
  priced: CartLine[],
  type: "pickup" | "delivery",
  lang: Lang,
  code?: string,
  address?: string
) {
  const subtotal = Math.round(priced.reduce((a, l) => a + l.qty * l.unitPrice, 0) * 100) / 100;
  const weightKg = cartWeightKg(items, priced);
  const deliveryDistanceKm = type === "delivery" ? await resolveDeliveryDistanceKm(address) : undefined;
  const disc = computeDiscount(s, priced, subtotal, lang, code, { type, distanceKm: deliveryDistanceKm, weightKg }, items);
  let deliveryFee = type === "delivery" ? deliveryFeeFor(s, deliveryDistanceKm, weightKg) : 0;
  if (disc.freeDelivery && type === "delivery") deliveryFee = 0;
  const total = Math.max(0, Math.round((subtotal - disc.amount + deliveryFee) * 100) / 100);
  // prices include VAT; vatRate is a fraction (0.135 = 13.5 %), so the VAT share is total × r / (1 + r)
  const vat = Math.round(((total * s.vatRate) / (1 + s.vatRate)) * 100) / 100;
  return {
    subtotal,
    weightKg,
    deliveryDistanceKm,
    deliveryFee,
    total,
    vat,
    discount: disc.amount || disc.freeDelivery
      ? { title: disc.title, amount: disc.amount, offerId: disc.offer?.id, freeDelivery: disc.freeDelivery }
      : undefined,
  };
}

const serverName = (items: MenuItem[], line: CartLine, lang: Lang): string => {
  const m = items.find((x) => x.id === line.itemId);
  return m ? (lang === "fi" ? m.nameFi ?? m.name : m.name) : line.name;
};
const publicLine = (line: CartLine, lang: Lang, items: MenuItem[]): CartLine => ({
  ...line,
  name: serverName(items, line, lang),
  ...(line.pizza ? { options: [] } : {}),
});

/**
 * Lenient cart quote used by POST /api/cart/price.
 *
 * Every line is priced on its own so a single stale row (old variant label,
 * display-string option, note saved as an option…) no longer 400s the whole
 * cart. Broken rows come back with `unitPrice: null` + `error`, are excluded
 * from the totals, and the client offers to remove them. Checkout stays strict
 * (`priceCart` / `validateOrder`) — nothing is ever charged on guessed data.
 */
export async function priceLines(
  s: Settings,
  raws: unknown[],
  type: "pickup" | "delivery",
  lang: Lang,
  code?: string,
  knownItems?: MenuItem[],
  address?: string
): Promise<PricedLines> {
  const items = knownItems ?? await effectiveItems();
  const priced: PricedLine[] = priceEachLine(s, items, raws);
  const valid = priced.filter((p): p is PricedLine & { unitPrice: number; error: null } => p.error === null && p.unitPrice !== null);
  const totals = await totalsFor(s, items, valid.map((p) => ({ ...publicLine(p.line, lang, items), unitPrice: p.unitPrice })), type, lang, code, address);
  return {
    lines: priced.map((p) => ({
      ...publicLine(p.line, lang, items),
      unitPrice: p.unitPrice,
      error: p.error,
    })),
    ...totals,
    invalidCount: priced.length - valid.length,
  };
}

/** THE price authority: recalculates every line + totals; never trusts client numbers */
export async function priceCart(
  s: Settings,
  lines: CartLine[],
  type: "pickup" | "delivery",
  lang: Lang,
  code?: string,
  knownItems?: MenuItem[],
  address?: string
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
  const totals = await totalsFor(s, items, repriced, type, lang, code, address);
  return {
    lines: repriced.map((line) => line.pizza ? { ...line, options: [] } : line),
    ...totals,
  };
}

/** full order validation used by POST /api/orders */
export async function validateOrder(
  s: Settings,
  body: { type: "pickup" | "delivery"; lines: CartLine[]; scheduled?: { date: string; time: string }; lang?: Lang; code?: string; address?: string }
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
  if (body.type === "delivery" && priced.deliveryDistanceKm !== undefined && s.radiusKm > 0 && priced.deliveryDistanceKm > s.radiusKm)
    throw new Error("order.deliveryRadius");
  return priced;
}

/** Status is driven only by explicit kitchen actions — never by a timer.
    A brand-new order stays "placed" until staff accept or decline it. */
export function orderStatus(o: Order): string {
  return o.statusOverride ?? "placed";
}

export const round2 = (n: number) => Math.round(n * 100) / 100;
