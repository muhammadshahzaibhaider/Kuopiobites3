import { db, must } from "./supabase";
import type { MenuItem, Tag } from "./lib/types";

type ItemRow = {
  id: string;
  category_id: string;
  name_fi: string;
  name_en: string | null;
  description_fi: string | null;
  description_en: string | null;
  price_med: number;
  price_perhe: number | null;
  price_variants: MenuItem["prices"] | null;
  available_days: number[] | null;
  pre_order_only: boolean;
  preorder_cutoff: NonNullable<MenuItem["availability"]>["preorderCutoff"] | null;
  lead_time_hours: number | null;
  mods: MenuItem["mods"] | null;
  tags: string[] | null;
};

export function toApiItem(row: ItemRow): MenuItem {
  const days = row.available_days ?? [];
  return {
    id: row.id,
    cat: row.category_id,
    name: row.name_en ?? row.name_fi,
    nameFi: row.name_fi,
    desc: row.description_en ?? undefined,
    descFi: row.description_fi ?? undefined,
    prices: row.price_variants ?? (row.price_perhe !== null
      ? [{ label: "Med", value: row.price_med }, { label: "Perhe", value: row.price_perhe }]
      : [{ label: "", value: row.price_med }]),
    tags: (row.tags ?? []) as Tag[],
    mods: row.mods ?? undefined,
    availability: row.pre_order_only || days.length || row.preorder_cutoff || row.lead_time_hours !== null
      ? {
          days,
          mode: row.pre_order_only ? "preorder_only" : "normal",
          preorderCutoff: row.preorder_cutoff ?? undefined,
          leadTimeHours: row.lead_time_hours ?? undefined,
        }
      : undefined,
  };
}

export async function listCategories() {
  const rows = must(await db.from("categories").select("id, name_fi, name_en, sort_order, visible").order("sort_order").limit(500));
  return rows.map((row) => ({ id: row.id, title: row.name_fi, en: row.name_en }));
}

export async function listItems(categoryId?: string): Promise<MenuItem[]> {
  let query = db.from("menu_items").select("*").order("sort_order").limit(500);
  if (categoryId) query = query.eq("category_id", categoryId);
  const rows = must(await query);
  return (rows as ItemRow[]).map(toApiItem);
}

export async function getItem(id: string): Promise<MenuItem | null> {
  const row = must(await db.from("menu_items").select("*").eq("id", id).maybeSingle());
  return row ? toApiItem(row as ItemRow) : null;
}

export function toDatabaseItem(item: MenuItem, sortOrder: number) {
  const labels = item.prices.map((price) => price.label).join("|");
  const medPerhe = labels === "Med|Perhe";
  const single = item.prices.length === 1 && item.prices[0].label === "";
  const top = item.mods?.find((group) => group.id === "top");
  const classic = /^pizza(\d)$/.exec(item.cat);
  return {
    id: item.id,
    category_id: item.cat,
    name_fi: item.nameFi ?? item.name,
    name_en: item.name,
    description_fi: item.descFi ?? null,
    description_en: item.desc ?? null,
    price_med: medPerhe || single ? item.prices[0].value : Math.min(...item.prices.map((price) => price.value)),
    price_perhe: medPerhe ? item.prices[1].value : null,
    price_variants: medPerhe || single ? null : item.prices,
    pre_order_only: item.availability?.mode === "preorder_only",
    available_days: item.availability?.days ?? [],
    preorder_cutoff: item.availability?.preorderCutoff ?? null,
    lead_time_hours: item.availability?.leadTimeHours ?? null,
    topping_tier_included: top?.min ?? (classic ? Number(classic[1]) : 0),
    mods: item.mods ?? [],
    tags: item.tags ?? [],
    sort_order: sortOrder,
  };
}