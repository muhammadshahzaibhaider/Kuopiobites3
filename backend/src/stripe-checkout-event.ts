import type Stripe from "stripe";

/** A verified event is only a signal. Fulfillment uses the current Checkout Session. */
export const CHECKOUT_EVENTS = new Set([
  "checkout.session.completed", "checkout.session.async_payment_succeeded",
  "checkout.session.expired", "checkout.session.async_payment_failed",
]);

type Session = {
  id?: unknown; metadata?: unknown; payment_status?: unknown; status?: unknown;
  amount_total?: unknown; currency?: unknown; payment_intent?: unknown;
};
export type CheckoutCommand = {
  p_event_id: string; p_event_type: string; p_order_id: string; p_session_id: string;
  p_payment_intent_id: string | null; p_amount_total: number | null;
  p_currency: string | null; p_payment_status: string; p_session_status: string;
};
export type CheckoutResult = { received: true; ignored?: string; duplicate?: boolean; paidSaved?: boolean; effectsPending?: boolean };
export type CheckoutDependencies = {
  retrieveSession: (id: string) => Promise<Session>;
  process: (command: CheckoutCommand) => Promise<CheckoutResult>;
};

const id = (value: unknown, prefix: string) =>
  typeof value === "string" && value.startsWith(prefix) && value.length <= 255 ? value : null;
const metadataOrder = (value: unknown): string | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const order = (value as Record<string, unknown>).order_id;
  return typeof order === "string" && order.length > 0 && order.length <= 100 ? order : null;
};

export async function applyStripeCheckoutEvent(
  event: { id: string; type: string; data: { object: unknown } },
  deps: CheckoutDependencies,
): Promise<CheckoutResult> {
  if (!CHECKOUT_EVENTS.has(event.type)) return { received: true, ignored: "unhandledEvent" };
  const payload = event.data.object as unknown as Session;
  const sessionId = id(payload?.id, "cs_");
  const orderId = metadataOrder(payload?.metadata);
  if (!sessionId || !orderId) return { received: true, ignored: "missingIdentity" };

  // Do not act on an old failure snapshot when Stripe now reports payment success.
  const session = await deps.retrieveSession(sessionId);
  if (id(session.id, "cs_") !== sessionId || metadataOrder(session.metadata) !== orderId)
    return { received: true, ignored: "sessionMismatch" };
  const paymentStatus = typeof session.payment_status === "string" ? session.payment_status : "";
  const sessionStatus = typeof session.status === "string" ? session.status : "";
  const amount = typeof session.amount_total === "number" && Number.isSafeInteger(session.amount_total)
    && session.amount_total > 0 ? session.amount_total : null;
  const currency = typeof session.currency === "string" ? session.currency.toLowerCase() : null;
  const intent = session.payment_intent;
  const paymentIntent = id(typeof intent === "object" && intent ? (intent as { id?: unknown }).id : intent, "pi_");
  const failure = event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed";
  if (paymentStatus !== "paid" && !(failure && paymentStatus === "unpaid"
    && (sessionStatus === "expired" || event.type === "checkout.session.async_payment_failed")))
    return { received: true, ignored: "unpaidSession" };
  if (paymentStatus === "paid" && (!amount || currency !== "eur" || !paymentIntent))
    return { received: true, ignored: "invalidPayment" };

  const result = await deps.process({
    p_event_id: event.id, p_event_type: event.type, p_order_id: orderId, p_session_id: sessionId,
    p_payment_intent_id: paymentIntent, p_amount_total: amount, p_currency: currency,
    p_payment_status: paymentStatus, p_session_status: sessionStatus,
  });
  if (!result || result.received !== true) throw new Error("payment.processingFailed");
  return result;
}

export type StripeTransport = Pick<Stripe, "webhooks" | "checkout">;
export async function receiveStripeCheckoutWebhook(
  raw: unknown, signature: string | string[] | undefined, secret: string,
  deps: { stripe: StripeTransport | null; process: CheckoutDependencies["process"]; refund?: (event: Stripe.Event) => Promise<void> },
): Promise<{ status: number; body: { data?: CheckoutResult; error?: string } }> {
  if (!deps.stripe || !secret) return { status: 503, body: { error: "payment.webhookUnavailable" } };
  if (typeof signature !== "string" || !Buffer.isBuffer(raw))
    return { status: 400, body: { error: "payment.invalidSignature" } };
  let event: Stripe.Event;
  try {
    event = deps.stripe.webhooks.constructEvent(raw, signature, secret);
  } catch {
    return { status: 400, body: { error: "payment.invalidSignature" } };
  }
  if (["refund.created", "refund.updated", "refund.failed"].includes(event.type)) {
    if (!deps.refund) return { status: 503, body: { error: "payment.refundUnavailable" } };
    await deps.refund(event);
    return { status: 200, body: { data: { received: true } } };
  }
  const data = await applyStripeCheckoutEvent(event, {
    retrieveSession: (id) => deps.stripe!.checkout.sessions.retrieve(id),
    process: deps.process,
  });
  // The RPC committed verified payment, but cleanup still needs Stripe retries.
  if (data.effectsPending) return { status: 503, body: { error: "payment.effectsPending" } };
  return { status: 200, body: { data } };
}
