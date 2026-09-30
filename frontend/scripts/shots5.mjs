import { chromium } from "playwright";
const BASE = "http://localhost:3000";
const out = "tmp/shots2";
import { mkdirSync } from "fs"; mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const run = async (name, fn) => { try { await fn(); console.log("✓", name); } catch (e) { console.log("✗", name, e.message.split("\n")[0]); } };
const scroll = async (p) => p.evaluate(async () => { const h = document.body.scrollHeight; for (let y = 0; y < h; y += 500) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 100)); } });

await run("home-hero", async () => {
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(BASE + "/", { waitUntil: "networkidle" }); await p.waitForTimeout(1200);
  await p.screenshot({ path: `${out}/home-hero.png` }); await p.close();
});
await run("home-cats", async () => {
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(BASE + "/", { waitUntil: "networkidle" }); await scroll(p);
  await p.evaluate(() => window.scrollTo(0, 1500)); await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}/home-cats1.png` });
  await p.evaluate(() => window.scrollTo(0, 2100)); await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}/home-cats2.png` });
  await p.evaluate(() => window.scrollTo(0, 700)); await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}/home-specials.png` });
  await p.close();
});
await run("menu-cards", async () => {
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(BASE + "/menu", { waitUntil: "networkidle" }); await p.waitForTimeout(900);
  await p.screenshot({ path: `${out}/menu-specials.png` }); await p.close();
});
await run("menu-fi", async () => {
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(BASE + "/menu", { waitUntil: "networkidle" });
  await p.getByRole("button", { name: "fi", exact: true }).click();
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${out}/menu-fi.png` }); await p.close();
});
await browser.close();
