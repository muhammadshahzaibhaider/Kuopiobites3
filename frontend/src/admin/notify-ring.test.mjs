import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import config from "../../next.config.mjs";

let notify;
const players = [];
class FakeAudio {
  src = "";
  dataset = {};
  paused = true;
  loop = false;
  volume = 1;
  currentTime = 0;
  calls = [];
  pauses = 0;
  constructor() { players.push(this); }
  setAttribute() {}
  play() {
    this.paused = false;
    return new Promise((resolve, reject) => this.calls.push({ resolve, reject }));
  }
  pause() { this.paused = true; this.pauses++; }
}

async function fresh() {
  players.length = 0;
  globalThis.window = {};
  globalThis.Audio = FakeAudio;
  notify = await import(`./notify.ts?case=${crypto.randomUUID()}`);
  return notify;
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };
afterEach(() => {
  notify?.stopNewOrderRing();
  delete globalThis.window;
  delete globalThis.Audio;
});

test("uses the production ring-window calculation", async () => {
  const n = await fresh();
  const now = 1_700_000_000_000;
  assert.equal(n.ringUntilFor(now, now), now + 300_000);
  assert.equal(n.ringUntilFor(now + 300_001, now), 0);
});

test("new paid, unpaid and demo-paid orders get the same ring window", async () => {
  const n = await fresh();
  const now = 1_700_000_000_000;
  for (const paymentStatus of ["pending", "paid", "demo_paid", undefined]) {
    const seen = new Map();
    const order = { id: "ticket", status: "placed", paymentStatus, createdAt: now - 600_000 };
    assert.equal(n.ringUntilForOrders([order], seen, now), now + 300_000);
    assert.equal(seen.get(order.id), now);
  }
});

test("polls and pending-to-paid changes do not reset or extend an existing window", async () => {
  const n = await fresh();
  const seen = new Map();
  const now = 1_700_000_000_000;
  const order = { id: "ticket", status: "placed", paymentStatus: "pending" };
  n.ringUntilForOrders([order], seen, now);
  assert.equal(n.ringUntilForOrders([{ ...order, paymentStatus: "paid" }], seen, now + 10_000), now + 300_000);
  assert.equal(n.ringUntilForOrders([order], seen, now + 300_001), 0);
});

test("a second order extends ringing without extending the first order's window", async () => {
  const n = await fresh();
  const seen = new Map();
  const now = 1_700_000_000_000;
  const first = { id: "first", status: "placed" };
  const second = { id: "second", status: "placed" };
  n.ringUntilForOrders([first], seen, now);
  assert.equal(n.ringUntilForOrders([first, second], seen, now + 60_000), now + 360_000);
  assert.equal(seen.get("first"), now);
  assert.equal(seen.get("second"), now + 60_000);
});

test("acceptance, cancellation, refund and completion remove tickets from ringing", async () => {
  const n = await fresh();
  for (const patch of [{ status: "accepted" }, { status: "preparing" }, { status: "completed" }, { status: "cancelled" }, { refunded: true }, { statusOverride: "accepted" }]) {
    const seen = new Map([["ticket", 1000]]);
    const order = { id: "ticket", status: "placed", ...patch };
    assert.equal(n.ringUntilForOrders([order], seen, 2000), 0);
    assert.equal(seen.size, 0);
  }
});

test("resolving one ticket keeps the other ticket's ringtone active", async () => {
  const n = await fresh();
  const seen = new Map([["first", 1000], ["second", 2000]]);
  assert.equal(n.ringUntilForOrders([{ id: "first", status: "accepted" }, { id: "second", status: "placed" }], seen, 3000), 302_000);
  assert.deepEqual([...seen.keys()], ["second"]);
});

test("unlock completion cannot pause a newly started order ring", async () => {
  const n = await fresh();
  n.unlockAudio();
  const a = players[0];
  n.startNewOrderRing(Date.now() + 30_000);
  a.calls[0].resolve();
  await flush();
  assert.equal(a.paused, false);
  assert.equal(a.volume, 1);
  assert.equal(a.loop, true);
});

test("unlock completion cannot silence the test chime", async () => {
  const n = await fresh();
  n.unlockAudio();
  n.playTestChime();
  const a = players[0];
  a.calls[0].resolve();
  await flush();
  assert.equal(a.paused, false);
  assert.equal(a.volume, 1);
  assert.equal(a.loop, false);
});

test("a gesture while ringing preserves volume, position and looping", async () => {
  const n = await fresh();
  n.startNewOrderRing(Date.now() + 30_000, "kitchen");
  const a = players[0];
  a.calls[0].resolve();
  await flush();
  a.currentTime = 0.4;
  n.unlockAudio();
  for (const c of a.calls) c.resolve();
  await flush();
  assert.equal(a.paused, false);
  assert.equal(a.currentTime, 0.4);
  assert.equal(a.volume, 1);
  assert.equal(a.loop, true);
});

test("changing or testing the tone cannot turn an active ring into a one-shot", async () => {
  const n = await fresh();
  n.startNewOrderRing(Date.now() + 30_000);
  n.playTestChime("siren");
  assert.equal(players[0].loop, true);
});

test("an expired ring does not create or start an audio player", async () => {
  const n = await fresh();
  n.startNewOrderRing(Date.now() - 1);
  assert.equal(players.length, 0);
});

test("mute or resolution stops audio and cancels a pending play result", async () => {
  const n = await fresh();
  n.startNewOrderRing(Date.now() + 30_000);
  const a = players[0];
  n.stopNewOrderRing();
  a.calls[0].resolve();
  await flush();
  assert.equal(a.paused, true);
  assert.equal(a.currentTime, 0);
});

test("a newer ticket replaces the old stop timer and expires at its own deadline", async (t) => {
  const n = await fresh();
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 1_700_000_000_000 });
  n.startNewOrderRing(Date.now() + 100);
  const a = players[0];
  t.mock.timers.tick(50);
  n.startNewOrderRing(Date.now() + 200);
  t.mock.timers.tick(50);
  assert.equal(a.paused, false);
  t.mock.timers.tick(200);
  assert.equal(a.paused, true);
});

test("async unlock waits for the actual play result", async () => {
  const n = await fresh();
  let done = false;
  const result = n.unlockAudioAsync().then(() => { done = true; });
  await flush();
  assert.equal(done, false);
  players[0].calls[0].resolve();
  await result;
  assert.equal(done, true);
  assert.equal(n.getAudioState(), "ready");
});

test("retries a rejected play on the next gesture and reports actual readiness", async () => {
  const n = await fresh();
  const observed = [];
  const unsubscribe = n.subscribeAudioState(() => observed.push(n.getAudioState()));
  n.startNewOrderRing(Date.now() + 30_000);
  const a = players[0];
  a.calls[0].reject(new DOMException("User gesture required", "NotAllowedError"));
  await flush();
  assert.equal(n.isAudioUnlocked(), false);
  assert.equal(n.getAudioState(), "blocked");
  n.unlockAudio();
  a.calls.at(-1).resolve();
  await flush();
  assert.equal(n.getAudioState(), "ready");
  assert.equal(a.loop, true);
  assert.equal(a.volume, 1);
  assert.deepEqual(observed, ["blocked", "ready"]);
  unsubscribe();
});

test("a stale failure cannot relock a newer successful playback", async () => {
  const n = await fresh();
  n.unlockAudio();
  n.startNewOrderRing(Date.now() + 30_000);
  const a = players[0];
  a.calls.at(-1).resolve();
  await flush();
  a.calls[0].reject(new DOMException("Old source was replaced", "AbortError"));
  await flush();
  assert.equal(n.isAudioUnlocked(), true);
  assert.equal(n.getAudioState(), "ready");
});

test("all existing tones produce a cached WAV blob without a remote request", async () => {
  const n = await fresh();
  for (const tone of n.RING_TONES) {
    n.playTestChime(tone.id);
    const a = players[0];
    const first = a.src;
    assert.ok(first.startsWith("blob:"));
    assert.equal(a.dataset.tone, tone.id);
    n.playTestChime(tone.id);
    assert.equal(a.src, first);
  }
});

test("does not create unused Web Audio contexts during dashboard gestures", async () => {
  const n = await fresh();
  let contexts = 0;
  window.AudioContext = class { constructor() { contexts++; throw new Error("unneeded"); } };
  n.unlockAudio();
  n.unlockAudio();
  assert.equal(contexts, 0);
});

test("both build roots explicitly allow local ringtone blobs only for media", async () => {
  const rootConfig = (await import("../../../next.config.mjs")).default;
  for (const c of [config, rootConfig]) {
    const policies = (await c.headers()).flatMap(r => r.headers).filter(h => h.key === "Content-Security-Policy");
    assert.equal(policies.length, 1);
    const media = policies[0].value.split(";").map(s => s.trim()).find(s => s.startsWith("media-src "));
    assert.equal(media, "media-src 'self' blob:");
    assert.ok(policies[0].value.includes("default-src 'self';"));
    assert.ok(policies[0].value.includes("object-src 'none';"));
  }
});
