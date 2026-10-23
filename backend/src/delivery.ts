import { createHash } from "node:crypto";
import type { CartLine, DeliveryRule, MenuItem, Settings } from "./lib/types";

const DISTANCE_CACHE_TTL_MS = 10 * 60_000;
const distanceCache = new Map<string, { expiresAt: number; km: number | null }>();
const ORIGIN = "Jalkasenkatu 7, 70820 Kuopio, Finland";
/** Shop coordinates (Jalkasenkatu 7) — used when Google Distance Matrix is not configured. */
export const SHOP_LAT = 62.83957;
export const SHOP_LNG = 27.6451;
/** Straight-line km underestimates city driving; a modest factor matches typical Kuopio roads. */
const DRIVING_FACTOR = 1.3;

/**
 * Returns driving distance in km.
 * Prefers Google Distance Matrix when DELIVERY_DISTANCE_API_KEY is set;
 * otherwise geocodes with OpenStreetMap (no extra env) and estimates driving km.
 */
export async function resolveDeliveryDistanceKm(address: string | undefined): Promise<number | undefined> {
  const normalized = address?.trim();
  if (!normalized || normalized.length > 200) return undefined;
  if (!/\b70\d{3}\b/.test(normalized)) return undefined;

  const cacheKey = createHash("sha256").update(normalized.toLocaleLowerCase("fi-FI")).digest("hex");
  const cached = distanceCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.km ?? undefined;
  if (distanceCache.size > 500) {
    for (const [entry, value] of distanceCache) if (value.expiresAt <= Date.now()) distanceCache.delete(entry);
    while (distanceCache.size > 500) distanceCache.delete(distanceCache.keys().next().value as string);
  }

  const googleKey = process.env.DELIVERY_DISTANCE_API_KEY?.trim();
  const km = googleKey
    ? await googleDrivingKm(normalized, googleKey)
    : await osmDrivingKm(normalized);
  distanceCache.set(cacheKey, { expiresAt: Date.now() + DISTANCE_CACHE_TTL_MS, km: km ?? null });
  return km;
}

async function googleDrivingKm(address: string, key: string): Promise<number | undefined> {
  try {
    const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
    url.searchParams.set("origins", ORIGIN);
    url.searchParams.set("destinations", address);
    url.searchParams.set("mode", "driving");
    url.searchParams.set("units", "metric");
    url.searchParams.set("region", "fi");
    url.searchParams.set("key", key);
    const response = await fetch(url, { signal: AbortSignal.timeout(3500), cache: "no-store" });
    if (!response.ok) return undefined;
    const json = await response.json() as {
      status?: string;
      rows?: Array<{ elements?: Array<{ status?: string; distance?: { value?: number } }> }>;
    };
    const meters = json.rows?.[0]?.elements?.[0]?.distance?.value;
    const status = json.rows?.[0]?.elements?.[0]?.status;
    if (json.status !== "OK" || status !== "OK" || !Number.isFinite(meters) || (meters as number) < 0) return undefined;
    return Math.round((meters as number) / 100) / 10;
  } catch {
    return undefined;
  }
}

async function osmDrivingKm(address: string): Promise<number | undefined> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", address);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "fi");
    url.searchParams.set("viewbox", "27.40,62.95,27.90,62.75");
    url.searchParams.set("bounded", "1");
    const response = await fetch(url, {
      signal: AbortSignal.timeout(4000),
      cache: "no-store",
      headers: { Accept: "application/json", "User-Agent": "KuopioBites/1.0 (delivery-distance)" },
    });
    if (!response.ok) return undefined;
    const json = await response.json() as Array<{ lat?: string; lon?: string }>;
    const lat = Number(json[0]?.lat);
    const lon = Number(json[0]?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return undefined;
    return drivingKmFromShop(lat, lon);
  } catch {
    return undefined;
  }
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function drivingKmFromShop(lat: number, lon: number): number {
  const km = haversineKm(SHOP_LAT, SHOP_LNG, lat, lon) * DRIVING_FACTOR;
  return Math.round(km * 10) / 10;
}

export function cartWeightKg(items: MenuItem[], lines: CartLine[]): number {
  const byId = new Map(items.map((item) => [item.id, item]));
  const grams = lines.reduce((sum, line) => sum + Math.round((byId.get(line.itemId)?.weightKg ?? 0) * 1000) * line.qty, 0);
  return Math.round(grams) / 1000;
}

function within(value: number | undefined, min: number | undefined, max: number | undefined): boolean {
  if (min !== undefined && (value === undefined || value < min)) return false;
  if (max !== undefined && (value === undefined || value > max)) return false;
  return true;
}

export function matchesDeliveryRule(rule: DeliveryRule, distanceKm: number | undefined, weightKg: number): boolean {
  if (!rule.active) return false;
  return within(distanceKm, rule.minDistanceKm, rule.maxDistanceKm)
    && within(weightKg, rule.minWeightKg, rule.maxWeightKg);
}

export function deliveryFeeFor(settings: Settings, distanceKm: number | undefined, weightKg: number): number {
  const matching = settings.deliveryRules.find((rule) => matchesDeliveryRule(rule, distanceKm, weightKg));
  return matching?.fee ?? settings.deliveryFee;
}

/** Guarded in-memory test hook; production uses the real provider integration. */
export function clearDeliveryDistanceCacheForTests(): void {
  distanceCache.clear();
}
