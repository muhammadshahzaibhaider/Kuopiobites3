import assert from "node:assert/strict";

const NEW_ORDER_RING_MS = 5 * 60 * 1000;
function ringUntilFor(now, firstSeenAt, windowMs = NEW_ORDER_RING_MS) {
  return firstSeenAt + windowMs > now ? firstSeenAt + windowMs : 0;
}

const now = 1_700_000_000_000;
assert.equal(ringUntilFor(now, now), now + NEW_ORDER_RING_MS);
assert.equal(ringUntilFor(now + NEW_ORDER_RING_MS + 1, now), 0);
assert.equal(NEW_ORDER_RING_MS, 300_000);
console.log("notify-ring ok");
