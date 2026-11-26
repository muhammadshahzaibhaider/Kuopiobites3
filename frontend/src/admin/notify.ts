"use client";
import type { OrderStatus } from "../lib/types";

/* Keep one HTMLAudioElement for priming, previews and the looping kitchen ring.
   Playback must start inside a user gesture when autoplay is blocked. Async
   results belong to one attempt: a late prime must never pause a newer ring. */

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

const wavCache = new Map<RingToneId, string>();
let player: HTMLAudioElement | null = null;
let ringTimer: ReturnType<typeof setTimeout> | null = null;
let ringUntil = 0;
let activeTone: RingToneId = "classic";
let unlocked = false;
let playVersion = 0;
let pendingPlay: Promise<void> | null = null;
export type AudioState = "locked" | "ready" | "blocked";
let audioState: AudioState = "locked";
const audioListeners = new Set<() => void>();

export const getAudioState = (): AudioState => audioState;
export function subscribeAudioState(listener: () => void): () => void {
  audioListeners.add(listener);
  return () => { audioListeners.delete(listener); };
}

function setAudioState(next: AudioState): void {
  unlocked = next === "ready";
  if (next === audioState) return;
  audioState = next;
  audioListeners.forEach((listener) => listener());
}

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

function setTone(a: HTMLAudioElement): void {
  if (a.dataset.tone === activeTone && a.src) return;
  a.src = wavFor(activeTone);
  a.dataset.tone = activeTone;
}

function playAudio(a: HTMLAudioElement, onStarted?: () => void): void {
  const version = ++playVersion;
  // Call play synchronously, while the trusted gesture is still active.
  pendingPlay = a.play().then(() => {
    if (version !== playVersion) return;
    pendingPlay = null;
    setAudioState("ready");
    onStarted?.();
  }).catch(() => {
    if (version !== playVersion) return;
    pendingPlay = null;
    setAudioState("blocked");
  });
}

/** Call from a click/keydown handler BEFORE any await. */
export function unlockAudio(): void {
  if (typeof window === "undefined") return;
  if (ringUntil > Date.now()) {
    ensurePlaying();
    return;
  }
  if (unlocked || pendingPlay) return;
  const a = getPlayer();
  if (!a) return;
  setTone(a);
  a.loop = false;
  a.volume = 0.001;
  playAudio(a, () => {
    a.pause();
    a.currentTime = 0;
    a.volume = 1;
  });
}

export async function unlockAudioAsync(): Promise<void> {
  unlockAudio();
  await pendingPlay;
}

function stopTimer(): void {
  if (ringTimer != null) {
    clearTimeout(ringTimer);
    ringTimer = null;
  }
}

export function stopNewOrderRing(): void {
  ++playVersion;
  pendingPlay = null;
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
  setTone(a);
  a.loop = true;
  a.volume = 1;
  playAudio(a);
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
  if (ringUntil > Date.now()) {
    ensurePlaying();
    return;
  }
  const a = getPlayer();
  if (!a) return;
  setTone(a);
  a.loop = false;
  a.volume = 1;
  a.currentTime = 0;
  playAudio(a);
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

type RingOrder = { id: string; status?: OrderStatus; statusOverride?: OrderStatus; refunded?: boolean };

export function isOpenOrderTicket(order: RingOrder): boolean {
  return (order.statusOverride ?? order.status ?? "placed") === "placed" && !order.refunded;
}

/** Payment confirmation is deliberately independent from notification eligibility. */
export function ringUntilForOrders(orders: readonly RingOrder[], firstSeenAt: Map<string, number>, now: number): number {
  const live = orders.filter(isOpenOrderTicket);
  const ids = new Set(live.map((order) => order.id));
  for (const id of firstSeenAt.keys()) {
    if (!ids.has(id)) firstSeenAt.delete(id);
  }
  let until = 0;
  for (const order of live) {
    if (!firstSeenAt.has(order.id)) firstSeenAt.set(order.id, now);
    until = Math.max(until, ringUntilFor(now, firstSeenAt.get(order.id)!));
  }
  return until;
}
