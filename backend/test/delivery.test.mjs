import assert from "node:assert/strict";
import { test } from "node:test";
import { deliveryFeeFor, drivingKmFromShop, matchesDeliveryRule } from "../src/delivery.ts";

const settings = {
  deliveryFee: 0,
  deliveryRules: [
    { id: "a", name: "0-3", fee: 0, active: true, minDistanceKm: 0, maxDistanceKm: 3 },
    { id: "b", name: "3-4", fee: 2, active: true, minDistanceKm: 3.1, maxDistanceKm: 4 },
    { id: "c", name: "4-5", fee: 3.5, active: true, minDistanceKm: 4.1, maxDistanceKm: 5 },
    { id: "d", name: "5-6", fee: 5, active: true, minDistanceKm: 5.1, maxDistanceKm: 6 },
  ],
};

test("unknown distance does not pick a km-banded rule (falls back to flat fee)", () => {
  assert.equal(deliveryFeeFor(settings, undefined, 0), 0);
});

test("a 4 km drive uses the 3.1–4 km band, not the free 0–3 km band", () => {
  assert.equal(deliveryFeeFor(settings, 4, 0), 2);
  assert.equal(deliveryFeeFor(settings, 3, 0), 0);
  assert.equal(deliveryFeeFor(settings, 4.5, 0), 3.5);
  assert.equal(deliveryFeeFor(settings, 5.5, 0), 5);
});

test("inactive bands are skipped", () => {
  const off = { ...settings, deliveryRules: settings.deliveryRules.map((r) => r.id === "b" ? { ...r, active: false } : r) };
  assert.equal(deliveryFeeFor(off, 4, 0), 0);
});

test("Kolmisoppi-ish coords are not in the free 0–3 km band after the driving factor", () => {
  const km = drivingKmFromShop(62.86336, 27.61338);
  assert.ok(km > 3, `expected > 3 km, got ${km}`);
  assert.ok(matchesDeliveryRule(settings.deliveryRules[1], km, 0) || km > 4);
});
