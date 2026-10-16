export interface RevenueEligibleOrder {
  paymentStatus?: string;
  refunded?: boolean;
}

/** Shared backend predicate for dashboard summary and report revenue. */
export function isRevenueEligible(order: RevenueEligibleOrder): boolean {
  return order.refunded !== true && (order.paymentStatus === "paid" || order.paymentStatus === "demo_paid");
}
