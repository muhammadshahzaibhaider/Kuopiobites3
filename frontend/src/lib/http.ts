/**
 * Browser transport. The app uses a same-origin Next proxy for /api and /media,
 * so the browser never calls localhost or a hard-coded backend host directly.
 * Authentication is carried only by HttpOnly cookies; no JWT is stored in JS.
 */
const ENV_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";
let csrfToken: string | null = null;

export function apiBase(): string {
  /* Relative URLs keep cookies same-origin in the browser. ENV_BASE is used only
     by server-side tooling/tests that import this module. */
  return typeof window === "undefined" ? ENV_BASE : "";
}

/* Compatibility exports: bearer tokens are intentionally no longer persisted. */
export const getToken = () => null;
export const setToken = (_token: string | null) => undefined;
export const getStaffToken = () => null;
export const setStaffToken = (_token: string | null) => undefined;

export class ApiError extends Error {}

async function ensureCsrf(): Promise<string> {
  if (csrfToken) return csrfToken;
  const response = await fetch(apiBase() + "/api/auth/csrf", { credentials: "include", cache: "no-store" });
  const json = await response.json().catch(() => ({})) as { data?: { csrfToken?: string } };
  if (!response.ok || !json.data?.csrfToken) throw new ApiError("csrf.unavailable");
  csrfToken = json.data.csrfToken;
  return csrfToken;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const json = await response.json().catch(() => ({})) as { data?: T; error?: string };
  if (!response.ok) throw new ApiError(json.error || `http ${response.status}`);
  return json.data as T;
}

export async function api<T>(
  path: string,
  opts: { method?: string; body?: unknown; staff?: boolean } = {}
): Promise<T> {
  const method = (opts.method ?? "GET").toUpperCase();
  const headers: Record<string, string> = { accept: "application/json" };
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  if (opts.staff) headers["x-session-scope"] = "staff";
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) headers["x-csrf-token"] = await ensureCsrf();
  const response = await fetch(apiBase() + path, {
    method,
    headers,
    credentials: "include",
    cache: "no-store",
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  return parseResponse<T>(response);
}

export async function apiBinary<T>(
  path: string,
  body: Blob,
  opts: { contentType: string; staff?: boolean } = { contentType: "application/octet-stream" }
): Promise<T> {
  const headers: Record<string, string> = { accept: "application/json", "content-type": opts.contentType };
  if (opts.staff) headers["x-session-scope"] = "staff";
  headers["x-csrf-token"] = await ensureCsrf();
  const response = await fetch(apiBase() + path, { method: "POST", headers, credentials: "include", body });
  return parseResponse<T>(response);
}
