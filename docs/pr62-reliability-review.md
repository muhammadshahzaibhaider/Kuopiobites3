# PR #62 reliability implementation and release record

Date: 26 November 2026 (Asia/Karachi). Starting head: `7d6c7e024b0fda98814f0f404589ae3d853ad47d`; main/base: `b3daad84fc0f4b1fa20f650d9b481c6e39444546`.

Disposition: implementation candidate; independent re-review and staging acceptance required. No production deployment, merge, real charge/refund, or production SQL application was performed.

## Evidence and corrections

The previous source audit (KB-A01–A20) and independent PR review (R62-01–R62-08) were recovered from the existing workspace and checked against the unchanged remote PR head. They are findings, not proof that production currently runs this branch.

| Finding | Result in this PR |
|---|---|
| R62-01 / KB-A09, retry after Stripe payment | Real checkout HTTP handler now reconciles and returns the original paid ticket. Open sessions return their original URL. Complete/unpaid sessions stay pending. Canonical expired/unpaid sessions release reservations and require a new explicit action. No branch silently creates a replacement session. |
| R62-05, incomplete request identity | Browser persists a UUID before sending. Customer + UUID is unique in the database. Its canonical request hash includes pizza selections, fulfillment details, notes, contact, promo and redemption inputs; irrelevant pickup address is normalized. Retrying an identity with different contents is rejected. Stripe checkout requires this identity; cached old clients must reload. |
| R62-06 / KB-A04, financial reservation races | `create_checkout_order` locks customer identity and shared reservation state, then reserves the order, kitchen lines, promotion use, reward and daily preorder capacity in one transaction. Matching retries return the original row before reward/capacity checks. Cart cleanup snapshot is captured in that transaction. |
| R62-02 / KB-A01, settings privacy | Direct SELECT revoked from PUBLIC, anon and authenticated on private settings and promotion configuration. Public shop/offer projections remain available through Express; verified staff retain configuration. Staff/public settings responses cannot enter shared caches. Real baseline grants/RLS tested with customer and staff identities. |
| R62-03 / KB-A03, A18, paid status transitions | Database trigger rejects unpaid/refunded acceptance and invalid transitions. API status write compares both payment and previous status. Internal canonical late-payment recovery and completed refunds retain explicit allowed transitions. |
| R62-04, backend compilation | Reservation projection now supplies required fields and normalizes database HH:MM:SS to slot HH:MM. TypeScript passes. |
| R62-07 / KB-A05, A06, lost settings/reward updates | Configuration writes omit database-owned promotion counters. Minimal settings changes commit in one SQL transaction. A locked trigger preserves private reward/claim keys from stale configuration saves. Private state uses compare-and-update; walk-in approval and its stamp commit together. |
| R62-08 / KB-A07, refunds | Persist a refund operation before contacting Stripe. Recover stored/provider refund identities before creating a refund. Only matching EUR/full-amount/PaymentIntent success marks refunded. Signed refund lifecycle webhooks retrieve canonical provider state. A refund arriving before its checkout webhook first recovers payment. Failures remain retryable. |
| KB-A02, A10, A11, tracking | Preserve minimal anonymous tracking, explicit cancellation, latest remote data; prevent previous-order and reversed-poll responses from replacing the current ticket. Finish a matching browser checkout identity after confirmed tracking. |
| KB-A08, delivery | Preserve fail-closed coverage verification from the prior commits. |
| KB-A12, checkout busy state | Preserve try/finally around profile and payment work from prior commits. |
| KB-A13–A15, reservations | Preserve server hours/date/block validation and frontend failure cleanup; enforce existing one-party-per-slot behavior atomically under contention. |
| KB-A16, cart | Atomic insert/increment replaces the bounded client-side read/compare retry loop. Database contention tests retain all increments. |
| KB-A17, erasure | Self-service and owner paths call the same erasure operation. Contact snapshots, line notes, private reward state and claims are removed under the existing anonymization policy. Financial order totals/history remain. This is an engineering consistency fix, not legal retention advice. |
| KB-A19, stale quote | Quote key includes fulfillment, address, language, promo and actual cart selections. Order page checks the current key during render, including the debounce window. Older results are invalidated and stale remote quotes are not reused after failure. Local fallback totals remain estimates; checkout always reprices. |
| KB-A20, reproducible release | Maintained `frontend/` lockfile repaired; clean install and production build pass. CI now checks the complete maintained frontend, quote/acceptance/ringtone tests, and browser audio. Root historical frontend is not a certified deployment target. |
| Active kitchen queue | Active tickets are fetched separately from recent history with keyset pagination; scheduled tickets cannot disappear behind the 300-row historical limit or first database page. |
| Additional reward defects | Explicit not-ready states above seven stamps are preserved for larger configured targets. Discounted payments below EUR 10 consume their reward without incorrectly awarding a new stamp or leaving it reserved forever. |
| Dependency advisories | Patched body-parser and qs transitives; upgraded Zod to patched 4.6.7 with explicit record-key schemas. Backend schema/HTTP regression suite and TypeScript cover this compatibility change. Maintained frontend resolves Next 16.4.6. Both npm audits report zero known advisories at verification time. |

## Validation

- Clean backend `npm ci --ignore-scripts`, TypeScript compilation, full backend suite against dedicated disposable PostgreSQL 17: **168 passed, zero failed, zero skipped**, including **38 database cases** and the complete ordered application migration chain. Hosted auth/storage objects are disposable stubs, not a live Supabase instance.
- Actual local Express checkout route: paid retry, open/lost-response retry, async-pending retry and expired retry; public/staff settings projections. Stripe/database/auth boundaries use synthetic fixtures. No external charge was made.
- Clean maintained frontend `npm ci --ignore-scripts`, translation check (295 EN/FI keys), TypeScript and production build: passed.
- Frontend acceptance, audio/CSP unit and quote-identity tests: **23 passed**. These do not prove audible playback on the restaurant device.
- Local browser audio test: **blocked** because Chromium download is denied in this workspace. GitHub Chromium integration **passed seven cases at `0610eea`**: five tones, denied-CSP reporting, and recovery from blocked autoplay through a trusted click. The browser source is unchanged by the subsequent database lock-order correction.
- `git diff --check`: passed. Tests are recorded for this candidate; final GitHub CI results must also be inspected at its pushed SHA.

## Controlled release prerequisites

1. Review the amended PR and SQL independently. Keep it draft until all required checks and acceptance tests pass.
2. Back up and stage the database. Apply the ordered Supabase migrations, including revised `20261126120000_audit_privacy_status.sql`, new `20261126130000_checkout_reliability.sql` and `20261126140000_reward_redemption_threshold.sql`. If an earlier draft privacy migration was already applied outside this workflow, explicitly apply its corrected definition/grants; a migration ledger will not rerun an edited file. Do not blindly reapply non-idempotent migrations.
3. Coordinate the backend and maintained frontend rollout. New RPCs/tables are prerequisites for this backend. New checkout requires the browser attempt UUID, so cached old clients fail safely and need reload. Verify Vercel's actual root is `frontend/`, and inspect the serving Render backend commit rather than assuming it matches the frontend.
4. Configure the signed Stripe endpoint for existing checkout events **and `refund.created`, `refund.updated`, `refund.failed`**. Exercise pending/success/failure, response loss, database interruption, duplicate and out-of-order events in test mode. Verify that a paid ticket accepts even when optional ready-time work fails.
5. Test paid/unpaid notification arrival, a trusted audio-unlock gesture, reconnect, background/foreground and audible ringtone on the actual kitchen browser/device. Run Google/email/reset authentication and mobile/desktop business acceptance. Google code-flow assumptions were identified in the earlier audit; this PR does not claim a live authentication pass or change that flow speculatively.
6. Obtain owner release acceptance, then deploy with post-deploy checks. Neither a unit-test pass nor this document approves deployment.

## Recovery and remaining operational limits

- Unbound checkout creation retries use the stored order and deterministic Stripe parameters/key; they never abandon a possibly charged order. Uncertain attempts older than 23 hours fail closed (`payment.recoveryRequired`) before Stripe can prune its idempotency key. An operator must inspect the original Stripe session/payment and bind/reconcile it; do not invent a new order or retry a charge blindly. No background reconciliation worker was introduced.
- Pending refund operations retain identity; webhook delivery or staff retry converges provider and database state. Older unbound refund uncertainty also requires provider inspection. A failed refund is surfaced, not silently reissued under a fresh key.
- Existing legacy open sessions created before durable attempt identity require staging/rollout reconciliation. This code cannot reconstruct missing historical customer intent or claim to repair every pre-existing production record.
- Browser audio, live Stripe, actual deployed backend SHA, Google login, multi-replica rate-limit behavior and repository branch-protection settings are not certified by local tests. The previous audit's operational risks remain release checks. Full historical secret scanning was not performed.
- Rollback must preserve payment/refund facts and order history. Prefer rolling back application deployments while retaining additive schema/security guards. Do not drop financial records, replay side effects blindly, or remove a migration with live dependencies. Restoring an old backend requires independent compatibility checks with the stronger status trigger.

No finite test suite guarantees zero future defects. This candidate closes reproduced application defects and adds regression coverage; production readiness remains contingent on the listed independent review, environment checks and business acceptance.


## Browser test fixture correction after first CI run

At `f738333`, GitHub backend/database tests, frontend unit tests, TypeScript and production build passed. Chromium ran all five tones successfully and confirmed that a denied media CSP is reported. The no-gesture case then timed out: it invoked playback with Playwright `page.evaluate`, whose Chromium implementation sends `Runtime.callFunctionOn` with `userGesture: true`.

The fixture now starts that case directly in the page module during navigation, records that no user activation existed, verifies blocked playback, and then tests recovery through a trusted click. Application ringtone code is unchanged by this correction. The amended CI run must pass before release; the original failed check has not been reclassified as a pass. Actual restaurant-device audio and live workflows remain acceptance requirements.


## Lock-order correction and regression proof

The new checkout/settings transactions lock shared settings before promotion/order rows. Payment expiry previously took a promotion lock before settings; that inverted order could deadlock with the new transactions. The canonical payment RPC now acquires the shared settings lock first for both success and failure. Missing settings still permits the verified paid fact to persist, with cleanup remaining retryable, as BUG-002 requires.

A deterministic two-connection regression holds the settings row, starts expiry, waits until its database lock wait is observable, and checks that another transaction can still lock the promotion. With the correction removed, the test reproduced `could not obtain lock`; with it restored, it passed. The complete backend suite then passed 168 tests with zero failures/skips, including 38 database cases. The final remote CI run remains the release gate at the amended SHA.

## Release preflight: production cart options type

The deployment preflight verified production column types and found `cart_items.options` is JSONB, matching the full repository schema. The reduced payment fixture had incorrectly represented it as `text[]`, allowing the new cart increment RPC's wrong array expression to pass. Before merge or production migration, the RPC was corrected to insert JSONB and the reduced fixture was aligned. The full application-schema bootstrap now executes cart inserts/increments with selected options and checkout reservation with its cart snapshot, rather than verifying schema installation alone.
