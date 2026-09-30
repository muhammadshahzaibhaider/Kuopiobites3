// Scroll-through captures: trigger whileInView reveals, then shoot sections; cart drawer; sticky bar
import { chromium } from "playwright";
import { mkdirSync } from "fs";
const BASE = "http://localhost:3000";
const out = process.argv[2] ?? "tmp/shots";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();

async function scrollThrough(page) {
  await page.evaluate(async () => {
    const h = document.body.scrollHeight;
    for (let y = 0; y < h; y += 500) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(800);
}

// home scrolled full page (desktop)
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await scrollThrough(page);
  await page.screenshot({ path: `${out}/home-scrolled-full.png`, fullPage: true });
  // mid sections
  await page.evaluate(() => window.scrollTo(0, 950));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/home-mid1.png` });
  await page.evaluate(() => window.scrollTo(0, 1900));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/home-mid2.png` });
  await page.evaluate(() => window.scrollTo(0, 2800));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/home-mid3.png` });
  await page.close();
  console.log("✓ home scrolled");
}

// cart drawer via header cart button
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE + "/menu?cat=pizza1", { waitUntil: "networkidle" });
  await page.locator("button.card-tilt").first().click();
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: /add to cart/i }).last().click().catch(() => {});
  await page.waitForTimeout(500);
  // open drawer from header
  await page.locator("header button").last().click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/cart-open.png` });
  await page.close();
  console.log("✓ cart drawer");
}

// mobile scrolled + sticky bar
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await scrollThrough(page);
  await page.evaluate(() => window.scrollTo(0, 1400));
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/home-mobile-mid.png` });
  await page.evaluate(() => window.scrollTo(0, 2600));
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/home-mobile-mid2.png` });
  await page.screenshot({ path: `${out}/home-mobile-scrolled-full.png`, fullPage: true });
  await page.close();
  console.log("✓ mobile scrolled");
}
await browser.close();
