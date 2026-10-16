import { createHash } from "node:crypto";
import { CFG } from "./config";
import { db } from "./supabase";
import type { DeliveryRule, RestaurantInfo, Settings } from "./lib/types";

export interface DeliveryMetrics {
  distanceKm?: number;
  weightKg: number;
  subtotalEur: number;
}

export interface DeliveryEvaluation {
  deliveryAllowed: boolean;
  deliveryFee: number;
  distanceKm?: number;
  appliedRules: DeliveryRule[];
  explanation: "delivery.allowed" | "delivery.outOfRange" | "delivery.ruleBlocked";
}

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const normalizeAddress = (value: string) => value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("fi-FI");
const addressHash = (value: string) => createHash("sha256").update(normalizeAddress(value)).digest("hex");

export function haversineKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const rad = (degrees: number) => degrees * Math.PI / 180;
  const earthRadiusKm = 6371.0088;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const lat1 = rad(a.latitude);
  const lat2 = rad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return round2(earthRadiusKm * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
}

async function readCachedPoint(address: string): Promise<{ latitude: number; longitude: number } | null> {
  const { data, error } = await db.from("delivery_geocode_cache")
    .select("latitude, longitude, updated_at").eq("address_hash", addressHash(address)).maybeSingle();
  if (error) throw new Error("delivery.geocodeCacheUnavailable");
  if (!data || Date.now() - Date.parse(data.updated_at) > 30 * 24 * 60 * 60 * 1000) return null;
  return { latitude: Number(data.latitude), longitude: Number(data.longitude) };
}

async function geocode(address: string): Promise<{ latitude: number; longitude: number }> {
  const cached = await readCachedPoint(address);
  if (cached) return cached;

  const url = new URL(CFG.deliveryGeocoderUrl);
  url.searchParams.set("q", address);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "fi");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CFG.deliveryGeocoderTimeoutMs);
  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: { accept: "application/json", "user-agent": CFG.deliveryGeocoderUserAgent },
      signal: controller.signal,
    });
  } catch {
    throw new Error("delivery.geocoderUnavailable");
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) throw new Error("delivery.geocoderUnavailable");
  const matches = await response.json().catch(() => null) as Array<{ lat?: string; lon?: string }> | null;
  const latitude = Number(matches?.[0]?.lat);
  const longitude = Number(matches?.[0]?.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    throw new Error("delivery.addressNotFound");
  }
  const point = { latitude, longitude };
  const { error } = await db.from("delivery_geocode_cache").upsert({
    address_hash: addressHash(address), latitude, longitude, updated_at: new Date().toISOString(),
  }, { onConflict: "address_hash" });
  if (error) throw new Error("delivery.geocodeCacheUnavailable");
  return point;
}

async function restaurantPoint(restaurant: RestaurantInfo): Promise<{ latitude: number; longitude: number }> {
  if (restaurant.latitude !== undefined && restaurant.longitude !== undefined) {
    return { latitude: restaurant.latitude, longitude: restaurant.longitude };
  }
  return geocode(`${restaurant.address}, Kuopio, Finland`);
}

export async function distanceToRestaurant(address: string, restaurant: RestaurantInfo): Promise<number> {
  const normalized = address.trim();
  if (!normalized) throw new Error("order.addressRequired");
  const [origin, destination] = await Promise.all([
    restaurantPoint(restaurant),
    geocode(`${normalized}, Kuopio, Finland`),
  ]);
  return haversineKm(origin, destination);
}

function helsinkiNow(date: Date): { day: number; date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Helsinki", year: "numeric", month: "2-digit", day: "2-digit",
    weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const get = (name: string) => parts.find((part) => part.type === name)?.value ?? "";
  const day = ({ Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 } as Record<string, number>)[get("weekday")];
  return { day, date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

function isBetween(value: number, range?: { min?: number; max?: number }): boolean {
  if (!range) return true;
  if (range.min !== undefined && value < range.min) return false;
  if (range.max !== undefined && value > range.max) return false;
  return true;
}

function timeMatches(now: string, start?: string, end?: string): boolean {
  if (!start || !end) return true;
  if (start <= end) return now >= start && now <= end;
  return now >= start || now <= end; // overnight window, e.g. 22:00–02:00
}

export function deliveryRuleMatches(rule: DeliveryRule, metrics: DeliveryMetrics, date = new Date()): boolean {
  if (!rule.active) return false;
  const local = helsinkiNow(date);
  if (rule.activeDays?.length && !rule.activeDays.includes(local.day)) return false;
  if (rule.startDate && local.date < rule.startDate) return false;
  if (rule.endDate && local.date > rule.endDate) return false;
  if (!timeMatches(local.time, rule.startTime, rule.endTime)) return false;
  const conditions = rule.conditions;
  if (conditions.distanceKm && (metrics.distanceKm === undefined || !isBetween(metrics.distanceKm, conditions.distanceKm))) return false;
  if (conditions.weightKg && !isBetween(metrics.weightKg, conditions.weightKg)) return false;
  if (conditions.subtotalEur && !isBetween(metrics.subtotalEur, conditions.subtotalEur)) return false;
  return true;
}

/** Pure evaluator shared by the checkout repricer, admin preview, and unit tests. */
export function evaluateDeliveryRules(
  settings: Pick<Settings, "deliveryFee" | "radiusKm" | "deliveryRules">,
  metrics: DeliveryMetrics,
  date = new Date(),
): DeliveryEvaluation {
  const distanceKm = metrics.distanceKm;
  if (settings.radiusKm > 0 && distanceKm !== undefined && distanceKm > settings.radiusKm) {
    return { deliveryAllowed: false, deliveryFee: 0, distanceKm, appliedRules: [], explanation: "delivery.outOfRange" };
  }
  let fee = round2(settings.deliveryFee);
  const appliedRules: DeliveryRule[] = [];
  const rules = [...settings.deliveryRules].sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
  for (const rule of rules) {
    if (!deliveryRuleMatches(rule, metrics, date)) continue;
    appliedRules.push(rule);
    switch (rule.outcome) {
      case "no_delivery":
        return { deliveryAllowed: false, deliveryFee: fee, distanceKm, appliedRules, explanation: "delivery.ruleBlocked" };
      case "free_delivery":
        fee = 0;
        break;
      case "fixed_fee":
        fee = round2(rule.value ?? settings.deliveryFee);
        break;
      case "percent_fee":
        fee = round2(settings.deliveryFee * (rule.value ?? 0) / 100);
        break;
      case "fixed_discount":
        fee = round2(Math.max(0, fee - (rule.value ?? 0)));
        break;
    }
    if (!rule.stackable) break;
  }
  return { deliveryAllowed: true, deliveryFee: fee, distanceKm, appliedRules, explanation: "delivery.allowed" };
}

export async function deliveryEvaluation(
  settings: Settings,
  metrics: Omit<DeliveryMetrics, "distanceKm"> & { distanceKm?: number },
  address?: string,
): Promise<DeliveryEvaluation> {
  let distanceKm = metrics.distanceKm;
  if (address?.trim()) distanceKm = await distanceToRestaurant(address, settings.restaurant);
  const evaluated = evaluateDeliveryRules(settings, { ...metrics, distanceKm });
  if (!evaluated.deliveryAllowed) {
    if (evaluated.explanation === "delivery.outOfRange") throw new Error("delivery.outOfRange");
    throw new Error("delivery.ruleBlocked");
  }
  return evaluated;
}

export function activeDeliveryRuleName(rule: DeliveryRule | undefined, lang: "en" | "fi") {
  if (!rule) return undefined;
  return { id: rule.id, nameEn: rule.nameEn, nameFi: rule.nameFi, label: lang === "fi" ? rule.nameFi : rule.nameEn };
}
