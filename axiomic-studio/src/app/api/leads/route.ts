import { NextResponse } from "next/server";

/**
 * Contact-form intake.
 *
 * Stores enquiries in Supabase (`leads` table) over its REST API — no SDK, so
 * the client bundle stays untouched. Configuration:
 *
 *   SUPABASE_URL               e.g. https://<ref>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY  server-only key (never exposed to the browser)
 *
 * If either variable is missing the route still accepts the request and reports
 * `stored: false`, so the form keeps working before Supabase is wired up.
 */

type Lead = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  service: string;
  budget: string;
  message: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function invalid(payload: Partial<Lead>): string | null {
  const required: (keyof Lead)[] = ["firstName", "lastName", "email", "phone", "service", "budget", "message"];
  for (const key of required) {
    if (!String(payload[key] ?? "").trim()) return `Missing field: ${key}`;
  }
  if (!EMAIL.test(String(payload.email))) return "Invalid email";
  if (String(payload.message).trim().length < 20) return "Message too short";
  if (String(payload.message).length > 5000) return "Message too long";
  return null;
}

export async function POST(request: Request) {
  let payload: Partial<Lead>;
  try {
    payload = (await request.json()) as Partial<Lead>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const problem = invalid(payload);
  if (problem) {
    return NextResponse.json({ ok: false, error: problem }, { status: 422 });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.warn("[leads] Supabase env not configured — accepting without storing");
    return NextResponse.json({ ok: true, stored: false });
  }

  const row = {
    first_name: payload.firstName!.trim(),
    last_name: payload.lastName!.trim(),
    email: payload.email!.trim().toLowerCase(),
    phone: payload.phone!.trim(),
    service: payload.service,
    budget: payload.budget,
    message: payload.message!.trim(),
    source: "website:contact",
    user_agent: request.headers.get("user-agent") ?? null,
  };

  try {
    const response = await fetch(`${url}/rest/v1/leads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify(row),
      cache: "no-store",
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("[leads] insert failed", response.status, detail);
      return NextResponse.json({ ok: false, error: "Could not save enquiry" }, { status: 502 });
    }

    return NextResponse.json({ ok: true, stored: true });
  } catch (error) {
    console.error("[leads] request failed", error);
    return NextResponse.json({ ok: false, error: "Could not save enquiry" }, { status: 502 });
  }
}
