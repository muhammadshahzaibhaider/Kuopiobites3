import type Stripe from "stripe";
import type { Order } from "./lib/types";

type CreateSession = (params: Stripe.Checkout.SessionCreateParams, options: Stripe.RequestOptions) => Promise<Stripe.Checkout.Session>;

function expiryRejected(error: unknown): boolean {
  const e = error as Partial<Stripe.errors.StripeError> | null;
  return e?.type === "StripeInvalidRequestError" && e.param === "expires_at";
}

/** Keep the expiry and key identical across retries. Stripe measures its minimum
 * from receipt of the request; order reservation and network time precede it. */
export async function openCheckoutSession(order: Order, webUrl: string, reused: boolean, create: CreateSession) {
  const created = Math.floor(order.createdAt / 1000);
  const returnUrl = `${webUrl}/track?id=${order.id}&payment=success`;
  const options = { idempotencyKey: `checkout:${order.id}` };
  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    line_items: [{
      price_data: { currency: "eur", product_data: { name: `Kuopio Bites order ${order.id}` }, unit_amount: Math.round(order.total * 100) },
      quantity: 1,
    }],
    customer_email: order.customer.email,
    metadata: { order_id: order.id, amount_eur: order.total.toFixed(2) },
    success_url: returnUrl + "#session_id={CHECKOUT_SESSION_ID}",
    cancel_url: webUrl + "/order?payment=cancelled",
    expires_at: created + 35 * 60,
  };
  try {
    return await create(params, options);
  } catch (error) {
    const mismatch = (error as Partial<Stripe.errors.StripeError>)?.type === "StripeIdempotencyError";
    if (reused && (mismatch || expiryRejected(error))) {
      // A pre-upgrade request may have succeeded before its database bind.
      // Replay its exact parameters with the original key, never a second key.
      try {
        return await create({ ...params, success_url: returnUrl, expires_at: created + 30 * 60 }, options);
      } catch (legacyError) {
        if (!(expiryRejected(error) && expiryRejected(legacyError))) throw legacyError;
      }
    }
    if (expiryRejected(error)) throw new Error("payment.creationExpired");
    throw error;
  }
}
