import { clsx, type ClassValue } from "clsx";

export function cx(...inputs: ClassValue[]) {
  return clsx(...inputs);
}

/** Prices always use a decimal point: €10.50 — never a comma. */
export function eur(n: number): string {
  return n.toFixed(2) + " €";
}

export function telHref(phone: string): string {
  const number = phone.replace(/[^0-9+]/g, "");
  if (!number) return "";
  return `tel:${number.startsWith("0") ? `+358${number.slice(1)}` : number}`;
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
