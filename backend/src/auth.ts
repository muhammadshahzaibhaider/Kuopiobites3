import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { CFG } from "./config";
import { db } from "./db";

export type Role = "owner" | "manager" | "kitchen";
export interface TokenPayload {
  sub: string;
  scope: "customer" | "staff";
  role?: Role;
  name?: string;
}

export const signCustomer = (sub: string, name: string) =>
  jwt.sign({ sub, scope: "customer", name } satisfies TokenPayload, CFG.jwtSecret, {
    expiresIn: "7d",
  });
export const signStaff = (sub: string, role: Role, name: string) =>
  jwt.sign({ sub, scope: "staff", role, name } satisfies TokenPayload, CFG.jwtSecret, {
    expiresIn: "12h",
  });

export function verify(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, CFG.jwtSecret) as TokenPayload;
  } catch {
    return null;
  }
}

/** attaches req.auth when a valid bearer token is present (optional auth) */
export function readAuth(req: Request, _res: Response, next: NextFunction) {
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer (.+)$/);
  (req as any).auth = m ? verify(m[1]) : null;
  next();
}

export function requireCustomer(req: Request, res: Response, next: NextFunction) {
  const a = (req as any).auth as TokenPayload | null;
  if (!a || a.scope !== "customer") return res.status(401).json({ error: "auth.required" });
  next();
}

const RANK: Record<Role, number> = { kitchen: 1, manager: 2, owner: 3 };

/** staff-only; optionally enforce a minimum role (never trust the UI to hide buttons) */
export function requireStaff(min: Role = "kitchen") {
  return (req: Request, res: Response, next: NextFunction) => {
    const a = (req as any).auth as TokenPayload | null;
    if (!a || a.scope !== "staff" || !a.role)
      return res.status(403).json({ error: "auth.staffRequired" });
    if (RANK[a.role] < RANK[min]) return res.status(403).json({ error: "auth.role" });
    next();
  };
}

export function staffRow(username: string) {
  return db.prepare(`SELECT * FROM staff WHERE username = ?`).get(username) as
    | { id: string; username: string; pass_hash: string; role: Role }
    | undefined;
}
