import type { Order, OrderStatus } from "./lib/types";
import { applyStripeCheckoutEvent, type CheckoutDependencies } from "./stripe-checkout-event";

/** Recovery is another caller of the webhook's canonical Stripe/SQL path.
 * Only a server-stored Checkout Session may be used; no client payment claims. */
export async function reconcileOrderPayment(order: Order, deps: CheckoutDependencies): Promise<void> {
  if (order.paymentStatus !== "pending" || !order.checkoutSessionId?.startsWith("cs_")) return;
  await applyStripeCheckoutEvent({
    id: `reconcile:${order.checkoutSessionId}`,
    type: "checkout.session.completed",
    data: { object: { id: order.checkoutSessionId, metadata: { order_id: order.id } } },
  }, deps);
}

export async function changePaidOrderStatus(id: string, status: OrderStatus, deps: {
  get: (id: string) => Promise<Order | null>;
  reconcile: (order: Order) => Promise<void>;
  update: (id: string, status: OrderStatus) => Promise<boolean>;
}): Promise<Order> {
  let order = await deps.get(id);
  if (!order) throw new Error("order.notFound");
  if (order.paymentStatus === "pending") {
    await deps.reconcile(order);
    order = await deps.get(id);
  }
  if (!order || (order.paymentStatus !== "paid" && order.paymentStatus !== "demo_paid"))
    throw new Error("payment.notPaid");
  // The database update must also guard paid status, closing the read/refund race.
  if (!await deps.update(id, status)) throw new Error("payment.notPaid");
  const saved = await deps.get(id);
  if (!saved) throw new Error("order.notFound");
  return saved;
}
