import assert from "node:assert/strict";
import { test } from "node:test";
import { applyStripeCheckoutEvent, receiveStripeCheckoutWebhook } from "../src/stripe-checkout-event.ts";
import Stripe from "stripe";
import express from "express";
import { createHmac } from "node:crypto";

const session = (over = {}) => ({
  id: "cs_expected", metadata: { order_id: "KB-review" }, payment_status: "paid",
  status: "complete", payment_intent: "pi_expected", amount_total: 1120, currency: "eur", ...over,
});
const event = (type = "checkout.session.completed", over = {}) =>
  ({ id: "evt_review", type, data: { object: session(over) } });
const deps = (canonical = session(), process = async () => ({ received: true, paidSaved: true })) =>
  ({ retrieveSession: async () => canonical, process });

test("valid canonical payment forwards complete, typed identity", async () => {
  let command;
  const r = await applyStripeCheckoutEvent(event(), deps(session(), async (x) => { command = x; return { received: true, paidSaved: true }; }));
  assert.equal(r.paidSaved, true);
  assert.equal(command.p_session_id, "cs_expected");
  assert.equal(command.p_payment_intent_id, "pi_expected");
  assert.equal(command.p_order_id, "KB-review");
  assert.equal(command.p_amount_total, 1120);
});
test("ignores unhandled events without retrieving or processing", async () => {
  let calls = 0;
  const r = await applyStripeCheckoutEvent(event("payment_intent.created"), { retrieveSession: async () => { calls++; }, process: async () => { calls++; } });
  assert.equal(r.ignored, "unhandledEvent"); assert.equal(calls, 0);
});
test("missing incoming identity cannot be treated as a match", async () => {
  for (const over of [{ id: undefined }, { id: "" }, { metadata: {} }, { metadata: null }]) {
    const r = await applyStripeCheckoutEvent(event("checkout.session.completed", over), deps());
    assert.equal(r.ignored, "missingIdentity");
  }
});
test("unpaid canonical session never marks paid, even if event claims success", async () => {
  let calls = 0;
  const r = await applyStripeCheckoutEvent(event("checkout.session.async_payment_succeeded"), deps(session({ payment_status: "unpaid" }), async () => { calls++; }));
  assert.equal(r.ignored, "unpaidSession"); assert.equal(calls, 0);
});
test("out-of-order failure uses current paid Stripe state instead of cancelling", async () => {
  let command;
  await applyStripeCheckoutEvent(event("checkout.session.expired", { payment_status: "unpaid" }),
    deps(session(), async (x) => { command = x; return { received: true, paidSaved: true }; }));
  assert.equal(command.p_payment_status, "paid");
});
test("canonical order and session must both match the signed signal", async () => {
  for (const canonical of [session({ id: "cs_wrong" }), session({ metadata: { order_id: "other" } })]) {
    const r = await applyStripeCheckoutEvent(event(), deps(canonical));
    assert.equal(r.ignored, "sessionMismatch");
  }
});
test("invalid amount, currency or missing PaymentIntent cannot confirm payment", async () => {
  for (const over of [{ amount_total: null }, { amount_total: "1120" }, { amount_total: 1.5 }, { amount_total: 0 }, { currency: "usd" }, { payment_intent: null }]) {
    const r = await applyStripeCheckoutEvent(event(), deps(session(over)));
    assert.equal(r.ignored, "invalidPayment");
  }
});
test("expanded PaymentIntent is handled without losing identity", async () => {
  let command;
  await applyStripeCheckoutEvent(event(), deps(session({ payment_intent: { id: "pi_expanded" } }), async (x) => { command = x; return { received: true }; }));
  assert.equal(command.p_payment_intent_id, "pi_expanded");
});
test("canonical unpaid expiry forwards cancellation without a payment side effect", async () => {
  let command;
  await applyStripeCheckoutEvent(event("checkout.session.expired"), deps(session({ payment_status: "unpaid", status: "expired", payment_intent: null }), async (x) => { command = x; return { received: true }; }));
  assert.equal(command.p_payment_status, "unpaid"); assert.equal(command.p_session_status, "expired");
});
test("Stripe/database failures are retriable errors, not successful acknowledgements", async () => {
  await assert.rejects(() => applyStripeCheckoutEvent(event(), { ...deps(), retrieveSession: async () => { throw new Error("Stripe down"); } }), /Stripe down/);
  await assert.rejects(() => applyStripeCheckoutEvent(event(), deps(session(), async () => { throw new Error("database down"); })), /database down/);
  await assert.rejects(() => applyStripeCheckoutEvent(event(), deps(session(), async () => null)), /processingFailed/);
});
test("does not invent fulfillment for zero affected database state", async () => {
  const r = await applyStripeCheckoutEvent(event(), deps(session(), async () => ({ received: true, ignored: "alreadyFinal" })));
  assert.equal(r.paidSaved, undefined); assert.equal(r.ignored, "alreadyFinal");
});

const secret = "whsec_local_test_only";
const sdk = new Stripe("sk_test_local_only");
const signature = (raw, time = Math.floor(Date.now() / 1000)) =>
  "t=" + time + ",v1=" + createHmac("sha256", secret).update(time + "." + raw).digest("hex");

test("actual HTTP raw-body adapter verifies SDK signatures and preserves retry status", async () => {
  let calls = 0, failDatabase = false;
  const app = express();
  const stripe = { webhooks: sdk.webhooks, checkout: { sessions: { retrieve: async () => session() } } };
  app.post("/api/webhooks/stripe", express.raw({ type: "application/json" }), async (req, res) => {
    try {
      const r = await receiveStripeCheckoutWebhook(req.body, req.headers["stripe-signature"], secret, {
        stripe, process: async () => { calls++; if (failDatabase) throw new Error("db unavailable"); return { received: true }; },
      });
      res.status(r.status).json(r.body);
    } catch { res.status(500).json({ error: "internal" }); }
  });
  const listener = app.listen(0, "127.0.0.1");
  await new Promise(resolve => listener.once("listening", resolve));
  const url = "http://127.0.0.1:" + listener.address().port + "/api/webhooks/stripe";
  const raw = JSON.stringify(event());
  const send = (body, sig) => fetch(url, { method: "POST", body, headers: { "content-type": "application/json", "stripe-signature": sig } });
  try {
    assert.equal((await send(raw, "bad")).status, 400);
    assert.equal((await send(raw, signature(raw, Math.floor(Date.now()/1000)-600))).status, 400);
    assert.equal((await send(raw + " ", signature(raw))).status, 400);
    assert.equal(calls, 0);
    assert.equal((await send(raw, signature(raw))).status, 200);
    assert.equal((await send(raw, signature(raw) + ",v1=" + "0".repeat(64))).status, 200);
    assert.equal(calls, 2);
    failDatabase = true;
    assert.equal((await send(raw, signature(raw))).status, 500);
  } finally { listener.closeAllConnections(); await new Promise(resolve => listener.close(resolve)); }
});
test("missing configuration or parsed body is rejected without processing", async () => {
  const missing = await receiveStripeCheckoutWebhook(Buffer.from("{}"), "x", secret, { stripe: null, process: async () => { throw new Error("must not run"); } });
  assert.equal(missing.status, 503);
  const parsed = await receiveStripeCheckoutWebhook({}, "x", secret, { stripe: sdk, process: async () => { throw new Error("must not run"); } });
  assert.equal(parsed.status, 400);
});
