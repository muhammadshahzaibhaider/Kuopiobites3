/**
 * Pure per-line cart pricing.
 *
 * Deliberately free of Supabase / Express / network imports so it can be unit
 * tested with plain `node --test`. The price authority itself is unchanged:
 * `expectedUnitPrice` is the same function the checkout path uses, so a line
 * priced here is priced exactly like it would be at checkout.
 */
import { modsForItem } from "./ateria";
import { activeToppings, builderUnitPrice, isCatOff, isItemOff, optionOff, pizzaUnitPrice } from "./v3";
import type { CartLine, MenuItem, Settings } from "./types";

/** Error codes the cart/checkout contract already defines. */
export type LineErrorCode =
  | "avail.unavailable"
  | "validation.invalidVariant"
  | "validation.invalidOption"
  | "validation.invalidOptions"
  | "validation.duplicateOption"
  | "validation.invalidPizzaMode"
  | "validation.invalidLine";

export interface PricedLine {
  line: CartLine;
  /** null when the line could not be priced (see error). */
  unitPrice: number | null;
  error: LineErrorCode | null;
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
  const groups = modsForItem(m, line.variantLabel);
  const sellableToppings = new Set(activeToppings(s));
  let price = m.prices[vi]?.value ?? 0;
  for (const opt of line.options) {
    if (selected.has(opt)) throw new Error("validation.duplicateOption");
    selected.add(opt);
    const group = groups.find((g) => g.options.some((o) => o.label === opt));
    const found = group?.options.find((o) => o.label === opt);
    if (!group || !found) throw new Error("validation.invalidOption");
    /* A topping can be removed from the master list or switched off after the
       item was authored — either way it must not be orderable. */
    if (group.id === "topping" || group.id === "top") {
      if (!s.toppings.includes(opt)) throw new Error("validation.invalidOption");
      if (!sellableToppings.has(opt)) throw new Error("avail.unavailable");
    }
    if (optionOff(s, `mod:${m.id}:${group.id}`, opt) || optionOff(s, "dip", opt)) throw new Error("avail.unavailable");
    price += found.price;
  }
  for (const group of groups) {
    const count = line.options.filter((opt) => group.options.some((o) => o.label === opt)).length;
    let minimum = group.exact ?? (group.required ? (group.min ?? 1) : (group.min ?? 0));
    /* Never demand more toppings than the shop can actually put on the pizza:
       a builder tier above the size of the master list would be unorderable. */
    if (group.id === "topping") minimum = Math.min(minimum, group.options.filter((option) => sellableToppings.has(option.label)).length);
    const maximum = group.exact ?? group.max ?? (group.type === "single" ? 1 : Number.POSITIVE_INFINITY);
    if (count < minimum || count > maximum) throw new Error("validation.invalidOptions");
  }
  return Math.round(price * 100) / 100;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Shape-guard a line that came from older clients, localStorage or the server
 * cart table. Structural junk (missing itemId, qty <= 0, options that are not
 * strings, a broken pizza payload) is reported as `validation.invalidLine`
 * instead of throwing, so one rotten line can never 400 the whole cart.
 *
 * Display-format problems (`variantLabel:"—"`, `"Täytteet: kebab"` options)
 * are intentionally NOT repaired here: pricing reports them per line so the
 * customer sees which row needs re-adding and the totals stay server-owned.
 */
export function coerceCartLine(raw: unknown, index = 0): { line: CartLine; error: LineErrorCode | null } {
  if (!isRecord(raw)) {
    return {
      line: { key: `invalid-${index}`, itemId: "", name: "", variantLabel: "", qty: 1, unitPrice: 0, options: [] },
      error: "validation.invalidLine",
    };
  }
  const itemId = typeof raw.itemId === "string" ? raw.itemId.trim() : "";
  const qty = typeof raw.qty === "number" && Number.isFinite(raw.qty) ? Math.floor(raw.qty) : 0;
  const variantLabel = typeof raw.variantLabel === "string" ? raw.variantLabel : "";
  const options = Array.isArray(raw.options) ? raw.options.filter((o): o is string => typeof o === "string") : [];
  const optionsWereObjects = Array.isArray(raw.options) && options.length !== raw.options.length;

  let error: LineErrorCode | null = null;
  if (!itemId) error = "validation.invalidLine";
  else if (qty < 1) error = "validation.invalidLine";
  else if (optionsWereObjects) error = "validation.invalidLine";

  let pizza: CartLine["pizza"];
  if (raw.pizza !== undefined && raw.pizza !== null) {
    const p = raw.pizza;
    const valid =
      isRecord(p) &&
      typeof p.sizeLabel === "string" &&
      Array.isArray(p.extras) &&
      p.extras.every((e) => isRecord(e) && typeof e.label === "string" && typeof e.count === "number" && e.count >= 0) &&
      (p.builder === undefined || typeof p.builder === "boolean");
    if (!valid) error = error ?? "validation.invalidLine";
    else
      pizza = {
        sizeLabel: p.sizeLabel as string,
        included: Array.isArray(p.included) ? p.included.filter((x): x is string => typeof x === "string") : [],
        extras: (p.extras as { label: string; count: number }[]).map((e) => ({ label: e.label, count: Math.floor(e.count) })),
        ...(typeof p.builder === "boolean" ? { builder: p.builder } : {}),
      };
  }

  const line: CartLine = {
    key: typeof raw.key === "string" && raw.key ? raw.key : `line-${index}`,
    itemId,
    name: typeof raw.name === "string" ? raw.name : "",
    variantLabel,
    qty: qty >= 1 ? Math.min(qty, 99) : 1,
    unitPrice: typeof raw.unitPrice === "number" && Number.isFinite(raw.unitPrice) ? raw.unitPrice : 0,
    options,
    ...(typeof raw.note === "string" && raw.note ? { note: raw.note } : {}),
    ...(typeof raw.img === "string" && raw.img ? { img: raw.img } : {}),
    ...(isRecord(raw.preorder) && typeof raw.preorder.date === "string" && typeof raw.preorder.time === "string"
      ? { preorder: { date: raw.preorder.date, time: raw.preorder.time } }
      : {}),
    ...(pizza ? { pizza } : {}),
  };
  return { line, error };
}

/**
 * Price every line independently. Valid lines get a server price; broken ones
 * carry a code and are excluded from totals by the caller.
 */
export function priceEachLine(s: Settings, items: MenuItem[], raws: unknown[]): PricedLine[] {
  return raws.map((raw, index) => {
    const { line, error } = coerceCartLine(raw, index);
    if (error) return { line, unitPrice: null, error };
    try {
      return { line, unitPrice: expectedUnitPrice(s, items, line), error: null };
    } catch (e) {
      return { line, unitPrice: null, error: (e as Error).message as LineErrorCode };
    }
  });
}
