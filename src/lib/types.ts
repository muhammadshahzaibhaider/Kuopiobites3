export type Tag = "veg" | "spicy" | "popular";
export type Lang = "en" | "fi";

export interface PriceVariant {
  /** Stable machine value, not translated; used in persisted carts/orders. */
  label: string;
  labelEn?: string;
  labelFi?: string;
  value: number;
  /** Optional per-variant copy, image, and weight; useful for portions and pack sizes. */
  nameEn?: string;
  nameFi?: string;
  descEn?: string;
  descFi?: string;
  imageUrl?: string;
  weightKg?: number;
}

export interface ModOption {
  /** Stable machine value persisted in cart/order lines. */
  label: string;
  price: number;
  labelEn?: string;
  labelFi?: string;
  priceByVariant?: number[];
  toppingId?: string;
}

export interface ModGroup {
  id: string;
  name: string;
  nameFi?: string;
  type: "single" | "multi";
  required?: boolean;
  min?: number;
  exact?: number;
  max?: number;
  options: ModOption[];
  perVariantExtra?: number[];
  hint?: string;
}

export interface Availability {
  days?: number[]; // 0=Sun..6=Sat; item sold only on these days
  mode?: "normal" | "preorder_only";
  preorderCutoff?: { day: number; time: string };
  leadTimeHours?: number;
}

export interface MenuItem {
  id: string;
  cat: string;
  name: string;
  nameFi?: string;
  desc?: string;
  descFi?: string;
  prices: PriceVariant[];
  tags?: Tag[];
  mods?: ModGroup[];
  availability?: Availability;
  /** several items can point at one photo file (size/meal variants) */
  imageKey?: string;
  /** optional persisted image reference and accessible alt text */
  imageUrl?: string;
  imageAltEn?: string;
  imageAltFi?: string;
  weightKg?: number;
  featured?: boolean;
  special?: boolean;
  showToppings?: boolean;
  toppingIds?: string[];
  includedToppingIds?: string[];
  archived?: boolean;
  available?: boolean;
}

export interface Category {
  id: string;
  title: string; // Finnish
  en?: string; // English
  archived?: boolean;
}

export interface CartLine {
  key: string;
  itemId: string;
  name: string;
  variantLabel: string;
  qty: number;
  unitPrice: number;
  options: string[];
  selections?: { groupId: string; optionLabel: string }[];
  img?: string;
  preorder?: { date: string; time: string };
  note?: string;
  pizza?: {
    sizeLabel: string;
    included: string[];
    extras: { label: string; count: number }[];
    builder?: boolean;
  };
}

export type OrderStatus =
  | "placed"
  | "accepted"
  | "preparing"
  | "ready"
  | "completed";

export interface Order {
  id: string;
  createdAt: number;
  type: "pickup" | "delivery";
  customer: { name: string; email: string; phone: string };
  address?: string;
  note?: string;
  lines: CartLine[];
  subtotal: number;
  deliveryFee: number;
  discount?: { title: string; amount: number; offerId?: string };
  total: number;
  vat: number;
  scheduled?: { date: string; time: string };
  statusOverride?: OrderStatus;
  readyAt?: number;
  readyNote?: string;
  deliveryOffer?: { id: string; nameEn: string; nameFi: string };
  distanceKm?: number;
  orderWeightKg?: number;
  refunded?: boolean;
  paymentStatus?: "pending" | "paid" | "failed" | "refunded" | "demo_paid";
  paymentId?: string;
  checkoutSessionId?: string;
  userId: string;
}

export interface Reservation {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  party: number;
  name: string;
  phone: string;
  email?: string;
  note?: string;
  createdAt: number;
  status?: "pending" | "accepted" | "declined";
}

export type StaffRole = "owner" | "manager" | "kitchen";

export interface User {
  id: string;
  name: string;
  email: string;
  /** Legacy plaintext password — migrated to passHash on first login. Optional for old records. */
  pass?: string;
  /** Salted SHA-256 (v2$salt$digest; older v1 unsalted digests upgrade on sign-in). Demo stub store only — production uses Supabase Auth. */
  passHash?: string;
  phone?: string;
  addresses: string[];
  marketing: boolean;
  lang?: Lang;
  createdAt: number;
  /** Item ids saved by this customer; optional for migration-safe old records. */
  favorites?: string[];
}

export type DayHours = { open: string; close: string } | null;
export type Hours = Record<number, DayHours>; // 0=Sun .. 6=Sat

export interface AvailState {
  off?: boolean; // off until turned back on
  offToday?: string; // helsinki date string; auto-resets next day
}

export interface Offer {
  id: string;
  type: "percent" | "fixed" | "override" | "bundle" | "freeItem" | "freeDelivery";
  value: number;
  scope: { itemIds?: string[]; category?: string; whole?: boolean };
  minOrder?: number;
  days?: number[];
  start?: string;
  end?: string;
  code?: string;
  maxUses?: number;
  uses?: number;
  banner?: UploadedImg;
  titleEn: string;
  titleFi: string;
  descEn?: string;
  descFi?: string;
  badgeEn?: string;
  badgeFi?: string;
  active: boolean;
  priority: number;
}

export interface SpecialItem {
  id: string;
  itemId: string;
  overridePrice?: number;
  discount?: number; // percent
  imageUrl?: string;
  textEn?: string;
  textFi?: string;
  start?: string;
  end?: string;
  sortOrder: number;
  active: boolean;
}

export interface ToppingMeta {
  en?: string;
  fi?: string;
  priceMed?: number;
  pricePerhe?: number;
}

export type DeliveryRuleOutcome = "free_delivery" | "fixed_fee" | "percent_fee" | "fixed_discount" | "no_delivery";
export interface DeliveryRule {
  id: string;
  nameEn: string;
  nameFi: string;
  conditionType: "distance" | "weight" | "subtotal" | "combined";
  conditions: {
    distanceKm?: { min?: number; max?: number };
    weightKg?: { min?: number; max?: number };
    subtotalEur?: { min?: number; max?: number };
  };
  outcome: DeliveryRuleOutcome;
  value?: number;
  active: boolean;
  activeDays?: number[];
  startTime?: string;
  endTime?: string;
  startDate?: string;
  endDate?: string;
  priority: number;
  stackable: boolean;
}

export interface RestaurantInfo {
  name: string;
  taglineEn: string;
  taglineFi: string;
  address: string;
  phone: string;
  email: string;
  instagram: string;
  facebook: string;
  mapLink: string;
  mapEmbed: string;
  latitude?: number;
  longitude?: number;
}

export interface SpecialCfg {
  itemId: string;
  price?: number;
  percent?: number;
  active: boolean;
  textEn?: string;
  textFi?: string;
  descEn?: string;
  descFi?: string;
  img?: string;
  start?: string;
  end?: string;
  link?: { type: "item" | "cat" | "offer"; id?: string };
}

export interface UploadedImg {
  src: string; // authenticated upload API URL or existing catalog asset
  altEn: string;
  altFi: string;
}

export interface CatMeta {
  img?: string;
  altEn?: string;
  altFi?: string;
  nameFi?: string;
  nameEn?: string;
  hidden?: boolean;
}

export interface Settings {
  paused: boolean;
  hours: Hours;
  deliveryFee: number;
  minOrder: number;
  radiusKm: number;
  deliveryRules: DeliveryRule[];
  restaurant: RestaurantInfo;
  vatRate: number;
  toppings: string[];
  special: SpecialCfg;
  blockedSlots: string[];
  blockedDates: string[];
  platforms: { wolt: string; uberEats: string };
  headerLogo: "round" | "mark";
  hideUnavailable: boolean;
  preorder: {
    enabled: boolean;
    cutoffDay: number; // 6 = Saturday
    cutoffTime: string;
    slots: string[];
    capacity?: number;
    noteEn: string;
    noteFi: string;
  };
  offers: Offer[];
  todaysSpecials: SpecialItem[];
  toppingMeta: Record<string, ToppingMeta>;
  itemImages: Record<string, UploadedImg>;
  offItems: Record<string, AvailState>;
  offCats: Record<string, AvailState>;
  offOptions: Record<string, string[]>; // 'topping', 'dip', `size:${itemId}`, `mod:${itemId}:${groupId}`
  catMeta: Record<string, CatMeta>;
  catOrder: string[];
  audit: { ts: number; who: string; msg: string }[];
  announcement: { enabled: boolean; text: string; textEn?: string; textFi?: string };
  pauseMessage: string;
}

export interface MenuOverride {
  soldOut?: boolean;
  name?: string;
  prices?: number[];
}

export interface ItemText {
  name?: string;
  desc?: string;
}

export interface Overrides {
  items: Record<string, MenuOverride>;
  order: Record<string, string[]>;
  added?: Record<string, MenuItem[]>;
  cats?: Category[];
  texts?: Partial<Record<Lang, Record<string, ItemText>>>;
}
