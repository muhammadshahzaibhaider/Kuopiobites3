/**
 * Local Supabase test double (GoTrue + PostgREST subset).
 *
 * Why this exists: this sandbox cannot reach supabase.co, and the backend's
 * auth flow is entirely Supabase-backed. This mock implements exactly the
 * endpoints the backend calls on its customer/staff auth paths so the full
 * flow (register → confirm → login → lockout → forgot → reset → change →
 * logout) can be exercised end-to-end against REAL frontend + backend code.
 *
 * It is a development/testing tool only — never deploy it. Run:
 *   node scripts/mock-supabase.mjs   (listens on :4599)
 * Then point backend/.env at it:
 *   SUPABASE_URL=http://127.0.0.1:4599
 *   SUPABASE_SERVICE_ROLE_KEY=test-service-role-key
 *
 * Test hooks (not part of the Supabase API):
 *   GET  /__test__/tokens?email=…  → last confirmation/recovery tokens issued
 *   POST /__test__/config {confirmEmail:boolean} → toggle email-confirmation mode
 */
import http from "node:http";
import { randomBytes, createHash } from "node:crypto";

const PORT = Number(process.env.MOCK_PORT || 4599);
const users = new Map(); // id → auth user
const sessions = new Map(); // access_token → { userId, revoked }
const refresh = new Map(); // refresh_token → userId
const emailTokens = new Map(); // token_hash → { userId, type }
const pkceCodes = new Map(); // auth code → userId
const tables = { customers: new Map(), staff_users: new Map(), activity_log: [], categories: new Map(), menu_items: new Map(), orders: new Map(), reservations: new Map(), newsletter_subscribers: new Map(), translation_strings: new Map(), promotions: new Map(), stripe_events: new Map(), settings: new Map(), toppings: new Map(), shop_settings: new Map(), todays_special: new Map(), order_items: [] };
let confirmEmail = false;

const tok = () => randomBytes(32).toString("base64url");
const tokenHash = (raw) => createHash("sha256").update(raw).digest("hex");
const nowIso = () => new Date().toISOString();

function publicUser(u) {
  return {
    id: u.id, email: u.email, phone: u.phone ?? "",
    email_confirmed_at: u.email_confirmed_at, user_metadata: u.user_metadata ?? {},
    created_at: u.created_at, updated_at: u.created_at, aud: "authenticated", role: "authenticated",
  };
}

function issueSession(userId) {
  const access_token = tok(); const refresh_token = tok();
  sessions.set(access_token, { userId, refreshToken: refresh_token, revoked: false });
  refresh.set(refresh_token, userId);
  return { access_token, refresh_token, token_type: "bearer", expires_in: 3600 };
}

function createAuthUser({ email, password, metadata = {}, confirm = true, id }) {
  const user = {
    id: id ?? crypto.randomUUID(),
    email: String(email).trim().toLowerCase(), // GoTrue normalizes emails to lowercase
    password, email_confirmed_at: confirm ? nowIso() : null,
    user_metadata: metadata, created_at: nowIso(),
  };
  users.set(user.id, user);
  return user;
}

/* Seed one staff account so admin login is regression-testable. */
const staffAuth = createAuthUser({ email: "owner@kuopiobites.test", password: "owner-pass-123", id: crypto.randomUUID() });
tables.staff_users.set(staffAuth.id, { id: staffAuth.id, username: "owner", name: "Owner", role: "owner", active: true });

function authError(res, status, code, msg) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify({ code: status, error_code: code, msg }));
}

function bearer(req) {
  return (req.headers.authorization || "").match(/^Bearer\s+(.+)$/i)?.[1] || "";
}

/* GoTrue-style lookup: GoTrue compares emails case-insensitively. */
const userByEmail = (email) => [...users.values()].find((u) => u.email === String(email).trim().toLowerCase());

function handleGoTrue(req, res, url, body) {
  const path = url.pathname.replace(/^\/auth\/v1/, "") || "/";
  if (req.method === "POST" && path === "/signup") {
    const { email, password, data: metadata } = body;
    if (userByEmail(email)) return authError(res, 422, "user_already_exists", "User already registered");
    const user = createAuthUser({ email, password, metadata, confirm: !confirmEmail });
    /* mirrors the public.handle_new_user trigger that owns customer profiles */
    tables.customers.set(user.id, {
      id: user.id, email: user.email, name: metadata?.name ?? "", phone: metadata?.phone ?? null,
      addresses: [], marketing_consent: false, favorites: [], created_at: nowIso(), lang: "en",
    });
    if (confirmEmail) {
      const raw = `signup-${tok()}`;
      emailTokens.set(raw, { userId: user.id, type: "signup" });
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify({ user: publicUser(user) })); // no session until confirmed
    }
    return res.end(JSON.stringify({ ...issueSession(user.id), user: publicUser(user) }));
  }
  if (req.method === "POST" && path === "/token") {
    const grant = url.searchParams.get("grant_type");
    if (grant === "password") {
      const user = userByEmail(body.email || "");
      if (!user || user.password !== body.password) return authError(res, 400, "invalid_credentials", "Invalid login credentials");
      if (!user.email_confirmed_at) return authError(res, 400, "email_not_confirmed", "Email not confirmed");
      return res.end(JSON.stringify({ ...issueSession(user.id), user: publicUser(user) }));
    }
    if (grant === "refresh_token") {
      const userId = refresh.get(body.refresh_token);
      const user = userId ? users.get(userId) : null;
      if (!user) return authError(res, 400, "refresh_token_not_found", "Invalid Refresh Token");
      return res.end(JSON.stringify({ ...issueSession(user.id), user: publicUser(user) }));
    }
    if (grant === "pkce") {
      const userId = pkceCodes.get(body.auth_code);
      const user = userId ? users.get(userId) : null;
      if (!user) return authError(res, 400, "flow_state_not_found", "invalid code");
      pkceCodes.delete(body.auth_code); // single use
      return res.end(JSON.stringify({ ...issueSession(user.id), user: publicUser(user) }));
    }
    return authError(res, 400, "unsupported_grant_type", "unsupported grant_type");
  }
  if (req.method === "GET" && path === "/user") {
    const session = sessions.get(bearer(req));
    const user = session && !session.revoked ? users.get(session.userId) : null;
    if (!user) return authError(res, 403, "bad_jwt", "invalid token");
    return res.end(JSON.stringify(publicUser(user)));
  }
  if (req.method === "POST" && path === "/verify") {
    const entry = emailTokens.get(body.token_hash);
    if (!entry || entry.type !== body.type) return authError(res, 403, "otp_expired", "Token has expired or is invalid");
    emailTokens.delete(body.token_hash); // single use
    const user = users.get(entry.userId);
    if (entry.type === "signup" || entry.type === "email") user.email_confirmed_at = nowIso();
    return res.end(JSON.stringify({ ...issueSession(user.id), user: publicUser(user) }));
  }
  if (req.method === "POST" && path === "/recover") {
    const user = userByEmail(body.email || "");
    /* GoTrue answers 200 even for unknown emails to avoid enumeration. */
    if (user) {
      const raw = `recovery-${tok()}`;
      emailTokens.set(raw, { userId: user.id, type: "recovery" });
    }
    return res.end(JSON.stringify({}));
  }
  if (req.method === "POST" && path === "/resend") return res.end(JSON.stringify({}));
  if (req.method === "POST" && path === "/logout") {
    /* GoTrue revokes the whole session (access + refresh) on sign-out. */
    const scope = url.searchParams.get("scope") || "global";
    const me = sessions.get(bearer(req));
    const currentToken = body?.jwt ?? bearer(req);
    const userId = me?.userId ?? (() => { const j = body?.jwt && sessions.get(body.jwt); return j?.userId; })();
    if (userId) {
      for (const [token, s] of sessions) {
        if (s.userId !== userId) continue;
        /* "others" keeps the session identified by the passed jwt alive —
           real GoTrue compares against the jwt claim, not the admin credential. */
        const matches = scope === "global" || (scope === "others" && token !== currentToken) || (scope === "local" && token === currentToken);
        if (matches) { s.revoked = true; refresh.delete(s.refreshToken); }
      }
    }
    res.writeHead(204); return res.end();
  }
  if (path.startsWith("/admin/users")) {
    const id = decodeURIComponent(path.split("/").pop() || "");
    const user = users.get(id);
    if (req.method === "GET") {
      if (!user) return authError(res, 404, "user_not_found", "User not found");
      return res.end(JSON.stringify(publicUser(user)));
    }
    if (req.method === "PUT") {
      if (!user) return authError(res, 404, "user_not_found", "User not found");
      if (body.password) user.password = body.password;
      if (body.email) user.email = String(body.email).trim().toLowerCase();
      if (body.email_confirm) user.email_confirmed_at = user.email_confirmed_at ?? nowIso();
      if (body.user_metadata) user.user_metadata = { ...user.user_metadata, ...body.user_metadata };
      return res.end(JSON.stringify(publicUser(user)));
    }
    if (req.method === "DELETE") {
      users.delete(id); tables.customers.delete(id);
      return res.end(JSON.stringify({}));
    }
  }
  authError(res, 404, "not_found", `mock gotrue: unhandled ${req.method} ${path}`);
}

/* Minimal PostgREST: eq/ilike/in filters, insert/patch/delete, maybeSingle. */
function handleRest(req, res, url, body) {
  const table = url.pathname.replace(/^\/rest\/v1\//, "").split("?")[0];
  const store = tables[table];
  if (table === "rpc") { res.writeHead(404, { "content-type": "application/json" }); return res.end("{}"); }
  if (!store) { res.writeHead(200, { "content-type": "application/json" }); return res.end("[]"); }
  const wantsObject = String(req.headers.accept || "").includes("pgrst.object+json");
  const rows = [...(store instanceof Map ? store.values() : store)];
  /* PostgREST embeds child resources in select "*, children(*)": */
  if (table === "orders") for (const row of rows) row.order_items = tables.order_items.filter((it) => it.order_id === row.id);
  const filtered = rows.filter((row) => {
    for (const [key, raw] of url.searchParams) {
      if (["select", "limit", "order", "offset"].includes(key)) continue;
      const m = String(raw).match(/^(eq|ilike|in|gte|lt)\.(.+)$/s);
      if (!m) continue;
      const [, op, value] = m;
      const cell = row[key];
      if (op === "eq" && String(cell) !== value) return false;
      if (op === "ilike" && !String(cell ?? "").toLowerCase().includes(value.replace(/[%*]/g, "").toLowerCase())) return false;
      if (op === "in" && !value.replace(/[()]/g, "").split(",").includes(String(cell))) return false;
      if (op === "gte" && !(cell >= value)) return false;
      if (op === "lt" && !(cell < value)) return false;
    }
    return true;
  });
  const sendRows = (list) => {
    if (wantsObject) {
      if (!list.length) { res.writeHead(406, { "content-type": "application/json" }); return res.end(JSON.stringify({ code: "PGRST116", message: "0 rows" })); }
      return res.end(JSON.stringify(list[0]));
    }
    const limit = Number(url.searchParams.get("limit") || list.length || 1);
    res.end(JSON.stringify(list.slice(0, limit)));
  };
  if (req.method === "GET") { res.writeHead(200, { "content-type": "application/json" }); return sendRows(filtered); }
  if (req.method === "POST") {
    const items = (Array.isArray(body) ? body : [body]).map((item) => ({ created_at: nowIso(), ...item }));
    if (Array.isArray(store)) store.push(...items);
    else for (const item of items) store.set(item.id ?? item.email ?? crypto.randomUUID(), { id: "row", ...item });
    res.writeHead(201, { "content-type": "application/json" });
    return sendRows(items);
  }
  if (req.method === "PATCH") {
    for (const row of filtered) Object.assign(row, body);
    res.writeHead(200, { "content-type": "application/json" });
    const preferRep = String(req.headers.prefer || "").includes("return=representation");
    return sendRows(preferRep ? filtered : []);
  }
  if (req.method === "DELETE") {
    for (const row of filtered) if (store instanceof Map) store.delete(row.id ?? row.email); else store.splice(store.indexOf(row), 1);
    res.writeHead(200, { "content-type": "application/json" });
    return sendRows(filtered);
  }
  res.writeHead(405); res.end();
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    let body = {};
    try { body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {}; } catch { body = {}; }
    res.setHeader("content-type", "application/json");
    if (url.pathname.startsWith("/auth/v1")) return handleGoTrue(req, res, url, body);
    if (url.pathname.startsWith("/rest/v1")) {
      /* Stored procedures the backend calls (SQL versions live in supabase/migrations). */
      if (url.pathname.startsWith("/rest/v1/rpc/create_order")) {
        const o = body?.p_order, items = body?.p_items ?? [];
        if (!o?.id) { res.writeHead(400, { "content-type": "application/json" }); return res.end(JSON.stringify({ code: "PGRST202", message: "missing p_order" })); }
        tables.orders.set(o.id, { created_at: nowIso(), status: "pending", ...o });
        for (const item of items) tables.order_items.push({ id: crypto.randomUUID(), order_id: o.id, created_at: nowIso(), ...item });
        res.writeHead(200, { "content-type": "application/json" });
        return res.end("null");
      }
      if (url.pathname.startsWith("/rest/v1/rpc/erase_customer")) {
        const id = body?.p_customer_id;
        tables.customers.delete(id);
        for (const [oid, row] of tables.orders) if (row.customer_id === id) tables.orders.delete(oid);
        const kept = tables.orders;
        tables.order_items = tables.order_items.filter((it) => kept.has(it.order_id));
        res.writeHead(200, { "content-type": "application/json" });
        return res.end("null");
      }
      /* PostgREST insert into Map-backed tables */
      if (req.method === "POST" && !url.pathname.startsWith("/rest/v1/rpc")) {
        const table = url.pathname.replace("/rest/v1/", "");
        const store = tables[table];
        if (store instanceof Map) {
          const items = Array.isArray(body) ? body : [body];
          const upsert = String(req.headers.prefer || "").includes("resolution=merge-duplicates");
          for (const item of items) {
            const key = item.id ?? item.email ?? item.key ?? item.event_id;
            if (!upsert && store.has(key)) { res.writeHead(409, { "content-type": "application/json" }); return res.end(JSON.stringify({ code: "23505", message: "duplicate key" })); }
            store.set(key, { created_at: nowIso(), ...item });
          }
          res.writeHead(201, { "content-type": "application/json" });
          const wantsObject = String(req.headers.accept || "").includes("pgrst.object+json");
          return res.end(JSON.stringify(wantsObject ? items[0] : items));
        }
      }
      return handleRest(req, res, url, body);
    }
    if (url.pathname === "/__test__/tokens") {
      const email = String(url.searchParams.get("email") || "").toLowerCase();
      const user = userByEmail(email);
      const out = user ? [...emailTokens.entries()].filter(([, v]) => v.userId === user.id).map(([t, v]) => ({ token: t, type: v.type })) : [];
      return res.end(JSON.stringify(out));
    }
    if (url.pathname === "/__test__/config" && req.method === "POST") {
      if (typeof body.confirmEmail === "boolean") confirmEmail = body.confirmEmail;
      return res.end(JSON.stringify({ confirmEmail }));
    }
    if (url.pathname === "/__test__/issue-code" && req.method === "POST") {
      const user = userByEmail(body.email || "");
      if (!user) { res.writeHead(404); return res.end("{}"); }
      const code = `pkce-${tok()}`;
      pkceCodes.set(code, user.id);
      return res.end(JSON.stringify({ code }));
    }
    res.writeHead(404); res.end(JSON.stringify({ error: "mock: not found", path: url.pathname }));
  });
});

server.listen(PORT, "0.0.0.0", () => console.log(`mock supabase on :${PORT} (confirmEmail=${confirmEmail})`));
