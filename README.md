# Axiom Labs — Enterprise AI Architecture & Digital Engineering Studio

Dark, cinematic flagship site for **Axiom Labs** — inspired by the editorial depth and motion language of `antimatterai.agency`, rebuilt with original code and Axiom's own brand (AX mark, violet/indigo beams, glassmorphism).

> **Status:** Demo site with illustrative work. All case studies, metrics, and performance figures are *concept demonstrations* — not verified client results, not compliance certifications, and not guarantees. See disclaimers in each dossier.

## Stack

- **Framework:** Next.js 14 (App Router), TypeScript 5.6
- **Styling:** Tailwind CSS 3.4, custom `glass-panel` and conic-ray utilities, `prefers-reduced-motion` safe
- **Icons:** `lucide-react`
- **Validation:** `zod` (shared schema between client preview and server)

## Architecture — Separation of Concerns

```
src/
├── app/                      # Next.js App Router (routing & pages)
│   ├── api/
│   │   ├── contact/route.ts  # ← server-only API module (see below)
│   │   └── health/route.ts
│   ├── work/                 # portfolio gallery + dossier pages
│   ├── services/[slug]/      # 6 service pillars
│   ├── company/              # narrative & FAQ
│   ├── blog/                 # educational notes
│   ├── open-axiom/           # starter kits (demo quality)
│   ├── resources/vendor-matrix
│   ├── demos/*               # 6 interactive labs (simulated)
│   ├── contact/              # contact hub
│   ├── layout.tsx
│   ├── page.tsx              # home with hero, stats, services, case studies
│   └── globals.css
├── components/               # front-end only (no server logic)
│   ├── Navbar.tsx            # mega-menu, mobile drawer, a11y
│   ├── Footer.tsx            # 5-column + live local clock
│   ├── Hero.tsx + LightRays.tsx
│   ├── StatsSection.tsx + RollingNumber.tsx
│   ├── ServicesGrid.tsx + CaseStudies.tsx + LogoStrip.tsx
│   ├── ContactForm.tsx       # client validation + honest status UI
│   └── ContactSection.tsx    # composition wrapper
├── data/                     # demo content (clearly labeled illustrative)
│   ├── clients.ts            # 7 dossiers — every metric flagged illustrative
│   ├── services.ts           # 6 pillars — no outcome claims
│   ├── blog.ts, openSource.ts, vendorMatrix.ts, navigation.ts
└── lib/
    ├── utils.ts              # cn()
    └── server/               # server-only modules (never imported by components directly via API)
        ├── validation.ts     # zod schema (shared)
        ├── rateLimit.ts      # in-memory sliding window (replace with Redis in prod)
        └── leadDestination.ts# dispatch to webhook/email — honest delivery gate
```

**Rule:** `src/components/*` and `src/data/*` never import `src/lib/server/*` directly. They talk to the API via `fetch("/api/contact")`. The API route is the only boundary that touches rate limiting, honeypots, and lead dispatch.

## Contact Form — Validation & Abuse Protection

### Client
- Required: `firstName`, `email`, `service`, `message` (min 15 chars)
- Regex email + Zod length bounds
- Honeypots: `botField`, `website` (hidden)
- Velocity: `formLoadedAt` timestamp (client sets on mount; server rejects <800ms)

### Server (`POST /api/contact`)

1. **Honeypot:** if `botField`/`website` populated → silent `200` (bot gets success, nothing dispatched)
2. **Velocity:** if `Date.now() - formLoadedAt < 800ms` → silent `200`
3. **Zod parse:** field-level errors → `400` with `error` + `issues`
4. **Rate limits:**
   - `5 req / hour / IP`
   - `3 req / day / email`
   - `Retry-After` header on 429
5. **Spam heuristic:** >5 links in message → `400`
6. **Lead destination:** `dispatchLead()` attempts:
   - `CONTACT_WEBHOOK_URL` (generic POST) → if ok, `{ delivered: true }`
   - else `RESEND_API_KEY` + `CONTACT_TO_EMAIL` (Resend email) → if ok, `{ delivered: true }`
   - else → `{ delivered: false }` with explicit reason — **UI never claims delivery in this state**

### Frontend honesty

`ContactForm.tsx` renders:

- `delivered: true` → "Inquiry Delivered"
- `delivered: false` → "Inquiry Logged — Preview Mode" + amber callout: *Set `CONTACT_WEBHOOK_URL` or `RESEND_API_KEY` to enable delivery.*

No "success" is claimed unless `delivered === true`.

### Env

Copy `.env.example` to `.env.local`:

```bash
# Optional — if absent, form runs in honest preview mode (validated + logged, not forwarded)
CONTACT_WEBHOOK_URL=https://hooks.example.com/axiom-leads
# OR email via Resend
RESEND_API_KEY=re_xxx
CONTACT_TO_EMAIL=leads@axiomlabs.agency
CONTACT_FROM_EMAIL=Axiom Labs <noreply@axiomlabs.agency>
```

## Demo Data — Labeling

- `src/data/clients.ts`: every `impactMetric`/`results[]` prefixed with `ILLUSTRATIVE:`; footer + dossier banners + card badges all say *Illustrative*.
- `src/data/vendorMatrix.ts`: all rows are synthetic examples; page has top banner + CSV export labeled illustrative.
- `src/data/services.ts`: `metrics` are design targets or process notes, never outcome promises.
- `src/data/openSource.ts`: each item has `note` discouraging production use without review.
- No SOC2/HIPAA/ISO/FedRAMP claim is made anywhere. Healthcare service page is explicitly "concepts" with a no-claim disclaimer; privacy language is "patterns to discuss with counsel."

## Run

```bash
npm install
npm run build   # 32 routes, zero type errors
npm run dev     # http://localhost:3000
```

### Tests

- `npm run typecheck` — static types
- `npm run build` — full production build (runs in CI)
- `curl` smoke (see `scripts/smoke-contact.mjs` if present) or manual: POST to `/api/contact` with honeypot/velocity/rate-limit cases (see `src/lib/server/validation.ts`).

## Deployment

- **Vercel / Next standalone:** set env vars in dashboard; no extra config. `next.config.mjs` includes CSP, HSTS-style headers, and no `api` rewrite (API lives in the same Next instance). If you need an external backend, add a `rewrites()` entry and point `NEXT_PUBLIC_API_BASE_URL` accordingly.
- **Fonts:** system stacks (no external font CDN) for offline builds; add `next/font` if you want Fraunces/Nunito.

## Inspiration vs. Originality

Visual references from `antimatterai.agency` (dark base `#030303`, conic rays, glass panels, marquee) were used as *interaction references only*. All copy, dossiers, icons, and shaders are original Axiom Labs creations — no branding, assets, or text copied.

## License

Demo code — adapt freely; do not ship demo dossiers as real client proof.
