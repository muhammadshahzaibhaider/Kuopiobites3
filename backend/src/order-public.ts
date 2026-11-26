import type { Order } from "./lib/types";

/** Anonymous /track payload: kitchen status + contents, no PII or payment ids. */
export function publicTrackOrder(order: Order) {
  const status = order.statusOverride ?? order.status ?? "placed";
  return {
    id: order.id,
    createdAt: order.createdAt,
    type: order.type,
    status,
    statusOverride: order.statusOverride,
    estimatedReadyAt: order.estimatedReadyAt,
    lines: (order.lines ?? []).map((line) => ({
      key: line.key,
      name: line.name,
      variantLabel: line.variantLabel,
      qty: line.qty,
      unitPrice: line.unitPrice,
      options: line.options ?? [],
    })),
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    total: order.total,
    vat: order.vat,
    scheduled: order.scheduled,
    paymentStatus: order.paymentStatus === "refunded" ? "refunded" : "paid",
    refunded: order.paymentStatus === "refunded",
    customer: { name: "", email: "", phone: "" },
  };
}

export function hasPrivateOrderFields(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const row = payload as Record<string, unknown>;
  const customer = row.customer as Record<string, unknown> | undefined;
  if (customer && (String(customer.email || "") || String(customer.phone || "") || String(customer.name || ""))) return true;
  if (typeof row.address === "string" && row.address.trim()) return true;
  if (typeof row.note === "string" && row.note.trim()) return true;
  if (typeof row.userId === "string" && row.userId.trim()) return true;
  if (typeof row.paymentId === "string" && row.paymentId.trim()) return true;
  if (typeof row.checkoutSessionId === "string" && row.checkoutSessionId.trim()) return true;
  return false;
}
