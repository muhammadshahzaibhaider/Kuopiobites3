// Usage: node scripts/shots.mjs <outDir> [names...]
import { chromium } from "playwright";
import { mkdirSync } from "fs";

const BASE = "http://localhost:3000";
const out = process.argv[2] ?? "tmp/shots";
mkdirSync(out, { recursive: true });

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 834, height: 1112 },
  mobile: { width: 390, height: 844 },
};

const browser = await chromium.launch();

async function shot(name, path, { vp = "desktop", full = false, before = null, wait = 1200 } = {}) {
  const page = await browser.newPage({ viewport: VIEWPORTS[vp] });
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  if (before) await before(page);
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: full });
  await page.close();
  console.log("✓", name);
}

const only = process.argv.slice(3);
const tasks = [
  ["home-desktop", "/", {}],
  ["home-desktop-full", "/", { full: true }],
  ["home-mobile", "/", { vp: "mobile" }],
  ["home-mobile-full", "/", { vp: "mobile", full: true }],
  ["home-tablet", "/", { vp: "tablet" }],
  ["menu-desktop", "/menu", {}],
  ["menu-desktop-full", "/menu", { full: true }],
  ["menu-mobile", "/menu", { vp: "mobile" }],
  ["menu-mobile-full", "/menu", { vp: "mobile", full: true }],
  ["dining-desktop", "/dining", {}],
  ["order-desktop", "/order", {}],
  ["account-desktop", "/account", {}],
  ["about-desktop", "/about", {}],
  // interactions
  ["pizza-sheet", "/menu", { before: async (p) => { await p.getByRole("button", { name: /margareta/i }).first().click(); } }],
  ["pizza-sheet-mobile", "/menu", { vp: "mobile", before: async (p) => { await p.getByRole("button", { name: /margareta/i }).first().click(); } }],
  ["menu-fi", "/menu", { before: async (p) => { await p.getByRole("button", { name: /^FI$/ }).first().click(); } }],
  ["cart-drawer", "/menu", { before: async (p) => {
      await p.getByRole("button", { name: /margareta/i }).first().click();
      await p.waitForTimeout(600);
      const add = p.getByRole("button", { name: /add to cart|lisää/i }).first();
      await add.click();
      await p.waitForTimeout(400);
    } }],
];

for (const [name, path, opts] of tasks) {
  if (only.length && !only.includes(name)) continue;
  try { await shot(name, path, opts); } catch (e) { console.log("✗", name, e.message.split("\n")[0]); }
}

await browser.close();
