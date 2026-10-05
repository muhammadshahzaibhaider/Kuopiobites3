import { chromium } from "playwright";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(String(e)));
await page.goto("http://localhost:3000/admin", { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
const inputs = page.locator("form input");
if (await inputs.count() >= 2) {
  await inputs.nth(0).fill("admin");
  await inputs.nth(1).fill("kuopio2026");
  await page.locator("form button[type=submit], form button").first().click();
  await page.waitForTimeout(2000);
}
await page.locator("aside button", { hasText: "Localization" }).last().click();
await page.waitForTimeout(2000);
const inner = page.locator("button", { hasText: /coverage|report/i }).first();
if (await inner.count()) { await inner.click(); await page.waitForTimeout(2000); }
await page.waitForTimeout(2500);
const card = page.locator("text=Menu photos missing").first();
if (await card.count()) {
  const wrap = card.locator("xpath=ancestor::*[contains(@class,'rounded')][1]");
  console.log("coverage card text:", (await wrap.innerText()).replace(/\n/g, " | "));
  await page.screenshot({ path: "tmp/shots4/coverage-0.png" });
}
console.log("pageerrors:", errs.length);
await browser.close();
