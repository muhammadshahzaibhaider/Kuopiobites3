import assert from "node:assert/strict";
import { test } from "node:test";
import { applyStripeCheckoutEvent, decideStripeCheckoutAction } from "../src/stripe-checkout-event.ts";

const order = (over = {}) => ({
  id: "KB-test1",
  total: 11.2,
  paymentStatus: "pending",
  checkoutSessionId: "cs_live_abc",
  ...over,
});

const session = (over = {}) => ({
  id: "cs_live_abc",
  amount_total: 1120,
  currency: "eur",
  payment_status: "paid",
  payment_intent: "pi_live_1",
  metadata: { order_id: "KB-test1" },
  ...over,
});

const event = (type, object) => ({ id: `evt_${type}`, type, data: { object } });

test("unpaid checkout.session.completed does not mark paid", () => {
  const d = decideStripeCheckoutAction(
    event("checkout.session.completed", session({ payment_status: "unpaid" })),
    order(),
  );
  assert.equal(d.action, "ignore");
  assert.equal(d.reason, "unpaidSession");
});

test("wrong amount or currency is ignored", () => {
  const amt = decideStripeCheckoutAction(
    event("checkout.session.completed", session({ amount_total: 9999 })),
    order(),
  );
  assert.equal(amt.action, "ignore");
  assert.equal(amt.reason, "amountMismatch");
  const cur = decideStripeCheckoutAction(
    event("checkout.session.completed", session({ currency: "usd" })),
    order(),
  );
  assert.equal(cur.reason, "amountMismatch");
});

test("session id must match the order checkout session", () => {
  const d = decideStripeCheckoutAction(
    event("checkout.session.completed", session({ id: "cs_other" })),
    order(),
  );
  assert.equal(d.reason, "sessionMismatch");
});

test("valid paid session marks the order paid", () => {
  const d = decideStripeCheckoutAction(
    event("checkout.session.completed", session()),
    order(),
  );
  assert.deepEqual(d, { action: "markPaid", orderId: "KB-test1", paymentRef: "pi_live_1" });
});

test("delayed async_payment_succeeded confirms payment", () => {
  const d = decideStripeCheckoutAction(
    event("checkout.session.async_payment_succeeded", session({ payment_status: "paid" })),
    order(),
  );
  assert.equal(d.action, "markPaid");
});

test("expiry does not delete or abandon a paid order", () => {
  const d = decideStripeCheckoutAction(
    event("checkout.session.expired", session({ payment_status: "unpaid" })),
    order({ paymentStatus: "paid" }),
  );
  assert.equal(d.action, "ignore");
  assert.equal(d.reason, "alreadyFinal");
});

test("expiry does not touch refunded orders", () => {
  const d = decideStripeCheckoutAction(
    event("checkout.session.async_payment_failed", session()),
    order({ paymentStatus: "refunded" }),
  );
  assert.equal(d.reason, "alreadyFinal");
});

test("unpaid expiry cancels without implying delete", () => {
  const d = decideStripeCheckoutAction(
    event("checkout.session.expired", session({ payment_status: "unpaid" })),
    order(),
  );
  assert.equal(d.action, "abandonUnpaid");
});

test("applyStripeCheckoutEvent: unpaid completed never writes paid", async () => {
  const writes = [];
  const result = await applyStripeCheckoutEvent(
    event("checkout.session.completed", session({ payment_status: "unpaid" })),
    {
      getOrder: async () => order(),
      markPaid: async () => { writes.push("paid"); },
      abandonUnpaid: async () => { writes.push("abandon"); },
      onPaid: async () => { writes.push("streak"); },
    },
  );
  assert.equal(result.ignored, "unpaidSession");
  assert.deepEqual(writes, []);
});

test("applyStripeCheckoutEvent: valid payment writes once; duplicate event is a no-op write", async () => {
  const writes = [];
  const deps = {
    getOrder: async () => order(),
    markPaid: async (id, ref) => { writes.push(`paid:${id}:${ref}`); },
    abandonUnpaid: async () => { writes.push("abandon"); },
    onPaid: async () => { writes.push("streak"); },
  };
  const first = await applyStripeCheckoutEvent(event("checkout.session.completed", session()), deps);
  assert.equal(first.received, true);
  const paidOrder = order({ paymentStatus: "paid" });
  const second = await applyStripeCheckoutEvent(event("checkout.session.completed", session()), {
    ...deps,
    getOrder: async () => paidOrder,
  });
  assert.equal(second.received, true);
  assert.deepEqual(writes, ["paid:KB-test1:pi_live_1", "streak"]);
});

test("applyStripeCheckoutEvent: expiry of paid order does not abandon", async () => {
  const writes = [];
  await applyStripeCheckoutEvent(
    event("checkout.session.expired", session({ payment_status: "unpaid" })),
    {
      getOrder: async () => order({ paymentStatus: "paid" }),
      markPaid: async () => { writes.push("paid"); },
      abandonUnpaid: async () => { writes.push("abandon"); },
      onPaid: async () => {},
    },
  );
  assert.deepEqual(writes, []);
});
