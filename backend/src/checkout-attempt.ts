import { createHash } from "node:crypto";

export type CheckoutSnapshot = {
  type: string;
  address?: string;
  scheduled?: { date: string; time: string };
  code?: string;
  redeemStreak?: boolean;
  total: number;
  lines: Array<{
    itemId: string;
    variantLabel?: string;
    qty: number;
    options?: string[];
    unitPrice: number;
    note?: string;
  }>;
};

/** Stable identity for one customer checkout action (cart + delivery + promo). */
export function checkoutFingerprint(input: CheckoutSnapshot): string {
  const payload = JSON.stringify({
    type: input.type,
    address: (input.address ?? "").trim().toLowerCase(),
    scheduled: input.scheduled ?? null,
    code: (input.code ?? "").trim().toLowerCase(),
    redeem: Boolean(input.redeemStreak),
    total: Number(input.total),
    lines: input.lines.map((line) => [
      line.itemId,
      line.variantLabel ?? "",
      line.qty,
      [...(line.options ?? [])].sort(),
      Number(line.unitPrice),
      line.note ?? "",
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
