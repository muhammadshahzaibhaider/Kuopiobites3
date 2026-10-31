export const STREAK_TARGET = 7;
/** Online paid orders below this total (€) do not fill a streak stamp. */
export const STREAK_MIN_TOTAL = 10;

export function qualifiesForStreakStamp(total: number): boolean {
  return Number.isFinite(total) && total >= STREAK_MIN_TOTAL;
}

export type OrderStreakCfg = {
  enabled: boolean;
  target: number;
  rewardItemId: string;
  rewardNameEn: string;
  rewardNameFi: string;
};

export type StreakState = {
  count: number;
  rewardReady: boolean;
  lastOrderId?: string;
  pendingRedeemOrderId?: string;
};

export const DEFAULT_ORDER_STREAK: OrderStreakCfg = {
  enabled: true,
  target: STREAK_TARGET,
  rewardItemId: "",
  rewardNameEn: "Free pizza",
  rewardNameFi: "Ilmainen pizza",
};

export const EMPTY_STREAK: StreakState = { count: 0, rewardReady: false };

export function normalizeStreakCfg(raw: unknown): OrderStreakCfg {
  const value = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const target = Number(value.target);
  return {
    enabled: value.enabled !== false,
    target: Number.isFinite(target) ? Math.min(20, Math.max(2, Math.round(target))) : STREAK_TARGET,
    rewardItemId: typeof value.rewardItemId === "string" ? value.rewardItemId.slice(0, 60) : "",
    rewardNameEn: typeof value.rewardNameEn === "string" ? value.rewardNameEn.slice(0, 80) : DEFAULT_ORDER_STREAK.rewardNameEn,
    rewardNameFi: typeof value.rewardNameFi === "string" ? value.rewardNameFi.slice(0, 80) : DEFAULT_ORDER_STREAK.rewardNameFi,
  };
}

export function normalizeStreakState(raw: unknown): StreakState {
  if (!raw || typeof raw !== "object") return { ...EMPTY_STREAK };
  const value = raw as Record<string, unknown>;
  const count = Math.max(0, Math.min(20, Math.round(Number(value.count) || 0)));
  return {
    count,
    rewardReady: Boolean(value.rewardReady) || count >= STREAK_TARGET,
    lastOrderId: typeof value.lastOrderId === "string" ? value.lastOrderId : undefined,
    pendingRedeemOrderId: typeof value.pendingRedeemOrderId === "string" ? value.pendingRedeemOrderId : undefined,
  };
}

/** Paid order: skip duplicates; a redeeming order starts the next cycle at 1. */
export function applyPaidOrder(state: StreakState, orderId: string, target: number): StreakState {
  if (state.lastOrderId === orderId) return state;
  if (state.pendingRedeemOrderId === orderId) {
    return { count: 1, rewardReady: false, lastOrderId: orderId };
  }
  if (state.rewardReady) return { ...state, lastOrderId: orderId };
  const count = Math.min(target, state.count + 1);
  return { count, rewardReady: count >= target, lastOrderId: orderId };
}

export function markPendingRedeem(state: StreakState, orderId: string): StreakState {
  if (!state.rewardReady) return state;
  return { ...state, pendingRedeemOrderId: orderId };
}

export function clearPendingRedeem(state: StreakState, orderId: string): StreakState {
  if (state.pendingRedeemOrderId !== orderId) return state;
  const next = { ...state };
  delete next.pendingRedeemOrderId;
  return next;
}

export type WalkInClaim = {
  id: string;
  userId: string;
  name: string;
  email: string;
  note: string;
  createdAt: number;
  status: "pending" | "approved" | "rejected";
};

export function normalizeWalkInClaims(raw: unknown): WalkInClaim[] {
  if (!Array.isArray(raw)) return [];
  const out: WalkInClaim[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const value = row as Record<string, unknown>;
    const id = typeof value.id === "string" ? value.id.slice(0, 40) : "";
    const userId = typeof value.userId === "string" ? value.userId.slice(0, 80) : "";
    if (!id || !userId) continue;
    const status = value.status === "approved" || value.status === "rejected" ? value.status : "pending";
    out.push({
      id,
      userId,
      name: typeof value.name === "string" ? value.name.slice(0, 80) : "",
      email: typeof value.email === "string" ? value.email.slice(0, 160) : "",
      note: typeof value.note === "string" ? value.note.slice(0, 400) : "",
      createdAt: Number(value.createdAt) || 0,
      status,
    });
  }
  return out.slice(-200);
}

export function pendingWalkInClaim(claims: WalkInClaim[], userId: string): WalkInClaim | undefined {
  return claims.find((claim) => claim.userId === userId && claim.status === "pending");
}

export function streakFreeAmount(lines: Array<{ itemId: string; unitPrice: number; qty: number }>, rewardItemId: string): number {
  if (!rewardItemId) return 0;
  const line = lines.find((row) => row.itemId === rewardItemId && row.qty > 0);
  if (!line) return 0;
  return Math.round(line.unitPrice * 100) / 100;
}
