import type { SupabaseClient } from "@supabase/supabase-js";
import { db } from "./supabase";
import { DEFAULT_SETTINGS } from "./lib/hours";
import { sanitizeToppingGroups } from "./lib/v3";
import type { CatMeta, ModGroup, Offer, Settings, SpecialItem, ToppingMeta, UploadedImg } from "./lib/types";

const slug = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function check(result: PromiseLike<{ error: { message: string } | null }>, operation: string): Promise<void> {
  const { error } = await result;
  // Keep database details out of client errors/logs; the operation code is enough
  // for the owner to identify the failing persistence step without exposing row data.
  if (error) throw new Error(`settings.persist.${operation}`);
}

function settingsRead<T>(result: { data: T | null; error: { message: string } | null }, operation: string): T {
  if (result.error || result.data === null) throw new Error(`settings.load.${operation}`);
  return result.data;
}

async function settingsPersistRead<T>(result: PromiseLike<{ data: T | null; error: { message: string } | null }>, operation: string): Promise<T> {
  const { data, error } = await result;
  if (error || data === null) throw new Error(`settings.persist.${operation}`);
  return data;
}

type SettingsRow = {
  paused: boolean;
  pause_message: string | null;
  hours: Settings["hours"];
  delivery_fee: number;
  min_order: number;
  radius_km: number;
  vat_rate: number;
  preorder: Settings["preorder"];
  blocked_dates: string[];
  blocked_slots: string[];
  announcement: Settings["announcement"];
  extra: Record<string, unknown>;
};

export async function loadSettings(): Promise<Settings> {
  const [settingsResult, categoryResult, itemResult, toppingResult, offerResult, specialResult] = await Promise.all([
    db.from("shop_settings").select("*").eq("id", true).single(),
    db.from("categories").select("id, name_fi, name_en, photo_url, photo_alt_fi, photo_alt_en, sort_order, visible").order("sort_order"),
    db.from("menu_items").select("id, available, sold_out_on, photo_url, photo_alt_fi, photo_alt_en"),
    db.from("toppings").select("id, name_fi, name_en, surcharge_med, surcharge_perhe, active, sort_order").order("sort_order"),
    db.from("promotions").select("*").order("priority", { ascending: false }),
    db.from("todays_special").select("*").order("sort_order"),
  ]);

  const row = settingsRead(settingsResult, "shop_settings") as SettingsRow;
  const categories = settingsRead(categoryResult, "categories") as Array<{
    id: string; name_fi: string; name_en: string; photo_url: string | null;
    photo_alt_fi: string | null; photo_alt_en: string | null; sort_order: number; visible: boolean;
  }>;
  const items = settingsRead(itemResult, "menu_items") as Array<{
    id: string; available: boolean; sold_out_on: string | null; photo_url: string | null;
    photo_alt_fi: string | null; photo_alt_en: string | null;
  }>;
  const toppings = settingsRead(toppingResult, "toppings") as Array<{
    name_fi: string; name_en: string | null; surcharge_med: number; surcharge_perhe: number; active: boolean;
  }>;
  const promotions = settingsRead(offerResult, "promotions") as Array<{
    id: string; code: string | null; discount_type: Offer["type"]; discount_value: number;
    scope: Offer["scope"]; min_order: number | null; days: number[] | null; starts_at: string | null;
    expires_at: string | null; usage_limit: number | null; used_count: number; title_fi: string; title_en: string;
    description_fi: string | null; description_en: string | null; badge_fi: string | null; badge_en: string | null;
    banner_url: string | null; priority: number; active: boolean;
  }>;
  const specials = settingsRead(specialResult, "todays_special") as Array<{
    id: string; menu_item_id: string; discount_type: "percent" | "fixed_price" | null; discount_value: number | null;
    photo_override_url: string | null; label_fi: string | null; label_en: string | null;
    sort_order: number; active: boolean; active_from: string | null; active_to: string | null;
  }>;

  const extra = row.extra ?? {};
  const catMeta: Record<string, CatMeta> = { ...DEFAULT_SETTINGS.catMeta, ...(extra.catMeta as Record<string, CatMeta> | undefined) };
  for (const category of categories) {
    catMeta[category.id] = {
      ...catMeta[category.id],
      nameFi: category.name_fi,
      nameEn: category.name_en,
      img: category.photo_url ?? undefined,
      altFi: category.photo_alt_fi ?? undefined,
      altEn: category.photo_alt_en ?? undefined,
      hidden: !category.visible,
    };
  }

  const itemImages: Record<string, UploadedImg> = { ...DEFAULT_SETTINGS.itemImages, ...(extra.itemImages as Record<string, UploadedImg> | undefined) };
  const offItems = { ...DEFAULT_SETTINGS.offItems, ...(extra.offItems as Settings["offItems"] | undefined) };
  for (const item of items) {
    if (item.photo_url) itemImages[item.id] = { src: item.photo_url, altFi: item.photo_alt_fi ?? "", altEn: item.photo_alt_en ?? "" };
    if (!item.available || item.sold_out_on) {
      offItems[item.id] = { off: !item.available, offToday: item.sold_out_on ?? undefined };
    } else {
      delete offItems[item.id];
    }
  }

  const persistedToppingMeta = (extra.toppingMeta as Record<string, ToppingMeta> | undefined) ?? {};
  const toppingMeta: Record<string, ToppingMeta> = { ...DEFAULT_SETTINGS.toppingMeta, ...persistedToppingMeta };
  const disabledToppings: string[] = [];
  for (const topping of toppings) {
    toppingMeta[topping.name_fi] = {
      ...toppingMeta[topping.name_fi],
      fi: toppingMeta[topping.name_fi]?.fi ?? topping.name_fi,
      en: topping.name_en ?? toppingMeta[topping.name_fi]?.en,
      priceMed: Number(topping.surcharge_med),
      pricePerhe: Number(topping.surcharge_perhe),
    };
    if (!topping.active) disabledToppings.push(topping.name_fi);
  }

  const offers: Offer[] = promotions.map((offer) => ({
    id: offer.id,
    code: offer.code ?? undefined,
    type: offer.discount_type,
    value: Number(offer.discount_value),
    scope: offer.scope,
    minOrder: offer.min_order === null ? undefined : Number(offer.min_order),
    days: offer.days ?? undefined,
    start: offer.starts_at ?? undefined,
    end: offer.expires_at ?? undefined,
    maxUses: offer.usage_limit ?? undefined,
    uses: offer.used_count,
    titleFi: offer.title_fi,
    titleEn: offer.title_en,
    descFi: offer.description_fi ?? undefined,
    descEn: offer.description_en ?? undefined,
    badgeFi: offer.badge_fi ?? undefined,
    badgeEn: offer.badge_en ?? undefined,
    banner: offer.banner_url ? { src: offer.banner_url, altFi: "", altEn: "" } : undefined,
    priority: offer.priority,
    active: offer.active,
  }));

  const todaysSpecials: SpecialItem[] = specials.map((special) => ({
    id: special.id,
    itemId: special.menu_item_id,
    ...(special.discount_type === "percent" ? { discount: Number(special.discount_value) } : {}),
    ...(special.discount_type === "fixed_price" ? { overridePrice: Number(special.discount_value) } : {}),
    imageUrl: special.photo_override_url ?? undefined,
    textFi: special.label_fi ?? undefined,
    textEn: special.label_en ?? undefined,
    sortOrder: special.sort_order,
    active: special.active,
    start: special.active_from ?? undefined,
    end: special.active_to ?? undefined,
  }));

  /* A topping removed from the master list is archived in the toppings table;
     never fall back to archived rows when the list itself is missing. */
  const toppingList = (extra.toppingList as string[] | undefined)
    ?? toppings.filter((topping) => topping.active).map((topping) => topping.name_fi);

  return {
    ...DEFAULT_SETTINGS,
    paused: row.paused,
    pauseMessage: row.pause_message ?? DEFAULT_SETTINGS.pauseMessage,
    hours: row.hours,
    deliveryFee: Number(row.delivery_fee),
    minOrder: Number(row.min_order),
    radiusKm: Number(row.radius_km),
    readyTimeMinutes: Number((extra.readyTimeMinutes as number | undefined) ?? DEFAULT_SETTINGS.readyTimeMinutes),
    deliveryRules: (extra.deliveryRules as Settings["deliveryRules"] | undefined) ?? DEFAULT_SETTINGS.deliveryRules,
    vatRate: Number(row.vat_rate),
    preorder: row.preorder,
    blockedDates: row.blocked_dates ?? [],
    blockedSlots: row.blocked_slots ?? [],
    announcement: row.announcement ?? { enabled: false, text: "" },
    platforms: (extra.platforms as Settings["platforms"] | undefined) ?? DEFAULT_SETTINGS.platforms,
    headerLogo: (extra.headerLogo as Settings["headerLogo"] | undefined) ?? DEFAULT_SETTINGS.headerLogo,
    hideUnavailable: (extra.hideUnavailable as boolean | undefined) ?? DEFAULT_SETTINGS.hideUnavailable,
    special: (extra.special as Settings["special"] | undefined) ?? DEFAULT_SETTINGS.special,
    offers,
    todaysSpecials,
    toppings: toppingList,
    toppingMeta,
    offOptions: {
      ...DEFAULT_SETTINGS.offOptions,
      ...(extra.offOptions as Settings["offOptions"] | undefined),
      /* Only labels that still exist in the master list can be "off" — this keeps
         removed toppings from resurrecting as greyed-out ghosts in the UI. */
      topping: [...new Set([...(extra.offOptions as Settings["offOptions"] | undefined)?.topping ?? [], ...disabledToppings])]
        .filter((label) => toppingList.includes(label)),
    },
    catMeta,
    catOrder: categories.map((category) => category.id),
    itemImages,
    offItems,
  };
}

/* Different rows are independent writes, so a small pool keeps a bulk settings
   save (images, category order, reordering the menu) inside the browser timeout.
   One PostgREST round trip per row, strictly sequential, took long enough on a
   cross-region link that PUT /api/settings aborted mid-save and the admin saw
   "Settings could not be saved" even though every value was valid. */
async function runWrites(tasks: Array<() => Promise<void>>, limit = 8): Promise<void> {
  let cursor = 0;
  let failure: unknown = null;
  const worker = async () => {
    while (cursor < tasks.length && !failure) {
      const task = tasks[cursor++];
      try {
        await task();
      } catch (error) {
        failure ??= error;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  if (failure) throw failure;
}

const sameText = (a: string | null | undefined, b: string | null | undefined) => (a ?? null) === (b ?? null);
const sameNumber = (a: number | string | null | undefined, b: number | string | null | undefined) =>
  (a === null || a === undefined ? null : Number(a)) === (b === null || b === undefined ? null : Number(b));
/* Postgres returns calendar dates as YYYY-MM-DD; the admin may hold a fuller
   ISO timestamp for "off today", so compare only the day part. */
const sameDay = (a: string | null | undefined, b: string | null | undefined) =>
  (a ?? "").slice(0, 10) === (b ?? "").slice(0, 10);
/* JSONB gives keys back in its own order, so compare structurally ordered. */
const stableJson = (value: unknown): string => {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
};
const sameJson = (a: unknown, b: unknown) => stableJson(a ?? null) === stableJson(b ?? null);

type CategoryRow = {
  id: string; name_fi: string; name_en: string | null; photo_url: string | null;
  photo_alt_fi: string | null; photo_alt_en: string | null; sort_order: number; visible: boolean;
};
type ItemRow = {
  id: string; mods: ModGroup[] | null; available: boolean; sold_out_on: string | null;
  photo_url: string | null; photo_alt_fi: string | null; photo_alt_en: string | null;
};
type ToppingRow = {
  id: string; name_fi: string; name_en: string | null; surcharge_med: number | string;
  surcharge_perhe: number | string; active: boolean; sort_order: number;
};
type OfferRow = {
  id: string; code: string | null; discount_type: Offer["type"]; discount_value: number | string;
  scope: Offer["scope"]; min_order: number | string | null; days: number[] | null;
  starts_at: string | null; expires_at: string | null; usage_limit: number | null; used_count: number;
  title_fi: string; title_en: string; description_fi: string | null; description_en: string | null;
  badge_fi: string | null; badge_en: string | null; banner_url: string | null; priority: number; active: boolean;
};
type SpecialRow = {
  id: string; menu_item_id: string; discount_type: "percent" | "fixed_price" | null;
  discount_value: number | string | null; photo_override_url: string | null;
  label_fi: string | null; label_en: string | null; sort_order: number; active: boolean;
  active_from: string | null; active_to: string | null;
};

export async function saveSettings(settings: Settings, client: SupabaseClient = db): Promise<void> {
  /* Storage must not accumulate "off" labels for toppings that no longer exist:
     re-adding a topping later should bring it back available, not still off. */
  const sellableOffToppings = (settings.offOptions.topping ?? []).filter((label) => settings.toppings.includes(label));
  const offOptions = { ...settings.offOptions, topping: sellableOffToppings };

  const extra = {
    platforms: settings.platforms,
    headerLogo: settings.headerLogo,
    hideUnavailable: settings.hideUnavailable,
    special: settings.special,
    catMeta: settings.catMeta,
    catOrder: settings.catOrder,
    itemImages: settings.itemImages,
    offItems: settings.offItems,
    offCats: settings.offCats,
    offOptions,
    toppingMeta: settings.toppingMeta,
    deliveryRules: settings.deliveryRules,
    readyTimeMinutes: settings.readyTimeMinutes,
    toppingList: settings.toppings,
  };
  await check(client.from("shop_settings").upsert({
    id: true,
    paused: settings.paused,
    pause_message: settings.pauseMessage,
    hours: settings.hours,
    delivery_fee: settings.deliveryFee,
    min_order: settings.minOrder,
    radius_km: settings.radiusKm,
    vat_rate: settings.vatRate,
    preorder: settings.preorder,
    blocked_dates: settings.blockedDates,
    blocked_slots: settings.blockedSlots,
    announcement: settings.announcement,
    extra,
  }, { onConflict: "id" }), "shop_settings");

  /* One parallel read of the current rows; each write below is skipped when the
     stored row already holds the requested values. That keeps a "today's
     special only" save down to a handful of requests instead of the ~250 that
     rewrote every menu item on every save. */
  const [categories, items, toppings, currentOffers, currentSpecials] = await Promise.all([
    settingsPersistRead<CategoryRow[]>(client.from("categories")
      .select("id, name_fi, name_en, photo_url, photo_alt_fi, photo_alt_en, sort_order, visible"), "categories_read"),
    settingsPersistRead<ItemRow[]>(client.from("menu_items")
      .select("id, mods, available, sold_out_on, photo_url, photo_alt_fi, photo_alt_en"), "menu_items_read"),
    settingsPersistRead<ToppingRow[]>(client.from("toppings")
      .select("id, name_fi, name_en, surcharge_med, surcharge_perhe, active, sort_order"), "toppings_read"),
    settingsPersistRead<OfferRow[]>(client.from("promotions")
      .select("id, code, discount_type, discount_value, scope, min_order, days, starts_at, expires_at, usage_limit, used_count, title_fi, title_en, description_fi, description_en, badge_fi, badge_en, banner_url, priority, active"), "promotions_read"),
    settingsPersistRead<SpecialRow[]>(client.from("todays_special")
      .select("id, menu_item_id, discount_type, discount_value, photo_override_url, label_fi, label_en, sort_order, active, active_from, active_to"), "todays_special_read"),
  ]);

  const writes: Array<() => Promise<void>> = [];

  for (const category of categories) {
    const meta = settings.catMeta[category.id] ?? {};
    const sortOrder = settings.catOrder.indexOf(category.id);
    const next = {
      name_fi: meta.nameFi ?? category.name_fi,
      name_en: meta.nameEn ?? category.name_en,
      photo_url: meta.img ?? null,
      photo_alt_fi: meta.altFi ?? null,
      photo_alt_en: meta.altEn ?? null,
      visible: !meta.hidden,
      ...(sortOrder >= 0 ? { sort_order: sortOrder } : {}),
    };
    if (
      next.name_fi === category.name_fi &&
      sameText(next.name_en, category.name_en) &&
      sameText(next.photo_url, category.photo_url) &&
      sameText(next.photo_alt_fi, category.photo_alt_fi) &&
      sameText(next.photo_alt_en, category.photo_alt_en) &&
      next.visible === category.visible &&
      (sortOrder < 0 || sortOrder === category.sort_order)
    ) continue;
    writes.push(() => check(client.from("categories").update(next).eq("id", category.id), "category"));
  }

  for (const item of items) {
    const availability = settings.offItems[item.id];
    const image = settings.itemImages[item.id];
    /* Item topping groups copy the master list when they are created. When a
       topping is removed here, strip it from every item in the same write so
       the public menu can never show an ingredient the kitchen no longer has. */
    const mods = sanitizeToppingGroups({ ...settings, offOptions }, item.mods ?? undefined);
    const modsChanged = mods !== (item.mods ?? undefined);
    const available = !availability?.off;
    const soldOutOn = availability?.offToday ?? null;
    if (
      available === item.available &&
      sameDay(soldOutOn, item.sold_out_on) &&
      sameText(image?.src, item.photo_url) &&
      sameText(image?.altFi, item.photo_alt_fi) &&
      sameText(image?.altEn, item.photo_alt_en) &&
      !modsChanged
    ) continue;
    writes.push(() => check(client.from("menu_items").update({
      available,
      sold_out_on: soldOutOn,
      photo_url: image?.src ?? null,
      photo_alt_fi: image?.altFi ?? null,
      photo_alt_en: image?.altEn ?? null,
      ...(modsChanged ? { mods: mods ?? [] } : {}),
    }).eq("id", item.id), "menu_item"));
  }

  const storedToppings = new Map(toppings.map((topping) => [topping.id, topping]));
  /* Two labels can slug to the same id; the last one wins, exactly like the
     sequential upserts this replaces. */
  const wantedToppings = new Map<string, {
    id: string; name_fi: string; name_en: string | null; surcharge_med: number;
    surcharge_perhe: number; active: boolean; sort_order: number;
  }>();
  for (const [sortOrder, label] of settings.toppings.entries()) {
    const meta: ToppingMeta = settings.toppingMeta[label] ?? {};
    const row = {
      id: slug(label),
      // Keep the stored option label stable; bilingual display names belong in metadata.
      name_fi: label,
      name_en: meta.en ?? null,
      surcharge_med: meta.priceMed ?? 1,
      surcharge_perhe: meta.pricePerhe ?? 2,
      active: !offOptions.topping?.includes(label),
      sort_order: sortOrder,
    };
    wantedToppings.set(row.id, row);
  }
  for (const row of wantedToppings.values()) {
    const stored = storedToppings.get(row.id);
    if (
      stored &&
      stored.name_fi === row.name_fi &&
      sameText(stored.name_en, row.name_en) &&
      sameNumber(stored.surcharge_med, row.surcharge_med) &&
      sameNumber(stored.surcharge_perhe, row.surcharge_perhe) &&
      stored.active === row.active &&
      stored.sort_order === row.sort_order
    ) continue;
    writes.push(() => check(client.from("toppings").upsert(row), "topping"));
  }
  const activeToppings = new Set(settings.toppings);
  for (const topping of toppings) {
    if (activeToppings.has(topping.name_fi) || !topping.active) continue;
    writes.push(() => check(client.from("toppings").update({ active: false }).eq("id", topping.id), "topping_archive"));
  }

  const storedOffers = new Map(currentOffers.map((offer) => [offer.id, offer]));
  const nextOfferIds = new Set(settings.offers.map((offer) => offer.id));
  for (const id of currentOffers.map((offer) => offer.id)) {
    if (!nextOfferIds.has(id)) writes.push(() => check(client.from("promotions").delete().eq("id", id), "promotion_delete"));
  }
  for (const offer of settings.offers) {
    const row = {
      id: offer.id,
      code: offer.code ?? null,
      discount_type: offer.type,
      discount_value: offer.value,
      scope: offer.scope,
      min_order: offer.minOrder ?? null,
      days: offer.days ?? null,
      starts_at: offer.start ?? null,
      expires_at: offer.end ?? null,
      usage_limit: offer.maxUses ?? null,
      used_count: offer.uses ?? 0,
      title_fi: offer.titleFi,
      title_en: offer.titleEn,
      description_fi: offer.descFi ?? null,
      description_en: offer.descEn ?? null,
      badge_fi: offer.badgeFi ?? null,
      badge_en: offer.badgeEn ?? null,
      banner_url: offer.banner?.src ?? null,
      priority: offer.priority,
      active: offer.active,
    };
    const stored = storedOffers.get(offer.id);
    if (
      stored &&
      sameText(stored.code, row.code) &&
      stored.discount_type === row.discount_type &&
      sameNumber(stored.discount_value, row.discount_value) &&
      sameJson(stored.scope, row.scope) &&
      sameNumber(stored.min_order, row.min_order) &&
      sameJson(stored.days, row.days) &&
      sameDay(stored.starts_at, row.starts_at) &&
      sameDay(stored.expires_at, row.expires_at) &&
      sameNumber(stored.usage_limit, row.usage_limit) &&
      sameNumber(stored.used_count, row.used_count) &&
      stored.title_fi === row.title_fi &&
      stored.title_en === row.title_en &&
      sameText(stored.description_fi, row.description_fi) &&
      sameText(stored.description_en, row.description_en) &&
      sameText(stored.badge_fi, row.badge_fi) &&
      sameText(stored.badge_en, row.badge_en) &&
      sameText(stored.banner_url, row.banner_url) &&
      sameNumber(stored.priority, row.priority) &&
      stored.active === row.active
    ) continue;
    writes.push(() => check(client.from("promotions").upsert(row), "promotion"));
  }

  const nextSpecialIds = new Set(settings.todaysSpecials.map((special) => special.id));
  for (const id of currentSpecials.map((special) => special.id)) {
    if (!nextSpecialIds.has(id)) writes.push(() => check(client.from("todays_special").delete().eq("id", id), "special_delete"));
  }
  const storedSpecials = new Map(currentSpecials.map((special) => [special.id, special]));
  /* Deduplicated by id: Postgres refuses an upsert that would touch the same
     row twice, and the last draft for an id is the one the manager sees. */
  const changedSpecials = new Map<string, Record<string, unknown>>();
  for (const special of settings.todaysSpecials) {
    const discountType = special.discount != null ? "percent" : special.overridePrice != null ? "fixed_price" : null;
    const row = {
      id: special.id,
      menu_item_id: special.itemId,
      discount_type: discountType,
      discount_value: special.discount ?? special.overridePrice ?? null,
      photo_override_url: special.imageUrl ?? null,
      label_fi: special.textFi ?? null,
      label_en: special.textEn ?? null,
      sort_order: special.sortOrder,
      active: special.active,
      active_from: special.start ?? null,
      active_to: special.end ?? null,
    };
    const stored = storedSpecials.get(special.id);
    if (
      stored &&
      stored.menu_item_id === row.menu_item_id &&
      stored.discount_type === row.discount_type &&
      sameNumber(stored.discount_value, row.discount_value) &&
      sameText(stored.photo_override_url, row.photo_override_url) &&
      sameText(stored.label_fi, row.label_fi) &&
      sameText(stored.label_en, row.label_en) &&
      stored.sort_order === row.sort_order &&
      stored.active === row.active &&
      sameDay(stored.active_from, row.active_from) &&
      sameDay(stored.active_to, row.active_to)
    ) continue;
    changedSpecials.set(special.id, row);
  }
  /* One upsert for the whole carousel: every column is either supplied here or
     has a database default, so a multi-row upsert cannot half-apply a reorder. */
  if (changedSpecials.size) writes.push(() => check(client.from("todays_special").upsert([...changedSpecials.values()]), "special"));

  await runWrites(writes);
}
