export interface RevenueEligibleOrder {
  paymentStatus?: string;
  refunded?: boolean;
}

/** Revenue includes only successful paid/demo payments and never refunded orders. */
export function isRevenueEligible(order: RevenueEligibleOrder): boolean {
  return order.refunded !== true && (order.paymentStatus === "paid" || order.paymentStatus === "demo_paid");
}
