type Attempt = { signature: string; id: string; orderId?: string };
const key = "kb.checkoutAttempt";
let current: Attempt | null = null;

function read(): Attempt | null {
  try {
    const candidate = JSON.parse(sessionStorage.getItem(key) ?? "null");
    if (typeof candidate?.id === "string" && typeof candidate.signature === "string") return candidate;
  } catch { /* Storage may be disabled or full. */ }
  return null;
}
function save(attempt: Attempt | null) {
  current = attempt;
  try {
    if (attempt) sessionStorage.setItem(key, JSON.stringify(attempt));
    else sessionStorage.removeItem(key);
  } catch { /* The in-memory identity still protects same-page retries. */ }
}

export async function beginCheckout(signature: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(signature));
  const hash = Array.from(new Uint8Array(bytes), (n) => n.toString(16).padStart(2, "0")).join("");
  const attempt = current ?? read();
  // Upgrade existing full signatures without changing an in-flight idempotency key.
  if (attempt && (attempt.signature === hash || attempt.signature === signature)) {
    save({ ...attempt, signature: hash });
    return attempt.id;
  }
  const id = crypto.randomUUID();
  save({ signature: hash, id });
  return id;
}
export function bindCheckout(id: string, orderId: string) {
  const attempt = current ?? read();
  if (attempt?.id === id) save({ ...attempt, orderId });
}
export function finishCheckout(id: string) {
  if ((current ?? read())?.id === id) save(null);
}
export function completeCheckoutAttempt(orderId: string) {
  if ((current ?? read())?.orderId === orderId) save(null);
}
