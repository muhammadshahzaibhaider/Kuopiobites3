import crypto from "node:crypto";

const base = process.env.SECURITY_CHECK_BASE || "http://localhost:4000";
const orderId = process.env.SECURITY_CHECK_ORDER_ID || "";
const jar = new Map();

function saveCookies(response) {
  const values = response.headers.getSetCookie?.() || [];
  for (const value of values) jar.set(value.split(";", 1)[0].split("=", 1)[0], value.split(";", 1)[0].split("=", 2)[1]);
}
function cookieHeader() { return [...jar].map(([key, value]) => `${key}=${value}`).join("; "); }
async function call(path, { method = "GET", body, staff = false, csrf = method !== "GET" } = {}) {
  if (csrf && !jar.has("kb_csrf")) await call("/api/auth/csrf", { csrf: false });
  const headers = { accept: "application/json", ...(body === undefined ? {} : { "content-type": "application/json" }), ...(staff ? { "x-session-scope": "staff" } : {}), ...(csrf && jar.has("kb_csrf") ? { "x-csrf-token": jar.get("kb_csrf") } : {}) };
  const response = await fetch(base + path, { method, headers: { ...headers, cookie: cookieHeader() }, body: body === undefined ? undefined : JSON.stringify(body) });
  saveCookies(response);
  return { status: response.status, json: await response.json().catch(() => ({})) };
}
function assert(condition, message) { if (!condition) throw new Error(message); }

const health = await call("/api/health", { csrf: false });
assert(health.status === 200, `health ${health.status}`);
const items = await call("/api/items", { csrf: false });
const item = items.json.data.find((candidate) => candidate.id === "specials-3") || items.json.data.find((candidate) => candidate.prices?.length && candidate.availability?.mode !== "preorder_only");
assert(item, "no stable test item");
const line = { key: "security-check", itemId: item.id, name: "attacker supplied name", variantLabel: item.prices[0].label, qty: 1, unitPrice: 0, options: [] };
const priced = await call("/api/cart/price", { method: "POST", body: { lines: [line], type: "pickup", lang: "en" } });
assert(priced.status === 200, `price status ${priced.status}`);
assert(priced.json.data.total > 0 && priced.json.data.total !== 0, "server accepted/took zero price");
assert(priced.json.data.lines[0].unitPrice !== 0, "client unit price was trusted");
const unknown = await call("/api/cart/price", { method: "POST", body: { lines: [{ ...line, unknown: true }], type: "pickup", lang: "en" } });
assert(unknown.status === 400 && unknown.json.error === "validation.failed", "unknown request key was accepted");

if (orderId) {
  const email = `security-check-${crypto.randomUUID()}@example.test`;
  const registered = await call("/api/auth/register", { method: "POST", body: { name: "IDOR Check", email, pass: "Correct horse battery staple!" } });
  assert(registered.status === 201, `register ${registered.status}`);
  const token = registered.json.data.devConfirmationToken;
  assert(token, "local dev confirmation token unavailable; configure SMTP or run against local development");
  const confirmed = await call("/api/auth/confirm-email", { method: "POST", body: { token } });
  assert(confirmed.status === 200, `confirm ${confirmed.status}`);
  const loggedIn = await call("/api/auth/login", { method: "POST", body: { email, pass: "Correct horse battery staple!" } });
  assert(loggedIn.status === 200, `login ${loggedIn.status}`);
  const forbidden = await call(`/api/orders/${encodeURIComponent(orderId)}`, { csrf: false });
  assert(forbidden.status === 403, `cross-customer order read returned ${forbidden.status}`);
  await call("/api/account", { method: "DELETE" });
}

console.log(JSON.stringify({ ok: true, checks: ["health", "server repricing", "strict unknown-key rejection", ...(orderId ? ["cross-customer order ownership"] : ["ownership check skipped: SECURITY_CHECK_ORDER_ID not set"])] }));
