import { test } from "node:test";
import assert from "node:assert/strict";
import { kitchenRead } from "./kitchen-feed.ts";
import { ticketLines } from "./ticket.ts";

test("overlapping slow polls share work and a failed reservation cannot discard an order", async () => {
  let calls = 0, resolve;
  const output = [];
  const orders = kitchenRead(() => { calls++; return new Promise((r) => { resolve = r; }); }, (value) => output.push(value));
  const reservations = kitchenRead(async () => { throw new Error("unavailable"); }, assert.fail);
  const first = orders.refresh();
  await reservations.refresh();
  const next = orders.refresh();
  assert.equal(calls, 1);
  resolve("new ticket");
  await Promise.all([first, next]);
  assert.deepEqual(output, ["new ticket"]);
});
test("an old poll cannot overwrite a kitchen action or restore data after logout", async () => {
  const waiters = [], output = [];
  const feed = kitchenRead(() => new Promise((r) => waiters.push(r)), (value) => output.push(value));
  const old = feed.refresh(); feed.invalidate();
  const current = feed.refresh();
  waiters[1]("accepted"); await current;
  waiters[0]("placed"); await old;
  assert.deepEqual(output, ["accepted"]);
});
const restaurant = { name: "Fixture", street: "Fixture street", postcode: "00000", city: "Kuopio", country: "FI" };
const order = { id: "KB-fixture", createdAt: 1, type: "pickup", customer: {}, lines: [],
  subtotal: 12.35, deliveryFee: 0, total: 10, vat: 1.19, checkoutSessionId: "cs_private", discount: { amount: 2.35 } };
for (const [state, label] of [["pending", "Maksua ei ole vahvistettu"], ["paid", "Maksettu verkossa"], ["refunded", "Hyvitetty"], ["demo_paid", "Testimaksu"]]) {
  test(`BUG-016 print uses recorded payment and VAT for ${state}`, () => {
    const text = ticketLines({ ...order, paymentStatus: state }, restaurant, () => []);
    assert.ok(text.includes(label)); assert.match(text, /ALV +1,19/);
    assert.doesNotMatch(text, /Visa|Y-tunnus|Laskun nro|Kortti:|cs_private/i);
    if (state === "pending") assert.doesNotMatch(text, /Maksettu|Kuitti/);
  });
}
