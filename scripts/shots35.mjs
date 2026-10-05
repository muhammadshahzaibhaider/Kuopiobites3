// Hydration check: full page loads with a saved cart must not throw React #418/#423,
// and the saved cart must still appear (badge/order page) after load.
import { chromium } from "playwright";
const login = await fetch("http://localhost:4000/api/auth/login", { method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: "testi@example.com", pass: "demo1234" }) }).then((r) => r.json());
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript((d) => { localStorage.setItem("kb_token", d.token); localStorage.setItem("kb_user", JSON.stringify(d.user)); }, login.data);
const page = await ctx.newPage();
let errs = [], total = 0;
page.on("pageerror", (e) => errs.push(e.message.match(/error #(\d+)/)?.[1] ?? e.message.slice(0, 80)));
const step = (n) => { total += errs.length; console.log(n.padEnd(36), "pageerrors:", errs.length, errs.join(",")); errs = []; };
await page.goto("http://localhost:3000/menu?cat=kebab", { waitUntil: "networkidle" }); await page.waitForTimeout(1200); step("menu load");
await page.locator("button:has-text('+')").first().click(); await page.waitForTimeout(400);
await page.locator("button:has-text('+')").first().click(); await page.waitForTimeout(600); step("add 2 items");
for (const p of ["/order", "/", "/menu?cat=kebab", "/dining"]) {
  await page.goto("http://localhost:3000" + p, { waitUntil: "networkidle" }); await page.waitForTimeout(1500);
  step(`full load ${p} (cart saved)`);
}
await page.goto("http://localhost:3000/order", { waitUntil: "networkidle" }); await page.waitForTimeout(2000);
const rows = (await page.locator("dl > div").allTextContents()).map((r) => r.replace(/\s+/g, " ").trim());
console.log("order summary after reload:", rows.slice(0, 4).join(" | "));
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("kb_cart") || "[]").reduce((a, l) => a + l.qty, 0));
console.log("cart qty persisted in localStorage:", saved);
await page.screenshot({ path: "tmp/shots4/order-after-reload.png" });
step("order page again");
console.log("TOTAL pageerrors:", total);
await browser.close();
