# Security audit & hardening — Kuopio Bites (2026-10-09)

Full audit + fix pass over the customer ordering site, the direct-URL admin panel, the
Express/Supabase backend, and both Next.js builds. Everything below was verified against
the running system (backend :4000 + the repo's mock Supabase double + both production
builds). Pre-existing protections were re-tested, not assumed.

Rules followed: backup first (revert point = commit `67c809d`), no git-history rewrite,
no invented secrets/domains, no `npm audit fix --force`, behavior/design left untouched.

---

## 1. What was broken — and fixed (this pass)

| Sev | Finding | Where (file:line) | Risk | Fix |
|---|---|---|---|---|
| **High** | **Stored XSS in the standalone app's print ticket.** Customer-controlled name/note/menu text was interpolated into `document.write` HTML — a crafted order note executed script in the staff print window. | `src/admin/views-orders.tsx` `printTicket()` (was line ~338) | Attacker submits an order with a `<img onerror>` name → runs when staff prints | Ticket now built with `createElement` + `textContent` (mirrors the already-fixed frontend copy). Verified: `document.write` gone from every source tree. |
| Medium | Malformed JSON bodies answered **500 "internal"** | `backend/src/server.ts` final error handler | Status-code misuse; noisy 5xx alarms hide real faults | `entity.parse.failed` → **400 `request.badBody`** (before/after proof below). |
| Medium | No global request ceiling — per-endpoint limiters only | `backend/src/server.ts` (~line 150) | Ungated public GETs (menu/settings/translations) were poundable | Global `/api` limiter **600 req / 15 min / IP**, env-tunable (`API_RATE_*`), keeper per-endpoint limits. |
| Medium | `X-Powered-By: Next.js` fingerprint on both web apps | `next.config.mjs`, `frontend/next.config.mjs` | Tells attackers the exact framework | `poweredByHeader: false` (verified absent over HTTP). |
| Medium | **Root standalone app had zero security headers** (frontend had the full set) | `next.config.mjs` | No CSP/HSTS/clickjacking protection there | Full parity block: CSP, HSTS (preload, prod only), `X-Frame-Options DENY`, `Referrer-Policy`, `Permissions-Policy`, `nosniff`. |
| Medium | Admin was indexable (no `robots.txt`, no `noindex`) | missing `public/robots.txt` both apps | Tool UI discoverable via search engines | `robots.txt` in both apps (`Disallow: /admin`) + `X-Robots-Tag: noindex, nofollow, noarchive` on every `/admin` response. |
| Medium | Stock Express HTML 404 ("Cannot GET /media/") for non-API paths | `backend/src/server.ts` | Leaks framework shape/text | JSON catch-all 404 (`route.notFound`) for all paths. |
| Low | Demo store kept unsalted SHA-256 / legacy plaintext passwords; reset tokens stored raw in localStorage | `src/lib/api.ts` | Old records were rainbow-table-able; a storage dump replayed reset links | `v2$salt$digest` per-user random salt, in-place migration on next login; reset tokens stored as `tokenHash` (legacy tokens still accepted). Migration-safe; production auth untouched (bcrypt via GoTrue). |
| Low | Dead SMTP mailer + unused `nodemailer`/`jsonwebtoken` deps; `SMTP_*`/`IMAGEGEN_API_KEY` in env template | `backend/src/mailer.ts`, `backend/package.json`, `backend/.env.example` | Dead code/config invites misuse | Removed (verified unused by search + running). Mail is Supabase-auth territory now; docs updated. |
| Low | `.config/nextjs-nodejs/config.json` (Next telemetry anonymous IDs) was tracked | repo root | Machine-persistent IDs in a public repo | Untracked + `.config/` gitignored. |
| Low | `source-map-js@1.2.1` (GHSA-68fv-2mgg-jv7q, event-loop DoS) | root `package-lock.json` | Build-time dep only, still listed | Semver-safe update applied; **`npm audit` = 0 vulnerabilities** in all three trees (prod & dev). |
| Info | In-memory test double lacked Map inserts, `create_order`/`erase_customer` RPC, `order_items` embedding, GoTrue "others" sign-out semantics | `backend/scripts/mock-supabase.mjs` | Prevented honest end-to-end security tests | Implemented; the full battery below is reproducible. |

## 2. Must be good already — re-verified live (not changed)

- **Authorization matrix:** anon → customer `/api/account` **401**, staff analytics **403**; customer → staff analytics/orders/analytics **403**; staff session on customer account **401**; staff-only mutations (menu/settings/uploads/status/refund) all server-side checked per request.
- **IDOR:** two real customer accounts; B reading A's order → **403 `auth.forbidden`**, anon → 403/401, owner A → 200, unknown id → 404 even for staff. Customer status-write attempt blocked; staff status-write 200.
- **Mass-assignment:** registering with an injected `role:"owner"` field → **400** (every zod schema is `.strict()`).
- **Server-side pricing:** cart request claiming `unitPrice: 0.01` 2× pizza → total computed from DB = **20.00**; demo order claiming `total: 0.01` persisted as **8.90**.
- **CSRF:** every mutating method requires double-submit token (`kb_csrf` cookie vs `x-csrf-token`, timing-safe compare). Forged token → 403, cross-browser-jar token → 403, own token → 200.
- **Login hygiene:** unknown email vs wrong password → byte-identical `401 auth.badCredentials`; repo policy = 8+ chars, letter+number; duplicate-self email → 409 (no enumeration via forgot-password: neutral response by design).
- **Sessions:** password change → other sessions revoked (401), current kept; old password then rejected; logout revokes. Supabase/GoTrue is the password store (bcrypt).
- **Rate limits:** auth 10/min, login 5/15 min + progressive lockout → observed **429 auth.tooManyAttempts** with `Retry-After`.
- **Uploads:** staff-only (anon 401, customer 403), content-type allow-list, **magic-byte sniff** (text-as-png → **415**, PHP content-type → 415), 5 MB cap (6.5 MB → **413**), random 18-byte names, stored in Supabase bucket (never executed).
- **Injection shapes:** SQLi-flavored ids/queries → 400 (zod charsets) or safe non-500; all DB access parameterized via supabase-js. No string-built SQL anywhere.
- **Error hygiene:** forced internal failure (killed data backend mid-request) → `500 {"error":"internal"}` — no stack, no types. Unknown route → JSON `404 route.notFound`.
- **Stripe webhook:** no signing secret configured → endpoint closed (503) instead of accepting unsigned events.
- **Headers (frontend + root, prod):** CSP (self scripts, no eval, `frame-ancestors 'none'` — plain links to WhatsApp/Wolt/UberEats unrestricted), HSTS `max-age=63072000; includeSubDomains; preload`, `X-Frame-Options DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`; backend helmet equivalents. No `X-Powered-By` anywhere.
- **Database:** RLS enabled on all 14 tables (30 policies), least-privilege split (service-role key server-only; anon key not used by browser at all — frontend talks to the backend only).
- **Secrets posture:** no hardcoded secret in tracked files (detect-secrets + regex battery + entropy scan over all 524 git blobs, 16 commits). Repo **is public** — history is clean (only placeholders); nothing to rotate unless keys were shared outside git.
- **Exposure sweep:** `/.git/*`, `/.env*`, `/backup.sql`, `/server.ts`, `/package.json`, `/data/*.db`, traversal + encoded traversal, null bytes → **all 404**. No directory listings.

## 3. MUST-DO-MANUALLY (provider/hosting side — nothing here is a code change)

1. **Supabase Dashboard → Authentication:** enable **Confirm email** before launch; configure a real **SMTP provider there** (never in app env); enforce **MFA for all staff accounts** (owner/manager) where available.
2. **Supabase Dashboard → Storage policy:** keep the `menu-images` bucket public-read + manager/owner write (matches `SUPABASE-SETUP.md`); review RLS policies once with `pg_policies` after first deploy.
3. **Stripe:** set live `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` in the hosting secret manager; register the webhook endpoint; verify unsigned/signed test events.
4. **Hosting:** TLS only (the apps send `upgrade-insecure-requests` + HSTS preload already); put the API behind the same-origin rewrite as here; add an edge/WAF rate limit (Cloudflare etc.) on top of the in-app ones; keep real client IPs trusted only from the proxy (prod sets `trust proxy 1` — correct only behind your proxy).
5. **CAPTCHA/Turnstile:** add to signup + forgot-password if abuse appears (flagged, not wired — needs a provider key I won't invent).
6. **The repo is PUBLIC** — keep it that way only if clean (it is today). Rotate any secret that ever existed outside git (dashboard/screenshots/logs).
7. Turn on **Dependabot** (repo settings) so the advisory feed opens PRs automatically.
8. Optional major-version upgrades (deferred deliberately): React 18→19, Express 4→5, Stripe v18→v23, zod 3→4, better-sqlite3 11→13. Schedule with regression time; current set is secure.

## 4. Changed files (commit follows)

- `src/admin/views-orders.tsx` — printTicket XSS fix (High)
- `backend/src/server.ts` — 400-on-bad-JSON, global API limiter, JSON catch-all 404
- `backend/src/config.ts` — `API_RATE_*`, removed dead SMTP block
- `backend/.env.example` — global limiter vars; SMTP replaced by Supabase-dashboard note
- `backend/src/mailer.ts` — **deleted** (dead)
- `backend/package.json` / `package-lock.json` — removed `nodemailer`, `jsonwebtoken` (+types); `@supabase/supabase-js` 2.117.3
- `next.config.mjs` (root) — hardened header block (parity with frontend), `poweredByHeader:false`, no prod sourcemaps
- `frontend/next.config.mjs` — `poweredByHeader:false`, no prod sourcemaps, `X-Robots-Tag` on `/admin`
- `public/robots.txt`, `frontend/public/robots.txt` — new
- `src/lib/api.ts` — salted demo hashes + hashed reset tokens (migration-safe)
- `src/lib/types.ts` — passHash comment
- `frontend/src/lib/authErrors.ts` — friendly text for `request.badBody`
- `backend/scripts/mock-supabase.mjs` — test double fidelity (Map inserts, RPCs, embeddings, sign-out scope)
- `.gitignore` — ignore `.config/`; `.config/nextjs-nodejs/config.json` untracked
- `SECURITY-OPERATIONS.md` — refreshed to Supabase reality (no JWT secret, dashboard SMTP, PITR backups)
- root/frontend `package-lock.json` — audit fixes + minor bumps (next 16.3.8→16.4.0, postcss, playwright)

## 5. Before / after test numbers

| Check | Before | After |
|---|---|---|
| Malformed JSON `POST /api/auth/login` | 500 `internal` | **400 `request.badBody`** |
| Unbounded public GETs | no 429 possible | global 600/15min ceiling |
| `X-Powered-By` header | sent (framework leak) | **absent** |
| Root app security headers | none | CSP/HSTS/XFO/RP/PP/nosniff (dump verified) |
| `/admin` search-index signals | none | `X-Robots-Tag: noindex, nofollow, noarchive` + robots.txt |
| Non-API 404 shape | Express HTML | JSON `route.notFound` |
| `document.write` in sources | 1 (root printTicket) | **0** |
| `npm audit` | 1 high (source-map-js) | **0/0** vulns, all trees |
| Functional battery (authz/IDOR/CSRF/pricing/uploads/sessions/limits) | n/a | **55/55 PASS** |
| Page-route renders (12 routes × 2 apps) | n/a | **24/24 HTTP 200**, content sanity OK |
| Typecheck/build (×3 TS roots, ×2 prod builds) | n/a | clean |

## 6. NOT verified (honest limits of this sandbox)

- **Browser-click E2E:** Playwright browser binaries can't be downloaded in this sandbox; popups/cart/admin were verified at code+HTTP level, not pixel level. The printTicket fix is verified by code parity with the frontend copy + typecheck, not by clicking "Print".
- **Stripe happy path** with real keys/webhook signing (no keys here by design).
- **Real Supabase project behavior** (lockout windows, exact RLS edge cases, email delivery): backend was tested against the repo's mock double, which faithfully mirrors GoTrue/PostgREST semantics — production config still MUST follow `SECURITY-OPERATIONS.md`.
- **CSP on the real domain** (static analysis only); third-party embeds beyond Google Maps aren't allow-listed on purpose.

## 7. Ongoing practices to keep

- `npm audit --omit=dev` on every dependency change; Dependabot PRs weekly.
- Never commit `.env*`, uploads, db dumps, keys; the two secret scanners here (detect-secrets + regex battery) are cheap to re-run (`scripts/` candidates).
- Keep server-side authority: prices, totals, roles, ownership — never trust request bodies beyond strict zod schemas.
- Re-run the route/401/403 matrix whenever a new authenticated endpoint is added.
