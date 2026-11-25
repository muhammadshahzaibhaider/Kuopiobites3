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

const noopDeps = (over = {}) => ({
  getOrder: async () => order(),
  markPaid: async () => ({ updated: true }),
  cancelPending: async () => ({ updated: true }),
  afterCancel: async () => {},
  onPaid: async () => {},
  ...over,
});

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

test("missing session ids are not treated as a match (success or failure)", () => {
  const noEventId = decideStripeCheckoutAction(
    event("checkout.session.completed", session({ id: "" })),
    order(),
  );
  assert.equal(noEventId.reason, "missingSession");
  const noOrderId = decideStripeCheckoutAction(
    event("checkout.session.expired", session({ payment_status: "unpaid" })),
    order({ checkoutSessionId: "" }),
  );
  assert.equal(noOrderId.reason, "missingSession");
  const missingBoth = decideStripeCheckoutAction(
    event("checkout.session.async_payment_failed", session({ id: undefined, payment_status: "unpaid" })),
    order({ checkoutSessionId: undefined }),
  );
  assert.equal(missingBoth.reason, "missingSession");
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
  assert.equal(d.reason, "alreadyFinal");
});

test("expiry does not touch refunded orders", () => {
  const d = decideStripeCheckoutAction(
    event("checkout.session.async_payment_failed", session()),
    order({ paymentStatus: "refunded" }),
  );
  assert.equal(d.reason, "alreadyFinal");
});

test("wrong-session expiry does not cancel", () => {
  const d = decideStripeCheckoutAction(
    event("checkout.session.expired", session({ id: "cs_other", payment_status: "unpaid" })),
    order(),
  );
  assert.equal(d.reason, "sessionMismatch");
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
    noopDeps({
      markPaid: async () => { writes.push("paid"); return { updated: true }; },
      cancelPending: async () => { writes.push("cancel"); return { updated: true }; },
    }),
  );
  assert.equal(result.ignored, "unpaidSession");
  assert.deepEqual(writes, []);
});

test("applyStripeCheckoutEvent: valid payment writes once; duplicate event is a no-op write", async () => {
  const writes = [];
  const deps = noopDeps({
    markPaid: async (id, ref) => { writes.push(`paid:${id}:${ref}`); return { updated: true }; },
    onPaid: async () => { writes.push("streak"); },
  });
  const first = await applyStripeCheckoutEvent(event("checkout.session.completed", session()), deps);
  assert.equal(first.received, true);
  const second = await applyStripeCheckoutEvent(event("checkout.session.completed", session()), {
    ...deps,
    getOrder: async () => order({ paymentStatus: "paid" }),
    markPaid: async () => { writes.push("paid-again"); return { updated: false }; },
  });
  assert.equal(second.received, true);
  assert.deepEqual(writes, ["paid:KB-test1:pi_live_1", "streak", "streak"]);
});

test("applyStripeCheckoutEvent: expiry of paid order does not abandon", async () => {
  const writes = [];
  await applyStripeCheckoutEvent(
    event("checkout.session.expired", session({ payment_status: "unpaid" })),
    noopDeps({
      getOrder: async () => order({ paymentStatus: "paid" }),
      cancelPending: async () => { writes.push("cancel"); return { updated: true }; },
      afterCancel: async () => { writes.push("cleanup"); },
    }),
  );
  assert.deepEqual(writes, []);
});

test("wrong-session expiry does not cancel or clean up", async () => {
  const writes = [];
  const result = await applyStripeCheckoutEvent(
    event("checkout.session.expired", session({ id: "cs_other", payment_status: "unpaid" })),
    noopDeps({
      cancelPending: async () => { writes.push("cancel"); return { updated: true }; },
      afterCancel: async () => { writes.push("cleanup"); },
    }),
  );
  assert.equal(result.ignored, "sessionMismatch");
  assert.deepEqual(writes, []);
});

test("repeated failure events clean up only after a real pending→cancelled transition", async () => {
  const writes = [];
  let pending = true;
  const deps = noopDeps({
    cancelPending: async () => {
      writes.push("cancel");
      if (!pending) return { updated: false };
      pending = false;
      return { updated: true };
    },
    afterCancel: async () => { writes.push("cleanup"); },
  });
  await applyStripeCheckoutEvent(event("checkout.session.expired", session({ payment_status: "unpaid" })), deps);
  await applyStripeCheckoutEvent(event("checkout.session.async_payment_failed", session({ payment_status: "unpaid" })), deps);
  assert.deepEqual(writes, ["cancel", "cleanup", "cancel"]);
});

test("partial failure: payment saved then onPaid throws; retry still runs onPaid without a second markPaid", async () => {
  const writes = [];
  let paid = false;
  const first = noopDeps({
    getOrder: async () => order(),
    markPaid: async () => { paid = true; writes.push("mark"); return { updated: true }; },
    onPaid: async () => { writes.push("streak-fail"); throw new Error("streak down"); },
  });
  await assert.rejects(
    () => applyStripeCheckoutEvent(event("checkout.session.completed", session()), first),
    /streak down/,
  );
  assert.equal(paid, true);
  const retry = noopDeps({
    getOrder: async () => order({ paymentStatus: "paid" }),
    markPaid: async () => { writes.push("mark-again"); return { updated: false }; },
    onPaid: async () => { writes.push("streak-ok"); },
  });
  const result = await applyStripeCheckoutEvent(event("checkout.session.completed", session()), retry);
  assert.equal(result.paidSaved, true);
  assert.deepEqual(writes, ["mark", "streak-fail", "streak-ok"]);
});
