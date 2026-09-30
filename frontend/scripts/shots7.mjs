import { chromium } from "playwright";
const browser = await chromium.launch();
const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await p.getByRole("link", { name: "About & Contact" }).first().click();
await p.waitForTimeout(900);
const ok = await p.locator("text=two hearts").first().isVisible().catch(() => false);
console.log("about via client nav:", ok);
await p.close(); await browser.close();
