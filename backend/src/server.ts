import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { createHmac, randomBytes, timingSafeEqual, createHash } from "node:crypto";
import Stripe from "stripe";
import { CFG } from "./config";
import { authClient, db as supabaseDb, logActivity } from "./supabase";
import { getItem, listCategories, listItems, toDatabaseItem } from "./supabase-menu";
import { getOrder, listCustomerOrders, listOrders } from "./supabase-orders";
import { saveSettings } from "./supabase-settings";
import {
  clearSessionCookies, currentAuth, customerRow, ensureCsrfCookie, issueCustomerSession, issueStaffSession,
  readAuth, requireCustomer, requireStaff, staffById, staffRow, csrfCookie,
  type Role, type TokenPayload,
} from "./auth";
import { effectiveItems, loadSettings, orderStatus, priceCart, validateOrder } from "./logic";
import { openInfo } from "./lib/hours";
import type { CartLine, MenuItem, Order, Reservation, Settings, User } from "./lib/types";
import {
  accountPatchSchema, cartSchema, categoryCreateSchema, categoryPatchSchema, confirmEmailSchema, customerOrderSchema, passwordChangeSchema,
  forgotPasswordSchema, loginSchema, menuItemSchema, paramId, promotionPatchSchema, registerSchema, reorderSchema, reservationSchema,
  resetPasswordSchema, settingsSchema, specialPatchSchema, staffLoginSchema, statusSchema, translationSchema, newsletterSchema,
} from "./schemas";
import { csrfMatches, loginIsLocked, recordLoginFailure, clearLoginFailures, requestIp, safeLogError } from "./security";

const app = express();
app.set("trust proxy", CFG.isProduction ? 1 : false);

/* Security headers apply to JSON, media, and error responses. The browser CSP
   itself is also set by Next.js; this API policy is intentionally conservative. */
app.use(helmet({
  contentSecurityPolicy: false,
  hsts: CFG.isProduction ? { maxAge: 63_072_000, includeSubDomains: true, preload: true } : false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use((req, res, next) => {
  const requestId = (req.headers["x-request-id"] as string | undefined)?.match(/^[A-Za-z0-9._-]{8,80}$/)?.[0]
    ?? randomBytes(12).toString("hex");
  (req as any).requestId = requestId;
  res.setHeader("X-Request-ID", requestId);
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(self)");
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
  next();
});

if (CFG.isProduction) {
  app.use((req, res, next) => {
    const forwarded = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
    if (req.secure || forwarded === "https") return next();
    return res.status(400).json({ error: "https.required" });
  });
}

app.use(
  cors({
    origin: (origin, cb) => {
      /* No Origin is not a browser CORS request (health checks/CLI); browser
         origins must match one configured origin byte-for-byte. */
      if (!origin || CFG.corsOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("CORS: origin not allowed"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token", "X-Session-Scope", "X-Request-ID"],
    exposedHeaders: ["X-Request-ID"],
    optionsSuccessStatus: 204,
  })
);

/* Stripe webhooks must receive the exact raw bytes before express.json runs. */
app.post(
  "/api/webhooks/stripe",
  express.raw({ type: "application/json", limit: "1mb" }),
  async (req, res, next) => {
    try {
      await handleStripeWebhook(req, res);
    } catch (error) {
      next(error);
    }
  }
);

app.use(express.json({ limit: CFG.jsonBodyLimit, strict: true }));
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) res.setHeader("Cache-Control", "no-store");
  next();
});
app.use((req, res, next) => {
  ensureCsrfCookie(res, req);
  next();
});
app.use(readAuth);
app.use((req, res, next) => {
  const mutating = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
  const exempt = req.path === "/api/auth/csrf" || req.path === "/api/webhooks/stripe";
  if (mutating && !exempt && !csrfMatches(req)) return res.status(403).json({ error: "csrf.invalid" });
  next();
});

const businessError = /^(?:auth\.|avail\.|order\.|pre\.|preorder\.|resv\.|item\.|payment\.|validation\.|account\.|promo\.|https\.)/;
const fail = (res: Response, code: number, error: string) => res.status(code).json({ error });
const ok = (res: Response, data: unknown, code = 200) => res.status(code).json({ data });
const wrap =
  (fn: (req: Request, res: Response) => unknown | Promise<unknown>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await fn(req, res);
    } catch (error) {
      if (error instanceof z.ZodError) {
        safeLogError((req as any).requestId || "unknown", new Error(`validation failed: ${error.issues.map((issue) => issue.path.join(".")).join(",")}`));
        return fail(res, 400, "validation.failed");
      }
      const message = error instanceof Error ? error.message : "internal";
      if (message === "auth.emailUnavailable" || message === "payment.unavailable" || message === "payment.required")
        return fail(res, 503, message);
      if (businessError.test(message)) return fail(res, 400, message);
      next(error);
    }
  };

const uid = (prefix: string) => `${prefix}-${randomBytes(9).toString("base64url")}`;
const publicUser = (row: any): Omit<User, "pass"> => ({
  id: row.id,
  name: row.name,
  email: row.email,
  phone: row.phone || "",
  addresses: JSON.parse(row.addresses || "[]"),
  marketing: Boolean(row.marketing),
  favorites: Array.from(new Set(row.favorites ?? [])),
  createdAt: row.created_at,
} as Omit<User, "pass">);
const authUser = (req: Request) => (req as any).customer as any;
const authStaff = (req: Request) => (req as any).staff as { id: string; username: string; role: Role };

/* Auth limiters answer with the same JSON envelope as every other error so the
   SPA can show a human message instead of a raw "http 429". */
const tooManyJson = (req: Request, res: Response) => {
  const reset = (req as any).rateLimit?.resetTime as Date | undefined;
  const retryAfter = reset ? Math.max(1, Math.ceil((reset.getTime() - Date.now()) / 1000)) : 60;
  res.setHeader("Retry-After", String(retryAfter));
  fail(res, 429, "auth.tooManyAttempts");
};
const authLimiter = rateLimit({ windowMs: CFG.rate.authWindowMs, limit: CFG.rate.authMax, standardHeaders: "draft-7", legacyHeaders: false, handler: tooManyJson });
const loginLimiter = rateLimit({ windowMs: CFG.rate.loginWindowMs, limit: CFG.rate.loginMax, standardHeaders: "draft-7", legacyHeaders: false, handler: tooManyJson });
const orderLimiter = rateLimit({ windowMs: CFG.rate.orderWindowMs, limit: CFG.rate.orderMax, standardHeaders: "draft-7", legacyHeaders: false });
const resvLimiter = rateLimit({ windowMs: CFG.rate.reservationWindowMs, limit: CFG.rate.reservationMax, standardHeaders: "draft-7", legacyHeaders: false });
const uploadLimiter = rateLimit({ windowMs: CFG.rate.uploadWindowMs, limit: CFG.rate.uploadMax, standardHeaders: "draft-7", legacyHeaders: false });
const newsletterLimiter = rateLimit({ windowMs: CFG.rate.newsletterWindowMs, limit: CFG.rate.newsletterMax, standardHeaders: "draft-7", legacyHeaders: false });
/* Global ceiling across the whole API: generous enough for a real browsing
   session (the client fires parallel GETs per page), tight enough to blunt
   scraping and credential tooling. Per-endpoint limits above stay stricter. */
const apiLimiter = rateLimit({ windowMs: CFG.rate.apiWindowMs, limit: CFG.rate.apiMax, standardHeaders: "draft-7", legacyHeaders: false, handler: tooManyJson });
app.use("/api", apiLimiter);

app.get("/api/health", wrap(async (_req, res) => {
  const { error } = await supabaseDb.from("categories").select("id").limit(1);
  if (error) throw error;
  ok(res, { status: "ok", ts: Date.now() });
}));

app.get("/api/categories", wrap(async (_req, res) => ok(res, await listCategories())));
app.get("/api/items", wrap(async (req, res) => {
  const query = z.object({ cat: z.string().max(40).optional() }).strict().parse(req.query);
  ok(res, await listItems(query.cat));
}));

app.get("/api/items/:id", wrap(async (req, res) => {
    const id = paramId.parse(req.params.id);
    const item = await getItem(id);
    if (!item) return fail(res, 404, "item.notFound");
    ok(res, item);
  }));

  app.get("/api/settings", wrap(async (_req, res) => {
    const { audit: _audit, ...publicSettings } = await loadSettings();
    ok(res, publicSettings);
  }));

  app.get("/api/translations", wrap(async (_req, res) => {
    const { data, error } = await supabaseDb.from("translation_strings").select("key, value_en, value_fi").limit(10000);
    if (error) throw error;
    const out: Record<string, Record<string, string>> = { en: {}, fi: {} };
    for (const row of data ?? []) {
      out.en[row.key] = row.value_en;
      if (row.value_fi) out.fi[row.key] = row.value_fi;
    }
    ok(res, out);
  }));

  app.get("/api/todays-special", wrap(async (_req, res) => {
    const settings = await loadSettings();
    ok(res, { special: settings.special, todaysSpecials: settings.todaysSpecials });
  }));

  app.post("/api/newsletter", newsletterLimiter, wrap(async (req, res) => {
    const { email } = newsletterSchema.parse(req.body);
    const { error } = await supabaseDb.from("newsletter_subscribers").upsert(
      { email: email.toLowerCase(), subscribed_at: new Date().toISOString() },
      { onConflict: "email", ignoreDuplicates: true }
    );
    if (error) throw error;
    ok(res, { subscribed: true });
  }));

  app.get("/api/auth/csrf", (req, res) => ok(res, { csrfToken: ensureCsrfCookie(res, req) }));
  app.get("/api/auth/session", wrap(async (req, res) => {
    const auth = currentAuth(req);
    if (!auth) return ok(res, { user: null, role: null });
    if (auth.scope === "customer") {
      const row = await customerRow(auth.sub);
      const verified = Boolean((req as any).supabaseUser?.email_confirmed_at);
      return ok(res, { user: row && verified ? publicUser(row) : null, role: null });
    }
    const row = await staffById(auth.sub);
    return ok(res, { user: null, role: row?.role ?? null });
  }));

  app.post("/api/auth/register", authLimiter, wrap(async (req, res) => {
    const b = registerSchema.parse(req.body);
    const { data, error } = await authClient().auth.signUp({
      email: b.email,
      password: b.pass,
      options: { data: { name: b.name, phone: b.phone ?? null }, emailRedirectTo: `${CFG.publicWebUrl}/auth/confirm` },
    });
    if (error || !data.user) return fail(res, error?.code === "user_already_exists" ? 409 : 400, error?.code === "user_already_exists" ? "auth.emailInUse" : "auth.register");
    if (data.session) issueCustomerSession(res, data.session.access_token, data.session.refresh_token);
    const profile = await customerRow(data.user.id);
    const user = profile ? publicUser(profile) : {
      id: data.user.id, name: b.name, email: b.email, phone: b.phone ?? "", addresses: [], marketing: false, createdAt: Date.now(),
    };
    ok(res, { user, needsConfirmation: !data.session }, 201);
  }));

  async function verifyLogin(scope: "customer" | "staff", identifier: string, password: string, ip: string) {
    const lockedUntil = loginIsLocked(scope, identifier, ip);
    if (lockedUntil) return { lockedUntil, row: null, session: null, emailNotConfirmed: false } as const;
    const staff = scope === "staff" ? await staffRow(identifier) : undefined;
    const email = scope === "customer" ? identifier : staff?.email;
    const { data, error } = await authClient().auth.signInWithPassword({
      email: email ?? "missing-user@example.invalid",
      password,
    });
    const correctIdentity = scope !== "staff" || Boolean(staff && data.user?.id === staff.id);
    const row = data.user && correctIdentity
      ? scope === "customer" ? await customerRow(data.user.id) : staff
      : undefined;
    if (error || !data.session || !row) {
      if (error?.code === "email_not_confirmed") return { lockedUntil: 0, row: null, session: null, emailNotConfirmed: true } as const;
      const lock = recordLoginFailure(scope, identifier, ip);
      return { lockedUntil: lock || 0, row: null, session: null, emailNotConfirmed: false } as const;
    }
    clearLoginFailures(scope, identifier, ip);
    return { row, session: data.session, lockedUntil: 0, emailNotConfirmed: false } as const;
  }

  app.post("/api/auth/login", loginLimiter, wrap(async (req, res) => {
    const b = loginSchema.parse(req.body);
    const result = await verifyLogin("customer", b.email, b.pass, requestIp(req));
    if (result.lockedUntil) {
      res.setHeader("Retry-After", String(Math.max(1, Math.ceil((result.lockedUntil - Date.now()) / 1000))));
      return fail(res, 429, "auth.tooManyAttempts");
    }
    if (result.emailNotConfirmed) return fail(res, 403, "auth.emailNotConfirmed");
    if (!result.row || !result.session) return fail(res, 401, "auth.badCredentials");
    issueCustomerSession(res, result.session.access_token, result.session.refresh_token, b.remember ?? true);
    ok(res, { user: publicUser(result.row) });
  }));

  app.post("/api/auth/admin-login", loginLimiter, wrap(async (req, res) => {
    const b = staffLoginSchema.parse(req.body);
    const result = await verifyLogin("staff", b.username, b.password, requestIp(req));
    if (result.lockedUntil) {
      res.setHeader("Retry-After", String(Math.max(1, Math.ceil((result.lockedUntil - Date.now()) / 1000))));
      return fail(res, 429, "auth.tooManyAttempts");
    }
    if (result.emailNotConfirmed) return fail(res, 403, "auth.emailNotConfirmed");
    if (!result.row || !result.session) return fail(res, 401, "auth.badCredentials");
    const staff = result.row as { username: string; role: Role };
    issueStaffSession(res, result.session.access_token, result.session.refresh_token);
    logActivity(staff.username, staff.role, "staff login");
    ok(res, { role: staff.role });
  }));

  app.post("/api/auth/confirm-email", authLimiter, wrap(async (req, res) => {
    const body = z.union([
      confirmEmailSchema,
      z.object({ accessToken: z.string().min(1), refreshToken: z.string().min(1) }).strict(),
    ]).parse(req.body);
    if ("code" in body) {
      /* PKCE links (Supabase default for newer projects) carry ?code=. */
      const { data, error } = await authClient().auth.exchangeCodeForSession(body.code);
      if (error || !data.user || !data.session) return fail(res, 400, "auth.confirmationInvalid");
      issueCustomerSession(res, data.session.access_token, data.session.refresh_token);
      return ok(res, { confirmed: true });
    }
    if ("token" in body) {
      /* Templates differ: some send type=email, the default sends type=signup.
         Honour the link's type and fall back across the email aliases. */
      const tried = new Set<string>();
      for (const type of [body.type, "email", "signup"] as const) {
        if (!type || tried.has(type)) continue;
        tried.add(type);
        const { data, error } = await authClient().auth.verifyOtp({ token_hash: body.token, type });
        if (!error && data.user) {
          if (data.session) issueCustomerSession(res, data.session.access_token, data.session.refresh_token);
          return ok(res, { confirmed: true });
        }
      }
      return fail(res, 400, "auth.confirmationInvalid");
    }
    const { data, error } = await supabaseDb.auth.getUser(body.accessToken);
    if (error || !data.user?.email_confirmed_at) return fail(res, 400, "auth.confirmationInvalid");
    const profile = await customerRow(data.user.id);
    if (!profile) return fail(res, 400, "auth.confirmationInvalid");
    issueCustomerSession(res, body.accessToken, body.refreshToken);
    ok(res, { confirmed: true });
  }));

  app.post("/api/auth/resend-confirmation", authLimiter, wrap(async (req, res) => {
    const { email } = forgotPasswordSchema.parse(req.body);
    /* Neutral response either way; Supabase only mails existing unconfirmed users. */
    await authClient().auth.resend({ type: "signup", email, options: { emailRedirectTo: `${CFG.publicWebUrl}/auth/confirm` } }).catch(() => {});
    ok(res, { ok: true });
  }));

  app.post("/api/auth/forgot-password", authLimiter, wrap(async (req, res) => {
    const { email } = forgotPasswordSchema.parse(req.body);
    /* Always neutral ("if this email is registered…"): GoTrue never reveals
       whether the address exists, and neither do we. The token lives only in
       GoTrue (hashed at rest), expires quickly, and is single-use. */
    await authClient().auth.resetPasswordForEmail(email, { redirectTo: `${CFG.publicWebUrl}/auth/reset` }).catch(() => {});
    ok(res, { ok: true });
  }));

  app.post("/api/auth/reset-password", authLimiter, wrap(async (req, res) => {
    const body = resetPasswordSchema.parse(req.body);
    let userId: string | null = null;
    let verifiedAccessToken: string | null = null;
    if ("code" in body) {
      const { data, error } = await authClient().auth.exchangeCodeForSession(body.code);
      if (!error && data.user && data.session) { userId = data.user.id; verifiedAccessToken = data.session.access_token; }
    } else if ("accessToken" in body) {
      const { data, error } = await supabaseDb.auth.getUser(body.accessToken);
      if (!error && data.user) { userId = data.user.id; verifiedAccessToken = body.accessToken; }
    } else {
      const { data, error } = await authClient().auth.verifyOtp({ token_hash: body.token, type: body.type ?? "recovery" });
      if (!error && data.user) { userId = data.user.id; verifiedAccessToken = data.session?.access_token ?? null; }
    }
    /* Same message for expired, reused, malformed, or alien tokens. */
    if (!userId) return fail(res, 400, "auth.resetInvalid");
    const { error: updateError } = await supabaseDb.auth.admin.updateUserById(userId, { password: body.next });
    if (updateError) return fail(res, 400, "auth.resetInvalid");
    /* Invalidate every existing session so the old password dies everywhere. */
    if (verifiedAccessToken) await supabaseDb.auth.admin.signOut(verifiedAccessToken, "global").catch(() => {});
    clearSessionCookies(res, { keepCsrf: true });
    ok(res, { ok: true });
  }));

app.post("/api/auth/logout", wrap(async (req, res) => {
  /* Revoke this session's tokens server-side (best effort), then drop cookies.
     The CSRF cookie stays: it is a per-browser token, and removing it orphaned
     the SPA's cached double-submit token (every later mutation failed). */
  const token = (req as any).accessToken as string | null;
  if (token) await supabaseDb.auth.admin.signOut(token, "local").catch(() => {});
  clearSessionCookies(res, { keepCsrf: true });
  ok(res, { ok: true });
}));

/* ── server-side pricing ───────────────────────────────────────────────── */
app.post("/api/cart/price", wrap(async (req, res) => {
  const b = cartSchema.parse(req.body);
  ok(res, await priceCart(await loadSettings(), b.lines as CartLine[], b.type, b.lang, b.code));
}));

/* ── upload boundary ───────────────────────────────────────────────────── */
function sniffImage(body: Buffer): { mime: "image/png" | "image/jpeg" | "image/webp"; ext: "png" | "jpg" | "webp" } | null {
  if (body.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return { mime: "image/png", ext: "png" };
  if (body.subarray(0, 3).equals(Buffer.from([255, 216, 255]))) return { mime: "image/jpeg", ext: "jpg" };
  if (body.length >= 12 && body.subarray(0, 4).toString() === "RIFF" && body.subarray(8, 12).toString() === "WEBP") return { mime: "image/webp", ext: "webp" };
  return null;
}

app.post("/api/uploads", uploadLimiter, requireStaff("manager"), express.raw({
  type: ["image/png", "image/jpeg", "image/webp"], limit: CFG.maxUploadBytes,
}), wrap(async (req, res) => {
  const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  if (!body.length) return fail(res, 415, "validation.imageType");
  const image = sniffImage(body);
  if (!image) return fail(res, 415, "validation.imageType");
  const filename = `${randomBytes(18).toString("hex")}.${image.ext}`;
  const { error } = await supabaseDb.storage.from("menu-images").upload(filename, body, {
    contentType: image.mime,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error?.message.toLowerCase().includes("already exists")) return fail(res, 409, "upload.retry");
  if (error) throw error;
  const publicUrl = supabaseDb.storage.from("menu-images").getPublicUrl(filename).data.publicUrl;
  const staff = authStaff(req);
  logActivity(staff.username, staff.role, `image uploaded ${filename}`);
  ok(res, { url: publicUrl, mime: image.mime }, 201);
}));

/* ── order creation / hosted checkout ──────────────────────────────────── */
function validateDeliveryAddress(type: "pickup" | "delivery", address?: string): void {
  if (type !== "delivery") return;
  if (!address || address.length > 200) throw new Error("order.addressRequired");
  const postcode = address.match(/\b(\d{5})\b/)?.[1];
  if (!postcode || !postcode.startsWith("70")) throw new Error("order.postcode");
}

function helsinkiIso(date: string, time: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute);
  const localParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Helsinki", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(utcGuess));
  const part = (type: string) => Number(localParts.find((entry) => entry.type === type)?.value ?? 0);
  const localAsUtc = Date.UTC(part("year"), part("month") - 1, part("day"), part("hour"), part("minute"));
  return new Date(utcGuess - (localAsUtc - utcGuess)).toISOString();
}

function nextDate(date: string): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
}

async function createPendingOrder(req: Request, body: z.infer<typeof customerOrderSchema>): Promise<{ order: Order; settings: Settings }> {
  const auth = currentAuth(req);
  const customer = authUser(req);
  if (!auth || !customer) throw new Error("auth.required");
  validateDeliveryAddress(body.type, body.address);
  const settings = await loadSettings();
  const priced = await validateOrder(settings, { type: body.type, lines: body.lines as CartLine[], scheduled: body.scheduled, lang: body.lang, code: body.code });
  if (body.scheduled && settings.preorder.capacity) {
    const start = helsinkiIso(body.scheduled.date, "00:00");
    const end = helsinkiIso(nextDate(body.scheduled.date), "00:00");
    const { data, error } = await supabaseDb.from("orders").select("order_items(quantity, is_preorder)")
      .gte("scheduled_for", start).lt("scheduled_for", end).in("payment_status", ["pending", "paid"]);
    if (error) throw error;
    const reserved = (data ?? []).reduce((sum, row) => sum + (row.order_items ?? [])
      .filter((line) => line.is_preorder).reduce((qty, line) => qty + line.quantity, 0), 0);
    const requested = (body.lines as CartLine[]).filter((line) => Boolean(line.preorder)).reduce((qty, line) => qty + line.qty, 0);
    if (reserved + requested > settings.preorder.capacity) throw new Error("pre.errCapacity");
  }
  if (!body.scheduled && !openInfo(settings.hours).open) throw new Error("order.closed");
  if (body.type === "delivery" && priced.total < settings.minOrder) throw new Error("order.minOrder");
  if (priced.total <= 0) throw new Error("payment.amountInvalid");

  const order: Order = {
    id: uid("KB"), createdAt: Date.now(), type: body.type,
    customer: { name: customer.name, email: customer.email, phone: body.customer.phone || customer.phone || "" },
    address: body.type === "delivery" ? body.address : undefined, note: body.note,
    lines: priced.lines, subtotal: priced.subtotal, deliveryFee: priced.deliveryFee, discount: priced.discount,
    total: priced.total, vat: priced.vat, scheduled: body.scheduled, paymentStatus: "pending", userId: auth.sub,
  } as Order;
  const { error } = await supabaseDb.rpc("create_order", {
    p_order: {
      id: order.id,
      customer_id: auth.sub,
      type: order.type,
      subtotal: order.subtotal,
      delivery_fee: order.deliveryFee,
      discount: order.discount?.amount ?? 0,
      discount_title: order.discount?.title ?? null,
      offer_id: order.discount?.offerId ?? null,
      vat: order.vat,
      total: order.total,
      payment_status: "pending",
      payment_ref: null,
      contact_name: order.customer.name,
      contact_phone: order.customer.phone,
      contact_email: order.customer.email,
      address: order.address ?? null,
      note: order.note ?? null,
      scheduled_for: body.scheduled ? `${body.scheduled.date} ${body.scheduled.time} Europe/Helsinki` : null,
    },
    p_items: priced.lines.map((line) => ({
      menu_item_id: line.itemId,
      item_name_snapshot: line.name,
      variant_label: line.variantLabel,
      selected_toppings: line.pizza ? { included: line.pizza.included, extras: line.pizza.extras, builder: !!line.pizza.builder } : null,
      options: line.options,
      is_preorder: !!line.preorder,
      quantity: line.qty,
      unit_price: line.unitPrice,
      line_price: Math.round(line.qty * line.unitPrice * 100) / 100,
      note: line.note ?? null,
    })),
  });
  if (error) {
    if (error.message.includes("order.promoUnavailable")) throw new Error("promo.unavailable");
    throw error;
  }
  return { order, settings };
}

async function releasePromoReservation(order: Order): Promise<void> {
  if (!order.discount?.offerId) return;
  const { data, error } = await supabaseDb.from("promotions").select("used_count").eq("id", order.discount.offerId).maybeSingle();
  if (error) throw error;
  if (data && data.used_count > 0) {
    const { error: updateError } = await supabaseDb.from("promotions").update({ used_count: data.used_count - 1 }).eq("id", order.discount.offerId);
    if (updateError) throw updateError;
  }
}

const stripeClient = CFG.stripeSecretKey ? new Stripe(CFG.stripeSecretKey) : null;

app.post("/api/checkout/session", orderLimiter, requireCustomer, wrap(async (req, res) => {
  const body = customerOrderSchema.parse(req.body);
  if (!stripeClient) {
    if (!CFG.allowDemoPayments) return fail(res, 503, "payment.unavailable");
    const created = await createPendingOrder(req, body);
    const demo = { ...created.order, paymentStatus: "demo_paid" } as Order;
    const { error } = await supabaseDb.from("orders").update({ payment_status: "paid", payment_ref: `demo:${randomBytes(8).toString("hex")}` }).eq("id", demo.id);
    if (error) throw error;
    ok(res, { mode: "demo", order: { ...demo, status: orderStatus(demo) } });
    return;
  }
  const created = await createPendingOrder(req, body);
  try {
    const session = await stripeClient.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "eur",
          product_data: { name: `Kuopio Bites order ${created.order.id}` },
          unit_amount: Math.round(created.order.total * 100),
        },
        quantity: 1,
      }],
      customer_email: created.order.customer.email,
      metadata: { order_id: created.order.id, amount_eur: created.order.total.toFixed(2) },
      success_url: `${CFG.publicWebUrl}/track/${created.order.id}?payment=success`,
      cancel_url: `${CFG.publicWebUrl}/order?payment=cancelled`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    });
    const { error } = await supabaseDb.from("orders").update({ payment_ref: session.id }).eq("id", created.order.id);
    if (error) throw error;
    ok(res, { mode: "stripe", url: session.url, sessionId: session.id, orderId: created.order.id });
  } catch (error) {
    const { error: deleteError } = await supabaseDb.from("orders").delete().eq("id", created.order.id);
    if (deleteError) throw deleteError;
    await releasePromoReservation(created.order);
    throw error;
  }
}));

/* Direct order creation is retained only for an explicitly local demo. A real
   deployment must use /api/checkout/session and the signed webhook below. */
app.post("/api/orders", orderLimiter, requireCustomer, wrap(async (req, res) => {
  if (!CFG.allowDemoPayments) return fail(res, 503, "payment.required");
  const body = customerOrderSchema.parse(req.body);
  const created = await createPendingOrder(req, body);
  const order = { ...created.order, paymentStatus: "demo_paid" } as Order;
  const { error } = await supabaseDb.from("orders").update({ payment_status: "paid", payment_ref: `demo:${randomBytes(8).toString("hex")}` }).eq("id", order.id);
  if (error) throw error;
  ok(res, { ...order, status: orderStatus(order) }, 201);
}));

function withStatus(order: Order) {
  return { ...order, status: orderStatus(order) };
}

app.get("/api/orders", requireStaff("kitchen"), wrap(async (_req, res) => {
  const orders = await listOrders(300);
  ok(res, orders
    .filter((order) => order.paymentStatus === "paid" || order.paymentStatus === "demo_paid")
    .map((order) => ({ ...order, status: orderStatus(order) })));
}));

app.get("/api/orders/:id", wrap(async (req, res) => {
  const id = paramId.parse(req.params.id);
  const auth = currentAuth(req);
  const order = await getOrder(id);
  if (!order) return fail(res, 404, "order.notFound");
  const isOwner = auth?.scope === "customer" && auth.sub === order.userId;
  const isStaff = auth?.scope === "staff" && Boolean(await staffById(auth.sub));
  if (!isOwner && !isStaff) return fail(res, 403, "auth.forbidden");
  ok(res, withStatus(order));
}));

app.patch("/api/orders/:id/status", requireStaff("kitchen"), wrap(async (req, res) => {
  const id = paramId.parse(req.params.id);
  const b = statusSchema.parse(req.body);
  const order = await getOrder(id);
  if (!order) return fail(res, 404, "order.notFound");
  if (order.paymentStatus !== "paid" && order.paymentStatus !== "demo_paid") return fail(res, 400, "payment.notPaid");
  const { error } = await supabaseDb.from("orders").update({ status: b.status }).eq("id", id);
  if (error) throw error;
  order.statusOverride = b.status;
  const staff = authStaff(req);
  logActivity(staff.username, staff.role, `order ${id} -> ${b.status}`);
  ok(res, { ...order, status: b.status });
}));

app.post("/api/orders/:id/refund", requireStaff("manager"), wrap(async (req, res) => {
  const id = paramId.parse(req.params.id);
  const order = await getOrder(id);
  if (!order) return fail(res, 404, "order.notFound");
  if (order.refunded) return ok(res, order);
  if (order.paymentStatus === "demo_paid" && CFG.allowDemoPayments) {
    order.refunded = true; order.paymentStatus = "refunded"; order.statusOverride = "completed";
  } else {
    if (!stripeClient || !order.paymentId) return fail(res, 503, "payment.unavailable");
    await stripeClient.refunds.create({ payment_intent: order.paymentId }, { idempotencyKey: `refund-${id}` });
    order.refunded = true; order.paymentStatus = "refunded"; order.statusOverride = "completed";
  }
  const { error } = await supabaseDb.from("orders").update({ payment_status: "refunded", status: "completed" }).eq("id", id);
  if (error) throw error;
  const staff = authStaff(req);
  logActivity(staff.username, staff.role, `order ${id} refunded`);
  ok(res, order);
}));

/* ── Stripe webhook: HMAC verification, idempotence, amount re-check ───── */
function verifyStripeSignature(payload: Buffer, header: string, secret: string): boolean {
  const pieces = Object.fromEntries(header.split(",").map((part) => part.split("=", 2) as [string, string]));
  const timestamp = Number(pieces.t);
  const received = pieces.v1 || "";
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 300 || !/^[a-f0-9]{64}$/i.test(received)) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload.toString("utf8")}`).digest("hex");
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(received, "hex"));
}

async function handleStripeWebhook(req: Request, res: Response): Promise<void> {
  if (!CFG.stripeWebhookSecret) return void fail(res, 503, "payment.webhookUnavailable");
  const signature = req.headers["stripe-signature"];
  const body = Buffer.isBuffer(req.body) ? req.body : Buffer.from("");
  if (typeof signature !== "string" || !verifyStripeSignature(body, signature, CFG.stripeWebhookSecret)) return void fail(res, 400, "payment.invalidSignature");
  let event: any;
  try { event = JSON.parse(body.toString("utf8")); } catch { return void fail(res, 400, "payment.invalidEvent"); }
  if (!event?.id || typeof event.type !== "string") return void fail(res, 400, "payment.invalidEvent");
  const { error: eventError } = await supabaseDb.from("stripe_events").insert({ event_id: event.id });
  if (eventError?.code === "23505") return void ok(res, { received: true, duplicate: true });
  if (eventError) throw eventError;
  try {
    const handledSuccess = event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded";
    const handledFailure = event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed";
    if (!handledSuccess && !handledFailure) return void ok(res, { received: true });
    const session = event.data?.object;
    const orderId = session?.metadata?.order_id;
    if (typeof orderId !== "string") return void ok(res, { received: true });
    const order = await getOrder(orderId);
    if (!order) return void ok(res, { received: true });
    if (handledFailure) {
      const { error } = await supabaseDb.from("orders").delete().eq("id", orderId);
      if (error) throw error;
      await releasePromoReservation(order);
      return void ok(res, { received: true });
    }
    const amountMatches = Number(session.amount_total) === Math.round(order.total * 100) && session.currency === "eur";
    if (!amountMatches) {
      await releasePromoReservation(order);
      logActivity("stripe-webhook", "security", `amount mismatch for order ${orderId}`);
      return void fail(res, 400, "payment.amountMismatch");
    }
    const paymentRef = typeof session.payment_intent === "string" ? session.payment_intent : order.checkoutSessionId;
    const { error } = await supabaseDb.from("orders").update({ payment_status: "paid", payment_ref: paymentRef }).eq("id", orderId);
    if (error) throw error;
    ok(res, { received: true });
  } catch (error) {
    await supabaseDb.from("stripe_events").delete().eq("event_id", event.id);
    throw error;
  }
}

/* ── reservations ─────────────────────────────────────────────────────── */
app.post("/api/reservations", resvLimiter, wrap(async (req, res) => {
  const body = reservationSchema.parse(req.body);
  const settings = await loadSettings();
  if (settings.blockedDates.includes(body.date)) return fail(res, 400, "resv.blockedDate");
  if (settings.blockedSlots.includes(`${body.date}T${body.time}`)) return fail(res, 400, "resv.blockedSlot");
  const reservation: Reservation = { ...body, id: uid("R"), createdAt: Date.now(), status: "pending" };
  const { error } = await supabaseDb.from("reservations").insert({
    id: reservation.id,
    customer_id: currentAuth(req)?.scope === "customer" ? currentAuth(req)?.sub : null,
    date: reservation.date,
    time: reservation.time,
    party_size: reservation.party,
    contact_name: reservation.name,
    contact_phone: reservation.phone,
    contact_email: reservation.email ?? null,
    note: reservation.note ?? null,
    status: reservation.status,
  });
  if (error) throw error;
  ok(res, reservation, 201);
}));

app.get("/api/reservations", requireStaff("kitchen"), wrap(async (_req, res) => {
  const { data, error } = await supabaseDb.from("reservations").select("*").order("created_at", { ascending: false }).limit(300);
  if (error) throw error;
  ok(res, (data ?? []).map((row) => ({
    id: row.id, date: row.date, time: row.time, party: row.party_size,
    name: row.contact_name, phone: row.contact_phone, email: row.contact_email ?? undefined,
    note: row.note ?? undefined, status: row.status, createdAt: Date.parse(row.created_at),
  })));
}));

app.patch("/api/reservations/:id", requireStaff("kitchen"), wrap(async (req, res) => {
  const id = paramId.parse(req.params.id);
  const body = z.object({ status: z.enum(["pending", "accepted", "declined"]) }).strict().parse(req.body);
  const { data, error } = await supabaseDb.from("reservations").update({ status: body.status }).eq("id", id).select("*").maybeSingle();
  if (error) throw error;
  if (!data) return fail(res, 404, "resv.notFound");
  const staff = authStaff(req);
  logActivity(staff.username, staff.role, `reservation ${id} -> ${body.status}`);
  ok(res, { id: data.id, date: data.date, time: data.time, party: data.party_size, name: data.contact_name, phone: data.contact_phone, email: data.contact_email ?? undefined, note: data.note ?? undefined, status: data.status, createdAt: Date.parse(data.created_at) });
}));

app.delete("/api/reservations/:id", requireStaff("kitchen"), wrap(async (req, res) => {
  const id = paramId.parse(req.params.id);
  const { data, error } = await supabaseDb.from("reservations").delete().eq("id", id).select("id").maybeSingle();
  if (error) throw error;
  if (!data) return fail(res, 404, "resv.notFound");
  const staff = authStaff(req);
  logActivity(staff.username, staff.role, `reservation ${id} deleted`);
  ok(res, { ok: true });
}));

/* ── customer account / GDPR ───────────────────────────────────────────── */
app.get("/api/account", requireCustomer, wrap((req, res) => ok(res, publicUser(authUser(req)))));

app.put("/api/account", requireCustomer, wrap(async (req, res) => {
  const auth = currentAuth(req)!;
  const body = accountPatchSchema.parse(req.body);
  const row = authUser(req);
  const addresses = body.addresses ?? JSON.parse(row.addresses || "[]");
  const next = {
    name: body.name ?? row.name,
    phone: body.phone ?? row.phone,
    addresses,
    marketing: body.marketing ?? Boolean(row.marketing),
    favorites: Array.from(new Set(body.favorites ?? row.favorites ?? [])),
  };
  const { data, error } = await supabaseDb.from("customers").update({
    name: next.name,
    phone: next.phone,
    addresses: next.addresses,
    marketing_consent: next.marketing,
    favorites: next.favorites,
  }).eq("id", auth.sub).select("id, name, email, phone, addresses, marketing_consent, favorites, created_at").single();
  if (error) throw error;
  ok(res, publicUser({ ...data, addresses: JSON.stringify(data.addresses ?? []), marketing: data.marketing_consent ? 1 : 0, favorites: data.favorites ?? [], created_at: Date.parse(data.created_at) }));
}));

app.put("/api/account/password", requireCustomer, wrap(async (req, res) => {
  const body = passwordChangeSchema.parse(req.body);
  const row = authUser(req);
  const { error: verifyError } = await authClient().auth.signInWithPassword({ email: row.email, password: body.current });
  if (verifyError) return fail(res, 400, "auth.badCredentials");
  const { error } = await supabaseDb.auth.admin.updateUserById(currentAuth(req)!.sub, { password: body.next });
  if (error) throw error;
  /* Signing out other sessions means a stolen laptop session dies when the
     owner rotates their password. The current session stays valid. */
  const token = (req as any).accessToken as string | null;
  if (token) await supabaseDb.auth.admin.signOut(token, "others").catch(() => {});
  ok(res, { ok: true });
}));

app.get("/api/account/orders", requireCustomer, wrap(async (req, res) => {
  const auth = currentAuth(req)!;
  const orders = await listCustomerOrders(auth.sub, 50);
  ok(res, orders.map(withStatus));
}));

app.get("/api/account/export", requireCustomer, wrap(async (req, res) => {
  const profile = authUser(req);
  const orders = await listCustomerOrders(currentAuth(req)!.sub, 10000);
  ok(res, { profile: publicUser(profile), orders: orders.map(withStatus) });
}));

app.delete("/api/account", requireCustomer, wrap(async (req, res) => {
  const auth = currentAuth(req)!;
  const { error } = await supabaseDb.auth.admin.deleteUser(auth.sub);
  if (error) throw error;
  clearSessionCookies(res, { keepCsrf: true });
  ok(res, { ok: true });
}));

/* ── admin menu/settings/content ───────────────────────────────────────── */
app.post("/api/categories", requireStaff("manager"), wrap(async (req, res) => {
  const b = categoryCreateSchema.parse(req.body);
  const id = uid("cat");
  const { data: last, error: readError } = await supabaseDb.from("categories").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  if (readError) throw readError;
  const { error } = await supabaseDb.from("categories").insert({ id, name_fi: b.title, name_en: b.en ?? b.title, sort_order: (last?.sort_order ?? -1) + 1 });
  if (error?.code === "23505") return fail(res, 409, "item.exists");
  if (error) throw error;
  const staff = authStaff(req); logActivity(staff.username, staff.role, `category + ${id}`);
  ok(res, { id, title: b.title, en: b.en ?? b.title }, 201);
}));

app.put("/api/categories/:id", requireStaff("manager"), wrap(async (req, res) => {
  const id = paramId.parse(req.params.id); const b = categoryPatchSchema.parse(req.body);
  const patch = { ...(b.title !== undefined ? { name_fi: b.title } : {}), ...(b.en !== undefined ? { name_en: b.en } : {}) };
  const { data, error } = await supabaseDb.from("categories").update(patch).eq("id", id).select("id").maybeSingle();
  if (error) throw error;
  if (!data) return fail(res, 404, "item.notFound");
  const staff = authStaff(req); logActivity(staff.username, staff.role, `category ~ ${id}`); ok(res, { ok: true });
}));

app.delete("/api/categories/:id", requireStaff("manager"), wrap(async (req, res) => {
  const id = paramId.parse(req.params.id);
  const { data, error } = await supabaseDb.from("categories").delete().eq("id", id).select("id").maybeSingle();
  if (error) throw error;
  if (!data) return fail(res, 404, "item.notFound");
  const staff = authStaff(req); logActivity(staff.username, staff.role, `category - ${id}`); ok(res, { ok: true });
}));

app.post("/api/items", requireStaff("manager"), wrap(async (req, res) => {
  const m = menuItemSchema.parse(req.body) as MenuItem;
  const { data: last, error: readError } = await supabaseDb.from("menu_items").select("sort_order").eq("category_id", m.cat).order("sort_order", { ascending: false }).limit(1).maybeSingle();
  if (readError) throw readError;
  const { error } = await supabaseDb.from("menu_items").insert(toDatabaseItem(m, (last?.sort_order ?? -1) + 1));
  if (error?.code === "23505") return fail(res, 409, "item.exists");
  if (error) throw error;
  const staff = authStaff(req); logActivity(staff.username, staff.role, `item + ${m.id}`); ok(res, m, 201);
}));

app.put("/api/items/:id", requireStaff("manager"), wrap(async (req, res) => {
  const id = paramId.parse(req.params.id); const m = menuItemSchema.parse({ ...req.body, id }) as MenuItem;
  const { data: row, error: readError } = await supabaseDb.from("menu_items").select("sort_order").eq("id", id).maybeSingle();
  if (readError) throw readError;
  if (!row) return fail(res, 404, "item.notFound");
  const { error } = await supabaseDb.from("menu_items").update(toDatabaseItem(m, row.sort_order)).eq("id", id);
  if (error) throw error;
  const staff = authStaff(req); logActivity(staff.username, staff.role, `item ~ ${id}`); ok(res, m);
}));

app.delete("/api/items/:id", requireStaff("manager"), wrap(async (req, res) => {
  const id = paramId.parse(req.params.id);
  const { data, error } = await supabaseDb.from("menu_items").delete().eq("id", id).select("id").maybeSingle();
  if (error) throw error;
  if (!data) return fail(res, 404, "item.notFound");
  const staff = authStaff(req); logActivity(staff.username, staff.role, `item - ${id}`); ok(res, { ok: true });
}));

app.patch("/api/items/reorder", requireStaff("manager"), wrap(async (req, res) => {
  const b = reorderSchema.parse(req.body);
  for (const [sortOrder, id] of b.order.entries()) {
    const { error } = await supabaseDb.from("menu_items").update({ sort_order: sortOrder }).eq("id", id).eq("category_id", b.cat);
    if (error) throw error;
  }
  const staff = authStaff(req); logActivity(staff.username, staff.role, `items reordered in ${b.cat}`); ok(res, { ok: true });
}));

app.put("/api/settings", requireStaff("manager"), wrap(async (req, res) => {
  const current = await loadSettings();
  const next = settingsSchema.parse({ ...current, ...req.body, audit: current.audit }) as Settings;
  await saveSettings(next);
  const staff = authStaff(req); logActivity(staff.username, staff.role, "settings updated"); ok(res, next);
}));

app.put("/api/todays-special", requireStaff("manager"), wrap(async (req, res) => {
  const patch = specialPatchSchema.parse(req.body); const current = await loadSettings();
  const next = settingsSchema.parse({ ...current, special: patch.special ?? current.special, todaysSpecials: patch.todaysSpecials ?? current.todaysSpecials }) as Settings;
  await saveSettings(next);
  const staff = authStaff(req); logActivity(staff.username, staff.role, "today's special updated");
  ok(res, { special: next.special, todaysSpecials: next.todaysSpecials });
}));

app.get("/api/promotions", wrap(async (_req, res) => ok(res, (await loadSettings()).offers)));
app.post("/api/promotions", requireStaff("manager"), wrap(async (req, res) => {
  const current = await loadSettings();
  const patch = promotionPatchSchema.parse(req.body);
  const offer = { ...patch, id: uid("of") };
  const next = settingsSchema.parse({ ...current, offers: [...current.offers, offer] }) as Settings;
  await saveSettings(next); const staff = authStaff(req); logActivity(staff.username, staff.role, `promotion + ${offer.id}`); ok(res, offer, 201);
}));
app.put("/api/promotions/:id", requireStaff("manager"), wrap(async (req, res) => {
  const id = paramId.parse(req.params.id); const current = await loadSettings();
  const patch = promotionPatchSchema.parse(req.body);
  if (!current.offers.some((offer) => offer.id === id)) return fail(res, 404, "promo.notFound");
  const offers = current.offers.map((offer) => offer.id === id ? { ...patch, id, uses: offer.uses } : offer);
  const next = settingsSchema.parse({ ...current, offers }) as Settings; await saveSettings(next);
  const staff = authStaff(req); logActivity(staff.username, staff.role, `promotion ~ ${id}`); ok(res, offers.find((offer) => offer.id === id));
}));
app.delete("/api/promotions/:id", requireStaff("manager"), wrap(async (req, res) => {
  const id = paramId.parse(req.params.id); const current = await loadSettings();
  const next = settingsSchema.parse({ ...current, offers: current.offers.filter((offer) => offer.id !== id) }) as Settings;
  await saveSettings(next); const staff = authStaff(req); logActivity(staff.username, staff.role, `promotion - ${id}`); ok(res, { ok: true });
}));

app.put("/api/translations", requireStaff("manager"), wrap(async (req, res) => {
  const b = translationSchema.parse(req.body);
  const { data: current, error: readError } = await supabaseDb.from("translation_strings").select("value_en, value_fi").eq("key", b.key).maybeSingle();
  if (readError) throw readError;
  const { error } = await supabaseDb.from("translation_strings").upsert({
    key: b.key,
    value_en: b.lang === "en" ? b.value : current?.value_en ?? b.value,
    value_fi: b.lang === "fi" ? b.value : current?.value_fi ?? null,
  }, { onConflict: "key" });
  if (error) throw error;
  const staff = authStaff(req); logActivity(staff.username, staff.role, `translation ~ ${b.lang}:${b.key}`); ok(res, { ok: true });
}));

/* ── admin customers / marketing / analytics / append-only activity ────── */
app.get("/api/admin/newsletter", requireStaff("manager"), wrap(async (_req, res) => {
  const { data, error } = await supabaseDb.from("newsletter_subscribers").select("email, subscribed_at").order("subscribed_at", { ascending: false }).limit(10000);
  if (error) throw error;
  ok(res, data ?? []);
}));
app.delete("/api/admin/newsletter/:email", requireStaff("manager"), wrap(async (req, res) => {
  const email = newsletterSchema.parse({ email: decodeURIComponent(req.params.email) }).email.toLowerCase();
  const { error } = await supabaseDb.from("newsletter_subscribers").delete().eq("email", email);
  if (error) throw error;
  ok(res, { ok: true });
}));
app.get("/api/customers", requireStaff("manager"), wrap(async (_req, res) => {
  const { data, error } = await supabaseDb.from("customers").select("id, name, email, phone, marketing_consent, created_at").limit(10000);
  if (error) throw error;
  ok(res, (data ?? []).map((customer) => ({
    id: customer.id, name: customer.name, email: customer.email, phone: customer.phone ?? "",
    marketing: customer.marketing_consent, created_at: Date.parse(customer.created_at),
  })));
}));
app.delete("/api/customers/:id", requireStaff("owner"), wrap(async (req, res) => {
  const id = paramId.parse(req.params.id);
  const { data: customer, error: readError } = await supabaseDb.from("customers").select("id").eq("id", id).maybeSingle();
  if (readError) throw readError;
  if (!customer) return fail(res, 404, "auth.notFound");
  const { error: eraseError } = await supabaseDb.rpc("erase_customer", { p_customer_id: id });
  if (eraseError) throw eraseError;
  const { error: authError } = await supabaseDb.auth.admin.deleteUser(id);
  if (authError) throw authError;
  const staff = authStaff(req); logActivity(staff.username, staff.role, `customer erased ${id} (GDPR)`); ok(res, { ok: true });
}));
app.get("/api/analytics/summary", requireStaff("manager"), wrap(async (_req, res) => {
  const orders = await listOrders(10000);
  const revenue = orders.filter((order) => !order.refunded && ["paid", "demo_paid"].includes(String(order.paymentStatus))).reduce((sum, order) => sum + order.total, 0);
  const byItem = new Map<string, number>();
  for (const order of orders) for (const line of order.lines) byItem.set(line.name, (byItem.get(line.name) ?? 0) + line.qty);
  const { data: reservations, error } = await supabaseDb.from("reservations").select("status").eq("status", "pending").limit(10000);
  if (error) throw error;
  const pendingReservations = reservations?.length ?? 0;
  ok(res, { orders: orders.length, revenue: Math.round(revenue * 100) / 100, refunded: orders.filter((order) => order.refunded).length, topItems: [...byItem.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10), pendingReservations });
}));
app.get("/api/admin/activity", requireStaff("manager"), wrap(async (_req, res) => {
  const { data, error } = await supabaseDb.from("activity_log").select("created_at, actor_name, actor_role, action, details").order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  ok(res, (data ?? []).map((row) => ({ ts: Date.parse(row.created_at), who: row.actor_name, role: row.actor_role, msg: row.details?.message ?? row.action })));
}));

app.use("/api", (_req, res) => fail(res, 404, "route.notFound"));
app.use((_req, res) => fail(res, 404, "route.notFound"));
app.use((err: Error & { status?: number; type?: string }, req: Request, res: Response, _next: NextFunction) => {
  safeLogError((req as any).requestId || "unknown", err);
  if (err.status === 413 || err.type === "entity.too.large") return fail(res, 413, "request.tooLarge");
  /* Malformed JSON bodies (express.json rejects with a SyntaxError typed
     "entity.parse.failed") are client mistakes, not server faults: answer 400
     with a stable code instead of leaking a 500. */
  if (err.type === "entity.parse.failed" || (err instanceof SyntaxError && err.status === 400)) return fail(res, 400, "request.badBody");
  fail(res, err.message.startsWith("CORS") ? 403 : 500, err.message.startsWith("CORS") ? "cors.forbidden" : "internal");
});

app.listen(CFG.port, "0.0.0.0", () => {
  console.log(`backend listening on :${CFG.port} (origins: ${CFG.corsOrigins.join(", ")})`);
});
