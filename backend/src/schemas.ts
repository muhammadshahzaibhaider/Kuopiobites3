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

const priceSchema = z.object({
  label: text(60), labelEn: text(80).optional(), labelFi: text(80).optional(), value: finiteMoney,
  nameEn: text(120).optional(), nameFi: text(120).optional(), descEn: text(500).optional(), descFi: text(500).optional(),
  imageUrl: imageSource.optional(), weightKg: z.number().finite().min(0).max(100).optional(),
}).strict();
const modOptionSchema = z.object({ label: text(100).min(1), price: finiteMoney, labelEn: text(100).optional(), labelFi: text(100).optional(), priceByVariant: z.array(finiteMoney).max(10).optional(), toppingId: text(100).optional() }).strict();
const modGroupSchema = z.object({
  id: text(60).min(1), name: text(120).min(1), nameFi: text(120).optional(), type: z.enum(["single", "multi"]),
  required: z.boolean().optional(), min: z.number().int().min(0).max(30).optional(),
  exact: z.number().int().min(0).max(30).optional(), max: z.number().int().min(0).max(30).optional(),
  options: z.array(modOptionSchema).max(100), perVariantExtra: z.array(finiteMoney).max(10).optional(),
  hint: text(300).optional(),
}).strict();

export const availabilityPatchSchema = z.object({ off: z.boolean() }).strict();

export const menuItemSchema = z.object({
  id: text(60).min(1), cat: text(40).min(1), name: text(120).min(1),
  nameFi: text(120).optional(), desc: text(500).optional(), descFi: text(500).optional(),
  prices: z.array(priceSchema).min(1).max(10), tags: z.array(z.enum(["veg", "spicy", "popular"])).max(3).optional(),
  mods: z.array(modGroupSchema).max(30).optional(), availability: availabilitySchema.optional(),
  imageKey: text(160).optional(), imageUrl: imageSource.optional(), imageAltEn: text(160).optional(), imageAltFi: text(160).optional(),
  weightKg: z.number().finite().min(0).max(100).optional(), featured: z.boolean().optional(), special: z.boolean().optional(),
  showToppings: z.boolean().optional(), toppingIds: z.array(text(100).min(1)).max(200).optional(),
  includedToppingIds: z.array(text(100).min(1)).max(200).optional(), available: z.boolean().optional(), archived: z.boolean().optional(),
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
  selections: z.array(z.object({ groupId: text(60).min(1), optionLabel: text(100).min(1) }).strict()).max(30).optional(),
  img: imageSource.optional(), preorder: preorderSchema.optional(), note: text(400).optional(),
  pizza: pizzaSchema.optional(),
}).strict();

export const cartSchema = z.object({
  lines: z.array(cartLineSchema).min(1).max(100),
  type: z.enum(["pickup", "delivery"]).default("pickup"),
  lang: z.enum(["en", "fi"]).default("en"), code: text(40).optional(), address: text(200).optional(),
}).strict();

/* Emails are always normalized (trim + lowercase) before lookup or storage so
   " USER@Example.FI " logs into the account created as user@example.fi. */
const email = z.string().trim().toLowerCase().email().max(120);

/* Pragmatic international format: "+358 44 981 6223" and "0449816223" both fit. */
const phoneSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().regex(/^\+?[0-9][0-9\s().-]{4,24}$/, "validation.phone").max(30).optional()
);

/* Policy: 8+ characters with at least one letter and one number. Existing
   accounts created under the old 12-character rule remain valid — this only
   governs newly set passwords. */
export const passwordPolicy = z.string().min(8, "validation.passwordLength").max(200)
  .regex(/[A-Za-z]/, "validation.passwordLetter")
  .regex(/\d/, "validation.passwordNumber");

export const registerSchema = z.object({
  name: text(80).min(1), email,
  pass: passwordPolicy, phone: phoneSchema,
}).strict();

export const loginSchema = z.object({
  email, pass: z.string().min(1).max(200),
  /* remember=false issues browser-session cookies instead of 30-day ones. */
  remember: z.boolean().optional(),
}).strict();
export const staffLoginSchema = z.object({ username: text(40).min(1), password: z.string().min(1).max(200) }).strict();
const staffUsername = text(40).min(3).regex(/^[a-zA-Z0-9._-]+$/);
const staffName = text(80).min(1);
const staffEmail = z.string().trim().email().max(254);
export const staffCreateSchema = z.object({
  username: staffUsername, name: staffName, email: staffEmail, role: z.enum(["owner", "manager", "kitchen"]),
  password: z.string().min(12).max(128),
}).strict();
export const staffPatchSchema = z.object({
  username: staffUsername.optional(), name: staffName.optional(), email: staffEmail.optional(),
  role: z.enum(["owner", "manager", "kitchen"]).optional(), active: z.boolean().optional(),
}).strict().refine((patch) => Object.keys(patch).length > 0, "empty staff update");

/* Supabase confirmation/recovery links arrive in three shapes depending on the
   project template: PKCE ?code=, ?token_hash=&type=, or #access_token implicit. */
export const emailLinkType = z.enum(["signup", "email", "recovery"]);
export const confirmEmailSchema = z.union([
  z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{40,}$/), type: emailLinkType.optional() }).strict(),
  z.object({ code: z.string().min(20).max(300) }).strict(),
]);
export const forgotPasswordSchema = z.object({ email }).strict();
export const resetPasswordSchema = z.union([
  z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{40,}$/), type: emailLinkType.optional(), next: passwordPolicy }).strict(),
  z.object({ accessToken: z.string().min(1), refreshToken: z.string().min(1), next: passwordPolicy }).strict(),
  z.object({ code: z.string().min(20).max(300), next: passwordPolicy }).strict(),
]);

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
const rangeSchema = z.object({ min: z.number().finite().min(0).max(100000).optional(), max: z.number().finite().min(0).max(100000).optional() }).strict()
  .refine((range) => range.min !== undefined || range.max !== undefined, "range bound required")
  .refine((range) => range.min === undefined || range.max === undefined || range.min <= range.max, "invalid range");
const deliveryConditionsSchema = z.object({
  distanceKm: rangeSchema.optional(), weightKg: rangeSchema.optional(), subtotalEur: rangeSchema.optional(),
}).strict();
const deliveryRuleObjectSchema = z.object({
  id: text(100).min(1), nameEn: text(120).min(1), nameFi: text(120).min(1),
  conditionType: z.enum(["distance", "weight", "subtotal", "combined"]), conditions: deliveryConditionsSchema,
  outcome: z.enum(["free_delivery", "fixed_fee", "percent_fee", "fixed_discount", "no_delivery"]),
  value: z.number().finite().min(0).max(10000).optional(), active: z.boolean(),
  activeDays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  startTime: hhmm.optional(), endTime: hhmm.optional(), startDate: date.optional(), endDate: date.optional(),
  priority: z.number().int().min(-1000).max(1000), stackable: z.boolean(),
}).strict();
function validateDeliveryRule(rule: z.infer<typeof deliveryRuleObjectSchema> | Omit<z.infer<typeof deliveryRuleObjectSchema>, "id">, ctx: z.RefinementCtx) {
  const conditionKeys = ["distanceKm", "weightKg", "subtotalEur"] as const;
  const count = conditionKeys.filter((key) => rule.conditions[key] !== undefined).length;
  const required = rule.conditionType === "distance" ? "distanceKm"
    : rule.conditionType === "weight" ? "weightKg"
      : rule.conditionType === "subtotal" ? "subtotalEur" : null;
  if (!count || (required && !rule.conditions[required]) || (rule.conditionType === "combined" && count < 2)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "invalid delivery rule conditions", path: ["conditions"] });
  }
  if ((rule.startTime === undefined) !== (rule.endTime === undefined)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "both rule times are required", path: ["startTime"] });
  }
  if (rule.startDate && rule.endDate && rule.startDate > rule.endDate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "invalid rule dates", path: ["startDate"] });
  }
  if (["fixed_fee", "percent_fee", "fixed_discount"].includes(rule.outcome) && rule.value === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "outcome value is required", path: ["value"] });
  }
  if (rule.outcome === "percent_fee" && (rule.value ?? 0) > 1000) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "percentage is too high", path: ["value"] });
  }
}
export const deliveryRuleSchema = deliveryRuleObjectSchema.superRefine(validateDeliveryRule);
export const deliveryRuleInputSchema = deliveryRuleObjectSchema.omit({ id: true }).superRefine(validateDeliveryRule);
export const deliveryPreviewSchema = z.object({
  distanceKm: z.number().finite().min(0).max(1000).optional(),
  weightKg: z.number().finite().min(0).max(1000),
  subtotalEur: finiteMoney,
}).strict();
const restaurantInfoSchema = z.object({
  name: text(120).min(1), taglineEn: text(200), taglineFi: text(200), address: text(200).min(1),
  phone: text(40), email: z.string().trim().max(160).email(), instagram: url.or(z.literal("")), facebook: url.or(z.literal("")),
  mapLink: url.or(z.literal("")), mapEmbed: url.or(z.literal("")),
  latitude: z.number().finite().min(-90).max(90).optional(), longitude: z.number().finite().min(-180).max(180).optional(),
}).strict().refine((restaurant) => (restaurant.latitude === undefined) === (restaurant.longitude === undefined), "both coordinates are required");

export const settingsSchema = z.object({
  paused: z.boolean(), hours: hoursSchema, deliveryFee: finiteMoney, minOrder: finiteMoney, radiusKm: z.number().finite().min(0).max(100),
  deliveryRules: z.array(deliveryRuleSchema).max(200), restaurant: restaurantInfoSchema,
  vatRate: z.number().finite().min(0).max(1), toppings: z.array(text(100)).max(200), special: specialCfgSchema,
  blockedSlots: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/)).max(500),
  blockedDates: z.array(date).max(500), platforms: z.object({ wolt: url.or(z.literal("")), uberEats: url.or(z.literal("")) }).strict(),
  headerLogo: z.enum(["round", "mark"]), hideUnavailable: z.boolean(),
  preorder: z.object({ enabled: z.boolean(), cutoffDay: z.number().int().min(0).max(6), cutoffTime: hhmm, slots: z.array(hhmm).max(100), capacity: z.number().int().positive().max(10000).optional(), noteEn: text(500), noteFi: text(500) }).strict(),
  offers: z.array(offerSchema).max(200), todaysSpecials: z.array(specialItemSchema).max(200), toppingMeta: z.record(toppingMetaSchema),
  itemImages: z.record(uploadedImgSchema), offItems: z.record(availabilityStateSchema), offCats: z.record(availabilityStateSchema),
  offOptions: z.record(z.array(text(100)).max(100)), catMeta: z.record(catMetaSchema), catOrder: z.array(text(60)).max(200),
  audit: z.array(z.object({ ts: z.number().int().nonnegative(), who: text(120), msg: text(500) }).strict()).max(10000),
  announcement: z.object({ enabled: z.boolean(), text: text(500), textEn: text(500).optional(), textFi: text(500).optional() }).strict(), pauseMessage: text(500),
}).strict();

export const categoryCreateSchema = z.object({ title: text(60).min(1), en: text(60).optional() }).strict();
export const categoryPatchSchema = z.object({ title: text(60).min(1).optional(), en: text(60).optional(), archived: z.boolean().optional() }).strict();
export const statusSchema = z.object({
  status: z.enum(["placed", "accepted", "preparing", "ready", "completed"]),
  readyInMinutes: z.number().int().min(1).max(720).optional(),
  note: text(300).optional(),
}).strict();
export const readyTimeSchema = z.object({
  minutes: z.number().int().min(1).max(720).optional(),
  addMinutes: z.number().int().min(-720).max(720).optional(),
  note: text(300).optional(),
}).strict().refine((body) => (body.minutes !== undefined) !== (body.addMinutes !== undefined), "provide either minutes or addMinutes");
export const reorderSchema = z.object({ cat: text(40).min(1), order: z.array(text(60).min(1)).min(1).max(1000) }).strict();
export const accountPatchSchema = z.object({
  name: text(80).min(1).optional(), phone: text(30).optional(), addresses: z.array(text(160)).max(6).optional(), marketing: z.boolean().optional(),
}).strict();
export const favoriteAddSchema = z.object({ itemId: text(60).min(1) }).strict();
export const favoriteMergeSchema = z.object({ itemIds: z.array(text(100)).max(500) }).strict();
export const cartMergeSchema = z.object({ lines: z.array(cartLineSchema).max(200) }).strict();
export const cartQtySchema = z.object({ qty: z.number().int().min(0).max(99) }).strict();
export const passwordChangeSchema = z.object({ current: z.string().min(1).max(200), next: passwordPolicy }).strict();
export const translationSchema = z.object({ lang: z.enum(["en", "fi"]), key: text(160).min(1), value: text(2000) }).strict();
export const newsletterSchema = z.object({ email: z.string().trim().email().max(160) }).strict();
function validatePromotionWrite(offer: Omit<z.infer<typeof offerSchema>, "id" | "uses">, ctx: z.RefinementCtx) {
  const { scope } = offer;
  const itemIds = scope.itemIds ?? [];
  const targetCount = Number(scope.whole === true) + Number(Boolean(scope.category)) + Number(itemIds.length > 0);
  if (targetCount !== 1 || (scope.category !== undefined && !scope.category.trim()) || itemIds.some((id) => !id.trim())) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "invalid promotion scope", path: ["scope"] });
  }
  if (new Set(itemIds).size !== itemIds.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "duplicate promotion item", path: ["scope", "itemIds"] });
  }
  if (offer.start && offer.end && offer.start > offer.end) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "invalid promotion dates", path: ["start"] });
  }
  if (offer.days && new Set(offer.days).size !== offer.days.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "duplicate promotion day", path: ["days"] });
  }
  if (offer.type === "percent" && offer.value > 100) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "promotion percentage exceeds 100", path: ["value"] });
  }
  if (["override", "bundle", "freeItem"].includes(offer.type) && !itemIds.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "promotion requires item scope", path: ["scope", "itemIds"] });
  }
  if (offer.type === "override" && itemIds.length > 100) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "too many override items", path: ["scope", "itemIds"] });
  }
  if (offer.type === "bundle" && new Set(itemIds).size < 2) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "bundle requires at least two items", path: ["scope", "itemIds"] });
  }
  if (offer.type === "freeDelivery" && scope.whole !== true) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "free delivery must target the whole order", path: ["scope"] });
  }
  if (["freeDelivery", "freeItem"].includes(offer.type) && offer.value !== 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "this promotion type does not accept a value", path: ["value"] });
  }
  if (Boolean(offer.descEn?.trim()) !== Boolean(offer.descFi?.trim())) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "promotion descriptions must be bilingual", path: ["descFi"] });
  }
  if (Boolean(offer.badgeEn?.trim()) !== Boolean(offer.badgeFi?.trim())) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "promotion badges must be bilingual", path: ["badgeFi"] });
  }
}

export const promotionPatchSchema = offerSchema.omit({ id: true, uses: true }).strict().superRefine(validatePromotionWrite);
export const specialPatchSchema = z.object({ special: specialCfgSchema.optional(), todaysSpecials: z.array(specialItemSchema).max(200).optional() }).strict();

export const paramId = z.string().regex(/^[A-Za-z0-9_-]{1,100}$/);
