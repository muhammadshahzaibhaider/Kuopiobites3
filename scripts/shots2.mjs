// Interaction shots: pizza sheet, cart drawer, FI lang
import { chromium } from "playwright";
import { mkdirSync } from "fs";
const BASE = "http://localhost:3000";
const out = process.argv[2] ?? "tmp/shots";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();

async function shot(name, url, vp, before) {
  const sizes = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } };
  const page = await browser.newPage({ viewport: sizes[vp] });
  await page.goto(BASE + url, { waitUntil: "networkidle" });
  if (before) await before(page);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/${name}.png` });
  await page.close();
  console.log("✓", name);
}

const openSheet = async (p) => {
  await p.locator("button.card-tilt").first().click();
  await p.waitForTimeout(900);
};

await shot("pizza-sheet", "/menu?cat=pizza1", "desktop", openSheet);
await shot("pizza-sheet-mobile", "/menu?cat=pizza1", "mobile", openSheet);
await shot("menu-fi", "/menu", "desktop", async (p) => {
  await p.getByRole("button", { name: "fi", exact: true }).click();
  await p.waitForTimeout(600);
});
await shot("cart-drawer", "/menu?cat=pizza1", "desktop", async (p) => {
  await openSheet(p);
  // pick first size
  await p.locator('[role="dialog"] button, aside button').filter({ hasText: /Med|Perhe|medium|family/i }).first().click().catch(() => {});
  await p.waitForTimeout(400);
  // sticky add button (pizza.add)
  await p.getByRole("button", { name: /add ·|lisää ·|Add pizza|€\d/i }).last().click().catch(() => {});
  await p.waitForTimeout(1200);
});
await browser.close();
