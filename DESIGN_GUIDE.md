# Kuopio Bites — Design Guide

Living reference for the public site **and** the admin panel. If a new screen disagrees with this document, the document wins (or gets updated deliberately).

---

## 1. Brand identity

- **Name:** Kuopio Bites & Asian cuisine — Jalkasenkatu 7, 70820 Kuopio · 044 981 6223.
- **Character:** warm South-Asian street kitchen meets Nordic clarity. Function over fashion in the admin; appetite over decoration on the public site.
- **Logo:** round logo (`/public/logo.png`) in header + favicon. The banner pizza mark is an alternative behind the `settings.headerLogo` config flag only.
- **Interaction references:** Wolt / Uber Eats *patterns* only (card grids, sheets, order pipeline). Never their branding, logos, layouts or assets.

## 2. Colour

Tailwind tokens (names are historical — `cherry` is now teal):

| Token | Hex | Use |
|---|---|---|
| `cherry` | `#0F3D3E` | Primary teal — header, footer, nav, headings, admin sidebar |
| `cherry-bright` | `#12433F` | Hover states, chart bars |
| `cherry-deep` / `cherry-dark` | `#0A2E2F` / `#06201F` | Dark surfaces, overlays |
| `cream` | `#FDF6E3` | Page background |
| `cream-deep` | `#FBEFC7` | Cards, tables, admin content bg |
| `cream-dark` | `#F1E0A8` | Hover on cream surfaces |
| `gold` | `#E8792B` | Burnt-orange accent — CTAs, quick-create “+”, highlights. **Sparingly.** |
| `gold-soft` / `gold-deep` | `#F49B58` / `#C05F1A` | Accent hover / accent text on cream |
| `brick` | `#B3402A` | Destructive / error / “sold out” |
| Status green | `#2e7d32` on `#e6f4e7` | Available, accepted, completed, refund-negative amounts |

Rules:

- WCAG AA contrast for all text; body text never lighter than `cherry/60`.
- Orange is an accent, never a background for long content.
- Public banner blends into cream — no hard edges against the page background.
- Hero banner sits on a faint tiled **hand-drawn food-doodle wallpaper** (`/public/brand/doodles.png`, original line-art, multiply blend at ~16% opacity, bottom fade mask) — small icons, transparent feel, never competing with the wordmark.

## 3. Typography

- **Display:** `font-display` — Fraunces (serif), fallback Georgia. Headings, prices totals, big numbers.
- **Body:** `font-sans` — Nunito Sans, fallback system-ui.
- **Script accent:** `font-script` (Caveat) — handwritten annotations only (e.g. “Päivän erikois”).
- Numbers that align in columns: `tabular-nums`.
- Prices: **EUR with decimal point, never comma** (€12.50) — everywhere, both languages.
- Admin labels: 11px, `font-black`, uppercase, tracking-wide, `cherry/50`.

## 4. Layout & spacing

- Public site: `container-x`, header is fixed `h-16 sm:h-20`; content starts `pt-24 sm:pt-28`.
- Radii: cards/panels `rounded-2xl`, controls `rounded-lg`, pills/chips `rounded-full`.
- Borders: hairline `border-cherry/10–/20`; emphasized border `border-gold` or 2px `border-gold/40` (drawer headers).
- Shadows: `shadow-card` (rest), `shadow-lift` (floating: drawers, dropdowns, modals).
- Admin shell: fixed 240px teal sidebar (`lg+`), off-canvas drawer below; sticky top bar; tab-chip row; content on `cream-deep`.

## 5. Components

**Buttons**

- Primary (public): teal bg, cream text. Admin primary/quick-create: `gold` bg, `cherry-dark` text, `active:scale-[0.97]`.
- Ghost: `border-cherry/20`, inverts to teal on hover. Destructive: `brick` outline → solid.
- Min touch height 36–44px.

**Pills / status**

- `Pill` (admin/ui.tsx): green = available/accepted/completed · orange = placed/preparing/pending · teal = ready/out/delivery · red = cancelled/refunded/sold-out · gold = pre-order · gray = neutral.

**Toggles** — 44×24-ish track, green when on, `cherry/20` when off, knob slides; role="switch".

**Tables (admin)** — single `DataTable` pattern: sticky-ish header row (uppercase micro-labels), zebra-free hairline rows, hover `cream-deep/70`, in-table search, sortable headers, checkbox column with bulk bar, ⋮ row menu (right-anchored popover), “Showing X ▾ of N” + pagination footer. Skeleton rows while loading; branded `EmptyState` (cream circle + icon) when empty — never a bare page.

**Drawers** — right-side sheet, spring slide, gold bottom-border header, max-w-md (2xl for order detail / item editor). Backdrop `cherry-dark/40` + slight blur.

**Tab chips (admin)** — rounded-full closable chips; active = teal fill; persisted in localStorage.

**Inputs** — `min-h-[38px]`, `border-cherry/20`, `bg-cream`, focus border `gold`.

## 6. Iconography

- Stroke icon set `Ic` (`src/admin/icons.tsx`), 16–20px, currentColor, weight 2.
- Public site may use emoji sparingly in menu chrome (🛵, 👥) but never as brand marks.

## 7. Imagery

- Menu photos: 1:1 1200×1200 WebP on `#F4F4F2`, soft studio light, gentle shadow, no text/logos/hands/props. Top-down for plates/pizzas/rice/noodles/salads/curries/biryani; 45°/side for burgers/wraps/rolls/shawarma/drinks/buckets.
- Stored `/public/menu/<category-slug>/<imageKey>.webp`; variants share one file via `imageKey`; live coverage from `/menu/index.json`.
- Rendering: `MenuImage` — `next/image`, lazy + blur placeholder; caption bottom-right “Havainnollistava tuotekuva / Illustrative product image”; missing photo → branded cream placeholder with category icon (never broken-image, never external hotlinks).
- Drinks: generic unbranded glass/can only; brand names remain text.
- Karachi Biryani imagery must show authentic red-and-white layering, not uniformly brown rice.

## 8. Motion

- Framer Motion: transforms + opacity only (no layout-thrash properties).
- Durations 150–400ms; drawers/menus use non-bouncy springs.
- Everything static under `prefers-reduced-motion` (`motion-reduce:` variants / CSS media query).
- Marquee strips, steam and floaty keyframes exist in tailwind.config for the public site only — never in the admin.

## 9. Localisation

- EN + FI, 215 shared keys (`scripts/check-i18n.mjs` gates the build — both dictionaries must stay complete).
- Finnish-first naming for menu items; per-language overrides editable in Admin → Localization without redeploy.
- Dates/times displayed in `Europe/Helsinki`; “klo” in Finnish contexts.

## 10. Admin UX principles

1. Function-first internal tool: dense tables, keyboard-friendly, no marketing polish.
2. Every destructive action gets a confirm dialog; every state change gets a toast + audit-log entry.
3. Availability is a first-class column: one tap toggles sold-out; “today only” auto-resets at midnight Helsinki.
4. Filters show an active-count badge; clearing is one click.
5. CSV export on every meaningful table (orders, menu, analytics).
6. Empty/loading/error states are always designed — skeleton rows, empty illustrations, retryable errors.
7. Roles (Owner / Manager / Kitchen) gate scope: Kitchen sees Orders + availability only (demo storage `kb_staff`; wire to real auth in production).

## 11. Accessibility

- Semantic landmarks (nav/main/aside/dialog), visible focus rings, `aria-label` on icon-only buttons, `role="switch"` on toggles, dialogs trap nothing but announce via `aria-modal`.
- AA contrast everywhere; touch targets ≥ 36px; tables remain horizontally scrollable on small screens rather than collapsing data.

## 12. Do / Don't quick list

- ✅ Decimal point prices · teal + cream base · orange sparingly · generated-original imagery · pattern-borrowing from delivery apps.
- ❌ Comma decimals · Wolt/Uber branding or assets · external image hotlinks · layout-property animations · un-designed empty states · cherry-red accents (retired with the v1 identity).

## Fixed stationary background (v3.2)
- `<FixedBackground />` mounted in `layout.tsx` via `<FixedBackgroundGate />` (chrome.tsx): renders ONLY on `/` (landing page) — all other routes keep the original solid cream page background (user directive). Layer: `position: fixed; inset: 0; z-index: -1`, height `100vh → 100lvh/100dvh` fallback chain. **Never** `background-attachment: fixed` (iOS Safari bug).
- Artwork = brand food collage: `/img/bg.webp` (desktop 236 KB) + `/img/bg-mobile.webp` (80 KB) via `<picture>`, JPG fallback `/img/hero.jpg`.
- Cream overlay tints the art; tunable via `:root` vars `--fixed-bg-overlay` (rgb triplet), `--fixed-bg-overlay-opacity` (0.22 — light tint only; heavier values read as 'blur' to the user, rejected), `--fixed-bg-parallax` (0.12, 0 = off).
- Parallax: **removed by user directive** — the layer is 100% stationary (no scroll listeners, no transforms). Verified: image rect identical at scrollY 0/1500/3000.
- Section rhythm: transparent (bg shows) → `.glass` (translucent + `backdrop-filter: blur(10px)`) → solid (`bg-cream-deep` cards / teal marquee & footer). Home category grid uses `.glass`.
- Home is banded per user directive: solid cream banner → fixed collage only in the hero band → from Today's Specials to the footer, solid cream again (`div.-mb-20.bg-cream.pb-20` wrapper; the `-mb-20/pb-20` pair paints cream through the footer's `mt-20` gap). Hard crisp edges at both hand-offs — gradient fades removed per user directive ("no blurred edges"). Hero copy sits on a flat `bg-cream/85` rounded panel (no backdrop blur) for AA contrast over the crisp collage.
- Home banner section is solid cream (doodle wallpaper on top); the fixed background appears only from the banner's bottom edge, with an 80px cream→transparent hand-off fade (`.absolute top-full` strip). User directive: bg starts where the banner ends.
- Admin keeps its own opaque `bg-cream-deep` shell — intentional.
