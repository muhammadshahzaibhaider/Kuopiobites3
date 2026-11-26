# BUG-002: Stripe payment to kitchen acceptance

## Evidence and scope
Inspected `main` at 4345256 and PR #61 at 8ebdb25. The production-intended application path is `POST /api/checkout/session` → Stripe Checkout → signed `POST /api/webhooks/stripe` → `orders.payment_status` → staff `PATCH /api/orders/:id/status`. `backend/src/server.ts` registers the raw-body webhook before JSON parsing. There is one Stripe-session processor, `applyStripeCheckoutEvent` → service-role `process_stripe_checkout_event`; staff recovery calls that same processor. No alternate client-side paid assertion is trusted.

These are repository findings. The active Render commit, Stripe account endpoint/subscriptions and hosted database migration state have not been verified in this run. Render discovery had no selected workspace. No production data, refund, cancellation, migration, merge or deploy was performed.

## Verified failure branches and resolution
| Branch | Defect or risk | Resolution |
| --- | --- | --- |
| Unpaid completion | Main could continue to an unconditional paid write for an unpaid matching-amount session; async event type was also treated as proof of payment. | Retrieve the current session from Stripe. Only `payment_status=paid` may enter the paid branch. |
| Event receipt before work | An interrupted/mismatched attempt could encounter an existing `stripe_events` ID and skip unfinished work. | Only completed receipts suppress repeats. Historical IDs without `processed_at` remain recoverable. Invalid identity/amount never creates a completed receipt. |
| Changed payment reference | `payment_ref` changes from `cs_` to `pi_`, losing the session needed for later recovery. | Preserve independent `checkout_session_id`, including trusted legacy `cs_` backfill. |
| Payment validation | Main tolerated amount discrepancies for paid events. | Require exact integer cents equal to `round(orders.total*100)`, EUR, matching stored `cs_` identity, canonical metadata order ID and PaymentIntent. Real mismatches remain unpaid and require investigation. |
| Cleanup failure | Earlier PR #61 rolled back payment when settings, promotion, cart or receipt work failed. | Persist validated paid state under the order lock. A nested savepoint rolls back auxiliary effects and their receipt on failure, records `stripe_effects_error`, and leaves paid durable. The webhook returns 503 for retries. |
| Missing webhook | Status PATCH previously trusted only the stale DB flag and returned `payment.notPaid`. | For pending orders, staff status PATCH retrieves the server-stored Checkout Session and uses the shared processor, then rereads payment. Unpaid, mismatched or unbound sessions cannot pass. |
| Ready-time request | Acceptance was sequenced after the estimate request. Returned failure happened to be caught by the store, but a rejection or hanging estimate still gated acceptance. | Persist accepted status and resolve the takeover before calling the optional estimate update. Never advertise the estimate as saved when it fails. |
| Expiry after payment | Main deleted order rows on failure events without guarding paid state. | Retrieve canonical Stripe state; SQL refuses unpaid expiry changes to paid/refunded rows. Cancelled unpaid rows/items are retained. Late confirmed payment reopens only a webhook-cancelled pending row; cleanup retries cannot reopen a staff-declined paid order. |
| Concurrent refund/status | A paid read followed by an unconditional status write could change a refunded row. | The status write also predicates on `payment_status=paid` and checks affected rows. |
| Checkout creation/binding failure | Deleting an order after an uncertain external request could lose the only payment correlation. | Retain uncertain attempts; return the hosted URL only after binding succeeds. Creation uses a per-order Stripe idempotency key. |

## Recovery semantics
A valid matching payment is independent of reward/cart/promotion availability. Side effects and the completed receipt remain atomic and idempotent, with pending cleanup visible as `stripe_paid_processed=false` and `stripe_effects_error IS NOT NULL`. Investigate and retry those sessions after fixing the cause; no second reward credit or deletion of changed/new cart lines is allowed. Failure to commit the core database update (database outage, missing schema, constraint/permission failure) still requires a retry; no implementation can guarantee durable storage while the database is unavailable.

A reused promotion cap can leave cleanup pending, but never hides the confirmed payment from the kitchen. Do not increase a promotion cap automatically. Non-webhook settings writers can still race with one another; a full reward-ledger migration is outside BUG-002.

A missing webhook can be recovered by staff attempting acceptance from the existing orders list. This is a staff-triggered recovery, not a background Stripe poller. The backend validates payment even when the frontend still displays pending. Public unauthenticated GET requests cannot trigger reconciliation. Historical orders deleted by old code or lacking both trusted session and matching legacy intent need separate operator reconciliation; do not infer payment from a customer screenshot or redirect URL.

## Verification and release gates
The payment-integrity workflow runs backend regression tests against disposable PostgreSQL, backend compilation, and frontend acceptance sequencing tests. Tests include exact/mismatched amounts, unpaid async signals, signatures/raw HTTP, expiry after paid, duplicate and concurrent delivery, failed receipts, reward/cart rollback, legacy receipts, missing-webhook recovery through the same application processor and SQL function, unavailable settings, reused promotion caps, concurrent refund, and ready-time failure. A focused schema fixture is not the full hosted Supabase schema or a real Stripe test-mode checkout.

Before production release:
1. Independent code/SQL review and isolated Supabase staging validation are required. Apply `supabase/migrations/20261126062645_stripe_checkout_integrity.sql`, then `supabase/migrations/20261126071000_bug002_payment_acceptance.sql` before the backend. The original migration is unchanged; staging that already applied it needs only the second migration.
2. Exercise Stripe test-mode checkout → persisted paid → kitchen accepted with real authentication. Include missing/delayed webhook, async payment, expiry, backend restart, estimate failure, duplicate delivery and extended repeated orders.
3. Confirm active frontend/backend commits, migration state, signing secret and webhook subscriptions. Check historical affected orders individually and resolve paid-but-cancelled cases without automatically issuing refunds or changing business decisions.
4. Obtain the owner's final deployment approval. Use backup/cutover checks and monitor webhook failures and pending effects. Reverting the backend reintroduces old behavior; retain additive columns and pause/reconcile checkout during rollback.

Menu, delivery pause and ringtone implementation are outside this change.

## Local validation (26 November 2026)
- Backend: 120 passed, 0 failed, 0 skipped against native PostgreSQL 17.7. Environment lacks system psql; a temporary pg-wire CLI adapter executed the unchanged SQL test commands against the real server. GitHub CI uses normal psql/PostgreSQL service containers.
- Frontend acceptance: 2 passed; backend and frontend TypeScript compilation passed.
- Frontend's existing package/lock mismatch prevented npm ci. Local typechecking used npm install --package-lock=false --ignore-scripts without repository dependency changes. This pre-existing reproducibility issue remains a release risk; it is outside BUG-002.
- The separate follow-up migration preserves the earlier draft migration. CI must pass on the final commit after publishing.
