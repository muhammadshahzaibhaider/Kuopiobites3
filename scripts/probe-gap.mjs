import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.waitForTimeout(800);
const out = await page.evaluate(() => {
  const wrap = document.querySelector("div.relative.bg-cream");
  const footer = document.querySelector("footer");
  const wb = wrap.getBoundingClientRect().bottom + scrollY;
  const ft = footer.getBoundingClientRect().top + scrollY;
  const between = [];
  if (ft - wb > 2) {
    document.querySelectorAll("body *").forEach((el) => {
      const r = el.getBoundingClientRect();
      const top = r.top + scrollY, bot = r.bottom + scrollY;
      if (top < ft && bot > wb && !wrap.contains(el) && !footer.contains(el) && r.height < 200 && r.height > 5) {
        between.push({ tag: el.tagName, cls: (el.className + "").slice(0, 80), top: Math.round(top), bot: Math.round(bot) });
      }
    });
  }
  return { wrapBottom: Math.round(wb), footerTop: Math.round(ft), gap: Math.round(ft - wb), between: between.slice(0, 10) };
});
console.log(JSON.stringify(out, null, 2));
await browser.close();
