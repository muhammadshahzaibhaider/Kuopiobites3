import assert from "node:assert/strict";
import { test } from "node:test";
import { applyPaidOrder, markPendingRedeem, pendingWalkInClaim, qualifiesForStreakStamp, streakFreeAmount } from "../src/streak.ts";

test("seven paid orders unlock the reward and then freeze until redeem", () => {
  let state = { count: 0, rewardReady: false };
  for (let i = 1; i <= 7; i++) state = applyPaidOrder(state, `o${i}`, 7);
  assert.equal(state.count, 7);
  assert.equal(state.rewardReady, true);
  const frozen = applyPaidOrder(state, "o8", 7);
  assert.equal(frozen.count, 7);
  assert.equal(frozen.rewardReady, true);
});

test("duplicate webhook for the same order does not double-count", () => {
  let state = applyPaidOrder({ count: 0, rewardReady: false }, "o1", 7);
  state = applyPaidOrder(state, "o1", 7);
  assert.equal(state.count, 1);
});

test("redeeming order resets and starts the next cycle at 1", () => {
  const ready = { count: 7, rewardReady: true };
  const pending = markPendingRedeem(ready, "redeem-1");
  const next = applyPaidOrder(pending, "redeem-1", 7);
  assert.equal(next.count, 1);
  assert.equal(next.rewardReady, false);
});

test("only one pending walk-in claim per customer", () => {
  const claims = [
    { id: "a", userId: "u1", name: "A", email: "a@x", note: "", createdAt: 1, status: "approved" },
    { id: "b", userId: "u1", name: "A", email: "a@x", note: "", createdAt: 2, status: "pending" },
  ];
  assert.equal(pendingWalkInClaim(claims, "u1")?.id, "b");
  assert.equal(pendingWalkInClaim(claims, "u2"), undefined);
});

test("online streak stamp requires at least €10 paid", () => {
  assert.equal(qualifiesForStreakStamp(9.99), false);
  assert.equal(qualifiesForStreakStamp(10), true);
  assert.equal(qualifiesForStreakStamp(14.5), true);
});

test("free amount is one unit of the configured reward item", () => {
  assert.equal(streakFreeAmount([{ itemId: "pizza-1", unitPrice: 12.5, qty: 2 }], "pizza-1"), 12.5);
  assert.equal(streakFreeAmount([{ itemId: "burger", unitPrice: 9, qty: 1 }], "pizza-1"), 0);
});
