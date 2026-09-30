import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const check = async (url) => {
  await page.goto("http://localhost:3000" + url, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  return page.evaluate(() => !!document.querySelector(".fixed-bg"));
};
console.log("home has layer:", await check("/"));
console.log("menu has layer:", await check("/menu?cat=kebab"));
await page.evaluate(() => window.scrollTo(0, 500));
await page.waitForTimeout(400);
await page.screenshot({ path: "tmp/shots4/menu-cream.png" });
console.log("dining has layer:", await check("/dining"));
await page.screenshot({ path: "tmp/shots4/dining-cream.png" });
console.log("about has layer:", await check("/about"));
// client-side nav back home: layer must come back
await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.waitForTimeout(800);
console.log("home again has layer:", await page.evaluate(() => !!document.querySelector(".fixed-bg")));
await browser.close();
console.log("done");
