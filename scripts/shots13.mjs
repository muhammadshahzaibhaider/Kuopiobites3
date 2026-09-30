import { chromium } from "playwright";
import { mkdirSync } from "fs";
mkdirSync("tmp/shots4", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
for (const [name, url] of [["menu", "/menu?cat=kebab"], ["dining", "/dining"]]) {
  await page.goto("http://localhost:3000" + url, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `tmp/shots4/fixed-bg-${name}.png` });
}
await browser.close();
console.log("done");
