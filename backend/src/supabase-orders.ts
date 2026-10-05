import { db } from "./supabase";
import { orderStatus } from "./logic";
import type { Order, OrderStatus } from "./lib/types";

type OrderRow = {
  id: string;
  customer_id: string | null;
  type: Order["type"];
  status: OrderStatus;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  discount_title: string | null;
  offer_id: string | null;
  vat: number;
  total: number;
  payment_status: "pending" | "paid" | "refunded";
  payment_ref: string | null;
  contact_name: string;
  contact_phone: string | null;
  contact_email: string | null;
  address: string | null;
  note: string | null;
  scheduled_for: string | null;
  created_at: string;
  order_items: Array<{
    id: string;
    menu_item_id: string | null;
    item_name_snapshot: string;
    variant_label: string;
    selected_toppings: { included?: string[]; extras?: { label: string; count: number }[]; builder?: boolean } | null;
    options: string[];
    is_preorder: boolean;
    quantity: number;
    unit_price: number;
    note: string | null;
  }>;
};

function helsinkiDateTime(value: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Helsinki",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(new Date(value)).split(" ");
  return { date: parts[0], time: parts[1] };
}

export function toApiOrder(row: OrderRow): Order {
  const scheduled = row.scheduled_for ? helsinkiDateTime(row.scheduled_for) : undefined;
  const paymentRef = row.payment_ref ?? "";
  return {
    id: row.id,
    createdAt: Date.parse(row.created_at),
    type: row.type,
    customer: { name: row.contact_name, email: row.contact_email ?? "", phone: row.contact_phone ?? "" },
    address: row.address ?? undefined,
    note: row.note ?? undefined,
    lines: row.order_items.map((item) => ({
      key: item.id,
      itemId: item.menu_item_id ?? "",
      name: item.item_name_snapshot,
      variantLabel: item.variant_label,
      qty: item.quantity,
      unitPrice: Number(item.unit_price),
      options: item.options ?? [],
      note: item.note ?? undefined,
      preorder: item.is_preorder && scheduled ? scheduled : undefined,
      pizza: item.selected_toppings ? {
        sizeLabel: item.variant_label,
        included: item.selected_toppings.included ?? [],
        extras: item.selected_toppings.extras ?? [],
        builder: item.selected_toppings.builder,
      } : undefined,
    })),
    subtotal: Number(row.subtotal),
    deliveryFee: Number(row.delivery_fee),
    discount: row.discount_title || row.offer_id ? { title: row.discount_title ?? "", amount: Number(row.discount), offerId: row.offer_id ?? undefined } : undefined,
    total: Number(row.total),
    vat: Number(row.vat),
    scheduled,
    statusOverride: row.status === "placed" ? undefined : row.status,
    paymentStatus: row.payment_status === "paid" && paymentRef.startsWith("demo:") ? "demo_paid" : row.payment_status,
    paymentId: paymentRef.startsWith("pi_") ? paymentRef : undefined,
    checkoutSessionId: paymentRef.startsWith("cs_") ? paymentRef : undefined,
    userId: row.customer_id ?? "",
  } as Order;
}

export async function getOrder(id: string): Promise<Order | null> {
  const { data, error } = await db.from("orders").select("*, order_items(*)").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toApiOrder(data as OrderRow) : null;
}

export async function listOrders(limit = 300): Promise<Order[]> {
  const { data, error } = await db.from("orders").select("*, order_items(*)").order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => toApiOrder(row as OrderRow));
}

export async function listCustomerOrders(customerId: string, limit = 50): Promise<Order[]> {
  const { data, error } = await db.from("orders").select("*, order_items(*)").eq("customer_id", customerId).order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => toApiOrder(row as OrderRow));
}