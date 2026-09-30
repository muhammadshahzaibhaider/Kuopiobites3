import { chromium } from "playwright";
import { mkdirSync } from "fs";

mkdirSync("tmp/shots4", { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.waitForTimeout(1200);

// sanity: layer exists, right image, glass section present
const info = await page.evaluate(() => {
  const el = document.querySelector(".fixed-bg");
  const img = el?.querySelector("img");
  const inner = el?.querySelector(".fixed-bg__inner");
  return {
    exists: !!el,
    z: el ? getComputedStyle(el).zIndex : null,
    pos: el ? getComputedStyle(el).position : null,
    h: el ? el.getBoundingClientRect().height : 0,
    imgSrc: img?.currentSrc || img?.src || null,
    imgOk: img ? img.complete && img.naturalWidth > 0 : false,
    parallax: getComputedStyle(document.documentElement).getPropertyValue("--fixed-bg-parallax"),
    willChange: inner ? getComputedStyle(inner).willChange : null,
    glass: !!document.querySelector(".glass"),
  };
});
console.log("LAYER:", JSON.stringify(info, null, 2));

// screenshots at 3 scroll offsets
for (const y of [0, 700, 1500]) {
  await page.evaluate((v) => window.scrollTo(0, v), y);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `tmp/shots4/fixed-bg-scroll-${y}.png` });
}

// pixel proof: crop a fixed viewport strip (top-right corner region where the
// collage is visible through the overlay) at two scroll offsets and compare
const a = await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(400);
await page.screenshot({ path: "tmp/shots4/strip-a.png", clip: { x: 1100, y: 320, width: 300, height: 200 } });
await page.evaluate(() => window.scrollTo(0, 1500));
await page.waitForTimeout(400);
await page.screenshot({ path: "tmp/shots4/strip-b.png", clip: { x: 1100, y: 320, width: 300, height: 200 } });

// parallax math check: at scrollY=1500, inner transform should be ≈ -180px
const t = await page.evaluate(() => {
  window.scrollTo(0, 1500);
  return new Promise((r) => setTimeout(() => r(document.querySelector(".fixed-bg__inner").style.transform), 300));
});
console.log("PARALLAX @1500:", t);

// mobile viewport
const m = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await m.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await m.waitForTimeout(1200);
const minfo = await m.evaluate(() => {
  const el = document.querySelector(".fixed-bg");
  const img = el?.querySelector("img");
  return { h: el?.getBoundingClientRect().height, vh: window.innerHeight, imgSrc: img?.currentSrc };
});
console.log("MOBILE:", JSON.stringify(minfo));
await m.screenshot({ path: "tmp/shots4/fixed-bg-mobile.png" });

await browser.close();
