import type { NextFunction, Request, Response } from "express";
import { randomBytes } from "node:crypto";
import { CFG } from "./config";
import { authClient, db } from "./supabase";

export type Role = "owner" | "manager" | "kitchen";
export interface TokenPayload {
  sub: string;
  scope: "customer" | "staff";
  role?: Role;
  name?: string;
}

const cookieValue = (req: Request, name: string): string | null => {
  const raw = req.headers.cookie || "";
  for (const pair of raw.split(";")) {
    const index = pair.indexOf("=");
    if (index < 0) continue;
    if (pair.slice(0, index).trim() === name) {
      try { return decodeURIComponent(pair.slice(index + 1).trim()); } catch { return null; }
    }
  }
  return null;
};

const cookieFlags = (maxAgeSeconds?: number) => [
  "Path=/",
  "HttpOnly",
  `SameSite=${CFG.cookieSameSite[0].toUpperCase()}${CFG.cookieSameSite.slice(1)}`,
  ...(CFG.cookieSecure ? ["Secure"] : []),
  ...(maxAgeSeconds === undefined ? [] : [`Max-Age=${maxAgeSeconds}`]),
].join("; ");

const csrfFlags = (maxAgeSeconds?: number) => [
  "Path=/",
  `SameSite=${CFG.cookieSameSite[0].toUpperCase()}${CFG.cookieSameSite.slice(1)}`,
  ...(CFG.cookieSecure ? ["Secure"] : []),
  ...(maxAgeSeconds === undefined ? [] : [`Max-Age=${maxAgeSeconds}`]),
].join("; ");

export function newCsrfToken(): string {
  return randomBytes(32).toString("base64url");
}

export function ensureCsrfCookie(res: Response, req: Request): string {
  const existing = cookieValue(req, CFG.csrfCookieName);
  if (existing && /^[A-Za-z0-9_-]{32,}$/.test(existing)) return existing;
  const token = newCsrfToken();
  res.append("Set-Cookie", `${CFG.csrfCookieName}=${encodeURIComponent(token)}; ${csrfFlags(8 * 60 * 60)}`);
  return token;
}

export function clearSessionCookies(res: Response): void {
  res.append("Set-Cookie", `${CFG.customerCookieName}=; ${cookieFlags(0)}`);
  res.append("Set-Cookie", `${CFG.staffCookieName}=; ${cookieFlags(0)}`);
  res.append("Set-Cookie", `kb_customer_refresh=; ${cookieFlags(0)}`);
  res.append("Set-Cookie", `kb_staff_refresh=; ${cookieFlags(0)}`);
  res.append("Set-Cookie", `${CFG.csrfCookieName}=; ${csrfFlags(0)}`);
}

function setSessionCookie(res: Response, scope: "customer" | "staff", accessToken: string, refreshToken: string): void {
  const name = scope === "staff" ? CFG.staffCookieName : CFG.customerCookieName;
  const refreshName = scope === "staff" ? "kb_staff_refresh" : "kb_customer_refresh";
  res.append("Set-Cookie", `${name}=${encodeURIComponent(accessToken)}; ${cookieFlags(60 * 60)}`);
  res.append("Set-Cookie", `${refreshName}=${encodeURIComponent(refreshToken)}; ${cookieFlags(30 * 24 * 60 * 60)}`);
}

export function issueCustomerSession(res: Response, accessToken: string, refreshToken: string): void {
  setSessionCookie(res, "customer", accessToken, refreshToken);
}

export function issueStaffSession(res: Response, accessToken: string, refreshToken: string): void {
  setSessionCookie(res, "staff", accessToken, refreshToken);
}

/**
 * Reads the HttpOnly cookie selected by the caller's scope header. A bearer
 * fallback is retained for the documented Supabase/migration bridge, but the
 * application never returns bearer tokens to the browser.
 */
export async function readAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const requestedScope = req.headers["x-session-scope"] === "staff" ? "staff" : "customer";
  const cookie = cookieValue(req, requestedScope === "staff" ? CFG.staffCookieName : CFG.customerCookieName);
  const refreshName = requestedScope === "staff" ? "kb_staff_refresh" : "kb_customer_refresh";
  const refreshToken = cookieValue(req, refreshName);
  const authorization = req.headers.authorization || "";
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  const accessToken = cookie || bearer;
  (req as any).auth = null;
  (req as any).authSource = cookie ? "cookie" : bearer ? "bearer" : "none";
  if (!accessToken && !refreshToken) return next();

  try {
    let user = accessToken ? (await db.auth.getUser(accessToken)).data.user : null;
    if (!user && refreshToken) {
      const { data, error } = await authClient().auth.refreshSession({ refresh_token: refreshToken });
      if (!error && data.session && data.user) {
        setSessionCookie(res, requestedScope, data.session.access_token, data.session.refresh_token);
        user = data.user;
        (req as any).authSource = "cookie";
      }
    }
    if (user) {
      (req as any).auth = { sub: user.id, scope: requestedScope } satisfies TokenPayload;
      (req as any).supabaseUser = user;
    }
    next();
  } catch (error) {
    next(error);
  }
}

export function currentAuth(req: Request): TokenPayload | null {
  return ((req as any).auth as TokenPayload | null) ?? null;
}

export async function customerRow(id: string) {
  const { data, error } = await db.from("customers")
    .select("id, name, email, phone, addresses, marketing_consent, favorites, created_at, lang")
    .eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return undefined;
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    phone: data.phone ?? "",
    addresses: JSON.stringify(data.addresses ?? []),
    marketing: data.marketing_consent ? 1 : 0,
    favorites: Array.from(new Set(data.favorites ?? [])),
    created_at: Date.parse(data.created_at),
    lang: data.lang,
  };
}

export async function staffById(id: string) {
  const { data, error } = await db.from("staff_users").select("id, username, name, role, active").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.active ? { ...data, role: data.role as Role } : undefined;
}

export async function requireCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = currentAuth(req);
  if (!auth || auth.scope !== "customer") return void res.status(401).json({ error: "auth.required" });
  try {
    const user = await customerRow(auth.sub);
    if (!user || !(req as any).supabaseUser?.email_confirmed_at) return void res.status(401).json({ error: "auth.sessionInvalid" });
    (req as any).customer = user;
    next();
  } catch (error) {
    next(error);
  }
}

const RANK: Record<Role, number> = { kitchen: 1, manager: 2, owner: 3 };

/** Staff role is looked up server-side so a demoted/deleted account cannot use an old JWT. */
export function requireStaff(min: Role = "kitchen") {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const auth = currentAuth(req);
    if (!auth || auth.scope !== "staff") return void res.status(403).json({ error: "auth.staffRequired" });
    try {
      const row = await staffById(auth.sub);
      if (!row || RANK[row.role] < RANK[min]) return void res.status(403).json({ error: "auth.role" });
      (req as any).staff = row;
      (req as any).auth = { ...auth, role: row.role, name: row.username } satisfies TokenPayload;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export async function staffRow(username: string) {
  const { data, error } = await db.from("staff_users")
    .select("id, username, name, role, active").ilike("username", username).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.active) return undefined;
  const { data: authData, error: authError } = await db.auth.admin.getUserById(data.id);
  if (authError || !authData.user.email) return undefined;
  return { ...data, email: authData.user.email, role: data.role as Role };
}

export function csrfCookie(req: Request): string | null {
  return cookieValue(req, CFG.csrfCookieName);
}
