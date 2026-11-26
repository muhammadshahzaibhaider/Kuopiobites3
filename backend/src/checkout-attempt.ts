import { createHash } from "node:crypto";

export type CheckoutSnapshot = {
  type: string;
  address?: string;
  scheduled?: { date: string; time: string };
  code?: string;
  redeemStreak?: boolean;
  total: number;
  customer?: { name: string; email: string; phone: string };
  note?: string;
  lines: Array<{
    itemId: string;
    variantLabel?: string;
    qty: number;
    options?: string[];
    unitPrice?: number;
    pizza?: unknown;
    preorder?: unknown;
    note?: string;
  }>;
};

/** Stable identity for one customer checkout action (cart + delivery + promo). */
export function checkoutFingerprint(input: CheckoutSnapshot): string {
  const payload = JSON.stringify({
    type: input.type,
    address: input.type === "delivery" ? (input.address ?? "").trim() : "",
    customer: input.customer ?? null,
    note: input.note ?? "",
    scheduled: input.scheduled ?? null,
    code: (input.code ?? "").trim().toLowerCase(),
    redeem: Boolean(input.redeemStreak),
    total: Number(input.total),
    lines: input.lines.map((line) => [
      line.itemId,
      line.variantLabel ?? "",
      line.qty,
      [...(line.options ?? [])].sort(),
      Number(line.unitPrice ?? 0),
      line.note ?? "",
      line.pizza ?? null,
      line.preorder ?? null,
    ]),
  });
  return createHash("sha256").update(payload).digest("hex");
}

export function sameCheckoutAttempt(a: CheckoutSnapshot, b: CheckoutSnapshot): boolean {
  return checkoutFingerprint(a) === checkoutFingerprint(b);
}

export function nextCartQty(existing: number | undefined, add: number): number {
  return Math.min(99, (existing ?? 0) + Math.max(1, add));
}
