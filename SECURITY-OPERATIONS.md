# Kuopio Bites security operations

This workspace currently runs a hardened custom SQLite/Express API and Next.js frontend. It is **not** a production Supabase deployment yet. The Supabase/Auth/RLS/GDPR design that must be preserved during migration is in `SUPABASE-SETUP.md`.

## Before production

1. Provision a TLS reverse proxy for both web and API. Set `NODE_ENV=production`, `COOKIE_SECURE=true`, exact HTTPS `CORS_ORIGINS`, `PUBLIC_WEB_URL`, and `PUBLIC_API_URL`. Do not expose the Node listener directly.
2. Put each secret in the deployment secret manager. Never commit `.env`, `.env.local`, database files, uploads, certificates, or private keys.
3. Generate `JWT_SIGNING_SECRET` with a cryptographically secure random generator and store it only in the backend secret manager. `JWT_SECRET` is a legacy local compatibility name and should be absent in production.
4. Configure real SMTP before enabling password signup. Confirm-email tokens are single-use and expire after 24 hours. Do not enable a local development token helper in production.
5. Configure a real Stripe secret, webhook signing secret, exact success/cancel URLs, and the Stripe Dashboard webhook endpoint. Use `/api/checkout/session`; never add card fields or card data to this application.
6. Complete the Supabase migration only with the project URL/keys and schema from the existing guide. A Supabase service-role/`sb_secret_…` key belongs only in the backend migration service, never in browser variables. Google client secret belongs only in Supabase Authentication provider settings; staff stay password-only.
7. Configure a provider-managed image bucket/storage if replacing the current local media directory. Preserve the 5 MiB image-only restriction and manager/owner write policy.
8. Remove seeded demo staff credentials and create named staff accounts. Enforce MFA at the IdP/edge for owner/manager where available.

## Secret inventory and rotation

| Secret | Location | Rotation action |
|---|---|---|
| `JWT_SIGNING_SECRET` | backend secret manager | Generate a new 32+ byte secret, deploy during a maintenance window, invalidate old sessions, and verify all clients re-authenticate. |
| `SUPABASE_SERVICE_ROLE_KEY` / `sb_secret_…` | backend migration runtime only | Rotate in Supabase Dashboard, update the secret manager, restart backend, and search logs/build artifacts for accidental exposure. |
| `STRIPE_SECRET_KEY` | backend only | Roll/revoke in Stripe, update backend, test a small checkout, and verify webhook delivery. |
| `STRIPE_WEBHOOK_SECRET` | backend only | Create/rotate the endpoint signing secret, update backend, send a Stripe test event, and verify invalid signatures return 400. |
| SMTP password/API credential | backend only | Rotate at the mail provider, update secret manager, send a confirmation test, and watch bounce/failure metrics. |
| image-generation/provider key | backend job only | Revoke/reissue at the provider; never put it in `NEXT_PUBLIC_*`. |
| Supabase publishable/anon key | browser-safe only | Rotate if necessary, then re-check RLS; it does not replace backend authorization. |

When a secret may have entered source control, assume compromise: revoke first, preserve audit evidence, rotate all related credentials, remove it from future revisions, and inspect CI/build logs. This workspace has no `.git` metadata, so historical-secret verification cannot be performed here.

## Monitoring and response

Export structured application logs with request ID, route, status, latency, and a redacted actor/role. Do not log passwords, bearer values, cookies, CSRF tokens, SMTP/Stripe/Supabase keys, full addresses, or raw payment payloads. Alert on:

- repeated `401/403/429` responses and failed-login/lockout audit events;
- CORS/CSRF failures, invalid Stripe signatures, amount mismatches, and unexpected role denials;
- elevated `5xx`, database busy/locked errors, SMTP failures, Stripe webhook retry/age, and upload rejection spikes;
- unusual refunds, owner-level GDPR erasures, changes to delivery/minimum/VAT/pricing, and audit-log gaps.

Keep encrypted, tested backups of SQLite until migration; test restore, retention, and GDPR deletion procedures. Keep activity/audit data append-only and forward it to an immutable log sink before allowing operators database access.

## Security checks used in this workspace

- `npm audit --omit=dev` in backend and frontend;
- `npm run typecheck` in both projects;
- `npm run build` in frontend;
- a local security script covering strict unknown-key rejection, server repricing with a submitted total of zero, customer ownership, and secret-name scans;
- a rebuilt `.next` scan for backend-only variable names.

The final report must distinguish code fixes from provider-side blockers. Passing local checks is not a statement that Supabase, Stripe, SMTP, TLS, WAF, backups, or monitoring are deployed.
