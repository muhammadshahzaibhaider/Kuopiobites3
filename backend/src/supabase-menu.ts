import { db, must } from "./supabase";
import type { Category, MenuItem, Tag } from "./lib/types";

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
  available: boolean;
  archived_at: string | null;
  available_days: number[] | null;
  pre_order_only: boolean;
  preorder_cutoff: NonNullable<MenuItem["availability"]>["preorderCutoff"] | null;
  lead_time_hours: number | null;
  mods: MenuItem["mods"] | null;
  tags: string[] | null;
  photo_url: string | null;
  photo_alt_fi: string | null;
  photo_alt_en: string | null;
  weight_kg: number | null;
  featured: boolean | null;
  is_special: boolean | null;
  toppings_enabled: boolean | null;
};

type ItemToppingRow = { item_id: string; topping_id: string; included: boolean };

export function toApiItem(row: ItemRow, links: ItemToppingRow[] = []): MenuItem {
  const days = row.available_days ?? [];
  const itemLinks = links.filter((link) => link.item_id === row.id);
  const prices = row.price_variants?.length ? row.price_variants : row.price_perhe !== null
    ? [{ label: "Med", value: Number(row.price_med) }, { label: "Perhe", value: Number(row.price_perhe) }]
    : [{ label: "", value: Number(row.price_med) }];
  return {
    id: row.id,
    cat: row.category_id,
    name: row.name_en ?? row.name_fi,
    nameFi: row.name_fi,
    desc: row.description_en ?? undefined,
    descFi: row.description_fi ?? undefined,
    prices: prices.map((price) => ({ ...price, value: Number(price.value) })),
    tags: (row.tags ?? []) as Tag[],
    mods: row.mods ?? undefined,
    imageUrl: row.photo_url ?? undefined,
    imageAltFi: row.photo_alt_fi ?? undefined,
    imageAltEn: row.photo_alt_en ?? undefined,
    weightKg: Number(row.weight_kg ?? 0),
    featured: Boolean(row.featured),
    special: Boolean(row.is_special),
    showToppings: Boolean(row.toppings_enabled),
    toppingIds: itemLinks.filter((link) => !link.included).map((link) => link.topping_id),
    includedToppingIds: itemLinks.filter((link) => link.included).map((link) => link.topping_id),
    available: Boolean(row.available),
    archived: Boolean(row.archived_at),
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

export async function listCategories(includeArchived = false): Promise<Category[]> {
  let query = db.from("categories").select("id, name_fi, name_en, sort_order, visible, archived_at").order("sort_order").limit(500);
  if (!includeArchived) query = query.eq("visible", true).is("archived_at", null);
  const rows = must(await query);
  return rows.map((row) => ({ id: row.id, title: row.name_fi, en: row.name_en, archived: Boolean(row.archived_at) }));
}

export async function listItems(categoryId?: string, includeArchived = false): Promise<MenuItem[]> {
  let query = db.from("menu_items").select("*").order("sort_order").limit(1000);
  if (categoryId) query = query.eq("category_id", categoryId);
  if (!includeArchived) {
    query = query.is("archived_at", null);
    const visibleCategories = must(await db.from("categories").select("id").eq("visible", true).is("archived_at", null));
    const categoryIds = visibleCategories.map((category) => category.id);
    if (!categoryIds.length) return [];
    query = query.in("category_id", categoryIds);
  }
  const rows = must(await query) as ItemRow[];
  if (!rows.length) return [];
  const links = must(await db.from("item_toppings").select("item_id, topping_id, included").in("item_id", rows.map((row) => row.id))) as ItemToppingRow[];
  return rows.map((row) => toApiItem(row, links));
}

export async function getItem(id: string, includeArchived = false): Promise<MenuItem | null> {
  const { data, error } = await db.from("menu_items").select("*").eq("id", id).maybeSingle();
  if (error && error.code !== "PGRST116") throw new Error(error.message);
  if (!data) return null;
  const row = data as ItemRow;
  if (!includeArchived && row.archived_at) return null;
  const { data: links, error: linksError } = await db.from("item_toppings").select("item_id, topping_id, included").eq("item_id", id);
  if (linksError) throw new Error(linksError.message);
  return toApiItem(row, (links ?? []) as ItemToppingRow[]);
}

export function toDatabaseItem(item: MenuItem, sortOrder: number) {
  const prices = item.prices.length ? item.prices : [{ label: "", value: 0 }];
  const top = item.mods?.find((group) => group.id === "top");
  const classic = /^pizza(\d)$/.exec(item.cat);
  return {
    id: item.id,
    category_id: item.cat,
    name_fi: item.nameFi ?? item.name,
    name_en: item.name,
    description_fi: item.descFi ?? null,
    description_en: item.desc ?? null,
    price_med: Math.min(...prices.map((price) => price.value)),
    price_perhe: null,
    price_variants: prices,
    available: item.available !== false,
    archived_at: item.archived ? new Date().toISOString() : null,
    weight_kg: item.weightKg ?? 0,
    featured: item.featured ?? false,
    is_special: item.special ?? false,
    toppings_enabled: item.showToppings ?? Boolean(item.toppingIds?.length || item.includedToppingIds?.length),
    included_toppings: item.includedToppingIds ?? [],
    pre_order_only: item.availability?.mode === "preorder_only",
    available_days: item.availability?.days ?? [],
    preorder_cutoff: item.availability?.preorderCutoff ?? null,
    lead_time_hours: item.availability?.leadTimeHours ?? null,
    topping_tier_included: top?.min ?? (classic ? Number(classic[1]) : 0),
    mods: item.mods ?? [],
    tags: item.tags ?? [],
    photo_url: item.imageUrl ?? null,
    photo_alt_fi: item.imageAltFi ?? item.nameFi ?? item.name,
    photo_alt_en: item.imageAltEn ?? item.name,
    sort_order: sortOrder,
  };
}

/** Keep the JSON compatibility model and normalized admin tables in sync. */
export async function syncItemConfiguration(item: MenuItem): Promise<void> {
  const variants = item.prices.map((variant, index) => ({
    id: `${item.id}-v${index + 1}`,
    item_id: item.id,
    label: variant.label || "Default",
    label_en: (variant.labelEn ?? variant.label) || "Default",
    label_fi: (variant.labelFi ?? variant.labelEn ?? variant.label) || "Oletus",
    name_en: variant.nameEn ?? item.name,
    name_fi: variant.nameFi ?? item.nameFi ?? item.name,
    description_en: variant.descEn ?? item.desc ?? null,
    description_fi: variant.descFi ?? item.descFi ?? null,
    price: variant.value,
    weight_kg: variant.weightKg ?? item.weightKg ?? 0,
    image_url: variant.imageUrl ?? item.imageUrl ?? null,
    is_default: index === 0,
    sort_order: index,
  }));
  const { error: deleteVariantsError } = await db.from("menu_item_variants").delete().eq("item_id", item.id);
  if (deleteVariantsError) throw new Error(deleteVariantsError.message);
  if (variants.length) {
    const { error } = await db.from("menu_item_variants").insert(variants);
    if (error) throw new Error(error.message);
  }

  const groups = (item.mods ?? []).map((group, index) => ({
    id: `${item.id}:${group.id}`,
    item_id: item.id,
    name_en: group.name,
    name_fi: group.nameFi ?? group.name,
    selection_type: group.type,
    required: group.required ?? false,
    min_selections: group.exact ?? group.min ?? (group.required ? 1 : 0),
    max_selections: group.exact ?? group.max ?? (group.type === "single" ? 1 : null),
    sort_order: index,
  }));
  const { error: deleteGroupsError } = await db.from("menu_option_groups").delete().eq("item_id", item.id);
  if (deleteGroupsError) throw new Error(deleteGroupsError.message);
  if (groups.length) {
    const { error } = await db.from("menu_option_groups").insert(groups);
    if (error) throw new Error(error.message);
    const choices = (item.mods ?? []).flatMap((group) => group.options.map((option, index) => ({
      id: `${item.id}:${group.id}:c${index + 1}`,
      group_id: `${item.id}:${group.id}`,
      label_en: option.labelEn ?? option.label,
      label_fi: option.labelFi ?? option.label,
      topping_id: option.toppingId ?? null,
      price: option.price,
      price_by_variant: option.priceByVariant ?? group.perVariantExtra ?? [],
      sort_order: index,
    })));
    if (choices.length) {
      const { error: choicesError } = await db.from("menu_option_choices").insert(choices);
      if (choicesError) throw new Error(choicesError.message);
    }
  }

  const toppingIds = Array.from(new Set([...(item.toppingIds ?? []), ...(item.includedToppingIds ?? [])]));
  const { error: deleteLinksError } = await db.from("item_toppings").delete().eq("item_id", item.id);
  if (deleteLinksError) throw new Error(deleteLinksError.message);
  if (toppingIds.length) {
    const included = new Set(item.includedToppingIds ?? []);
    const links = toppingIds.map((toppingId) => ({
      item_id: item.id,
      topping_id: toppingId,
      included: included.has(toppingId),
      price_overrides: {},
    }));
    const { error: linksError } = await db.from("item_toppings").insert(links);
    if (linksError) throw new Error(linksError.message);
  }
}
