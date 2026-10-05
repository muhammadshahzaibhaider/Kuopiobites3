import { createHash, timingSafeEqual } from "node:crypto";
import type { Request } from "express";
import { CFG } from "./config";
import { logActivity } from "./supabase";

export const requestIp = (req: Request): string => (req.ip || req.socket.remoteAddress || "unknown").slice(0, 80);

export const opaqueIdentifier = (value: string): string =>
  createHash("sha256").update(value.trim().toLowerCase()).digest("hex").slice(0, 16);

const attemptKey = (scope: string, identifier: string, ip: string): string =>
  createHash("sha256").update(`${scope}:${identifier.trim().toLowerCase()}:${ip}`).digest("hex");

const attempts = new Map<string, { failures: number; firstFailedAt: number; lockedUntil: number }>();

export function loginIsLocked(scope: string, identifier: string, ip: string): number {
  const row = attempts.get(attemptKey(scope, identifier, ip));
  const now = Date.now();
  if (!row || row.lockedUntil <= now) return 0;
  return row.lockedUntil;
}

export function recordLoginFailure(scope: string, identifier: string, ip: string): number {
  const key = attemptKey(scope, identifier, ip);
  const now = Date.now();
  const windowMs = CFG.rate.loginWindowMs;
  const row = attempts.get(key);
  const withinWindow = row && now - row.firstFailedAt < windowMs;
  const failures = withinWindow ? row.failures + 1 : 1;
  const first = withinWindow ? row.firstFailedAt : now;
  const lockedUntil = failures >= CFG.rate.loginMaxAttempts
    ? now + CFG.rate.loginLockoutSeconds * 1000
    : 0;
  attempts.set(key, { failures, firstFailedAt: first, lockedUntil });
  for (const [attempt, value] of attempts) {
    if (now - value.firstFailedAt > windowMs * 2 && value.lockedUntil <= now) attempts.delete(attempt);
  }
  logActivity(`login:${opaqueIdentifier(identifier)}`, "security", `${scope} login failure${lockedUntil ? " (temporarily locked)" : ""}`);
  return lockedUntil;
}

export function clearLoginFailures(scope: string, identifier: string, ip: string): void {
  attempts.delete(attemptKey(scope, identifier, ip));
}

export function csrfMatches(req: Request): boolean {
  /* A bearer client in the documented migration bridge is not exposed to
     browser cookie CSRF. Browser requests, including unauthenticated public
     reservations and login, must present the double-submit token. */
  if ((req as any).authSource === "bearer") return true;
  const cookie = (req.headers.cookie || "").split(";").map((part) => part.trim()).find((part) => part.startsWith(`${CFG.csrfCookieName}=`))?.slice(CFG.csrfCookieName.length + 1);
  const header = req.headers["x-csrf-token"];
  const token = Array.isArray(header) ? header[0] : header;
  if (!cookie || !token || !/^[A-Za-z0-9_-]{32,}$/.test(token)) return false;
  try {
    const left = Buffer.from(decodeURIComponent(cookie));
    const right = Buffer.from(token);
    return left.length === right.length && timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

export function safeLogError(requestId: string, err: unknown): void {
  const message = err instanceof Error ? err.message : "unknown error";
  console.error(JSON.stringify({ level: "error", requestId, message: message.slice(0, 240) }));
}
