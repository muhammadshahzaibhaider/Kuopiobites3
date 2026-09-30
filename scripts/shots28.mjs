import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:3000/menu?cat=kebab", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
console.log("edited price visible on public page:", await page.locator("text=€13.50").count() > 0);
await browser.close();
