/**
 * Browser transport. The app uses a same-origin Next proxy for /api and /media,
 * so the browser never calls localhost or a hard-coded backend host directly.
 * Authentication is carried only by HttpOnly cookies; no JWT is stored in JS.
 */
const ENV_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";
const CSRF_COOKIE = "kb_csrf";
const REQUEST_TIMEOUT_MS = 15_000;
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

function csrfFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const pair = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${CSRF_COOKIE}=`));
  if (!pair) return null;
  try {
    const value = decodeURIComponent(pair.slice(CSRF_COOKIE.length + 1));
    return /^[A-Za-z0-9_-]{32,}$/.test(value) ? value : null;
  } catch {
    return null;
  }
}

async function fetchCsrfToken(): Promise<string> {
  const json = await request<{ csrfToken: string }>("/api/auth/csrf", { method: "GET" });
  if (!json?.csrfToken) throw new ApiError("csrf.unavailable");
  csrfToken = json.csrfToken;
  return csrfToken;
}

/**
 * The double-submit header must mirror the CURRENT kb_csrf cookie. Reading the
 * cookie per request (instead of trusting a stale cached token) is what keeps
 * logout → login working without a page reload; the retry below covers any
 * remaining race (e.g. the token rotating between tab focus and submit).
 */
async function csrfHeader(): Promise<string> {
  return csrfFromCookie() ?? csrfToken ?? fetchCsrfToken();
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(apiBase() + path, { credentials: "include", cache: "no-store", ...init, signal: controller.signal });
  } catch (error) {
    /* Offline, DNS, proxy-down and timeout all surface as friendly codes. */
    throw new ApiError(error instanceof DOMException && error.name === "AbortError" ? "net.timeout" : "net.offline");
  } finally {
    clearTimeout(timer);
  }
  const json = await response.json().catch(() => ({})) as { data?: T; error?: string };
  if (!response.ok) throw new ApiErrorWithStatus(json.error || `http ${response.status}`, response.status);
  return json.data as T;
}

class ApiErrorWithStatus extends ApiError {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(
  path: string,
  opts: { method?: string; body?: unknown; staff?: boolean } = {}
): Promise<T> {
  const method = (opts.method ?? "GET").toUpperCase();
  const headers: Record<string, string> = { accept: "application/json" };
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  if (opts.staff) headers["x-session-scope"] = "staff";
  let retries = 1;
  while (true) {
    if (!["GET", "HEAD", "OPTIONS"].includes(method)) headers["x-csrf-token"] = await csrfHeader();
    try {
      return await request<T>(path, {
        method, headers,
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      });
    } catch (error) {
      if (retries > 0 && error instanceof ApiErrorWithStatus && error.status === 403 && error.message === "csrf.invalid") {
        retries -= 1;
        csrfToken = null;
        try { await fetchCsrfToken(); } catch { /* surface the original error below */ }
        continue;
      }
      throw error instanceof ApiError ? error : new ApiError("net.offline");
    }
  }
}

export async function apiBinary<T>(
  path: string,
  body: Blob,
  opts: { contentType: string; staff?: boolean } = { contentType: "application/octet-stream" }
): Promise<T> {
  const headers: Record<string, string> = { accept: "application/json", "content-type": opts.contentType };
  if (opts.staff) headers["x-session-scope"] = "staff";
  headers["x-csrf-token"] = await csrfHeader();
  return request<T>(path, { method: "POST", headers, body });
}
