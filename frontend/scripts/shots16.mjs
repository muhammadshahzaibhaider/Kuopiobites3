import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
// scroll so the specials boundary (top of cream wrapper) sits mid-viewport
const edge = await page.evaluate(() => {
  const w = document.querySelector("div.relative.bg-cream");
  return Math.round(w.getBoundingClientRect().top + window.scrollY);
});
console.log("SPECIALS TOP (doc px):", edge);
await page.evaluate((y) => window.scrollTo(0, y - 450), edge);
await page.waitForTimeout(400);
await page.screenshot({ path: "tmp/shots4/specials-edge.png" });
// bottom of page — should be plain cream, no collage
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(500);
await page.screenshot({ path: "tmp/shots4/page-bottom.png" });
await browser.close();
console.log("done");
