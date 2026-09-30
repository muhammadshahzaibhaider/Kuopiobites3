/**
 * Single typed HTTP client — the ONLY place the frontend knows about the backend.
 * `NEXT_PUBLIC_API_BASE_URL` is the sole backend-related variable allowed here
 * (a public origin, never a secret). In the sandbox preview the sibling 4000-port
 * host is derived from window.location when the env var is unset.
 */
const ENV_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

export function apiBase(): string {
  if (ENV_BASE) return ENV_BASE;
  if (typeof window !== "undefined") {
    const m = window.location.origin.match(/^(https?:\/\/)(\d+)(-.+)$/);
    if (m) return m[1] + "4000" + m[3]; // e2b preview hosts: 3000-xxx → 4000-xxx
    return "http://localhost:4000";
  }
  return "http://localhost:4000";
}

export const getToken = () =>
  typeof window === "undefined" ? null : localStorage.getItem("kb_token");
export const setToken = (t: string | null) => {
  if (typeof window === "undefined") return;
  if (t) localStorage.setItem("kb_token", t);
  else localStorage.removeItem("kb_token");
};
export const getStaffToken = () =>
  typeof window === "undefined" ? null : localStorage.getItem("kb_staff_token");
export const setStaffToken = (t: string | null) => {
  if (typeof window === "undefined") return;
  if (t) localStorage.setItem("kb_staff_token", t);
  else localStorage.removeItem("kb_staff_token");
};

export class ApiError extends Error {}

export async function api<T>(
  path: string,
  opts: { method?: string; body?: unknown; staff?: boolean } = {}
): Promise<T> {
  const token = opts.staff ? getStaffToken() : getToken();
  const res = await fetch(apiBase() + path, {
    method: opts.method ?? "GET",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((json as { error?: string }).error || `http ${res.status}`);
  return (json as { data: T }).data;
}
