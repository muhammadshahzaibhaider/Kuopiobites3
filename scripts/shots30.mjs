import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 120)));
await page.goto("http://localhost:3000/admin", { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.fill("input[placeholder='Username']", "admin");
await page.fill("input[placeholder='Password']", "kuopio2026");
await page.click("button:has-text('Sign in')");
await page.waitForTimeout(1500);
const click = async (label) => {
  const el = page.locator(`aside >> text=${label}`).first();
  if (await el.count()) { await el.click(); await page.waitForTimeout(600); return true; }
  return false;
};
for (const g of ["Orders", "Dining", "Menu", "Customers", "Analytics", "Admin", "Settings"]) await click(g);
for (const leaf of ["Live Queue", "History", "Refunds", "Calendar", "Reservations", "Slot Settings", "Items", "Categories", "Toppings", "Today's Special", "Sales", "Item Performance", "Peak Hours", "General", "Restaurant Info"]) await click(leaf);
// the activity log is embedded below Admin → Staff and should remain visible
await click("Admin"); await click("Staff");
await page.waitForTimeout(800);
const auditHasRows = await page.locator("td:has-text('settings updated'), td:has-text('login'), td:has-text('reordered')").count() > 0;
console.log("audit rows from backend:", auditHasRows);
await page.screenshot({ path: "tmp/shots4/admin-audit.png" });
// customers view
await click("Customers");
await page.waitForTimeout(800);
console.log("customers shows Testi:", await page.locator("text=testi@example.com").count() > 0);
console.log("pageerrors:", errors.length ? errors.slice(0, 5) : "none");
await browser.close();
console.log("done");
