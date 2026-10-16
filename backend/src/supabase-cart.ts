import { db } from "./supabase";
import { safeLogError } from "./security";
import { getItem } from "./supabase-menu";
import type { CartLine } from "./lib/types";

/* Server-side per-customer cart. Stored fields (name/img/unitPrice) are
   display snapshots for the cart UI only — money is always recomputed from the
   menu at quote/checkout time, so tampering with them buys an attacker
   nothing. customer_id always comes from the verified session, never from the
   request body. */
const toLine = (row: any): CartLine => ({
  key: row.line_key,
  itemId: row.item_id,
  name: row.name_snap ?? "",
  variantLabel: row.variant_label ?? "",
  qty: row.qty,
  unitPrice: row.unit_price ?? 0,
  options: (row.options ?? []) as string[],
  img: row.img ?? undefined,
  note: row.note ?? undefined,
  pizza: row.pizza ?? undefined,
  preorder: row.preorder ?? undefined,
});

export async function listCart(customerId: string): Promise<CartLine[]> {
  const { data, error } = await db.from("cart_items")
    .select("*").eq("customer_id", customerId)
    .order("created_at", { ascending: true }).limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []).map(toLine);
}

/** Never throws: cart problems must not blank the page. */
export async function safeListCart(requestId: string, customerId: string): Promise<CartLine[]> {
  try {
    return await listCart(customerId);
  } catch (error) {
    safeLogError(requestId, error instanceof Error ? error : new Error("cart load failed"));
    return [];
  }
}

/**
 * Adds a line (idempotent per line_key: same item+variant+options stacks qty).
 * Returns { qty } on success or false when the menu item is unknown.
 */
export async function addCartLine(customerId: string, line: CartLine): Promise<{ qty: number } | false> {
  const item = await getItem(line.itemId);
  if (!item) return false;
  const { data: existing, error: findError } = await db.from("cart_items")
    .select("id, qty").eq("customer_id", customerId).eq("line_key", line.key).maybeSingle();
  if (findError) throw new Error(findError.message);
  const qty = Math.min(99, (existing?.qty ?? 0) + Math.max(1, line.qty));
  if (existing) {
    const { error } = await db.from("cart_items")
      .update({ qty, updated_at: new Date().toISOString() }).eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await db.from("cart_items").insert({
      customer_id: customerId, line_key: line.key, item_id: line.itemId,
      name_snap: (line.name || "").slice(0, 160) || null, variant_label: (line.variantLabel || "").slice(0, 40),
      qty: Math.max(1, line.qty), options: line.options ?? [], note: (line.note || "").slice(0, 400) || null,
      pizza: line.pizza ?? null, preorder: line.preorder ?? null, img: line.img ?? null, unit_price: line.unitPrice ?? null,
    });
    if (error && !/duplicate|23505/i.test(error.message)) throw new Error(error.message);
  }
  return { qty };
}

/** Sets an absolute quantity; qty<=0 removes the line. Returns false if absent. */
export async function setCartLineQty(customerId: string, key: string, qty: number): Promise<boolean> {
  if (qty <= 0) {
    await removeCartLine(customerId, key);
    return true;
  }
  const { data, error } = await db.from("cart_items")
    .update({ qty: Math.min(99, qty), updated_at: new Date().toISOString() })
    .eq("customer_id", customerId).eq("line_key", key).select("id");
  if (error) throw new Error(error.message);
  return (data ?? []).length > 0;
}

export async function removeCartLine(customerId: string, key: string): Promise<void> {
  const { error } = await db.from("cart_items")
    .delete().eq("customer_id", customerId).eq("line_key", key);
  if (error) throw new Error(error.message);
}

export async function clearCart(customerId: string): Promise<void> {
  const { error } = await db.from("cart_items").delete().eq("customer_id", customerId);
  if (error) throw new Error(error.message);
}

/** One-time import of a pre-login/local cart; unknown items are skipped. */
export async function mergeCartLines(requestId: string, customerId: string, lines: CartLine[]): Promise<CartLine[]> {
  for (const line of lines.slice(0, 200)) {
    try {
      await addCartLine(customerId, line);
    } catch (error) {
      safeLogError(requestId, error instanceof Error ? error : new Error(`cart merge skipped ${line.itemId}`));
    }
  }
  return listCart(customerId);
}
