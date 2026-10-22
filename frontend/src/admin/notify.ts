"use client";

/* Kitchen notification chimes — synthesised with the Web Audio API so the
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

export const RING_TONES = [
  { id: "classic", label: "Classic ding" },
  { id: "kitchen", label: "Kitchen beep" },
  { id: "siren", label: "Siren" },
  { id: "buzzer", label: "Buzzer" },
  { id: "doorbell", label: "Doorbell" },
] as const;

export type RingToneId = (typeof RING_TONES)[number]["id"];

export function isRingToneId(value: string): value is RingToneId {
  return RING_TONES.some((tone) => tone.id === value);
}

function burst(
  c: AudioContext,
  freq: number,
  start: number,
  duration: number,
  peak = 0.16,
  type: OscillatorType = "sine",
) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  const attack = Math.min(0.012, duration / 4);
  const release = Math.min(0.018, duration / 4);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + attack);
  gain.gain.setValueAtTime(peak, start + duration - release);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(start);
  osc.stop(start + duration + 0.01);
}

/** Length of one packed cycle — the next cycle starts at this offset (no extra silence). */
function playToneAt(c: AudioContext, tone: RingToneId, t: number): number {
  if (tone === "kitchen") {
    burst(c, 980, t, 0.22, 0.18, "square");
    burst(c, 980, t + 0.22, 0.22, 0.18, "square");
    burst(c, 1318, t + 0.44, 0.28, 0.2, "square");
    return 0.72;
  }
  if (tone === "siren") {
    burst(c, 780, t, 0.36, 0.17, "sawtooth");
    burst(c, 1180, t + 0.36, 0.36, 0.17, "sawtooth");
    return 0.72;
  }
  if (tone === "buzzer") {
    burst(c, 440, t, 0.18, 0.16, "square");
    burst(c, 880, t + 0.18, 0.18, 0.16, "square");
    burst(c, 440, t + 0.36, 0.18, 0.16, "square");
    burst(c, 880, t + 0.54, 0.18, 0.16, "square");
    return 0.72;
  }
  if (tone === "doorbell") {
    burst(c, 523.25, t, 0.36, 0.18, "triangle");
    burst(c, 659.25, t + 0.36, 0.36, 0.18, "triangle");
    return 0.72;
  }
  /* classic ding — notes packed so the next cycle butts against this one */
  burst(c, 659.25, t, 0.24, 0.17);
  burst(c, 880.0, t + 0.18, 0.26, 0.17);
  burst(c, 1108.73, t + 0.36, 0.36, 0.15);
  return 0.72;
}

export function playNewOrderChime(tone: RingToneId = "classic"): void {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  playToneAt(c, tone, c.currentTime + 0.02);
}

/** Keep ringing until the kitchen accepts, or 5 minutes, whichever is first. */
export const NEW_ORDER_RING_MS = 5 * 60 * 1000;

let ringTimer: ReturnType<typeof setTimeout> | null = null;
let ringUntil = 0;
let nextAt = 0;
let activeTone: RingToneId = "classic";

function scheduleAhead(): void {
  const c = getCtx();
  if (!c) return;
  if (Date.now() >= ringUntil) {
    stopNewOrderRing();
    return;
  }
  const horizon = c.currentTime + 0.55;
  while (nextAt < horizon) {
    if (Date.now() >= ringUntil) {
      stopNewOrderRing();
      return;
    }
    nextAt += playToneAt(c, activeTone, Math.max(nextAt, c.currentTime));
  }
  ringTimer = setTimeout(scheduleAhead, 200);
}

export function startNewOrderRing(untilTs: number, tone: RingToneId = "classic"): void {
  if (typeof window === "undefined") return;
  const toneChanged = ringTimer != null && activeTone !== tone;
  activeTone = tone;
  ringUntil = Math.max(ringUntil, untilTs);
  if (ringUntil <= Date.now()) {
    stopNewOrderRing();
    return;
  }
  if (ringTimer != null && !toneChanged) return;
  if (ringTimer != null) {
    clearTimeout(ringTimer);
    ringTimer = null;
  }
  unlockAudio();
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  nextAt = c.currentTime;
  scheduleAhead();
}

export function stopNewOrderRing(): void {
  if (ringTimer != null) {
    clearTimeout(ringTimer);
    ringTimer = null;
  }
  ringUntil = 0;
  nextAt = 0;
}

/** Preview the selected kitchen tone. */
export function playTestChime(tone: RingToneId = "classic"): void {
  playNewOrderChime(tone);
}
