import type { Hours, Reservation, Settings } from "./types";

export const DEFAULT_HOURS: Hours = {
  0: { open: "12:00", close: "21:00" }, // Sun
  1: { open: "10:00", close: "21:00" },
  2: { open: "10:00", close: "21:00" },
  3: { open: "10:00", close: "21:00" },
  4: { open: "10:00", close: "21:00" },
  5: { open: "10:00", close: "22:00" }, // Fri
  6: { open: "11:00", close: "22:00" }, // Sat
};

export const DEFAULT_TOPPINGS = [
  "jauheliha", "salami", "kinkku", "ananas", "tonnikala", "herkkusieni",
  "pepperoni", "sipuli", "aurajuusto", "katkarapu", "simpukka", "paprika",
  "oliivi", "kana", "tomaatti", "fetajuusto", "kebab", "kanakebab", "jalapeno",
  "majoneesi", "BBQ", "pekoni", "valkosipulimajoneesi", "mozzarella",
  "edamjuusto", "cheddarjuusto",
];

export const DEFAULT_SETTINGS: Settings = {
  paused: false,
  hours: DEFAULT_HOURS,
  deliveryFee: 2.5,
  minOrder: 15,
  radiusKm: 6,
  readyTimeMinutes: 25,
  deliveryRules: [],
  vatRate: 0.135, // FI restaurant/takeaway food VAT since 1.1.2026 (was 0.14)
  toppings: DEFAULT_TOPPINGS,
  special: { itemId: "specials-3", active: true }, // Karachi Biryani
  blockedSlots: [],
  blockedDates: [],
  platforms: {
    wolt: "https://wolt.com/fi/fin/kuopio/restaurant/kuopio-bites",
    uberEats: "https://www.ubereats.com/store-browse-uuid/2b21a27b-6e47-587c-956a-f00de5f5fcfa?diningMode=DELIVERY",
  },
  headerLogo: "round",
  hideUnavailable: false,
  preorder: {
    enabled: true,
    cutoffDay: 6,
    cutoffTime: "18:00",
    slots: ["10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00"],
    capacity: 40,
    noteEn: "Order by Saturday 18:00 for Sunday pickup.",
    noteFi: "Tilaa viimeistään lauantaina klo 18.00 sunnuntain noutoa varten.",
  },
  todaysSpecials: [
    { id: "ts-1", itemId: "specials-3", discount: 10, textEn: "Today's Special", textFi: "Päivän annos", sortOrder: 0, active: true },
    { id: "ts-2", itemId: "specials-1", textEn: "Sunday pre-order", textFi: "Sunnuntain ennakkotilaus", sortOrder: 1, active: true },
    { id: "ts-3", itemId: "specials-11", overridePrice: 2.5, textEn: "Cool down", textFi: "Viilennä", sortOrder: 2, active: true },
  ],
  toppingMeta: {},
  itemImages: {},
  offers: [
    {
      id: "off-wings",
      type: "percent",
      value: 10,
      scope: { category: "wings" },
      titleEn: "Wings week −10%",
      titleFi: "Wings-viikko −10%",
      descEn: "All wing deals, this week only.",
      descFi: "Kaikki wings-tarjoukset, vain tällä viikolla.",
      badgeEn: "−10%",
      badgeFi: "−10%",
      active: true,
      priority: 1,
    },
  ],
  offItems: {},
  offCats: {},
  offOptions: {},
  catMeta: {},
  catOrder: [],
  audit: [],
  announcement: { enabled: false, text: "" },
  pauseMessage: "Keitti\u00f6mme pit\u00e4\u00e4 lyhyen tauon \u2014 palaamme pian!",
  orderStreak: { enabled: true, target: 7, rewardItemId: "", rewardNameEn: "Free pizza", rewardNameFi: "Ilmainen pizza" },
};

export const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

/** Current time in Helsinki (restaurant local time). */
export function helsinkiNow(): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Helsinki",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const wd: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const hh = parseInt(get("hour"), 10) % 24;
  const mm = parseInt(get("minute"), 10);
  return { day: wd[get("weekday")], minutes: hh * 60 + mm };
}

export function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10));
  return h * 60 + m;
}

/** Browser <input type="time"> may emit HH:MM:SS; the API contract is HH:MM. */
export function toHhmm(value: string): string {
  const match = String(value).trim().match(/^(\d{1,2}):([0-5]\d)(?::[0-5]\d)?$/);
  if (!match) return value;
  const hour = Number(match[1]);
  if (hour > 23) return value;
  return `${String(hour).padStart(2, "0")}:${match[2]}`;
}

export interface OpenInfo {
  open: boolean;
  /** today's close time when open */
  closeAt?: string;
  /** opening time when closed */
  openAt?: string;
  /** 0 = today, 1 = tomorrow, else weekday index */
  nextDay?: number;
}

/**
 * Close time in minutes counted from the *opening day's* midnight.
 * A close at or before the opening time means the kitchen runs past midnight
 * (10:00–00:00, 10:00–02:00), so it is moved to the next day — comparing it
 * directly against the opening time would make the shop look closed all day.
 */
export function closeMinutes(entry: { open: string; close: string }): number {
  const open = toMin(entry.open);
  const close = toMin(entry.close);
  return close <= open ? close + 1440 : close;
}

export function openInfo(hours: Hours, now: { day: number; minutes: number } = helsinkiNow()): OpenInfo {
  const { day, minutes } = now;

  /* 1 · last night's window can still be running (Fri 10:00–02:00 → open at
     Sat 01:30). Checked before today's entry: after midnight today has not
     opened yet, so the plain comparison would wrongly report "closed". */
  const previous = hours[(day + 6) % 7];
  if (previous) {
    const previousClose = closeMinutes(previous);
    if (previousClose > 1440 && minutes < previousClose - 1440) return { open: true, closeAt: previous.close };
  }

  /* 2 · today's own window (close may spill past midnight) */
  const today = hours[day];
  if (today) {
    const open = toMin(today.open);
    const close = closeMinutes(today);
    if (minutes >= open && minutes < close) return { open: true, closeAt: today.close };
    if (minutes < open) return { open: false, openAt: today.open, nextDay: 0 };
  }

  /* 3 · next opening within the coming week */
  for (let i = 1; i <= 7; i++) {
    const d = (day + i) % 7;
    const h = hours[d];
    if (h) return { open: false, openAt: h.open, nextDay: i === 1 ? 1 : d };
  }
  return { open: false };
}

export function orderingInfo(
  settings: Settings,
  now?: { day: number; minutes: number }
): { open: boolean; info: OpenInfo; paused: boolean } {
  const info = openInfo(settings.hours, now);
  return { open: !settings.paused && info.open, info, paused: settings.paused };
}

/** Available reservation slots for a date (30 min steps, last seating 60 min before close). */
export function slotsFor(
  dateStr: string,
  settings: Settings,
  reservations: Reservation[]
): string[] {
  const d = new Date(dateStr + "T12:00:00");
  if (settings.blockedDates.includes(dateStr)) return [];
  const entry = settings.hours[d.getDay()];
  if (!entry) return [];
  const now = helsinkiNow();
  const isToday = isSameDayHelsinki(dateStr);
  const taken = new Set(
    reservations
      .filter((r) => r.date === dateStr && r.status !== "declined")
      .map((r) => r.time)
  );
  const blocked = new Set(
    settings.blockedSlots
      .filter((b) => b.startsWith(dateStr + "|"))
      .map((b) => b.split("|")[1])
  );
  const slots: string[] = [];
  const open = toMin(entry.open);
  /* Table slots stay inside the calendar day: an overnight close (00:00/02:00)
     still means the last seating is before midnight, never a 25:00 slot. */
  const close = Math.min(closeMinutes(entry), 1440);
  for (let t = open; t <= close - 60; t += 30) {
    const hh = String(Math.floor(t / 60)).padStart(2, "0");
    const mm = String(t % 60).padStart(2, "0");
    const hm = `${hh}:${mm}`;
    if (isToday && now.minutes >= t) continue;
    if (!taken.has(hm) && !blocked.has(hm)) slots.push(hm);
  }
  return slots;
}

function isSameDayHelsinki(dateStr: string): boolean {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Helsinki",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date()) === dateStr;
}

export function todayStrHelsinki(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Helsinki",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
