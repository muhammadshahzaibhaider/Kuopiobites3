// VAT display check after the 13.5 % / formula fix: order page row + server-priced amount, no order placed
import { chromium } from "playwright";
const login = await fetch("http://localhost:4000/api/auth/login", {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: "testi@example.com", pass: "demo1234" }),
}).then((r) => r.json());
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript((d) => { localStorage.setItem("kb_token", d.token); localStorage.setItem("kb_user", JSON.stringify(d.user)); }, login.data);
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://localhost:3000/menu?cat=kebab", { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
await page.locator("button:has-text('+')").first().click();
await page.waitForTimeout(400);
await page.locator("button:has-text('+')").first().click();
await page.waitForTimeout(600);
await page.goto("http://localhost:3000/order", { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
const rows = await page.locator("dl > div").allTextContents();
console.log("order summary rows:", rows.map((r) => r.replace(/\s+/g, " ").trim()));
await page.screenshot({ path: "tmp/shots4/order-vat-135.png" });
console.log("pageerrors:", errors.length, JSON.stringify(errors.map((e) => e.slice(0, 160))));
await browser.close();
