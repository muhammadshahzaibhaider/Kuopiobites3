import { chromium } from "playwright";
const BASE = "http://localhost:3000";
const out = "tmp/shots1";
const browser = await chromium.launch();
const run = async (name, fn) => { try { await fn(); console.log("✓", name); } catch (e) { console.log("✗", name, e.message.split("\n")[0]); } };

await run("home-mids", async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.evaluate(async () => { const h = document.body.scrollHeight; for (let y = 0; y < h; y += 500) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 110)); } });
  for (const [n, y] of [["home-mid1", 950], ["home-mid2", 1900], ["home-mid3", 2800], ["home-mid4", 3700]]) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${out}/${n}.png` });
  }
  await page.close();
});

await run("cart-open", async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE + "/menu?cat=pizza1", { waitUntil: "networkidle" });
  await page.locator("button.card-tilt").first().click();
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: /add to cart/i }).last().click();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: /open cart/i }).click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/cart-open.png` });
  await page.close();
});

await run("mobile-mids", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.evaluate(async () => { const h = document.body.scrollHeight; for (let y = 0; y < h; y += 400) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 100)); } });
  for (const [n, y] of [["home-mobile-mid", 1500], ["home-mobile-mid2", 3000]]) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${out}/${n}.png` });
  }
  await page.close();
});
await browser.close();
