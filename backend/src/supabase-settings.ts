import { db, must } from "./supabase";
import { DEFAULT_SETTINGS } from "./lib/hours";
import type { CatMeta, Offer, Settings, SpecialItem, ToppingMeta, UploadedImg } from "./lib/types";

const slug = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function check(result: PromiseLike<{ error: { message: string } | null }>): Promise<void> {
  const { error } = await result;
  if (error) throw new Error(error.message);
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

  const row = must(settingsResult) as SettingsRow;
  const categories = must(categoryResult) as Array<{
    id: string; name_fi: string; name_en: string; photo_url: string | null;
    photo_alt_fi: string | null; photo_alt_en: string | null; sort_order: number; visible: boolean;
  }>;
  const items = must(itemResult) as Array<{
    id: string; available: boolean; sold_out_on: string | null; photo_url: string | null;
    photo_alt_fi: string | null; photo_alt_en: string | null;
  }>;
  const toppings = must(toppingResult) as Array<{
    name_fi: string; name_en: string | null; surcharge_med: number; surcharge_perhe: number; active: boolean;
  }>;
  const promotions = must(offerResult) as Array<{
    id: string; code: string | null; discount_type: Offer["type"]; discount_value: number;
    scope: Offer["scope"]; min_order: number | null; days: number[] | null; starts_at: string | null;
    expires_at: string | null; usage_limit: number | null; used_count: number; title_fi: string; title_en: string;
    description_fi: string | null; description_en: string | null; badge_fi: string | null; badge_en: string | null;
    banner_url: string | null; priority: number; active: boolean;
  }>;
  const specials = must(specialResult) as Array<{
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

  const toppingMeta: Record<string, ToppingMeta> = { ...DEFAULT_SETTINGS.toppingMeta };
  const disabledToppings: string[] = [];
  for (const topping of toppings) {
    toppingMeta[topping.name_fi] = {
      fi: topping.name_fi,
      en: topping.name_en ?? undefined,
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

  return {
    ...DEFAULT_SETTINGS,
    paused: row.paused,
    pauseMessage: row.pause_message ?? DEFAULT_SETTINGS.pauseMessage,
    hours: row.hours,
    deliveryFee: Number(row.delivery_fee),
    minOrder: Number(row.min_order),
    radiusKm: Number(row.radius_km),
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
    toppings: toppings.map((topping) => topping.name_fi),
    toppingMeta,
    offOptions: { ...DEFAULT_SETTINGS.offOptions, ...(extra.offOptions as Settings["offOptions"] | undefined), topping: disabledToppings },
    catMeta,
    catOrder: categories.map((category) => category.id),
    itemImages,
    offItems,
  };
}

export async function saveSettings(settings: Settings): Promise<void> {
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
    offOptions: settings.offOptions,
    toppingMeta: settings.toppingMeta,
  };
  await check(db.from("shop_settings").update({
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
  }).eq("id", true));

  const categories = await must(await db.from("categories").select("id"));
  for (const category of categories) {
    const meta = settings.catMeta[category.id] ?? {};
    const sortOrder = settings.catOrder.indexOf(category.id);
    await check(db.from("categories").update({
      name_fi: meta.nameFi,
      name_en: meta.nameEn,
      photo_url: meta.img ?? null,
      photo_alt_fi: meta.altFi ?? null,
      photo_alt_en: meta.altEn ?? null,
      visible: !meta.hidden,
      ...(sortOrder >= 0 ? { sort_order: sortOrder } : {}),
    }).eq("id", category.id));
  }

  const items = await must(await db.from("menu_items").select("id"));
  for (const item of items) {
    const availability = settings.offItems[item.id];
    const image = settings.itemImages[item.id];
    await check(db.from("menu_items").update({
      available: !availability?.off,
      sold_out_on: availability?.offToday ?? null,
      photo_url: image?.src ?? null,
      photo_alt_fi: image?.altFi ?? null,
      photo_alt_en: image?.altEn ?? null,
    }).eq("id", item.id));
  }

  const activeToppings = new Set(settings.toppings);
  for (const [sortOrder, label] of settings.toppings.entries()) {
    const meta: ToppingMeta = settings.toppingMeta[label] ?? {};
    await check(db.from("toppings").upsert({
      id: slug(label),
      name_fi: meta.fi ?? label,
      name_en: meta.en ?? null,
      surcharge_med: meta.priceMed ?? 1,
      surcharge_perhe: meta.pricePerhe ?? 2,
      active: !settings.offOptions.topping?.includes(label),
      sort_order: sortOrder,
    }));
  }
  const currentToppings = await must(await db.from("toppings").select("id, name_fi"));
  for (const topping of currentToppings) {
    if (!activeToppings.has(topping.name_fi)) await check(db.from("toppings").update({ active: false }).eq("id", topping.id));
  }

  const currentOffers = await must(await db.from("promotions").select("id"));
  const nextOfferIds = new Set(settings.offers.map((offer) => offer.id));
  for (const id of currentOffers.map((offer) => offer.id)) {
    if (!nextOfferIds.has(id)) await check(db.from("promotions").delete().eq("id", id));
  }
  for (const offer of settings.offers) {
    await check(db.from("promotions").upsert({
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
    }));
  }

  const currentSpecials = await must(await db.from("todays_special").select("id"));
  const nextSpecialIds = new Set(settings.todaysSpecials.map((special) => special.id));
  for (const id of currentSpecials.map((special) => special.id)) {
    if (!nextSpecialIds.has(id)) await check(db.from("todays_special").delete().eq("id", id));
  }
  for (const special of settings.todaysSpecials) {
    const discountType = special.discount != null ? "percent" : special.overridePrice != null ? "fixed_price" : null;
    await check(db.from("todays_special").upsert({
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
    }));
  }
}