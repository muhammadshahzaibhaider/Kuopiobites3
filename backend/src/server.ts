import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { CFG } from "./config";
import { db, getJSON, setJSON, logActivity } from "./db";
import {
  readAuth, requireCustomer, requireStaff, signCustomer, signStaff, staffRow, type TokenPayload,
} from "./auth";
import { effectiveItems, loadSettings, orderStatus, priceCart, validateOrder } from "./logic";
import type { CartLine, MenuItem, Order, Reservation, Settings, User } from "./lib/types";

const app = express();
app.use(express.json({ limit: "8mb" }));
app.use(
  cors({
    origin: (origin, cb) => {
      // same-origin tools (curl) send no origin — allow; browsers must be on the allowlist
      if (!origin || CFG.corsOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("CORS: origin not allowed"));
    },
  })
);
app.use(readAuth);

const uid = (p: string) => p + "-" + Math.random().toString(36).slice(2, 8).toUpperCase();
const ok = (res: Response, data: unknown, code = 200) => res.status(code).json({ data });
const fail = (res: Response, code: number, error: string) => res.status(code).json({ error });
const wrap =
  (fn: (req: Request, res: Response) => unknown) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await fn(req, res);
    } catch (e) {
      if (e instanceof z.ZodError)
        return fail(res, 400, "validation: " + e.issues.map((i) => i.path.join(".") + " " + i.message).join(", "));
      const msg = e instanceof Error ? e.message : "internal";
      if (msg.startsWith("avail.") || msg.startsWith("order.") || msg.startsWith("preorder."))
        return fail(res, 400, msg);
      next(e);
    }
  };

/* rate limits on abuse-prone public endpoints */
const authLimiter = rateLimit({ windowMs: 60_000, max: 10, standardHeaders: true });
const orderLimiter = rateLimit({ windowMs: 15 * 60_000, max: 30 });
const resvLimiter = rateLimit({ windowMs: 15 * 60_000, max: 20 });

/* ── health / public reads ─────────────────────────────────────────────── */
app.get("/api/health", (_req, res) => ok(res, { status: "ok", ts: Date.now() }));

app.get("/api/categories", (_req, res) =>
  ok(res, db.prepare(`SELECT id, title, en FROM categories ORDER BY sort`).all())
);

app.get("/api/items", (req, res) => {
  const rows = (
    req.query.cat
      ? db.prepare(`SELECT data FROM items WHERE cat = ? ORDER BY sort`).all(String(req.query.cat))
      : db.prepare(`SELECT data FROM items ORDER BY sort`).all()
  ) as { data: string }[];
  ok(res, rows.map((r) => JSON.parse(r.data)));
});

app.get("/api/items/:id", (req, res) => {
  const row = db.prepare(`SELECT data FROM items WHERE id = ?`).get(req.params.id) as
    | { data: string } | undefined;
  if (!row) return fail(res, 404, "item.notFound");
  ok(res, JSON.parse(row.data));
});

app.get("/api/settings", (_req, res) => {
  const s = { ...loadSettings() } as Partial<Settings>;
  delete (s as any).audit; // audit trail is staff-only (see /api/admin/activity)
  ok(res, s);
});

app.get("/api/translations", (_req, res) => {
  const rows = db.prepare(`SELECT lang, key, value FROM translations`).all() as {
    lang: string; key: string; value: string;
  }[];
  const out: Record<string, Record<string, string>> = {};
  for (const r of rows) (out[r.lang] ??= {})[r.key] = r.value;
  ok(res, out);
});

app.get("/api/todays-special", (_req, res) => {
  const s = loadSettings();
  ok(res, { special: s.special, todaysSpecials: s.todaysSpecials });
});

/* ── auth ──────────────────────────────────────────────────────────────── */
const registerSchema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email().max(120),
  pass: z.string().min(4).max(120),
  phone: z.string().max(30).optional(),
});
app.post("/api/auth/register", authLimiter, wrap((req, res) => {
  const b = registerSchema.parse(req.body);
  const exists = db.prepare(`SELECT id FROM users WHERE lower(email) = lower(?)`).get(b.email);
  if (exists) return fail(res, 409, "auth.exists");
  const u = {
    id: uid("u"), name: b.name, email: b.email, phone: b.phone ?? "",
    addresses: [], marketing: false, createdAt: Date.now(),
  };
  db.prepare(
    `INSERT INTO users (id, name, email, pass_hash, phone, addresses, marketing, created_at)
     VALUES (?, ?, ?, ?, ?, '[]', 0, ?)`
  ).run(u.id, u.name, u.email, bcrypt.hashSync(b.pass, 10), u.phone, u.createdAt);
  ok(res, { token: signCustomer(u.id, u.name), user: u }, 201);
}));

app.post("/api/auth/login", authLimiter, wrap((req, res) => {
  const b = z.object({ email: z.string().email(), pass: z.string() }).parse(req.body);
  const row = db.prepare(`SELECT * FROM users WHERE lower(email) = lower(?)`).get(b.email) as
    | (User & { pass_hash: string }) | undefined;
  if (!row || !bcrypt.compareSync(b.pass, row.pass_hash)) return fail(res, 401, "auth.badCredentials");
  const { pass_hash, ...user } = row;
  ok(res, { token: signCustomer(row.id, row.name), user });
}));

app.post("/api/auth/admin-login", authLimiter, wrap((req, res) => {
  const b = z.object({ username: z.string().max(40), password: z.string().max(120) }).parse(req.body);
  const row = staffRow(b.username);
  if (!row || !bcrypt.compareSync(b.password, row.pass_hash)) return fail(res, 401, "auth.badCredentials");
  logActivity(row.username, row.role, "staff login");
  ok(res, { token: signStaff(row.id, row.role, row.username), role: row.role });
}));

/* stateless JWTs: logout = client discards the token */
app.post("/api/auth/logout", (_req, res) => ok(res, { ok: true }));

/* ── server-side pricing (the price authority) ─────────────────────────── */
const cartSchema = z.object({
  lines: z.array(z.object({
    itemId: z.string(), qty: z.number().int().min(1).max(99),
    variantLabel: z.string(), options: z.array(z.string()).default([]),
    pizza: z.object({
      sizeLabel: z.string(), included: z.array(z.string()),
      extras: z.array(z.object({ label: z.string(), count: z.number().int().min(1).max(9) })),
      builder: z.boolean().optional(),
    }).optional(),
  })).min(1),
  type: z.enum(["pickup", "delivery"]).default("pickup"),
  lang: z.enum(["en", "fi"]).default("en"),
  code: z.string().optional(),
});
app.post("/api/cart/price", wrap((req, res) => {
  const b = cartSchema.parse(req.body);
  ok(res, priceCart(loadSettings(), b.lines as CartLine[], b.type, b.lang, b.code));
}));

/* ── orders ────────────────────────────────────────────────────────────── */
const orderSchema = z.object({
  type: z.enum(["pickup", "delivery"]),
  customer: z.object({ name: z.string().min(1), email: z.string().email(), phone: z.string().min(3) }),
  address: z.string().optional(), note: z.string().max(400).optional(),
  lines: cartSchema.shape.lines.min(1),
  total: z.number().min(0),
  scheduled: z.object({ date: z.string(), time: z.string() }).optional(),
  lang: z.enum(["en", "fi"]).optional(), code: z.string().optional(),
});
app.post("/api/orders", orderLimiter, requireCustomer, wrap((req, res) => {
  const b = orderSchema.parse(req.body);
  const auth = (req as any).auth as TokenPayload;
  const s = loadSettings();
  const priced = validateOrder(s, { ...b, lines: b.lines as CartLine[] });
  if (b.type === "delivery" && priced.total < s.minOrder) return fail(res, 400, "order.minOrder");
  const order: Order = {
    id: uid("KB"), createdAt: Date.now(), type: b.type, customer: b.customer,
    address: b.address, note: b.note, lines: priced.lines, subtotal: priced.subtotal,
    deliveryFee: priced.deliveryFee, discount: priced.discount, total: priced.total,
    vat: priced.vat, scheduled: b.scheduled, paymentId: "pi_" + Math.random().toString(36).slice(2),
    userId: auth.sub,
  };
  db.prepare(`INSERT INTO orders (id, user_id, created_at, data) VALUES (?, ?, ?, ?)`)
    .run(order.id, auth.sub, order.createdAt, JSON.stringify(order));
  if (priced.discount?.offerId) {
    const offers = s.offers.map((o) =>
      o.id === priced.discount!.offerId ? { ...o, uses: (o.uses ?? 0) + 1 } : o);
    setJSON("settings", { ...s, offers });
  }
  ok(res, { ...order, status: orderStatus(order) }, 201);
}));

const withStatus = (data: string) => {
  const o = JSON.parse(data) as Order;
  return { ...o, status: orderStatus(o) };
};

app.get("/api/orders", requireStaff("kitchen"), (req, res) => {
  const rows = db.prepare(`SELECT data FROM orders ORDER BY created_at DESC LIMIT 300`).all() as { data: string }[];
  ok(res, rows.map((r) => withStatus(r.data)));
});

app.get("/api/orders/:id", wrap((req, res) => {
  const auth = (req as any).auth as TokenPayload | null;
  const row = db.prepare(`SELECT user_id, data FROM orders WHERE id = ?`).get(req.params.id) as
    | { user_id: string; data: string } | undefined;
  if (!row) return fail(res, 404, "order.notFound");
  const isOwner = auth?.scope === "customer" && auth.sub === row.user_id;
  const isStaff = auth?.scope === "staff";
  if (!isOwner && !isStaff) return fail(res, 403, "auth.forbidden");
  ok(res, withStatus(row.data));
}));

const statusSchema = z.object({ status: z.enum(["placed", "accepted", "preparing", "ready", "completed"]) });
app.patch("/api/orders/:id/status", requireStaff("kitchen"), wrap((req, res) => {
  const b = statusSchema.parse(req.body);
  const row = db.prepare(`SELECT data FROM orders WHERE id = ?`).get(req.params.id) as { data: string } | undefined;
  if (!row) return fail(res, 404, "order.notFound");
  const o = JSON.parse(row.data) as Order;
  o.statusOverride = b.status;
  db.prepare(`UPDATE orders SET data = ? WHERE id = ?`).run(JSON.stringify(o), req.params.id);
  const auth = (req as any).auth as TokenPayload;
  logActivity(auth.name!, auth.role!, `order ${req.params.id} → ${b.status}`);
  ok(res, { ...o, status: b.status });
}));

app.post("/api/orders/:id/refund", requireStaff("manager"), wrap((req, res) => {
  const row = db.prepare(`SELECT data FROM orders WHERE id = ?`).get(req.params.id) as { data: string } | undefined;
  if (!row) return fail(res, 404, "order.notFound");
  const o = JSON.parse(row.data) as Order;
  o.refunded = true; o.statusOverride = "completed";
  db.prepare(`UPDATE orders SET data = ? WHERE id = ?`).run(JSON.stringify(o), req.params.id);
  const auth = (req as any).auth as TokenPayload;
  logActivity(auth.name!, auth.role!, `order ${req.params.id} refunded`);
  ok(res, o);
}));

/* ── reservations ─────────────────────────────────────────────────────── */
const resvSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  party: z.number().int().min(1).max(30),
  name: z.string().min(1).max(80), phone: z.string().min(3).max(30),
  email: z.string().email().optional(), note: z.string().max(400).optional(),
});
app.post("/api/reservations", resvLimiter, wrap((req, res) => {
  const b = resvSchema.parse(req.body);
  const s = loadSettings();
  if (s.blockedDates.includes(b.date)) return fail(res, 400, "resv.blockedDate");
  if (s.blockedSlots.includes(`${b.date}T${b.time}`)) return fail(res, 400, "resv.blockedSlot");
  const r: Reservation = { ...b, id: uid("R"), createdAt: Date.now(), status: "pending" };
  db.prepare(`INSERT INTO reservations (id, created_at, data) VALUES (?, ?, ?)`)
    .run(r.id, r.createdAt, JSON.stringify(r));
  ok(res, r, 201);
}));

app.get("/api/reservations", requireStaff("kitchen"), (_req, res) => {
  const rows = db.prepare(`SELECT data FROM reservations ORDER BY created_at DESC LIMIT 300`).all() as { data: string }[];
  ok(res, rows.map((r) => JSON.parse(r.data)));
});

app.patch("/api/reservations/:id", requireStaff("kitchen"), wrap((req, res) => {
  const b = z.object({ status: z.enum(["pending", "accepted", "declined"]) }).parse(req.body);
  const row = db.prepare(`SELECT data FROM reservations WHERE id = ?`).get(req.params.id) as { data: string } | undefined;
  if (!row) return fail(res, 404, "resv.notFound");
  const r = { ...JSON.parse(row.data), status: b.status } as Reservation;
  db.prepare(`UPDATE reservations SET data = ? WHERE id = ?`).run(JSON.stringify(r), req.params.id);
  const auth = (req as any).auth as TokenPayload;
  logActivity(auth.name!, auth.role!, `reservation ${req.params.id} → ${b.status}`);
  ok(res, r);
}));

app.delete("/api/reservations/:id", requireStaff("kitchen"), wrap((req, res) => {
  db.prepare(`DELETE FROM reservations WHERE id = ?`).run(req.params.id);
  const auth = (req as any).auth as TokenPayload;
  logActivity(auth.name!, auth.role!, `reservation ${req.params.id} deleted`);
  ok(res, { ok: true });
}));

/* ── customer account (GDPR export / update / erase) ───────────────────── */
app.put("/api/account", requireCustomer, wrap((req, res) => {
  const auth = (req as any).auth as TokenPayload;
  const b = z.object({
    name: z.string().min(1).max(80).optional(), phone: z.string().max(30).optional(),
    addresses: z.array(z.string().max(160)).max(6).optional(), marketing: z.boolean().optional(),
  }).parse(req.body);
  const row = db.prepare(`SELECT * FROM users WHERE id = ?`).get(auth.sub) as any;
  if (!row) return fail(res, 404, "auth.notFound");
  const next = {
    name: b.name ?? row.name, phone: b.phone ?? row.phone,
    addresses: b.addresses ? JSON.stringify(b.addresses) : row.addresses,
    marketing: b.marketing === undefined ? row.marketing : b.marketing ? 1 : 0,
  };
  db.prepare(`UPDATE users SET name = ?, phone = ?, addresses = ?, marketing = ? WHERE id = ?`)
    .run(next.name, next.phone, next.addresses, next.marketing, auth.sub);
  ok(res, { id: auth.sub, name: next.name, phone: next.phone, addresses: b.addresses ?? JSON.parse(row.addresses), marketing: !!next.marketing });
}));

app.get("/api/account/export", requireCustomer, wrap((req, res) => {
  const auth = (req as any).auth as TokenPayload;
  const row = db.prepare(`SELECT * FROM users WHERE id = ?`).get(auth.sub) as any;
  if (!row) return fail(res, 404, "auth.notFound");
  const orders = (db.prepare(`SELECT data FROM orders WHERE user_id = ?`).all(auth.sub) as { data: string }[])
    .map((r) => withStatus(r.data));
  delete row.pass_hash;
  ok(res, { profile: row, addresses: JSON.parse(row.addresses), orders });
}));

app.delete("/api/account", requireCustomer, wrap((req, res) => {
  const auth = (req as any).auth as TokenPayload;
  db.prepare(`DELETE FROM users WHERE id = ?`).run(auth.sub); // GDPR erase; orders keep denormalized contact
  ok(res, { ok: true });
}));

/* ── admin: menu CRUD ──────────────────────────────────────────────────── */
const auth2 = () => (req: Request) => (req as any).auth as TokenPayload;

app.post("/api/categories", requireStaff("manager"), wrap((req, res) => {
  const b = z.object({ title: z.string().min(1).max(60), en: z.string().max(60).optional() }).parse(req.body);
  const id = "cat-" + Math.random().toString(36).slice(2, 7);
  const max = (db.prepare(`SELECT MAX(sort) m FROM categories`).get() as { m: number | null }).m ?? -1;
  db.prepare(`INSERT INTO categories (id, title, en, sort) VALUES (?, ?, ?, ?)`).run(id, b.title, b.en ?? b.title, max + 1);
  logActivity(auth2()(req).name!, auth2()(req).role!, `category + ${id}`);
  ok(res, { id, title: b.title, en: b.en }, 201);
}));

app.put("/api/categories/:id", requireStaff("manager"), wrap((req, res) => {
  const b = z.object({ title: z.string().min(1).max(60).optional(), en: z.string().max(60).optional() }).parse(req.body);
  db.prepare(`UPDATE categories SET title = COALESCE(?, title), en = COALESCE(?, en) WHERE id = ?`)
    .run(b.title ?? null, b.en ?? null, req.params.id);
  logActivity(auth2()(req).name!, auth2()(req).role!, `category ~ ${req.params.id}`);
  ok(res, { ok: true });
}));

app.delete("/api/categories/:id", requireStaff("manager"), wrap((req, res) => {
  db.prepare(`DELETE FROM categories WHERE id = ?`).run(req.params.id);
  logActivity(auth2()(req).name!, auth2()(req).role!, `category - ${req.params.id}`);
  ok(res, { ok: true });
}));

const itemSchema = z.object({
  id: z.string().min(1).max(60), cat: z.string().min(1).max(40),
  name: z.string().min(1).max(80), prices: z.array(z.object({ label: z.string(), value: z.number().min(0) })).min(1),
}).passthrough();
app.post("/api/items", requireStaff("manager"), wrap((req, res) => {
  const m = itemSchema.parse(req.body) as unknown as MenuItem;
  const max = (db.prepare(`SELECT MAX(sort) m FROM items WHERE cat = ?`).get(m.cat) as { m: number | null }).m ?? -1;
  db.prepare(`INSERT INTO items (id, cat, sort, data) VALUES (?, ?, ?, ?)`)
    .run(m.id, m.cat, max + 1, JSON.stringify(m));
  logActivity(auth2()(req).name!, auth2()(req).role!, `item + ${m.id}`);
  ok(res, m, 201);
}));

app.put("/api/items/:id", requireStaff("manager"), wrap((req, res) => {
  const m = itemSchema.parse({ ...req.body, id: req.params.id }) as unknown as MenuItem;
  const row = db.prepare(`SELECT sort FROM items WHERE id = ?`).get(req.params.id) as { sort: number } | undefined;
  if (!row) return fail(res, 404, "item.notFound");
  db.prepare(`UPDATE items SET cat = ?, sort = ?, data = ? WHERE id = ?`)
    .run(m.cat, row.sort, JSON.stringify(m), req.params.id);
  logActivity(auth2()(req).name!, auth2()(req).role!, `item ~ ${m.id}`);
  ok(res, m);
}));

app.delete("/api/items/:id", requireStaff("manager"), wrap((req, res) => {
  db.prepare(`DELETE FROM items WHERE id = ?`).run(req.params.id);
  logActivity(auth2()(req).name!, auth2()(req).role!, `item - ${req.params.id}`);
  ok(res, { ok: true });
}));

app.patch("/api/items/reorder", requireStaff("manager"), wrap((req, res) => {
  const b = z.object({ cat: z.string(), order: z.array(z.string()).min(1) }).parse(req.body);
  const stmt = db.prepare(`UPDATE items SET sort = ? WHERE id = ? AND cat = ?`);
  const tx = db.transaction(() => b.order.forEach((id, i) => stmt.run(i, id, b.cat)));
  tx();
  const a = auth2()(req);
  logActivity(a.name!, a.role!, `items reordered in ${b.cat}`);
  ok(res, { ok: true });
}));

/* ── admin: settings / specials / promotions / translations ───────────── */
app.put("/api/settings", requireStaff("manager"), wrap((req, res) => {
  const s = loadSettings();
  const next = { ...s, ...req.body, audit: (s as any).audit } as Settings;
  if (typeof next.paused !== "boolean" || typeof next.deliveryFee !== "number")
    return fail(res, 400, "validation: settings shape");
  setJSON("settings", next);
  const a = auth2()(req);
  logActivity(a.name!, a.role!, "settings updated");
  ok(res, next);
}));

app.put("/api/todays-special", requireStaff("manager"), wrap((req, res) => {
  const s = loadSettings();
  const next = { ...s, special: req.body.special ?? s.special, todaysSpecials: req.body.todaysSpecials ?? s.todaysSpecials };
  setJSON("settings", next);
  const a = auth2()(req);
  logActivity(a.name!, a.role!, "today's special updated");
  ok(res, { special: next.special, todaysSpecials: next.todaysSpecials });
}));

app.get("/api/promotions", (_req, res) => ok(res, loadSettings().offers));
app.post("/api/promotions", requireStaff("manager"), wrap((req, res) => {
  const s = loadSettings();
  const offer = { ...req.body, id: req.body.id || uid("of"), active: req.body.active ?? true };
  setJSON("settings", { ...s, offers: [...s.offers, offer] });
  const a = auth2()(req);
  logActivity(a.name!, a.role!, `promotion + ${offer.id}`);
  ok(res, offer, 201);
}));
app.put("/api/promotions/:id", requireStaff("manager"), wrap((req, res) => {
  const s = loadSettings();
  const offers = s.offers.map((o) => (o.id === req.params.id ? { ...o, ...req.body, id: o.id } : o));
  setJSON("settings", { ...s, offers });
  const a = auth2()(req);
  logActivity(a.name!, a.role!, `promotion ~ ${req.params.id}`);
  ok(res, offers.find((o) => o.id === req.params.id));
}));
app.delete("/api/promotions/:id", requireStaff("manager"), wrap((req, res) => {
  const s = loadSettings();
  setJSON("settings", { ...s, offers: s.offers.filter((o) => o.id !== req.params.id) });
  const a = auth2()(req);
  logActivity(a.name!, a.role!, `promotion - ${req.params.id}`);
  ok(res, { ok: true });
}));

app.put("/api/translations", requireStaff("manager"), wrap((req, res) => {
  const b = z.object({ lang: z.enum(["en", "fi"]), key: z.string().min(1), value: z.string() }).parse(req.body);
  db.prepare(`INSERT INTO translations (lang, key, value) VALUES (?, ?, ?)
    ON CONFLICT(lang, key) DO UPDATE SET value = excluded.value`).run(b.lang, b.key, b.value);
  const a = auth2()(req);
  logActivity(a.name!, a.role!, `translation ~ ${b.lang}:${b.key}`);
  ok(res, { ok: true });
}));

/* ── admin: customers / analytics / activity ───────────────────────────── */
app.get("/api/customers", requireStaff("manager"), (_req, res) => {
  const rows = db.prepare(`SELECT id, name, email, phone, marketing, created_at FROM users`).all();
  ok(res, rows);
});
app.delete("/api/customers/:id", requireStaff("owner"), wrap((req, res) => {
  db.prepare(`DELETE FROM users WHERE id = ?`).run(req.params.id);
  const a = auth2()(req);
  logActivity(a.name!, a.role!, `customer erased ${req.params.id} (GDPR)`);
  ok(res, { ok: true });
}));

app.get("/api/analytics/summary", requireStaff("manager"), (_req, res) => {
  const rows = (db.prepare(`SELECT data FROM orders`).all() as { data: string }[]).map((r) => JSON.parse(r.data) as Order);
  const revenue = rows.filter((o) => !o.refunded).reduce((a, o) => a + o.total, 0);
  const byItem = new Map<string, number>();
  for (const o of rows) for (const l of o.lines) byItem.set(l.name, (byItem.get(l.name) ?? 0) + l.qty);
  const top = [...byItem.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const pendingResv = (db.prepare(`SELECT data FROM reservations`).all() as { data: string }[])
    .filter((r) => JSON.parse(r.data).status === "pending").length;
  ok(res, {
    orders: rows.length, revenue: Math.round(revenue * 100) / 100,
    refunded: rows.filter((o) => o.refunded).length, topItems: top, pendingReservations: pendingResv,
  });
});

app.get("/api/admin/activity", requireStaff("manager"), (_req, res) => {
  ok(res, db.prepare(`SELECT ts, who, role, msg FROM activity ORDER BY id DESC LIMIT 200`).all());
});

app.use("/api", (_req, res) => fail(res, 404, "route.notFound"));
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.message);
  fail(res, err.message.startsWith("CORS") ? 403 : 500, err.message.startsWith("CORS") ? err.message : "internal");
});

app.listen(CFG.port, "0.0.0.0", () =>
  console.log(`backend listening on :${CFG.port} (origins: ${CFG.corsOrigins.join(", ")})`)
);
