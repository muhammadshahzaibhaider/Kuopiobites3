import type Stripe from "stripe";
import type { Order } from "./lib/types";
export type RefundOperation = { refund_id: string | null; created_at: string };
export function validateFullRefund(order: Order, refund: Stripe.Refund): void {
  const intent = typeof refund.payment_intent === "string" ? refund.payment_intent : refund.payment_intent?.id;
  if (intent !== order.paymentId || refund.amount !== Math.round(order.total * 100) || refund.currency !== "eur")
    throw new Error("payment.refundMismatch");
}
/** Persist intent before contacting Stripe; recover lost responses before creating anything. */
export async function requestOrderRefund(order: Order, deps: {
  reserve: () => Promise<RefundOperation>;
  retrieve: (id: string) => Promise<Stripe.Refund>;
  list: () => Promise<{ data: Stripe.Refund[]; has_more: boolean }>;
  create: () => Promise<Stripe.Refund>;
  record: (refund: Stripe.Refund) => Promise<void>;
}): Promise<Stripe.Refund> {
  const operation = await deps.reserve();
  let refund: Stripe.Refund | undefined;
  if (operation.refund_id) refund = await deps.retrieve(operation.refund_id);
  else {
    const prior = await deps.list();
    if (prior.has_more) throw new Error("payment.recoveryRequired");
    refund = prior.data.find((r) => r.status !== "failed" && r.status !== "canceled");
    if (!refund) {
      // Stripe may prune an idempotency key after 24 hours. Require review of older uncertainty.
      if (Date.now() - Date.parse(operation.created_at) > 23 * 60 * 60_000)
        throw new Error("payment.recoveryRequired");
      refund = await deps.create();
    }
  }
  validateFullRefund(order, refund);
  await deps.record(refund);
  return refund;
}

/** A refund can arrive before the checkout webhook. Recover the paid fact first. */
export async function reconcileRefundEvent(refund: Stripe.Refund, deps: {
  findOrder: (intent: string) => Promise<Order | null>;
  sessions: (intent: string) => Promise<Array<{ id: string; metadata: { order_id?: string } | null }>>;
  knownOrder: (id: string) => Promise<Order | null>;
  recover: (order: Order, sessionId: string) => Promise<void>;
  record: (orderId: string, refund: Stripe.Refund) => Promise<void>;
}): Promise<void> {
  const intent = typeof refund.payment_intent === "string" ? refund.payment_intent : refund.payment_intent?.id;
  if (!intent) throw new Error("payment.refundMismatch");
  let order = await deps.findOrder(intent);
  if (!order) {
    for (const session of await deps.sessions(intent)) {
      const id = session.metadata?.order_id;
      if (!id) continue;
      const known = await deps.knownOrder(id);
      if (!known) continue;
      if (known.checkoutSessionId !== session.id) throw new Error("payment.sessionBindingFailed");
      await deps.recover(known, session.id);
      order = await deps.findOrder(intent);
      if (!order) throw new Error("payment.processingFailed");
      break;
    }
  }
  if (!order) return; // Refund belongs to another application in the same Stripe account.
  validateFullRefund(order, refund);
  await deps.record(order.id, refund);
}
