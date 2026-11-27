import assert from "node:assert/strict";
import { test } from "node:test";
import { openCheckoutSession } from "../src/checkout-session.ts";

const order = { id: "KB-unit", createdAt: 1_800_000_000_005, total: 12.35, customer: { email: "fixture@example.invalid" } };
const site = "https://fixture.example.invalid";
const expiryError = Object.assign(new Error("invalid expiry"), { type: "StripeInvalidRequestError", param: "expires_at" });
test("a slow reservation still satisfies Stripe's minimum and retries use identical parameters", async () => {
  const receivedAt = Math.floor(order.createdAt / 1000) + 90;
  const calls = [];
  const create = async (params, options) => {
    calls.push({ params, options });
    if (params.expires_at < receivedAt + 1800) throw expiryError;
    return { id: "cs_one" };
  };
  await openCheckoutSession(order, site, false, create);
  await openCheckoutSession(order, site, true, create);
  assert.deepEqual(calls[1], calls[0]);
  assert.equal(calls[0].params.line_items[0].price_data.unit_amount, 1235);
  assert.match(calls[0].params.success_url, /#session_id=\{CHECKOUT_SESSION_ID\}$/);
});
test("an unbound pre-upgrade attempt replays its original Stripe parameters and key", async () => {
  const keys = [];
  const create = async (params, options) => {
    keys.push(options.idempotencyKey);
    if (params.success_url.includes("#")) throw { type: "StripeIdempotencyError" };
    assert.equal(params.expires_at, Math.floor(order.createdAt / 1000) + 1800);
    return { id: "cs_legacy" };
  };
  assert.equal((await openCheckoutSession(order, site, true, create)).id, "cs_legacy");
  assert.deepEqual(keys, ["checkout:KB-unit", "checkout:KB-unit"]);
});
test("only a definitive expiry rejection permits unbound cleanup", async () => {
  await assert.rejects(openCheckoutSession(order, site, true, async () => { throw expiryError; }), /payment.creationExpired/);
  for (const problem of [new Error("connection lost"), { type: "StripeAPIError" }, { type: "StripeInvalidRequestError", param: "email" }]) {
    let count = 0;
    await assert.rejects(openCheckoutSession(order, site, true, async () => { count++; throw problem; }), (e) => e === problem);
    assert.equal(count, 1);
  }
});
test("a provider idempotency mismatch followed by invalid legacy expiry remains uncertain", async () => {
  let count = 0;
  await assert.rejects(openCheckoutSession(order, site, true, async () => {
    if (++count === 1) throw { type: "StripeIdempotencyError" };
    throw expiryError;
  }), (e) => e === expiryError);
});
