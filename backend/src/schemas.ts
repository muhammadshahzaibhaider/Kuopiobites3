import { z } from "zod";
import { CFG } from "./config";

const text = (max: number) => z.string().trim().max(max);
const finiteMoney = z.number().finite().min(0).max(10000);
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const date = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/).refine((value) => {
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}, "invalid calendar date");
const url = z.string().trim().max(500).refine((value) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}, "must be an http(s) URL");

const imageSource = z.string().trim().max(Math.ceil(CFG.maxUploadBytes * 4 / 3) + 512).refine((value) => {
  if (/^\/(?:media|menu|brand|images)\/[A-Za-z0-9_./-]+$/i.test(value)) return true;
  if (/^https?:\/\//i.test(value)) return true;
  const match = value.match(/^data:image\/(webp|png|jpeg);base64,([A-Za-z0-9+/=]+)$/i);
  if (!match) return false;
  try {
    return Buffer.from(match[2], "base64").byteLength <= CFG.maxUploadBytes;
  } catch {
    return false;
  }
}, "unsupported or oversized image source");

export const uploadedImgSchema = z.object({
  src: imageSource,
  altEn: text(160).min(1),
  altFi: text(160).min(1),
}).strict();

const availabilitySchema = z.object({
  days: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  mode: z.enum(["normal", "preorder_only"]).optional(),
  preorderCutoff: z.object({ day: z.number().int().min(0).max(6), time: hhmm }).strict().optional(),
  leadTimeHours: z.number().int().min(0).max(720).optional(),
}).strict();

const priceSchema = z.object({ label: text(40), value: finiteMoney }).strict();
const modOptionSchema = z.object({ label: text(100).min(1), price: finiteMoney }).strict();
const modGroupSchema = z.object({
  id: text(60).min(1), name: text(120).min(1), type: z.enum(["single", "multi"]),
  required: z.boolean().optional(), min: z.number().int().min(0).max(30).optional(),
  exact: z.number().int().min(0).max(30).optional(), max: z.number().int().min(0).max(30).optional(),
  options: z.array(modOptionSchema).max(100), perVariantExtra: z.array(finiteMoney).max(10).optional(),
  hint: text(300).optional(),
}).strict();

export const menuItemSchema = z.object({
  id: text(60).min(1), cat: text(40).min(1), name: text(120).min(1),
  nameFi: text(120).optional(), desc: text(500).optional(), descFi: text(500).optional(),
  prices: z.array(priceSchema).min(1).max(10), tags: z.array(z.enum(["veg", "spicy", "popular"])).max(3).optional(),
  mods: z.array(modGroupSchema).max(30).optional(), availability: availabilitySchema.optional(),
  imageKey: text(160).optional(), imageUrl: imageSource.optional(),
}).strict();

const preorderSchema = z.object({ date, time: hhmm }).strict();
const pizzaSchema = z.object({
  sizeLabel: text(40), included: z.array(text(100)).max(40),
  extras: z.array(z.object({ label: text(100).min(1), count: z.number().int().min(1).max(3) }).strict()).max(30),
  builder: z.boolean().optional(),
}).strict();

export const cartLineSchema = z.object({
  key: text(100).min(1).optional(), itemId: text(60).min(1), name: text(160).optional(),
  variantLabel: text(40), qty: z.number().int().min(1).max(99),
  unitPrice: finiteMoney.optional(), options: z.array(text(100)).max(30).default([]),
  img: imageSource.optional(), preorder: preorderSchema.optional(), note: text(400).optional(),
  pizza: pizzaSchema.optional(),
}).strict();

export const cartSchema = z.object({
  lines: z.array(cartLineSchema).min(1).max(100),
  type: z.enum(["pickup", "delivery"]).default("pickup"),
  lang: z.enum(["en", "fi"]).default("en"), code: text(40).optional(),
}).strict();

export const registerSchema = z.object({
  name: text(80).min(1), email: z.string().trim().email().max(120),
  pass: z.string().min(12).max(200), phone: text(30).optional(),
}).strict();

export const loginSchema = z.object({ email: z.string().trim().email().max(120), pass: z.string().min(1).max(200) }).strict();
export const staffLoginSchema = z.object({ username: text(40).min(1), password: z.string().min(1).max(200) }).strict();
export const confirmEmailSchema = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{40,}$/) }).strict();

export const customerOrderSchema = z.object({
  type: z.enum(["pickup", "delivery"]),
  customer: z.object({ name: text(120).min(1), email: z.string().email().max(160), phone: text(30).min(3).max(30) }).strict(),
  address: text(200).optional(), note: text(400).optional(),
  lines: z.array(cartLineSchema).min(1).max(100),
  /* Accepted for backwards compatibility only; the server ignores it completely. */
  total: finiteMoney,
  scheduled: preorderSchema.optional(), lang: z.enum(["en", "fi"]).optional(), code: text(40).optional(),
}).strict();

export const reservationSchema = z.object({
  date, time: hhmm, party: z.number().int().min(1).max(30), name: text(80).min(1), phone: text(30).min(3),
  email: z.string().trim().email().max(160).optional(), note: text(400).optional(),
}).strict();

const specialItemSchema = z.object({
  id: text(80).min(1), itemId: text(60).min(1), overridePrice: finiteMoney.optional(), discount: z.number().finite().min(0).max(100).optional(),
  imageUrl: imageSource.optional(), textEn: text(160).optional(), textFi: text(160).optional(), start: date.optional(), end: date.optional(),
  sortOrder: z.number().int().min(0).max(10000), active: z.boolean(),
}).strict();

const specialCfgSchema = z.object({
  itemId: text(60).min(1), price: finiteMoney.optional(), percent: z.number().finite().min(0).max(100).optional(), active: z.boolean(),
  textEn: text(160).optional(), textFi: text(160).optional(), descEn: text(500).optional(), descFi: text(500).optional(),
  img: imageSource.optional(), start: date.optional(), end: date.optional(),
  link: z.object({ type: z.enum(["item", "cat", "offer"]), id: text(80).optional() }).strict().optional(),
}).strict();

const offerScopeSchema = z.object({
  itemIds: z.array(text(60)).max(100).optional(), category: text(60).optional(), whole: z.boolean().optional(),
}).strict();
const offerSchema = z.object({
  id: text(80).min(1), type: z.enum(["percent", "fixed", "override", "bundle", "freeItem", "freeDelivery"]),
  value: finiteMoney, scope: offerScopeSchema, minOrder: finiteMoney.optional(), days: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  start: date.optional(), end: date.optional(), code: text(40).regex(/^[A-Za-z0-9_-]*$/).optional(),
  maxUses: z.number().int().positive().max(1_000_000).optional(), uses: z.number().int().min(0).max(1_000_000).optional(),
  banner: uploadedImgSchema.optional(), titleEn: text(160).min(1), titleFi: text(160).min(1), descEn: text(500).optional(), descFi: text(500).optional(),
  badgeEn: text(80).optional(), badgeFi: text(80).optional(), active: z.boolean(), priority: z.number().int().min(-1000).max(1000),
}).strict();

const toppingMetaSchema = z.object({ en: text(100).optional(), fi: text(100).optional(), priceMed: finiteMoney.optional(), pricePerhe: finiteMoney.optional() }).strict();
const availabilityStateSchema = z.object({ off: z.boolean().optional(), offToday: date.optional() }).strict();
const catMetaSchema = z.object({ img: imageSource.optional(), altEn: text(160).optional(), altFi: text(160).optional(), nameFi: text(120).optional(), nameEn: text(120).optional(), hidden: z.boolean().optional() }).strict();
const dayHoursSchema = z.object({ open: hhmm, close: hhmm }).strict();
const hoursSchema = z.record(z.enum(["0", "1", "2", "3", "4", "5", "6"]), dayHoursSchema.nullable());

export const settingsSchema = z.object({
  paused: z.boolean(), hours: hoursSchema, deliveryFee: finiteMoney, minOrder: finiteMoney, radiusKm: z.number().finite().min(0).max(100),
  vatRate: z.number().finite().min(0).max(1), toppings: z.array(text(100)).max(200), special: specialCfgSchema,
  blockedSlots: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/)).max(500),
  blockedDates: z.array(date).max(500), platforms: z.object({ wolt: url.or(z.literal("")), uberEats: url.or(z.literal("")) }).strict(),
  headerLogo: z.enum(["round", "mark"]), hideUnavailable: z.boolean(),
  preorder: z.object({ enabled: z.boolean(), cutoffDay: z.number().int().min(0).max(6), cutoffTime: hhmm, slots: z.array(hhmm).max(100), capacity: z.number().int().positive().max(10000).optional(), noteEn: text(500), noteFi: text(500) }).strict(),
  offers: z.array(offerSchema).max(200), todaysSpecials: z.array(specialItemSchema).max(200), toppingMeta: z.record(toppingMetaSchema),
  itemImages: z.record(uploadedImgSchema), offItems: z.record(availabilityStateSchema), offCats: z.record(availabilityStateSchema),
  offOptions: z.record(z.array(text(100)).max(100)), catMeta: z.record(catMetaSchema), catOrder: z.array(text(60)).max(200),
  audit: z.array(z.object({ ts: z.number().int().nonnegative(), who: text(120), msg: text(500) }).strict()).max(10000),
  announcement: z.object({ enabled: z.boolean(), text: text(500) }).strict(), pauseMessage: text(500),
}).strict();

export const categoryCreateSchema = z.object({ title: text(60).min(1), en: text(60).optional() }).strict();
export const categoryPatchSchema = z.object({ title: text(60).min(1).optional(), en: text(60).optional() }).strict();
export const statusSchema = z.object({ status: z.enum(["placed", "accepted", "preparing", "ready", "completed"]) }).strict();
export const reorderSchema = z.object({ cat: text(40).min(1), order: z.array(text(60).min(1)).min(1).max(1000) }).strict();
export const accountPatchSchema = z.object({
  name: text(80).min(1).optional(), phone: text(30).optional(), addresses: z.array(text(160)).max(6).optional(), marketing: z.boolean().optional(),
  favorites: z.array(text(100)).max(500).optional(),
}).strict();
export const translationSchema = z.object({ lang: z.enum(["en", "fi"]), key: text(160).min(1), value: text(2000) }).strict();
export const newsletterSchema = z.object({ email: z.string().trim().email().max(160) }).strict();
export const promotionPatchSchema = offerSchema.omit({ id: true }).strict();
export const specialPatchSchema = z.object({ special: specialCfgSchema.optional(), todaysSpecials: z.array(specialItemSchema).max(200).optional() }).strict();

export const paramId = z.string().regex(/^[A-Za-z0-9_-]{1,100}$/);
