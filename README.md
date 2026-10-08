# Kuopio Bites — website (v2)

Production-quality, heavily animated, mobile-first site for **Kuopio Bites**,
Jalkasenkatu 7, 70820 Kuopio · 044 981 6223.

## Stack
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS — v2 design tokens: deep teal `#0F3D3E/#12433F` (nav, footer, headings, buttons), warm cream `#FDF6E3/#FBEFC7`, burnt-orange accent `#E8792B`
- Framer Motion (reveals, transitions, hero Ken Burns, marquee, micro-interactions)
- Fonts: Fraunces Variable (display) + Nunito Sans Variable (body) + Caveat (script)
- i18n: EN/FI dictionary (`src/lib/i18n.tsx`), header pill toggle, persisted in localStorage

## Run
```bash
npm install && npm run build && npm run start   # or: npm run dev
```

## Pages
| Route | What it is |
|---|---|
| `/` | Teal hero with single Order Online + Dining CTA pair, live open/closed badge, single-dish Today's Special ticker (left-to-right marquee, static under reduced motion), round category grid (21 circles, staggered, scrollable on mobile), featured carousel, story, hours/map/contact |
| `/menu` | Full 30+ category menu, sticky scrollable pills, search + veg filter, SELECT TOPPING modal for Fantasia/Pannu (min-tier toppings included, extras auto-priced €1/€2 with live running total) |
| `/order` | Account gate → pickup/delivery → 70xxx radius + min-order checks → dot-formatted totals with VAT → stubbed Stripe pay → tracking |
| `/track/[id]` | Live status timeline (auto-progress + admin override) |
| `/dining` | Dining hub: ambiance/seating/hours info + Reserve-a-Table flow (only-open slots, instant confirmation). `/reservations` redirects here |
| `/account` | Profile, addresses, order history, marketing consent |
| `/about` | Story, map, click-to-call, contact form |
| `/admin` | **admin / kuopio2026** — dashboard (today's orders/revenue/pending/upcoming + 7-day revenue chart), live queue with status filters + alerts + refund, menu CRUD with drag-reorder, sold-out toggle, topping-list editor, single Today's Special picker, category creation, reservations accept/decline + 30-day calendar + date/slot blocking, customers, settings (hours, delivery rules, pause switch), per-language content editing |

## v2 fixes & features
- **Client-nav bug (§18)**: page transitions are now enter-only keyed mounts (no AnimatePresence exit cycle), so content always renders immediately after Link navigation; scroll reveals re-register per route.
- **Prices** always dot-formatted (`€10.50`) via `eur()`.
- **Biryani imagery** regenerated as authentic red-and-white Karachi style; hero updated to match.
- **i18n** across nav, hero, sections, buttons, footer, admin tabs; menu names/descriptions editable per language from admin Content tab.

## Backend stubs
All network calls live in `src/lib/api.ts`, annotated with the real endpoints
(`POST /api/orders`, `POST /api/reservations`, `POST /api/checkout`, `PATCH /api/orders/:id`,
`POST /api/auth/*`, `PATCH /api/settings`). Swap bodies to wire a real backend.

## Note
10 category photos (burger, fillets, mix, bucket, noodles, rice, naan, curry, sides, drinks)
are pending next-turn image generation due to the per-turn image cap; circles gracefully
fall back to the pizza photo via `onError` until those files exist, then pick them up automatically.

## v3 additions
- Animated Home brand banner (`public/brand/kuopio-bites-banner.png`, reduced-motion safe)
- Halwa Puri Sundays-only pre-order flow (server-validated, admin-configurable)
- Availability ON/OFF for items/categories/toppings/dips/sizes + bulk + audit log
- Specials & Offers admin (percent/fixed/override/bundle/freeItem/freeDelivery, promo codes, best-single-discount)
- Deep links `/menu?item=<id>` with scroll + pulse + auto-open sheet
- Categories manager with 1:1 circle uploads; reusable ImageUploader (WebP, ≤5 MB, EN/FI alt)
- Full FI audit: Admin → Translations + `npm run check-i18n` (runs in build; fails on EN/FI key drift)
- PRD: see `PRD.md`

## v3.1 additions
- Today's Specials = scrollable/swipeable carousel of Link cards (drag, arrows, dots, keyboard, ticker auto-scroll with pause, reduced-motion safe)
- Wolt-style pizza cards + size/extras pizza sheet (26 toppings, €1/€2 extras, included toppings free, kitchen note, live total, server price re-validation)
- Per-pizza images at /public/menu/pizza/<slug>.webp (10/38 generated; branded placeholder otherwise) + admin pizza-image uploader
- Topping names EN/FI + per-size extra prices editable in Admin → Menu

## v3.1.1 images-for-every-item
- `src/lib/images.ts` manifest: item → imageKey → /public/menu/<cat>/<key>.webp (shared keys for size/meal variants; branded placeholder + caption)
- `scripts/list-images.mjs` → /menu/index.json (build-gated coverage report)
- Admin → Menu → Items: per-item image upload/replace with normalized persisted paths
- 20/142 unique photos generated so far (pizzas 1–2 + South Asian Specials)
