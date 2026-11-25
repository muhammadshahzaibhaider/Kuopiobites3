import type { Order } from "./lib/types";

export type StripeEventLike = {
  id: string;
  type: string;
  data?: { object?: Record<string, unknown> | null };
};

export type StripeDecision =
  | { action: "ack" }
  | { action: "markPaid"; orderId: string; paymentRef: string }
  | { action: "ensurePaid"; orderId: string }
  | { action: "abandonUnpaid"; orderId: string }
  | { action: "ignore"; reason: "unpaidSession" | "amountMismatch" | "sessionMismatch" | "alreadyFinal" | "missingSession" };

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

/** Both sides must have a session id and they must be identical, plus metadata.order_id. */
export function sessionIdentityOk(session: Record<string, unknown>, order: Order): boolean {
  const sessionId = typeof session.id === "string" ? session.id.trim() : "";
  const stored = typeof order.checkoutSessionId === "string" ? order.checkoutSessionId.trim() : "";
  if (!sessionId || !stored) return false;
  if (sessionId !== stored) return false;
  const metaId = (session.metadata as { order_id?: unknown } | undefined)?.order_id;
  if (typeof metaId !== "string" || !metaId || metaId !== order.id) return false;
  return true;
}

function isFinalPayment(order: Order): boolean {
  const pay = String(order.paymentStatus);
  return pay === "paid" || pay === "demo_paid" || pay === "refunded";
}

function sessionObject(event: StripeEventLike): Record<string, unknown> {
  return (event.data?.object ?? {}) as Record<string, unknown>;
}

/** Pure decision used by the Stripe webhook handler and regression tests. */
export function decideStripeCheckoutAction(event: StripeEventLike, order: Order | null): StripeDecision {
  if (!SUCCESS.has(event.type) && !FAILURE.has(event.type)) return { action: "ack" };
  const session = sessionObject(event);
  const orderId = (session.metadata as { order_id?: unknown } | undefined)?.order_id;
  if (typeof orderId !== "string" || !orderId) return { action: "ack" };
  if (!order) return { action: "ack" };

  const sessionId = typeof session.id === "string" ? session.id.trim() : "";
  const stored = typeof order.checkoutSessionId === "string" ? order.checkoutSessionId.trim() : "";
  if (!sessionId || !stored) return { action: "ignore", reason: "missingSession" };
  if (!sessionIdentityOk(session, order)) return { action: "ignore", reason: "sessionMismatch" };

  if (FAILURE.has(event.type)) {
    if (isFinalPayment(order)) return { action: "ignore", reason: "alreadyFinal" };
    return { action: "abandonUnpaid", orderId: order.id };
  }

  if (!sessionPaid(event, session)) return { action: "ignore", reason: "unpaidSession" };
  if (!amountOk(session, order)) return { action: "ignore", reason: "amountMismatch" };
  if (order.paymentStatus === "refunded") return { action: "ignore", reason: "alreadyFinal" };
  if (isFinalPayment(order)) return { action: "ensurePaid", orderId: order.id };

  const pi = session.payment_intent;
  const paymentRef = typeof pi === "string" && pi ? pi : sessionId;
  return { action: "markPaid", orderId: order.id, paymentRef };
}

export type StripeWebhookDeps = {
  getOrder: (id: string) => Promise<Order | null>;
  /** Persist paid. Return updated=true only when a pending row actually flipped. */
  markPaid: (orderId: string, paymentRef: string) => Promise<{ updated: boolean }>;
  /** Cancel still-pending. Return updated=true only when the row changed. */
  cancelPending: (order: Order) => Promise<{ updated: boolean }>;
  afterCancel: (order: Order) => Promise<void>;
  onPaid: (order: Order) => Promise<void>;
};

export async function applyStripeCheckoutEvent(event: StripeEventLike, deps: StripeWebhookDeps): Promise<{ received: true; ignored?: string; paidSaved?: boolean }> {
  const session = sessionObject(event);
  const orderId = (session.metadata as { order_id?: unknown } | undefined)?.order_id;
  const order = typeof orderId === "string" ? await deps.getOrder(orderId) : null;
  const decision = decideStripeCheckoutAction(event, order);

  if (decision.action === "markPaid") {
    const { updated } = await deps.markPaid(decision.orderId, decision.paymentRef);
    try {
      if (order) await deps.onPaid({ ...order, paymentStatus: "paid" });
    } catch (error) {
      /* Payment row is already saved — retry must run onPaid via ensurePaid, not roll back. */
      throw Object.assign(error instanceof Error ? error : new Error(String(error)), { paymentSaved: true });
    }
    return { received: true, paidSaved: updated || true };
  }

  if (decision.action === "ensurePaid") {
    if (order) await deps.onPaid({ ...order, paymentStatus: order.paymentStatus === "refunded" ? "refunded" : "paid" });
    return { received: true, paidSaved: true };
  }

  if (decision.action === "abandonUnpaid" && order) {
    const { updated } = await deps.cancelPending(order);
    if (updated) await deps.afterCancel(order);
    return { received: true };
  }

  if (decision.action === "ignore") return { received: true, ignored: decision.reason };
  return { received: true };
}
