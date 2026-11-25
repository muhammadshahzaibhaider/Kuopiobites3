import type { Order } from "./lib/types";

export type StripeEventLike = {
  id: string;
  type: string;
  data?: { object?: Record<string, unknown> | null };
};

export type StripeDecision =
  | { action: "ack" }
  | { action: "markPaid"; orderId: string; paymentRef: string }
  | { action: "abandonUnpaid"; orderId: string }
  | { action: "ignore"; reason: "unpaidSession" | "amountMismatch" | "sessionMismatch" | "alreadyFinal" };

const SUCCESS = new Set(["checkout.session.completed", "checkout.session.async_payment_succeeded"]);
const FAILURE = new Set(["checkout.session.expired", "checkout.session.async_payment_failed"]);

function sessionPaid(event: StripeEventLike, session: Record<string, unknown>): boolean {
  if (event.type === "checkout.session.async_payment_succeeded") return true;
  return session.payment_status === "paid";
}

function amountOk(session: Record<string, unknown>, order: Order): boolean {
  const expected = Math.round(Number(order.total) * 100);
  const got = Number(session.amount_total);
  const currency = String(session.currency || "").toLowerCase();
  return Number.isFinite(got) && got === expected && currency === "eur";
}

function sessionBound(session: Record<string, unknown>, order: Order): boolean {
  const sessionId = typeof session.id === "string" ? session.id : "";
  const stored = order.checkoutSessionId || "";
  if (stored && sessionId && stored !== sessionId) return false;
  const metaId = (session.metadata as { order_id?: unknown } | undefined)?.order_id;
  if (typeof metaId === "string" && metaId !== order.id) return false;
  return true;
}

function isFinalPayment(order: Order): boolean {
  const pay = String(order.paymentStatus);
  return pay === "paid" || pay === "demo_paid" || pay === "refunded";
}

/** Pure decision used by the Stripe webhook handler and regression tests. */
export function decideStripeCheckoutAction(event: StripeEventLike, order: Order | null): StripeDecision {
  if (!SUCCESS.has(event.type) && !FAILURE.has(event.type)) return { action: "ack" };
  const session = (event.data?.object ?? {}) as Record<string, unknown>;
  const orderId = (session.metadata as { order_id?: unknown } | undefined)?.order_id;
  if (typeof orderId !== "string" || !orderId) return { action: "ack" };
  if (!order) return { action: "ack" };

  if (FAILURE.has(event.type)) {
    if (isFinalPayment(order)) return { action: "ignore", reason: "alreadyFinal" };
    return { action: "abandonUnpaid", orderId: order.id };
  }

  if (!sessionBound(session, order)) return { action: "ignore", reason: "sessionMismatch" };
  if (!sessionPaid(event, session)) return { action: "ignore", reason: "unpaidSession" };
  if (!amountOk(session, order)) return { action: "ignore", reason: "amountMismatch" };
  if (isFinalPayment(order)) return { action: "ack" };

  const pi = session.payment_intent;
  const paymentRef = typeof pi === "string" && pi ? pi : (typeof session.id === "string" ? session.id : order.checkoutSessionId || order.id);
  return { action: "markPaid", orderId: order.id, paymentRef };
}

export type StripeWebhookDeps = {
  getOrder: (id: string) => Promise<Order | null>;
  markPaid: (orderId: string, paymentRef: string) => Promise<void>;
  abandonUnpaid: (order: Order) => Promise<void>;
  onPaid: (order: Order) => Promise<void>;
};

export async function applyStripeCheckoutEvent(event: StripeEventLike, deps: StripeWebhookDeps): Promise<{ received: true; duplicate?: boolean; ignored?: string }> {
  const session = event.data?.object as Record<string, unknown> | undefined;
  const orderId = (session?.metadata as { order_id?: unknown } | undefined)?.order_id;
  const order = typeof orderId === "string" ? await deps.getOrder(orderId) : null;
  const decision = decideStripeCheckoutAction(event, order);

  if (decision.action === "markPaid") {
    await deps.markPaid(decision.orderId, decision.paymentRef);
    if (order) await deps.onPaid({ ...order, paymentStatus: "paid" });
    return { received: true };
  }
  if (decision.action === "abandonUnpaid" && order) {
    await deps.abandonUnpaid(order);
    return { received: true };
  }
  if (decision.action === "ignore") return { received: true, ignored: decision.reason };
  return { received: true };
}
