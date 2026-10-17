import { clsx, type ClassValue } from "clsx";

export function cx(...inputs: ClassValue[]) {
  return clsx(...inputs);
}

/** Prices always use a decimal point: €10.50 — never a comma. */
export function eur(n: number): string {
  return "€" + n.toFixed(2);
}

export function uid(prefix = ""): string {
  return (
    prefix +
    Math.random().toString(36).slice(2, 8) +
    Date.now().toString(36).slice(-4)
  );
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("fi-FI", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtDate(ts: number | string): string {
  const d = typeof ts === "string" ? new Date(ts + "T12:00:00") : new Date(ts);
  return d.toLocaleDateString("fi-FI", {
    weekday: "short",
    day: "numeric",
    month: "numeric",
  });
}

/** Absolute promise time (ms) for an order; falls back to created + estimate. */
export function readyAtOf(o: { createdAt: number; etaMinutes?: number; readyAt?: number }): number {
  return o.readyAt ?? o.createdAt + Math.max(1, o.etaMinutes ?? 25) * 60000;
}

/** Minutes remaining (rounded up), 0 once the promise time has passed. */
export function minutesLeft(readyAt: number, now = Date.now()): number {
  return Math.max(0, Math.ceil((readyAt - now) / 60000));
}

/** "18:45" in the browser locale — used on ETA badges. */
export function clockLabel(ts: number): string {
  return new Date(ts).toLocaleTimeString("fi-FI", { hour: "2-digit", minute: "2-digit" });
}

/** Compact countdown label: 14 min · 3 min 20 s · now. */
export function countdownLabel(msLeft: number): string {
  if (msLeft <= 0) return "now";
  const mins = Math.floor(msLeft / 60000);
  const secs = Math.floor((msLeft % 60000) / 1000);
  if (mins <= 0) return `${secs} s`;
  return secs > 0 && mins < 10 ? `${mins} min ${secs} s` : `${mins} min`;
}
