import assert from "node:assert/strict";
import { test } from "node:test";
import { hasPrivateOrderFields, publicTrackOrder } from "../src/order-public.ts";
import { canTransition } from "../src/order-payment.ts";
import { markPendingRedeem } from "../src/streak.ts";

test("public track redacts contact, address, notes and payment ids", () => {
  const pub = publicTrackOrder({
    id: "KB-1",
    createdAt: 1,
    type: "delivery",
    customer: { name: "Ada", email: "a@b.c", phone: "0441234567" },
    address: "Secret street 1",
    note: "allergy",
    lines: [{ key: "k", name: "Pizza", qty: 1, unitPrice: 10, options: [] }],
    subtotal: 10,
    deliveryFee: 0,
    total: 10,
    vat: 1,
    paymentStatus: "paid",
    paymentId: "pi_secret",
    checkoutSessionId: "cs_secret",
    userId: "user-1",
    statusOverride: "preparing",
  });
  assert.equal(pub.id, "KB-1");
  assert.equal(pub.status, "preparing");
  assert.equal(hasPrivateOrderFields(pub), false);
});

test("status transitions cannot reopen completed or cancelled tickets", () => {
  assert.equal(canTransition("placed", "accepted"), true);
  assert.equal(canTransition("completed", "accepted"), false);
  assert.equal(canTransition("cancelled", "placed"), false);
  assert.equal(canTransition("ready", "completed"), true);
});

test("a second overlapping reward reservation is rejected", () => {
  const reserved = markPendingRedeem({ count: 7, rewardReady: true }, "KB-A");
  assert.equal(reserved.pendingRedeemOrderId, "KB-A");
  assert.throws(() => markPendingRedeem(reserved, "KB-B"), /streak.reserved/);
});
