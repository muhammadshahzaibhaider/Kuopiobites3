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

/** A warm three-note "ding-dong" that repeats twice for a new order. */
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

/** Soft confirmation used when enabling the sound toggle. */
export function playTestChime(): void {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  const t = c.currentTime + 0.02;
  note(c, 659.25, t, 0.22, 0.1);
  note(c, 987.77, t + 0.14, 0.3, 0.1);
}
