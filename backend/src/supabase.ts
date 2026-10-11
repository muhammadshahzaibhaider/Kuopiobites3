import "./config";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "").trim();

if (!url || !key) {
  if (!process.env.VERCEL) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in backend/.env");
  }
}

const authOptions = {
  persistSession: false,
  autoRefreshToken: false,
  detectSessionInUrl: false,
};

function requireClient(): SupabaseClient {
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in backend/.env");
  }
  return createClient(url, key, { auth: authOptions });
}

const eagerClient: SupabaseClient | null = url && key ? createClient(url, key, { auth: authOptions }) : null;

export const db: SupabaseClient = eagerClient ?? new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = requireClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export const authClient = (): SupabaseClient => requireClient();

export function must<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  if (result.data === null) throw new Error("not found");
  return result.data;
}

export function logActivity(actorName: string, actorRole: string, message: string): void {
  void Promise.resolve(db.from("activity_log").insert({
    actor_name: actorName.slice(0, 120),
    actor_role: actorRole.slice(0, 40),
    action: message.slice(0, 120),
    details: { message: message.slice(0, 500) },
  })).then(({ error }) => {
    if (error) console.error(`audit.write: ${error.message}`);
  }).catch((error: unknown) => {
    console.error(`audit.write: ${error instanceof Error ? error.message : "unknown"}`);
  });
}
