import type { CartLine } from "./types";

/**
 * Shape guard for cart lines that did not necessarily come from the current UI.
 *
 * A line can arrive from the server cart table (written by an older build), from
 * the legacy localStorage cart, or from a tab that was open during a bad deploy.
 * Anything that cannot be safely interpreted as a CartLine is dropped here —
 * once, on load — so a single rotten row never breaks the cart screen.
 *
 * Display-format problems that are still *structurally* valid (an old
 * `variantLabel:"—"`, an option stored as `"Täytteet: kebab"`) are deliberately
 * left in place: the server reports them per line and the UI offers a Remove
 * action, which is clearer for the customer than silently losing an item.
 */
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const keyOf = (itemId: string, variantLabel: string, options: string[]): string =>
  `${itemId}|${variantLabel}|${JSON.stringify(options)}`.slice(0, 100);

export function sanitizeCartLine(raw: unknown): CartLine | null {
  if (!isRecord(raw)) return null;
  const itemId = typeof raw.itemId === "string" ? raw.itemId.trim() : "";
  if (!itemId) return null;

  const qty = typeof raw.qty === "number" && Number.isFinite(raw.qty) ? Math.floor(raw.qty) : 0;
  if (qty < 1) return null;

  if (raw.variantLabel !== undefined && typeof raw.variantLabel !== "string") return null;
  const variantLabel = typeof raw.variantLabel === "string" ? raw.variantLabel : "";

  if (raw.options !== undefined && !Array.isArray(raw.options)) return null;
  const rawOptions = Array.isArray(raw.options) ? raw.options : [];
  if (rawOptions.some((o) => typeof o !== "string")) return null;
  const options = rawOptions as string[];

  let pizza: CartLine["pizza"];
  if (raw.pizza !== undefined && raw.pizza !== null) {
    const p = raw.pizza;
    const valid =
      isRecord(p) &&
      typeof p.sizeLabel === "string" &&
      p.sizeLabel === variantLabel &&
      (p.builder === undefined || typeof p.builder === "boolean") &&
      Array.isArray(p.extras) &&
      (p.extras as unknown[]).every(
        (e) => isRecord(e) && typeof e.label === "string" && typeof e.count === "number" && Number.isFinite(e.count) && e.count >= 0
      );
    if (!valid) return null;
    pizza = {
      sizeLabel: p.sizeLabel as string,
      included: Array.isArray(p.included) ? (p.included as unknown[]).filter((x): x is string => typeof x === "string") : [],
      extras: (p.extras as { label: string; count: number }[]).map((e) => ({ label: e.label, count: Math.floor(e.count) })),
      ...(typeof p.builder === "boolean" ? { builder: p.builder } : {}),
    };
  }

  return {
    key: typeof raw.key === "string" && raw.key ? raw.key : keyOf(itemId, variantLabel, options),
    itemId,
    name: typeof raw.name === "string" ? raw.name : "",
    variantLabel,
    qty: Math.min(qty, 99),
    unitPrice: typeof raw.unitPrice === "number" && Number.isFinite(raw.unitPrice) && raw.unitPrice >= 0 ? raw.unitPrice : 0,
    options,
    ...(typeof raw.img === "string" && raw.img ? { img: raw.img } : {}),
    ...(typeof raw.note === "string" && raw.note ? { note: raw.note } : {}),
    ...(isRecord(raw.preorder) && typeof raw.preorder.date === "string" && typeof raw.preorder.time === "string"
      ? { preorder: { date: raw.preorder.date, time: raw.preorder.time } }
      : {}),
    ...(pizza ? { pizza } : {}),
  };
}

/** Sanitize a whole cart and de-duplicate by line key. Never throws. */
export function sanitizeCartLines(raw: unknown): CartLine[] {
  if (!Array.isArray(raw)) return [];
  const out: CartLine[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    const line = sanitizeCartLine(entry);
    if (!line) continue;
    if (seen.has(line.key)) continue;
    seen.add(line.key);
    out.push(line);
  }
  return out;
}
