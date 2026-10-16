import type { Order, OrderStatus } from "./lib/types";
import { orderStatus } from "./logic";

export interface AnalyticsReport {
  days: number;
  orders: number;
  revenue: number;
  averageOrderValue: number;
  refunded: number;
  refundedAmount: number;
  pickup: number;
  delivery: number;
  revenueByDay: Array<{ date: string; revenue: number; orders: number }>;
  items: Array<{ itemId: string; name: string; quantity: number; revenue: number }>;
  ordersByHour: Array<{ hour: number; orders: number }>;
  statusCounts: Record<OrderStatus, number>;
  pendingReservations: number;
}

function helsinkiDayKey(timestamp: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Helsinki", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(timestamp));
}

function helsinkiHour(timestamp: number): number {
  return Number(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Helsinki", hour: "2-digit", hourCycle: "h23",
  }).format(new Date(timestamp))) % 24;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildAnalyticsReport(orders: Order[], days: number, pendingReservations = 0, now = Date.now()): AnalyticsReport {
  const today = helsinkiDayKey(now);
  const [year, month, day] = today.split("-").map(Number);
  const todayUtc = Date.UTC(year, month - 1, day, 12);
  const dayKeys = Array.from({ length: days }, (_, index) => {
    const value = new Date(todayUtc - (days - 1 - index) * 86_400_000);
    return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(value.getUTCDate()).padStart(2, "0")}`;
  });
  const firstDay = dayKeys[0];
  const lastDay = dayKeys[dayKeys.length - 1];
  const inRange = orders.filter((order) => {
    const day = helsinkiDayKey(order.createdAt);
    return day >= firstDay && day <= lastDay;
  });
  const paid = inRange.filter((order) => !order.refunded && ["paid", "demo_paid"].includes(String(order.paymentStatus)));
  const refunds = inRange.filter((order) => order.refunded || order.paymentStatus === "refunded");
  const byDay = new Map(dayKeys.map((key) => [key, { date: key, revenue: 0, orders: 0 }]));
  const byItem = new Map<string, { itemId: string; name: string; quantity: number; revenue: number }>();
  const byHour = Array.from({ length: 24 }, (_, hour) => ({ hour, orders: 0 }));
  const statusCounts: Record<OrderStatus, number> = { placed: 0, accepted: 0, preparing: 0, ready: 0, completed: 0 };

  for (const order of paid) {
    const date = helsinkiDayKey(order.createdAt);
    const dayRow = byDay.get(date);
    if (dayRow) {
      dayRow.revenue += order.total;
      dayRow.orders += 1;
    }
    byHour[helsinkiHour(order.createdAt)].orders += 1;
    statusCounts[orderStatus(order) as OrderStatus] += 1;
    for (const line of order.lines) {
      const itemKey = line.itemId || line.name;
      const current = byItem.get(itemKey) ?? { itemId: itemKey, name: line.name, quantity: 0, revenue: 0 };
      current.quantity += line.qty;
      current.revenue += line.qty * line.unitPrice;
      byItem.set(itemKey, current);
    }
  }

  const revenue = round2(paid.reduce((sum, order) => sum + order.total, 0));
  return {
    days,
    orders: paid.length,
    revenue,
    averageOrderValue: paid.length ? round2(revenue / paid.length) : 0,
    refunded: refunds.length,
    refundedAmount: round2(refunds.reduce((sum, order) => sum + order.total, 0)),
    pickup: paid.filter((order) => order.type === "pickup").length,
    delivery: paid.filter((order) => order.type === "delivery").length,
    revenueByDay: [...byDay.values()].map((row) => ({ ...row, revenue: round2(row.revenue) })),
    items: [...byItem.values()].map((row) => ({ ...row, revenue: round2(row.revenue) })).sort((a, b) => b.revenue - a.revenue),
    ordersByHour: byHour,
    statusCounts,
    pendingReservations,
  };
}
