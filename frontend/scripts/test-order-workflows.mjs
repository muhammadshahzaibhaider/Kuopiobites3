/** Built Next application in Chromium. All API responses and customer data are local fixtures. */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { setTimeout as sleep } from "node:timers/promises";
import next from "next";
import { chromium } from "playwright";
import { DEFAULT_SETTINGS } from "../src/lib/hours.ts";

const app = next({ dev: false, hostname: "127.0.0.1" });
await app.prepare();
const server = createServer(app.getRequestHandler());
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = "http://127.0.0.1:" + server.address().port;
const user = { id: "fixture-user", name: "Fixture", email: "fixture@example.invalid", phone: "0400000000", addresses: [], favorites: [] };
const line = { key: "fixture", itemId: "fixture", name: "Fixture pizza", qty: 1, unitPrice: 10, options: [] };
const ticket = { id: "KB-browser", createdAt: Date.now(), type: "pickup", lines: [line], total: 10, subtotal: 10, deliveryFee: 0,
  vat: 1.19, customer: user, status: "placed", paymentStatus: "paid" };
let browser;
async function until(check) {
  const end = Date.now() + 8000;
  while (!check()) { if (Date.now() > end) assert.fail("Timed out waiting for the fixture request"); await sleep(30); }
}
try {
  browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    args: ["--autoplay-policy=user-gesture-required"],
  });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));
  let confirmed = false, staff = false, cartDeletes = 0, confirmations = 0, cartReads = 0;
  let status = "placed", estimateCalls = 0, settingsPatch, signouts = 0;
  let settings = { ...DEFAULT_SETTINGS, deliveryEnabled: true, paused: false };
  await context.route("**/*", async (route) => {
    const req = route.request(), url = new URL(req.url());
    if (url.origin !== origin) return route.abort();
    const path = url.pathname, method = req.method();
    if (!path.startsWith("/api/")) return route.continue();
    const send = (data) => route.fulfill({ json: { data } });
    const fail = (status, error) => route.fulfill({ status, json: { error } });
    if (path === "/api/auth/csrf") return send({ csrfToken: "a".repeat(40) });
    if (path === "/api/auth/session") return send(req.headers()["x-session-scope"] === "staff"
      ? { user: null, role: staff ? "manager" : null } : { user, role: null });
    if (path === "/api/auth/logout") { staff = false; signouts++; return send({ ok: true }); }
    if (path === "/api/settings") {
      if (method === "PUT") { settingsPatch = req.postDataJSON(); settings = { ...settings, ...settingsPatch.changes }; }
      return send(settings);
    }
    if (path === "/api/orders/KB-browser/confirm-return") {
      assert.equal(req.postDataJSON().sessionId, "cs_browser");
      confirmations++;
      return confirmed ? send(ticket) : route.fulfill({status:202,json:{data:{pending:true}}});
    }
    if (path === "/api/orders/KB-browser") return send({ ...ticket, status });
    if (path === "/api/orders/KB-browser/status") { status = req.postDataJSON().status; return send({ ...ticket, status }); }
    if (path === "/api/orders/KB-browser/ready-time") { estimateCalls++; return fail(503, "estimate.fixtureFailure"); }
    if (path === "/api/orders") return staff ? send([{...ticket,status}]) : fail(403, "auth.forbidden");
    if (path === "/api/reservations") return fail(503, "reservations.fixtureFailure");
    if (path === "/api/cart") { if (method === "DELETE") cartDeletes++; else cartReads++; return send([line]); }
    if (path === "/api/translations") return send({});
    if (path === "/api/analytics/report") return fail(503,"analytics.fixtureFailure");
    return send([]);
  });
  await page.goto(origin + "/track?id=KB-browser&payment=success#session_id=cs_browser");
  await page.getByRole("heading", {name: "Waiting for payment confirmation"}).waitFor();
  assert.equal(cartDeletes, 0);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  confirmed = true;
  const readsBefore = cartReads;
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await page.getByRole("heading", {name: "Order KB-browser"}).waitFor();
  await until(() => cartReads > readsBefore);
  assert.equal(cartDeletes, 0); assert.ok(confirmations >= 2);
  console.log("PASS: mobile Stripe return, pending then paid, preserves the current basket");

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate(() => sessionStorage.setItem("kb_admin", "1")); // old browser state
  await page.goto(origin + "/admin");
  await page.getByRole("button", { name: "Sign in to admin" }).waitFor();
  staff = true;
  await page.reload();
  const alert = page.getByRole("dialog", { name: "New order KB-browser" });
  await alert.waitFor();
  await alert.getByRole("button", {name:/Accept/}).click();
  await until(() => estimateCalls === 1);
  assert.equal(status, "accepted");
  await alert.waitFor({ state: "detached" });
  console.log("PASS: kitchen receives order during reservation outage and accepts despite estimate failure");

  await page.getByRole("button", {name:/Pause delivery only/}).click();
  await page.getByRole("button", {name:/Resume delivery/}).waitFor();
  assert.deepEqual(settingsPatch, { previous:{deliveryEnabled:true}, changes:{deliveryEnabled:false} });
  assert.equal(settings.paused, false);
  await page.getByRole("button", { name: "Account", exact:true }).click();
  await page.getByRole("button", { name:/Log out|Sign out/i }).click();
  await page.getByRole("button", { name:"Sign in to admin" }).waitFor();
  assert.equal(signouts,1);
  await page.reload();
  await page.getByRole("button", {name:"Sign in to admin"}).waitFor();
  assert.deepEqual(pageErrors, []);
  console.log("PASS: delivery-only toggle, persisted staff sign-out and stale-tab gate");
} finally {
  if (browser) await browser.close();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  await app.close();
}
