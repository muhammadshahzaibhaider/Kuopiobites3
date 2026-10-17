/**
 * Opening-hours logic. Pure module, fixed clocks — the production bug was a
 * kitchen closing at 00:00/02:00 being treated as "closed all day".
 */
import test from "node:test";
import assert from "node:assert/strict";

import { closeMinutes, openInfo, slotsFor } from "../src/lib/hours.ts";
import { DEFAULT_SETTINGS } from "../src/lib/hours.ts";

/** 0=Sun … 6=Sat; the times the owner actually set in the live shop. */
const OVERNIGHT = {
  0: { open: "10:00", close: "02:00" },
  1: { open: "10:00", close: "00:00" },
  2: { open: "10:00", close: "00:00" },
  3: { open: "10:00", close: "00:00" },
  4: { open: "10:00", close: "00:00" },
  5: { open: "10:00", close: "02:00" },
  6: { open: "10:00", close: "02:00" },
};

const at = (day, hh, mm = 0) => ({ day, minutes: hh * 60 + mm });

test("close before/at opening is measured as the next day", () => {
  assert.equal(closeMinutes({ open: "10:00", close: "00:00" }), 1440);
  assert.equal(closeMinutes({ open: "10:00", close: "02:00" }), 1560);
  assert.equal(closeMinutes({ open: "10:00", close: "21:00" }), 1260);
});

test("normal same-day window still works", () => {
  assert.deepEqual(openInfo(DEFAULT_SETTINGS.hours, at(1, 13)), { open: true, closeAt: "21:00" });
  assert.deepEqual(openInfo(DEFAULT_SETTINGS.hours, at(1, 9)), { open: false, openAt: "10:00", nextDay: 0 });
  /* 1 = tomorrow (Tuesday), which opens at 10:00 */
  assert.deepEqual(openInfo(DEFAULT_SETTINGS.hours, at(1, 22)), { open: false, openAt: "10:00", nextDay: 1 });
});

test("10:00–00:00 is open all evening (the live regression)", () => {
  const noon = openInfo(OVERNIGHT, at(2, 13));
  assert.equal(noon.open, true);
  assert.equal(noon.closeAt, "00:00");
  assert.equal(openInfo(OVERNIGHT, at(2, 23, 59)).open, true);
});

test("10:00–02:00 stays open after midnight", () => {
  const lateFriday = openInfo(OVERNIGHT, at(5, 23, 30));
  assert.equal(lateFriday.open, true);
  assert.equal(lateFriday.closeAt, "02:00");
  /* Saturday 01:30 belongs to Friday's window */
  assert.deepEqual(openInfo(OVERNIGHT, at(6, 1, 30)), { open: true, closeAt: "02:00" });
});

test("after the overnight close the next opening is today", () => {
  /* Sat 02:30 — Friday's window ended, Saturday opens at 10:00 */
  assert.deepEqual(openInfo(OVERNIGHT, at(6, 2, 30)), { open: false, openAt: "10:00", nextDay: 0 });
});

test("a 00:00 close does not leak into the next morning", () => {
  /* Tue 00:30 — Monday's 10:00–00:00 window is over, Tuesday opens at 10:00 */
  assert.deepEqual(openInfo(OVERNIGHT, at(2, 0, 30)), { open: false, openAt: "10:00", nextDay: 0 });
});

test("closed days are skipped when looking for the next opening", () => {
  const hours = { ...OVERNIGHT, 2: null };
  assert.deepEqual(openInfo(hours, at(2, 13)), { open: false, openAt: "10:00", nextDay: 1 });
});

test("a shop closed every day reports closed with no next opening", () => {
  assert.deepEqual(openInfo({ 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null }, at(3, 12)), { open: false });
});

test("reservation slots stop before midnight on an overnight close", () => {
  const settings = { ...DEFAULT_SETTINGS, hours: OVERNIGHT };
  const slots = slotsFor("2099-06-02", settings, []); // future Tuesday
  assert.equal(slots[0], "10:00");
  assert.equal(slots.at(-1), "23:00");
  assert.ok(slots.every((slot) => Number(slot.slice(0, 2)) < 24));
});

test("paused ordering keeps the hours info but reports closed", () => {
  const settings = { ...DEFAULT_SETTINGS, paused: true, hours: OVERNIGHT };
  const info = openInfo(settings.hours, at(2, 13));
  assert.equal(info.open, true);
  assert.equal(info.closeAt, "00:00");
});
