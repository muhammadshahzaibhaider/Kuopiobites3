/**
 * Lightweight in-memory sliding-window rate limiter for the contact endpoint.
 * Suitable for single-instance / edge deployments. For multi-instance production,
 * replace with Redis/Upstash.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Cleanup every 10 min to avoid unbounded growth
if (typeof setInterval !== "undefined") {
  const interval = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets.entries()) {
      if (now > bucket.resetAt) buckets.delete(key);
    }
  }, 10 * 60 * 1000);
  // Allow Node to exit even if interval is still active
  // @ts-ignore - unref exists in Node
  if (interval.unref) interval.unref();
}

/**
 * Check whether a key is rate-limited.
 * @param key - identifier (e.g. IP or email)
 * @param limit - max requests in window
 * @param windowMs - window duration in ms
 * @returns object with allowed flag and retry info
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetMs: number } {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now > existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetMs: windowMs };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetMs: existing.resetAt - now };
  }

  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count, resetMs: existing.resetAt - now };
}

export function getClientIp(headers: Headers): string {
  // Vercel / Cloudflare / generic proxy headers
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}
