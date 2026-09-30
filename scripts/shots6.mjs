import { chromium } from "playwright";
import { mkdirSync } from "fs";
mkdirSync("tmp/shots2", { recursive: true });
const BASE = "http://localhost:3000";
const browser = await chromium.launch();

// FI menu cards
{
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(BASE + "/menu", { waitUntil: "networkidle" });
  await p.getByRole("button", { name: "fi", exact: true }).click();
  await p.waitForTimeout(700);
  await p.screenshot({ path: "tmp/shots2/menu-fi2.png" });
  await p.close();
  console.log("✓ menu-fi2");
}

// client-side nav check: click Home→Menu→Dining→About, assert headings appear without reload
{
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(BASE + "/", { waitUntil: "networkidle" });
  let reloaded = false;
  p.on("framenavigated", (f) => { if (f === p.mainFrame()) reloaded = true; });
  const clicks = [
    ["Menu", "craving|mieli"],
    ["Dining", "Dining at|tervetuloa"],
    ["About & Contact", "story|tarina"],
    ["Home", "Asian Cuisine"],
  ];
  for (const [label, rx] of clicks) {
    reloaded = false;
    await p.getByRole("link", { name: label }).first().click();
    await p.waitForTimeout(900);
    const ok = await p.locator(`text=/${rx}/i`).first().isVisible().catch(() => false);
    console.log(`nav ${label}: content=${ok} hardReload=${reloaded}`);
  }
  await p.screenshot({ path: "tmp/shots2/about.png" });
  await p.close();
}
await browser.close();
