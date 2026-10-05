import { chromium } from "playwright";
const login = await fetch("http://localhost:4000/api/auth/login", {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: "testi@example.com", pass: "demo1234" }),
}).then((r) => r.json());
const tk = login.data.token;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript((d) => { localStorage.setItem("kb_token", d.token); localStorage.setItem("kb_user", JSON.stringify(d.user)); }, login.data);
const page = await ctx.newPage();
await page.goto("http://localhost:3000/menu?cat=kebab", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await page.locator("button:has-text('+')").first().click();
await page.waitForTimeout(400);
await page.locator("button:has-text('+')").first().click();
await page.waitForTimeout(600);
await page.goto("http://localhost:3000/order", { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
const phone = page.locator("input[placeholder='Phone for order updates']");
if (await phone.count() && !(await phone.inputValue())) await phone.fill("0401234567");
const addr = page.locator("input[placeholder*='postal code']");
if (await addr.count() && !(await addr.inputValue())) await addr.fill("Maaherrankatu 12, 70100, Kuopio");
const cph = page.locator("input[placeholder='Phone for the courier']");
if (await cph.count() && !(await cph.inputValue())) await cph.fill("0401234567");
await page.waitForTimeout(1200);
const total = await page.locator("dd.tabular-nums").last().textContent();
console.log("displayed total (server-priced):", total);
await page.screenshot({ path: "tmp/shots4/order-page.png" });
await page.locator("button", { hasText: "·" }).last().click();
await page.waitForTimeout(3000);
const after = await page.locator("text=KB-").first().textContent().catch(() => "no-id");
console.log("post-pay order ref:", (after || "").trim());
await page.screenshot({ path: "tmp/shots4/order-after-pay.png" });
await browser.close();
const orders = await fetch("http://localhost:4000/api/account/orders", { headers: { authorization: "Bearer " + tk } }).then((r) => r.json());
const d = orders.data;
console.log("backend receipt:", d.length, "orders; latest:", d[0].id, "€" + d[0].total, d[0].lines[0].name, "status:", d[0].status);
console.log("done");
