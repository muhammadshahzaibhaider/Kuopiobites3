/** Every input that changes a quote, excluding display snapshots updated by that quote. */
export function quoteIdentity(lines: Array<{ key: string; qty: number; itemId: string; variantLabel: string; options?: string[]; pizza?: unknown; preorder?: unknown }>, type: string, code = "", address = "", lang = "en"): string {
  return JSON.stringify([type, type === "delivery" ? address : "", code, lang,
    lines.map((l) => [l.key, l.itemId, l.variantLabel, l.qty, l.options ?? [], l.pizza ?? null, l.preorder ?? null])]);
}
