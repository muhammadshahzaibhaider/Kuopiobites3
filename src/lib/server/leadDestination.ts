/**
 * Lead destination abstraction.
 * This module is intentionally isolated from UI components (server-only).
 * It determines whether an inquiry can be "delivered" vs. merely logged/previewed.
 */

export type LeadResult =
  | { delivered: true; destination: string; id?: string }
  | { delivered: false; reason: string };

/**
 * Attempt to dispatch the lead to the configured destination.
 * Currently supports:
 *  - CONTACT_WEBHOOK_URL (generic POST)
 *  - RESEND_API_KEY (email via Resend)
 * If none are configured, we return delivered:false so the UI does NOT claim delivery.
 *
 * In production, wire this to your CRM (HubSpot, Salesforce), email service, or Slack webhook.
 */
export async function dispatchLead(payload: {
  firstName: string;
  lastName?: string;
  email: string;
  company?: string;
  service: string;
  budget?: string;
  message: string;
  meta: { ip: string; userAgent: string | null; timestamp: string };
}): Promise<LeadResult> {
  const webhookUrl = process.env.CONTACT_WEBHOOK_URL;
  const resendKey = process.env.RESEND_API_KEY;
  const resendTo = process.env.CONTACT_TO_EMAIL;
  const resendFrom = process.env.CONTACT_FROM_EMAIL || "Axiom Labs <noreply@axiomlabs.agency>";

  // 1) Webhook destination (preferred for CRM automation)
  if (webhookUrl) {
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "axiom.contact.inquiry",
          ...payload,
          receivedAt: new Date().toISOString(),
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("[leadDestination] Webhook failed", res.status, text.slice(0, 500));
        return { delivered: false, reason: `Lead webhook returned ${res.status}` };
      }
      return { delivered: true, destination: "webhook" };
    } catch (err) {
      console.error("[leadDestination] Webhook error", err);
      return { delivered: false, reason: "Lead webhook unreachable" };
    }
  }

  // 2) Email via Resend (if configured)
  if (resendKey && resendTo) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: resendFrom,
          to: [resendTo],
          subject: `[Axiom Labs] Inquiry: ${payload.service} — ${payload.firstName} ${payload.lastName || ""}`.trim(),
          html: `
            <h2>New Axiom Labs Inquiry</h2>
            <p><strong>From:</strong> ${escapeHtml(payload.firstName)} ${escapeHtml(payload.lastName || "")} &lt;${escapeHtml(payload.email)}&gt;</p>
            ${payload.company ? `<p><strong>Company:</strong> ${escapeHtml(payload.company)}</p>` : ""}
            <p><strong>Service:</strong> ${escapeHtml(payload.service)}</p>
            ${payload.budget ? `<p><strong>Budget:</strong> ${escapeHtml(payload.budget)}</p>` : ""}
            <p><strong>Message:</strong></p>
            <pre style="white-space:pre-wrap;font-family:system-ui">${escapeHtml(payload.message)}</pre>
            <hr/><p style="font-size:12px;color:#666">IP: ${escapeHtml(payload.meta.ip)} • UA: ${escapeHtml(payload.meta.userAgent || "unknown")} • ${payload.meta.timestamp}</p>
          `,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("[leadDestination] Resend failed", res.status, data);
        return { delivered: false, reason: `Email dispatch failed (${res.status})` };
      }
      return { delivered: true, destination: "email", id: (data as any).id };
    } catch (err) {
      console.error("[leadDestination] Resend error", err);
      return { delivered: false, reason: "Email service unreachable" };
    }
  }

  // 3) No destination configured → audit log only
  console.log("[leadDestination] No lead destination configured — inquiry logged only (not delivered)", {
    email: payload.email,
    service: payload.service,
  });
  return {
    delivered: false,
    reason:
      "No lead destination configured. Set CONTACT_WEBHOOK_URL or RESEND_API_KEY to enable delivery. Inquiry was logged for preview only.",
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
