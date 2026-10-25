import { NextRequest, NextResponse } from "next/server";
import { contactSchema } from "@/lib/server/validation";
import { checkRateLimit, getClientIp } from "@/lib/server/rateLimit";
import { dispatchLead } from "@/lib/server/leadDestination";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const ua = req.headers.get("user-agent");

  // Global rate limit: 5 per hour per IP
  const rl = checkRateLimit(`contact:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later.", retryAfterMs: rl.resetMs },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetMs / 1000)) } }
    );
  }

  // Per-email limit: 3 per day
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  // Abuse protection — check raw body BEFORE schema validation so bots that
  // submit garbage + honeypot still get a silent success (no signal leakage).
  const raw = body as Record<string, unknown>;
  const rawBot = typeof raw.botField === "string" ? raw.botField.trim() : "";
  const rawWeb = typeof raw.website === "string" ? raw.website.trim() : "";
  if (rawBot.length > 0) {
    console.warn("[contact] honeypot botField triggered", { ip });
    return NextResponse.json({ delivered: true, message: "Inquiry processed." }, { status: 200 });
  }
  if (rawWeb.length > 0) {
    console.warn("[contact] honeypot website triggered", { ip });
    return NextResponse.json({ delivered: true, message: "Inquiry processed." }, { status: 200 });
  }
  const rawLoaded = typeof raw.formLoadedAt === "number" ? raw.formLoadedAt : Number(raw.formLoadedAt);
  if (Number.isFinite(rawLoaded) && Date.now() - rawLoaded < 800) {
    console.warn("[contact] velocity check failed", { ip, delta: Date.now() - rawLoaded });
    return NextResponse.json({ delivered: true, message: "Inquiry processed." }, { status: 200 });
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first.message, issues: parsed.error.issues }, { status: 400 });
  }

  const data = parsed.data;

  // Per-email rate limit
  const emailKey = `contact:email:${data.email.toLowerCase()}`;
  const emailRl = checkRateLimit(emailKey, 3, 24 * 60 * 60 * 1000);
  if (!emailRl.allowed) {
    return NextResponse.json({ error: "Too many inquiries from this email. Please try again tomorrow." }, { status: 429 });
  }

  // Message sanity: block obvious spam patterns (excessive links)
  const linkCount = (data.message.match(/https?:\/\//gi) || []).length;
  if (linkCount > 5) {
    return NextResponse.json({ error: "Message contains too many links. Please revise and resubmit." }, { status: 400 });
  }

  // Attempt dispatch to configured lead destination (webhook/email). Honest response.
  const leadResult = await dispatchLead({
    firstName: data.firstName,
    lastName: data.lastName || undefined,
    email: data.email,
    company: data.company || undefined,
    service: data.service,
    budget: data.budget || undefined,
    message: data.message,
    meta: { ip, userAgent: ua, timestamp: new Date().toISOString() },
  });

  if (leadResult.delivered) {
    console.log("[contact] delivered", { email: data.email, service: data.service, ip, destination: leadResult.destination });
    return NextResponse.json(
      {
        delivered: true,
        message: "Your inquiry was delivered. An Axiom Labs architect will reply within one business day.",
        receivedAt: new Date().toISOString(),
      },
      { status: 200 }
    );
  } else {
    // Validated and logged, but NOT delivered to external destination — be explicit
    console.log("[contact] logged only (no destination)", { email: data.email, service: data.service, ip, reason: leadResult.reason });
    return NextResponse.json(
      {
        delivered: false,
        message:
          "Your inquiry was received and validated, but no lead destination is configured for this deployment, so it was not forwarded. Configure CONTACT_WEBHOOK_URL or RESEND_API_KEY to enable delivery.",
        detail: leadResult.reason,
        receivedAt: new Date().toISOString(),
      },
      { status: 200 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed. Use POST." }, { status: 405 });
}
