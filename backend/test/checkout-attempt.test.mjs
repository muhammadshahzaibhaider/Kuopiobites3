import assert from "node:assert/strict";
import { test } from "node:test";
import { checkoutFingerprint, nextCartQty, sameCheckoutAttempt } from "../src/checkout-attempt.ts";

const cart = {
  type: "pickup",
  total: 19.8,
  lines: [{ itemId: "biryani", variantLabel: "Full", qty: 2, options: [], unitPrice: 9.9 }],
};

test("the same cart fingerprints as one checkout attempt", () => {
  assert.equal(sameCheckoutAttempt(cart, { ...cart, lines: [{ ...cart.lines[0] }] }), true);
  assert.equal(checkoutFingerprint(cart).length, 64);
});

test("a changed quantity or address is a different attempt", () => {
  assert.equal(sameCheckoutAttempt(cart, { ...cart, lines: [{ ...cart.lines[0], qty: 3 }] }), false);
  assert.equal(sameCheckoutAttempt({ ...cart, type: "delivery", address: "A" }, { ...cart, type: "delivery", address: "B" }), false);
});

test("quantity helper caps sequential additions at 99 (database concurrency is tested separately)", () => {
  let qty = 0;
  qty = nextCartQty(qty, 1);
  qty = nextCartQty(qty, 1);
  assert.equal(qty, 2);
  assert.equal(nextCartQty(98, 5), 99);
});
