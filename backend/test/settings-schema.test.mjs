// PUT /api/settings contract for the delivery-rules editor: the panel's own
// payload shape must validate, and malformed rules must still be rejected so a
// bad rule can never be silently dropped from the stored list.
import { test } from "node:test";
import assert from "node:assert/strict";

const { settingsSchema } = await import("../src/schemas.ts");
const { DEFAULT_SETTINGS } = await import("../src/lib/hours.ts");

const base = () => structuredClone({ ...DEFAULT_SETTINGS, audit: [] });

test("a freshly added rule (id, name, fee, active) is accepted", () => {
  const next = base();
  next.deliveryRules = [{ id: "delivery-mvcliqze003", name: "New delivery zone", fee: 0, active: true }];
  const parsed = settingsSchema.parse(next);
  assert.deepEqual(parsed.deliveryRules, next.deliveryRules);
});

test("distance and weight bounds are accepted", () => {
  const next = base();
  next.deliveryRules = [{ id: "delivery-a", name: "Keskusta 0-3 km", fee: 2.5, active: true, minDistanceKm: 0, maxDistanceKm: 3, minWeightKg: 0, maxWeightKg: 12 }];
  assert.equal(settingsSchema.parse(next).deliveryRules[0].maxDistanceKm, 3);
});

test("an unknown property is rejected instead of being written back", () => {
  const next = base();
  next.deliveryRules = [{ id: "delivery-a", name: "Keskusta", fee: 2.5, active: true, nameFi: "Keskusta" }];
  assert.equal(settingsSchema.safeParse(next).success, false);
});

test("a rule without a name is rejected", () => {
  const next = base();
  next.deliveryRules = [{ id: "delivery-a", fee: 2.5, active: true }];
  assert.equal(settingsSchema.safeParse(next).success, false);
});

test("a NaN fee is rejected", () => {
  const next = base();
  next.deliveryRules = [{ id: "delivery-a", name: "Keskusta", fee: Number.NaN, active: true }];
  assert.equal(settingsSchema.safeParse(next).success, false);
});

test("opening hours with seconds from a time input are coerced to HH:MM", () => {
  const next = base();
  next.hours = {
    0: { open: "10:00:00", close: "23:00:00" },
    1: { open: "10:00", close: "00:00" },
    2: { open: "10:00", close: "00:00" },
    3: { open: "10:00", close: "02:00" },
    4: { open: "10:00", close: "02:00" },
    5: { open: "10:00", close: "02:00" },
    6: { open: "10:00", close: "02:00" },
  };
  const parsed = settingsSchema.parse(next);
  assert.deepEqual(parsed.hours["0"], { open: "10:00", close: "23:00" });
});

test("overnight close times (00:00 / 02:00) are accepted", () => {
  const next = base();
  next.hours = {
    0: { open: "10:00", close: "23:00" },
    1: { open: "10:00", close: "00:00" },
    2: { open: "10:00", close: "00:00" },
    3: { open: "10:00", close: "02:00" },
    4: { open: "10:00", close: "02:00" },
    5: { open: "10:00", close: "02:00" },
    6: { open: "10:00", close: "02:00" },
  };
  assert.equal(settingsSchema.safeParse(next).success, true);
});

test("min above max is rejected", () => {
  const next = base();
  next.deliveryRules = [{ id: "delivery-a", name: "Keskusta", fee: 2.5, active: true, minDistanceKm: 5, maxDistanceKm: 3 }];
  assert.equal(settingsSchema.safeParse(next).success, false);
});
