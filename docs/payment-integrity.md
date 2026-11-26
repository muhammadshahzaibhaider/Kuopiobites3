# PR 61: Stripe Checkout integrity

## Scope and evidence
The previous helper used a Checkout Session identifier that disappeared after payment_ref changed from cs_ to pi_. It also separated payment/cancellation writes from reward, promotion and cart cleanup, and recorded webhook receipts before processing completed. The old mocked tests did not exercise the persisted paid-row shape or database rollback.

This change preserves checkout_session_id, verifies Stripe signatures with the official SDK, retrieves the canonical session before acting, and processes state, cleanup and completed receipts in one service-role-only PostgreSQL transaction. Exact amount/currency/session/order matches remain mandatory. Refunded orders cannot return to paid. Existing checkout totals and customer responses are preserved; cart cleanup uses a captured snapshot and retains new/edited rows. No frontend, kitchen, pricing or ringtone files are changed.

## Verification
The GitHub Actions workflow runs the backend suite, actual PostgreSQL transaction/concurrency tests and TypeScript compilation. The database tests reset only an explicitly enabled localhost kuopio_test database. They use a focused schema fixture with the relevant production columns/constraints, not a full hosted Supabase environment. Tests cover duplicates, concurrent success/refund, interrupted receipt insertion after side effects, cancellation rollback, stale events, session mismatch, legacy references and safe cart cleanup. Signature tests use actual SDK verification and HTTP raw-body transport.

CI is necessary but does not prove production correctness. This document must be read alongside the latest PR check results.

## Deployment prerequisites — not completed by this PR
1. Independently review the code and SQL; retain the PR as draft until release gates pass.
2. Provision an isolated Supabase/staging backend with Stripe test credentials. Apply supabase/migrations/20261126062645_stripe_checkout_integrity.sql there before deploying the backend. The migration was generated with Supabase CLI 3.4.0. No production migration is executed by CI.
3. Exercise actual signed Stripe test-mode checkout, asynchronous success/failure, expiry, duplicate delivery and backend restart. Verify persisted payment, reward, promotion, cart and kitchen states for each order. Run an extended order sequence rather than declaring success after two or three orders.
4. Reconcile historical paid/cancelled orders and unfinished side effects separately. Migration flags prevent unsafe automatic replay of historical paid rewards/cart cleanup; they cannot establish whether previous code completed those effects.
5. For production cutover, the owner must approve a maintenance window and database backup. Pause checkout creation while migrating and changing backend versions; drain/reconcile existing sessions. Old code does not populate the new durable fields. Confirm active Vercel/Render commits and Stripe webhook subscriptions before reopening checkout.
6. Monitor webhook non-2xx, retry backlog, paid orders absent from the kitchen and promotion reconciliation errors. Alerting/hosted monitoring configuration remains a separate operational task.

## Explicit limits and recovery
- Checkout Session creation and database binding cross two systems. A Stripe session created before a failed/ambiguous network response or failed database binding requires reconciliation against Stripe metadata. Unbound orders cannot be marked paid from an untrusted session ID. This PR retains order/line records instead of deleting them; it does not implement a distributed checkout outbox.
- If a cancelled promotion reservation has been reused up to its usage limit before contradictory late payment, the transaction raises payment.promotionReconciliationRequired. An operator must reconcile the paid order and promotion; no silent cap overrun occurs.
- Webhook transactions serialize reward updates with each other. Other existing settings/reward writers use read-modify-write requests and can still conflict; staging must include concurrent checkout/settings testing. A complete reward-ledger migration is outside this change.
- Browser ringtone autoplay and order acceptance regressions are separate work (PR 60); this PR does not claim to fix or verify them.
- An additive schema can remain in place when reverting the backend. Reverting application code reintroduces its old behavior; pause checkout and reconcile events before rollback. Do not drop migration columns while the new backend is active.
- Do not merge/deploy based solely on these automated tests. Actual Stripe delivery, the full hosted schema/RLS, release migration and independent review remain release gates.
