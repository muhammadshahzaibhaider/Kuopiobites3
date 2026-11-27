import type { Order, OrderStatus } from "./lib/types";

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  placed: ["accepted", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["completed"],
  completed: [],
  cancelled: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return true;
  return (TRANSITIONS[from] ?? []).includes(to);
}
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
  update: (id: string, status: OrderStatus, expected: OrderStatus) => Promise<boolean>;
}): Promise<Order> {
  let order = await deps.get(id);
  if (!order) throw new Error("order.notFound");
  if (order.paymentStatus === "pending") {
    await deps.reconcile(order);
    order = await deps.get(id);
  }
  if (!order || (order.paymentStatus !== "paid" && order.paymentStatus !== "demo_paid"))
    throw new Error("payment.notPaid");
  const current = (order.statusOverride ?? order.status ?? "placed") as OrderStatus;
  if (current === status) return order;
  if (!canTransition(current, status)) throw new Error("order.badTransition");
  // The database update must also guard paid status, closing the read/refund race.
  const updated = await deps.update(id, status, current);
  const saved = await deps.get(id);
  if (!saved) throw new Error("order.notFound");
  if (!updated) {
    if (!["paid", "demo_paid"].includes(String(saved.paymentStatus))) throw new Error("payment.notPaid");
    if ((saved.statusOverride ?? saved.status ?? "placed") !== status) throw new Error("order.statusChanged");
  }
  return saved;
}
