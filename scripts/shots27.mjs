import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const apiCalls = [];
page.on("request", (r) => { if (r.url().includes(":4000")) apiCalls.push(r.method() + " " + new URL(r.url()).pathname); });
await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
console.log("API calls from home:", apiCalls.slice(0, 8));
console.log("category circles:", await page.locator("a[href^='/menu?cat=']").count());
await page.screenshot({ path: "tmp/shots4/split-home.png" });
// client-side nav (the old bug): click Menu link, content must appear without reload
await page.click("header a[href='/menu']");
await page.waitForTimeout(1200);
console.log("menu cards after client-nav:", await page.locator("text=€").count() > 0);
// admin login via backend
await page.goto("http://localhost:3000/admin", { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.fill("input[placeholder='Username']", "admin");
await page.fill("input[placeholder='Password']", "kuopio2026");
await page.click("button:has-text('Sign in')");
await page.waitForTimeout(1500);
console.log("admin dashboard visible:", await page.locator("text=Muutosloki, text=Audit, text=Dashboard").first().isVisible().catch(() => false));
await page.screenshot({ path: "tmp/shots4/split-admin.png" });
await browser.close();
console.log("done");
