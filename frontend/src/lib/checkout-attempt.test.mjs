import assert from "node:assert/strict";
import { test } from "node:test";

async function fixture({ blocked = false, legacy = null } = {}) {
  let value = legacy && JSON.stringify(legacy);
  globalThis.sessionStorage = { getItem: () => value, setItem: (_, next) => { if (blocked) throw Error("quota"); value = next; }, removeItem: () => { value = null; } };
  return { client: await import("./checkout-attempt.ts?" + crypto.randomUUID()), saved: () => value && JSON.parse(value) };
}
test("write-denied storage preserves the same checkout across retries", async () => {
  const { client } = await fixture({ blocked: true });
  assert.equal(await client.beginCheckout("same basket"), await client.beginCheckout("same basket"));
});
test("legacy identity survives migration; new storage omits contact and basket details", async () => {
  const { client, saved } = await fixture({ legacy: { id: "old", signature: "customer@example.invalid", orderId: "KB-old" } });
  assert.equal(await client.beginCheckout("customer@example.invalid"), "old");
  assert.match(saved().signature, /^[0-9a-f]{64}$/); assert.equal(saved().orderId, "KB-old");
});
test("late responses and tracking for an older order cannot replace or clear a newer attempt", async () => {
  const { client, saved } = await fixture();
  const old = await client.beginCheckout("old"), latest = await client.beginCheckout("new");
  client.bindCheckout(old, "KB-old"); client.finishCheckout(old); client.completeCheckoutAttempt("KB-old");
  assert.equal(saved().id, latest); assert.equal(saved().orderId, undefined);
  client.bindCheckout(latest, "KB-new"); client.completeCheckoutAttempt("KB-new"); assert.equal(saved(), null);
});
