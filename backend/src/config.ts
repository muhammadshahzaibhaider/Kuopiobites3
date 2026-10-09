import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(here, "../.env");

/**
 * Small dependency-free env loader for this local SQLite service. Deployment
 * secret managers still win because process.env is never overwritten.
 */
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match || match[1] in process.env) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

const positiveInt = (name: string, fallback: number): number => {
  const n = Number(process.env[name]);
  return Number.isSafeInteger(n) && n > 0 ? n : fallback;
};

const bool = (name: string, fallback: boolean): boolean => {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return value.toLowerCase() === "true";
};

const nodeEnv = process.env.NODE_ENV || "development";
const rawOrigins = (process.env.CORS_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const origins = rawOrigins.map((origin) => {
  if (origin === "*") throw new Error("CORS_ORIGINS must never contain '*'");
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    throw new Error(`Invalid CORS origin: ${origin}`);
  }
  if (!/^https?:$/.test(parsed.protocol) || parsed.pathname !== "/" || parsed.search || parsed.hash)
    throw new Error(`CORS origin must be an exact http(s) origin: ${origin}`);
  return parsed.origin;
});

if (nodeEnv === "production" && origins.some((origin) => !origin.startsWith("https://"))) {
  throw new Error("Production CORS_ORIGINS must contain HTTPS origins only");
}
if (nodeEnv === "production" && !(process.env.PUBLIC_WEB_URL || origins[0]).startsWith("https://"))
  throw new Error("PUBLIC_WEB_URL must be HTTPS in production");
if (nodeEnv === "production" && !(process.env.PUBLIC_API_URL || "").startsWith("https://"))
  throw new Error("PUBLIC_API_URL must be HTTPS in production");

const cookieSameSite = (process.env.COOKIE_SAME_SITE || "lax").toLowerCase();
if (!(["lax", "strict", "none"] as string[]).includes(cookieSameSite))
  throw new Error("COOKIE_SAME_SITE must be lax, strict, or none");
const cookieSecure = bool("COOKIE_SECURE", nodeEnv === "production");
if (cookieSameSite === "none" && !cookieSecure)
  throw new Error("COOKIE_SAME_SITE=none requires COOKIE_SECURE=true");

const allowDemoPayments = bool("ALLOW_DEMO_PAYMENTS", false);
if (nodeEnv === "production" && allowDemoPayments)
  throw new Error("ALLOW_DEMO_PAYMENTS is forbidden in production");

export const CFG = {
  nodeEnv,
  isProduction: nodeEnv === "production",
  port: positiveInt("PORT", 4000),
  corsOrigins: origins,
  publicWebUrl: process.env.PUBLIC_WEB_URL || origins[0],
  publicApiUrl: process.env.PUBLIC_API_URL || `http://localhost:${positiveInt("PORT", 4000)}`,
  dbFile: resolve(here, "..", process.env.DB_FILE || "./data/kuopio.db"),
  uploadsDir: resolve(here, "..", process.env.UPLOAD_DIR || "./data/uploads"),
  jsonBodyLimit: process.env.JSON_BODY_LIMIT || "2mb",
  maxUploadBytes: positiveInt("MAX_UPLOAD_BYTES", 5 * 1024 * 1024),
  cookieSecure,
  cookieSameSite: cookieSameSite as "lax" | "strict" | "none",
  customerCookieName: "kb_customer_session",
  staffCookieName: "kb_staff_session",
  csrfCookieName: "kb_csrf",
  rate: {
    /* Broad ceiling for every API request per IP. Site traffic fans out into
       several parallel GETs per page view, so this sits far above the
       per-endpoint limits below. */
    apiWindowMs: positiveInt("API_RATE_WINDOW_MS", 15 * 60_000),
    apiMax: positiveInt("API_RATE_MAX", 600),
    authWindowMs: positiveInt("AUTH_RATE_WINDOW_MS", 60_000),
    authMax: positiveInt("AUTH_RATE_MAX", 10),
    loginWindowMs: positiveInt("LOGIN_RATE_WINDOW_MS", 15 * 60_000),
    loginMax: positiveInt("LOGIN_RATE_MAX", 5),
    loginMaxAttempts: positiveInt("LOGIN_MAX_ATTEMPTS", 5),
    loginLockoutSeconds: positiveInt("LOGIN_LOCKOUT_SECONDS", 900),
    orderWindowMs: positiveInt("ORDER_RATE_WINDOW_MS", 15 * 60_000),
    orderMax: positiveInt("ORDER_RATE_MAX", 30),
    reservationWindowMs: positiveInt("RESERVATION_RATE_WINDOW_MS", 15 * 60_000),
    reservationMax: positiveInt("RESERVATION_RATE_MAX", 20),
    uploadWindowMs: positiveInt("UPLOAD_RATE_WINDOW_MS", 15 * 60_000),
    uploadMax: positiveInt("UPLOAD_RATE_MAX", 30),
    newsletterWindowMs: positiveInt("NEWSLETTER_RATE_WINDOW_MS", 60 * 60_000),
    newsletterMax: positiveInt("NEWSLETTER_RATE_MAX", 5),
  },
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
  /* Outbound mail is handled by Supabase Auth (GoTrue) — SMTP credentials are
     configured in the Supabase Dashboard, never in this process. */
  allowDemoPayments,
};

