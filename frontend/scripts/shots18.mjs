import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
const edges = await page.evaluate(() => {
  const banner = document.querySelector("section.bg-cream");
  const wrap = document.querySelector("div.-mb-20.bg-cream");
  return {
    bannerBottom: Math.round(banner.getBoundingClientRect().bottom + scrollY),
    specialsTop: Math.round(wrap.getBoundingClientRect().top + scrollY),
  };
});
console.log(edges);
await page.evaluate((y) => window.scrollTo(0, y - 450), edges.bannerBottom);
await page.waitForTimeout(400);
await page.screenshot({ path: "tmp/shots4/crisp-banner-edge.png" });
await page.evaluate((y) => window.scrollTo(0, y - 450), edges.specialsTop);
await page.waitForTimeout(400);
await page.screenshot({ path: "tmp/shots4/crisp-specials-edge.png" });
await browser.close();
console.log("done");
