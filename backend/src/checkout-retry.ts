import type { Order } from "./lib/types";
type Session = { id: string; status: string | null; payment_status: string; url: string | null };
/** Paid or uncertain provider sessions never fall through to another charge. */
export async function recoverCheckoutRetry(order: Order, session: Session, deps: {
  reconcile: (order: Order) => Promise<void>;
  get: (id: string) => Promise<Order | null>;
  respond: (data: { mode: "stripe"; url?: string; sessionId?: string; orderId: string; order?: Order }) => void;
}): Promise<void> {
  if (session.id !== order.checkoutSessionId) throw new Error("payment.sessionMismatch");
  if (session.payment_status === "paid") {
    await deps.reconcile(order);
    const saved = await deps.get(order.id);
    if (!saved || !["paid", "demo_paid", "refunded"].includes(String(saved.paymentStatus))) throw new Error("payment.processingFailed");
    deps.respond({ mode: "stripe", orderId: saved.id, order: saved });
    return;
  }
  if (session.status === "open" && session.url) {
    deps.respond({ mode: "stripe", url: session.url, sessionId: session.id, orderId: order.id });
    return;
  }
  if (session.status === "expired" && session.payment_status === "unpaid") throw new Error("payment.attemptExpired");
  throw new Error("payment.processingPending");
}
