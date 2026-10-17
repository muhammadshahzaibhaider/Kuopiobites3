import { createHash } from "node:crypto";
import type { CartLine, DeliveryRule, MenuItem, Settings } from "./lib/types";

const DISTANCE_CACHE_TTL_MS = 10 * 60_000;
const distanceCache = new Map<string, { expiresAt: number; km: number | null }>();
const ORIGIN = "Jalkasenkatu 7, 70820 Kuopio, Finland";

/**
 * Returns Google Maps driving distance when a server-only key is configured.
 * The integration is optional: without a key, postcode and flat-fee delivery
 * continue to work, while distance-qualified rules are simply not eligible.
 */
export async function resolveDeliveryDistanceKm(address: string | undefined): Promise<number | undefined> {
  const key = process.env.DELIVERY_DISTANCE_API_KEY?.trim();
  const normalized = address?.trim();
  if (!key || !normalized || normalized.length > 200) return undefined;
  if (!/\b70\d{3}\b/.test(normalized)) return undefined;

  const cacheKey = createHash("sha256").update(normalized.toLocaleLowerCase("fi-FI")).digest("hex");
  const cached = distanceCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.km ?? undefined;
  if (distanceCache.size > 500) {
    for (const [entry, value] of distanceCache) if (value.expiresAt <= Date.now()) distanceCache.delete(entry);
    while (distanceCache.size > 500) distanceCache.delete(distanceCache.keys().next().value as string);
  }

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
    url.searchParams.set("origins", ORIGIN);
    url.searchParams.set("destinations", normalized);
    url.searchParams.set("mode", "driving");
    url.searchParams.set("units", "metric");
    url.searchParams.set("region", "fi");
    url.searchParams.set("key", key);
    const response = await fetch(url, { signal: AbortSignal.timeout(3500), cache: "no-store" });
    if (!response.ok) throw new Error("provider.http");
    const json = await response.json() as {
      status?: string;
      rows?: Array<{ elements?: Array<{ status?: string; distance?: { value?: number } }> }>;
    };
    const meters = json.rows?.[0]?.elements?.[0]?.distance?.value;
    const status = json.rows?.[0]?.elements?.[0]?.status;
    const km = json.status === "OK" && status === "OK" && Number.isFinite(meters) && (meters as number) >= 0
      ? Math.round((meters as number) / 100) / 10
      : null;
    distanceCache.set(cacheKey, { expiresAt: Date.now() + DISTANCE_CACHE_TTL_MS, km });
    return km ?? undefined;
  } catch {
    // Do not log customer address or provider response. Flat/weight rules remain usable.
    return undefined;
  }
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
