import { db } from "./supabase";
import { safeLogError } from "./security";
import { getItem } from "./supabase-menu";

/* Favorites live in their own table (public.customer_favorites), one row per
   customer+item pair. The legacy `customers.favorites` array column is gone
   from every query — and every loader here is wrapped so a favorites problem
   can never break login, profile, or page loads again. */
export async function listFavorites(customerId: string): Promise<string[]> {
  const { data, error } = await db.from("customer_favorites")
    .select("menu_item_id").eq("customer_id", customerId)
    .order("created_at", { ascending: true }).limit(1000);
  if (error) throw new Error(error.message);
  return Array.from(new Set((data ?? []).map((row: any) => row.menu_item_id)));
}

/** Never throws: on any failure, logs and returns an empty list. */
export async function safeListFavorites(requestId: string, customerId: string): Promise<string[]> {
  try {
    return await listFavorites(customerId);
  } catch (error) {
    safeLogError(requestId, error instanceof Error ? error : new Error("favorites load failed"));
    return [];
  }
}

/** Adds a favorite. Returns false when the menu item does not exist. */
export async function addFavorite(customerId: string, itemId: string): Promise<boolean> {
  const item = await getItem(itemId);
  if (!item) return false;
  const { error } = await db.from("customer_favorites")
    .insert({ customer_id: customerId, menu_item_id: itemId });
  /* The unique (customer_id, menu_item_id) pair makes adds idempotent: a
     duplicate insert is not an error for us. */
  if (error && !/duplicate|23505/i.test(error.message)) throw new Error(error.message);
  return true;
}

export async function removeFavorite(customerId: string, itemId: string): Promise<void> {
  const { error } = await db.from("customer_favorites")
    .delete().eq("customer_id", customerId).eq("menu_item_id", itemId);
  if (error) throw new Error(error.message);
}

/** Merge a legacy/local list into the table (post-login one-time import). */
export async function mergeFavorites(requestId: string, customerId: string, itemIds: string[]): Promise<string[]> {
  const clean = Array.from(new Set(itemIds)).slice(0, 500);
  for (const itemId of clean) {
    try {
      await addFavorite(customerId, itemId);
    } catch (error) {
      /* Unknown or stale ids are skipped, never fatal. */
      safeLogError(requestId, error instanceof Error ? error : new Error(`favorite merge skipped ${itemId}`));
    }
  }
  return listFavorites(customerId);
}
