import type { Order } from "../lib/types";

const TICKET_W = 42;
const RULE = "-".repeat(TICKET_W);
const DOTS = ".".repeat(TICKET_W);

function ticketPad(left: string, right: string, width = TICKET_W): string {
  const gap = Math.max(1, width - left.length - right.length);
  return left + " ".repeat(gap) + right;
}

function center(text: string, width = TICKET_W): string {
  const pad = Math.max(0, Math.floor((width - text.length) / 2));
  return " ".repeat(pad) + text;
}

/** Finnish fiscal receipts use a decimal comma. */
function fiNum(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

function helsinkiClock(ts: number): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Helsinki",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(ts));
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${g("year")}-${g("month")}-${g("day")} ${g("hour")}:${g("minute")}:${g("second")}`;
}

export function ticketLines(o: Order, restaurant: {
  name: string; street: string; postcode: string; city: string; country: string; yTunnus?: string;
}, details: (line: Order["lines"][number]) => string[]): string {
  const net = Math.round((o.total - o.vat) * 100) / 100;
  const discountPct = o.subtotal > 0 && o.discount?.amount
    ? ((o.discount.amount / o.subtotal) * 100).toFixed(1)
    : "";
  const itemRows = o.lines.flatMap((l) => {
    const rows = [ticketPad(`${l.qty}x ${l.name}`, `${fiNum(l.unitPrice * l.qty)}`)];
    for (const row of details(l)) rows.push(`  ${row}`);
    return rows;
  });
  if (o.type === "delivery" && o.deliveryFee > 0) {
    itemRows.push(ticketPad("1x Toimitus", `${fiNum(o.deliveryFee)}`));
  }
  const refunded = o.refunded || o.paymentStatus === "refunded";
  const paid = o.paymentStatus === "paid" || o.paymentStatus === "demo_paid";
  const payLabel = refunded ? "Hyvitetty" : o.paymentStatus === "demo_paid" ? "Testimaksu" : "Maksettu verkossa";

  return [
    "",
    center(restaurant.name),
    "",
    center(restaurant.street),
    center(`${restaurant.postcode} ${restaurant.city}`),
    center(restaurant.country),
    ...(restaurant.yTunnus ? [center(`Y-tunnus: ${restaurant.yTunnus}`)] : []),
    "",
    center(paid || refunded ? "Kuitti" : "Tilaus"),
    "",
    `Tilaus-ID: ${o.id}`,
    helsinkiClock(o.createdAt),
    ...(o.type === "delivery"
      ? ["Toimitus:", o.customer.name, o.customer.phone, o.address || ""]
      : []),
    ...(o.note ? [`Ohje: ${o.note}`] : []),
    RULE,
    ticketPad("Tuote", "EUR"),
    ...itemRows,
    DOTS,
    ticketPad("Välisumma", fiNum(o.subtotal + (o.deliveryFee || 0))),
    ...(o.discount?.amount
      ? [ticketPad(`Alennus (${discountPct}%)`, `-${fiNum(o.discount.amount)}`)]
      : []),
    DOTS,
    ticketPad("Yhteensä", fiNum(o.total)),
    paid || refunded ? ticketPad(payLabel, fiNum(o.total)) : "Maksua ei ole vahvistettu",
    "",
    "ALV-yhteenveto",
    ticketPad("Veroton", fiNum(net)),
    ticketPad("ALV", fiNum(o.vat)),
    "",
    `Summa: ${fiNum(o.total)}`,
    "",
    center("Kiitos vierailustasi!"),
    "",
  ].filter((row) => row !== undefined).join("\n");
}
