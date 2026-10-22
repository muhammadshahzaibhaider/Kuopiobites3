"use client";

/* Kitchen notification chime — synthesised with the Web Audio API so the
   admin panel needs no audio asset and works offline. Browsers only allow
   audio after a user gesture; unlock() is called from the sign-in click and
   from any first pointer interaction in the panel. */

let ctx: AudioContext | null = null;

type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const Ctor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    return null;
  }
  return ctx;
}

export function unlockAudio(): void {
  const c = getCtx();
  if (c && c.state === "suspended") void c.resume();
}

function note(c: AudioContext, freq: number, start: number, duration: number, peak = 0.16) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(peak, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(start);
  osc.stop(start + duration + 0.04);
}

/** One pass of the kitchen chime (~1.5s). */
export function playNewOrderChime(): void {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  const t = c.currentTime + 0.03;
  // E5 · A5 · C#6 — bright enough to cut through kitchen noise
  note(c, 659.25, t, 0.28);
  note(c, 880.0, t + 0.18, 0.34);
  note(c, 1108.73, t + 0.38, 0.5, 0.13);
  note(c, 880.0, t + 0.75, 0.24, 0.1);
  note(c, 1108.73, t + 0.92, 0.55, 0.12);
}

/** Keep ringing until the kitchen accepts, or 5 minutes, whichever is first. */
export const NEW_ORDER_RING_MS = 5 * 60 * 1000;
const CHIME_GAP_MS = 1800;

let ringTimer: ReturnType<typeof setInterval> | null = null;
let ringUntil = 0;

export function startNewOrderRing(untilTs: number): void {
  if (typeof window === "undefined") return;
  ringUntil = Math.max(ringUntil, untilTs);
  if (ringUntil <= Date.now()) {
    stopNewOrderRing();
    return;
  }
  if (ringTimer != null) return;
  unlockAudio();
  playNewOrderChime();
  ringTimer = setInterval(() => {
    if (Date.now() >= ringUntil) {
      stopNewOrderRing();
      return;
    }
    playNewOrderChime();
  }, CHIME_GAP_MS);
}

export function stopNewOrderRing(): void {
  if (ringTimer != null) {
    clearInterval(ringTimer);
    ringTimer = null;
  }
  ringUntil = 0;
}

/** Soft confirmation used when enabling the sound toggle. */
export function playTestChime(): void {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  const t = c.currentTime + 0.02;
  note(c, 659.25, t, 0.22, 0.1);
  note(c, 987.77, t + 0.14, 0.3, 0.1);
}
