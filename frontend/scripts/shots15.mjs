import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
await page.screenshot({ path: "tmp/shots4/banner-top.png" });
// find banner bottom edge in page coords, then scroll so the hand-off is mid-viewport
const edge = await page.evaluate(() => {
  const s = document.querySelector("section.bg-cream");
  return Math.round(s.getBoundingClientRect().bottom + window.scrollY);
});
console.log("BANNER BOTTOM (doc px):", edge);
await page.evaluate((y) => window.scrollTo(0, y - 450), edge);
await page.waitForTimeout(400);
await page.screenshot({ path: "tmp/shots4/banner-edge.png" });
await browser.close();
console.log("done");
