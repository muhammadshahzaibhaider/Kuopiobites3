"use client";

/* Kitchen ring: HTMLAudioElement (looping WAV) is the primary path.
   Web Audio oscillators used to fail silently because:
   1) Sign-in awaits the network, so the user-gesture is gone before AudioContext starts.
   2) A context created after that await stays "suspended" and playToneAt never runs.
   3) Ring stop used createdAt+5min, so a ticket older than 5 minutes never sounded.
   Unlock must run in the same click/keydown tick (before any await). */

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

export const NEW_ORDER_RING_MS = 5 * 60 * 1000;

type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

const wavCache = new Map<RingToneId, string>();
let player: HTMLAudioElement | null = null;
let ringTimer: ReturnType<typeof setTimeout> | null = null;
let ringUntil = 0;
let activeTone: RingToneId = "classic";
let unlocked = false;

function toneSpec(tone: RingToneId): { f: number; t0: number; t1: number }[] {
  if (tone === "kitchen") return [{ f: 980, t0: 0, t1: 0.22 }, { f: 980, t0: 0.22, t1: 0.44 }, { f: 1318, t0: 0.44, t1: 0.72 }];
  if (tone === "siren") return [{ f: 780, t0: 0, t1: 0.36 }, { f: 1180, t0: 0.36, t1: 0.72 }];
  if (tone === "buzzer") return [{ f: 440, t0: 0, t1: 0.18 }, { f: 880, t0: 0.18, t1: 0.36 }, { f: 440, t0: 0.36, t1: 0.54 }, { f: 880, t0: 0.54, t1: 0.72 }];
  if (tone === "doorbell") return [{ f: 523.25, t0: 0, t1: 0.36 }, { f: 659.25, t0: 0.36, t1: 0.72 }];
  return [{ f: 659.25, t0: 0, t1: 0.24 }, { f: 880, t0: 0.16, t1: 0.42 }, { f: 1108.73, t0: 0.36, t1: 0.72 }];
}

function wavFor(tone: RingToneId): string {
  const hit = wavCache.get(tone);
  if (hit) return hit;
  const sr = 22050;
  const seconds = 0.8;
  const n = Math.floor(sr * seconds);
  const bytes = new ArrayBuffer(44 + n * 2);
  const v = new DataView(bytes);
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); w(8, "WAVE"); w(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, "data"); v.setUint32(40, n * 2, true);
  const parts = toneSpec(tone);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    let s = 0;
    for (const p of parts) {
      if (t >= p.t0 && t < p.t1) s += Math.sin(2 * Math.PI * p.f * t) * 0.32;
    }
    v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, s)) * 32767, true);
  }
  const url = URL.createObjectURL(new Blob([bytes], { type: "audio/wav" }));
  wavCache.set(tone, url);
  return url;
}

function getPlayer(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (player) return player;
  player = new Audio();
  player.preload = "auto";
  player.loop = true;
  player.setAttribute("playsinline", "true");
  return player;
}

function primeWebAudio(): void {
  if (typeof window === "undefined") return;
  const Ctor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
  if (!Ctor) return;
  try {
    const c = new Ctor();
    const g = c.createGain();
    g.gain.value = 0.0001;
    const o = c.createOscillator();
    o.connect(g).connect(c.destination);
    o.start();
    o.stop(c.currentTime + 0.05);
    void c.resume();
  } catch { /* ignore */ }
}

/** Call from a click/keydown handler BEFORE any await. */
export function unlockAudio(): void {
  if (typeof window === "undefined") return;
  const a = getPlayer();
  if (!a) return;
  a.src = wavFor(activeTone);
  a.loop = true;
  a.volume = 0.001;
  const p = a.play();
  if (p && typeof p.then === "function") {
    void p.then(() => {
      a.pause();
      a.currentTime = 0;
      a.volume = 1;
      unlocked = true;
    }).catch(() => { /* still locked until a real gesture */ });
  }
  primeWebAudio();
}

export async function unlockAudioAsync(): Promise<void> {
  unlockAudio();
}

function stopTimer(): void {
  if (ringTimer != null) {
    clearTimeout(ringTimer);
    ringTimer = null;
  }
}

export function stopNewOrderRing(): void {
  stopTimer();
  ringUntil = 0;
  const a = player;
  if (!a) return;
  try {
    a.pause();
    a.currentTime = 0;
  } catch { /* ignore */ }
}

function ensurePlaying(): void {
  const a = getPlayer();
  if (!a) return;
  const url = wavFor(activeTone);
  if (!a.src || a.dataset.tone !== activeTone) {
    a.src = url;
    a.dataset.tone = activeTone;
  }
  a.loop = true;
  a.volume = 1;
  void a.play().then(() => { unlocked = true; }).catch(() => { unlocked = false; });
}

export function startNewOrderRing(untilTs: number, tone: RingToneId = "classic"): void {
  if (typeof window === "undefined") return;
  activeTone = tone;
  ringUntil = Math.max(ringUntil, untilTs);
  const remain = ringUntil - Date.now();
  if (remain <= 0) {
    stopNewOrderRing();
    return;
  }
  ensurePlaying();
  stopTimer();
  ringTimer = setTimeout(() => stopNewOrderRing(), remain);
}

export function playNewOrderChime(tone: RingToneId = "classic"): void {
  activeTone = tone;
  const a = getPlayer();
  if (!a) return;
  a.loop = false;
  a.src = wavFor(tone);
  a.volume = 1;
  a.currentTime = 0;
  void a.play().then(() => { unlocked = true; }).catch(() => { unlocked = false; });
}

export function playTestChime(tone: RingToneId = "classic"): void {
  playNewOrderChime(tone);
}

export function isAudioUnlocked(): boolean {
  return unlocked;
}

/** Ring window starts when this tab first sees the ticket, not from createdAt. */
export function ringUntilFor(now: number, firstSeenAt: number, windowMs = NEW_ORDER_RING_MS): number {
  return firstSeenAt + windowMs > now ? firstSeenAt + windowMs : 0;
}
