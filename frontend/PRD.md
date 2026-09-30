# PRD — Kuopio Bites Website (v3.1)

**Product:** Public website + ordering flow + kitchen admin for **Kuopio Bites**
**Address:** Jalkasenkatu 7, 70820 Kuopio, Finland · **Phone:** 044 981 6223
**Stack:** Next.js 14 (App Router, static export of all public routes) · TypeScript · Tailwind CSS · Framer Motion · mock backend (localStorage) with clearly annotated API stubs for a real backend swap.

---

## 1. Product goals

1. Let customers browse the full menu in **English or Finnish**, build pizzas, order pickup/delivery, reserve tables, and track orders.
2. Give the kitchen an **internal-tool admin** to control the menu, availability, specials, offers, pre-orders, categories and translations **without deploys**.
3. Feel like a warm Pakistani–Finnish family kitchen: teal/cream/orange identity, serif display type, playful micro-animations — while remaining accessible (WCAG AA, reduced-motion support) and fast (no CLS on the banner).

## 2. Brand identity

| Token | Value | Usage |
|---|---|---|
| Deep teal `cherry` | `#0F3D3E` – `#12433F` | header, footer, headings, primary buttons |
| Cream | `#FDF6E3`, `#FBEFC7` | page background, cards |
| Burnt orange `gold` | `#E8792B` (accents) | badges, rules, hover states |
| Display font | Fraunces (serif) | headings, wordmark, prices |
| Body font | Nunito Sans | copy, UI |
| Script font | Caveat | kickers, "& Asian Cuisine" |

- **Prices:** always euro with a **decimal point** (`12.90 €`), never a comma.
- **Logo:** `public/logo.png` (round) in the header/favicon; the round pizza mark cropped from the banner artwork (`public/brand/pizza-mark.png`) is available behind the config flag `settings.headerLogo: "round" | "mark"` (Admin → Settings).

## 3. Home brand banner (v3 §21)

- Artwork: `public/brand/kuopio-bites-banner.png` (1774×887), rendered via `next/image` `fill` + `priority` inside a fixed `2/1` aspect container → **no CLS**.
- `mix-blend-mode: multiply` blends the artwork into the cream background (no visible rectangle edge).
- Percentage-positioned overlay animations (transform/opacity only):
  1. **Steam wisps** rising over the pizza "O" (~24% x) — loop.
  2. **Lifted pizza slice** (~28% x, 27% y) — lift/settle every 6 s.
  3. **Biryani pan shimmer** (~46–55% x) — warm radial glow pulse, 5 s.
  4. **Tower light glow** (~69% x, 24% y) — soft pulse, 4 s.
- Entrance: wordmark (top clip) fades+rises, then "& Asian Cuisine" tagline (bottom clip) staggers in after 250 ms.
- `prefers-reduced-motion` → **single static image, zero animations**.
- `alt` text from the i18n dictionary (`banner.alt`, EN/FI).

## 4. Information architecture

| Route | Purpose |
|---|---|
| `/` | Banner, hero + CTAs, offers strip, specials marquee card, 21 round category circles, featured rail, story teaser, hours/location/contact band, map |
| `/menu` | Sticky category pills, search, veg filter, item cards (quick-add `+`), detail sheets, offers strip, deep links `?cat=` and `?item=` |
| `/dining` | Dining info + table reservation flow |
| `/order` | Cart review, pickup/delivery, promo code, ETA/schedule, itemised summary, stubbed Stripe-style payment |
| `/track/[id]` | Live status timeline (placed→accepted→preparing→ready→completed), order contents, scheduled slot |
| `/account` | Login/register (ordering requires an account), order history, saved addresses |
| `/about` | Story, hours, team |
| `/admin` | Kitchen admin (see §11), login `admin` / `kuopio2026` (session-scoped) |

## 5. Menu & ordering (core, v1–v2, retained)

- **Categories (21):** specials, pizzat, pannupizzat, fantasia (build-your-own), kebab, wings, shawarma, grilli, falafel, salaatti, kanakebab, koivet, wrap, kala, burger, fillets, mix, bucket, noodles, rice, naan, curry, sides, drinks (round circle grid; admin-editable names/images/order/visibility).
- **SELECT TOPPING builder:** Fantasia/pannu pizzas require 3+ toppings (multi-select, per-variant extra prices); dips, spice and sauce modifier groups; sizes (Pieni/Medium/Perhe etc. translated EN/FI).
- **Today's Specials (v3.1):** a scrollable/swipeable **carousel** of special cards on Home (see §16); admin-managed list with price/discount, EN/FI badge text, image, schedule, order, active toggle.
- **Karachi biryani accuracy:** red-and-white authentic imagery and description.
- Cart persists (`kb_cart`), quantity steppers everywhere, ordering requires login, delivery min order & radius validated, VAT shown, live open/closed derived from opening hours + pause switch.

## 6. Pre-order: Halwa Puri (v3 §22)

- `Halwa Puri Platter` + `Extra Puri` carry `availability: { days:[0], mode:"preorder_only", preorderCutoff:{day:6,time:"18:00"}, leadTimeHours:18 }` — **Sundays only, pre-order only, never ASAP**.
- Public UI: always visible with badge *"Sundays only · Pre-order" / "Vain sunnuntaisin · Ennakkotilaus"*; button **"Pre-order" / "Ennakkotilaa"** opens a pre-order sheet: next available Sundays (auto-computed, Helsinki TZ), slot picker (defaults 10:30–14:00), cutoff shown, quantity + Extra Puri add-on.
- Cart line stores `preorder {date,time}`; cart chip shows *"Pre-order · Sun 05.10. at 10:30"*. A mixed cart schedules the **whole order** (one-sentence explanation key `pre.mix`).
- Checkout shows the scheduled date/time; order + tracking show it; queue gets a **PRE-ORDER** badge, a **Pre-orders** filter and a **"This Sunday's pre-orders"** portions summary.
- **Server re-validation** (`placeOrder` → `validatePreorder`): rejects disabled pre-orders, non-Sunday dates, past-cutoff dates with friendly messages in the current language (`pre.errClosed` / `pre.errSunday` / `pre.errCutoff` / `pre.errSlot`).
- Admin: master ON/OFF (Menu tab panel **and** dashboard quick switch), editable cutoff day/time, slots, optional capacity, EN/FI note. All dates/times use **Europe/Helsinki**.
- Mechanism is generic — any item with `availability.mode: "preorder_only"` behaves the same.

## 7. Availability ON/OFF everywhere (v3 §23)

- **Items:** prominent OFF (until turned back on) / OFF (today, auto-resets at Helsinki midnight) / ON buttons per row + checkbox **bulk actions** bar in Admin → Menu.
- **Categories:** CAT OFF / today / ON switches.
- **Options:** toppings, dips and size variants toggled as chips (Admin → Menu → availability panel); keys `topping`, `dip`, `size:<itemId>`, `mod:<itemId>:<groupId>`.
- Public effect within ≤5 s (settings re-render, no reload): greyed card + *"Unavailable / Ei saatavilla"* label + disabled add button, or fully hidden when `settings.hideUnavailable` is on. Unavailable toppings/sizes are unselectable (struck through) in item sheets.
- Cart item turned unavailable ⇒ cart notice + **checkout blocked** (drawer and order page); `placeOrder` re-validates server-side (`avail.unavailable`).
- Every toggle writes to the **audit log** (user + timestamp + message, Admin → Audit).

## 8. Localisation (v3 §24)

- Every user-facing string comes from the dictionary (`src/lib/i18n.tsx`, 199 keys × EN/FI) or `{en, fi}` pairs; ingredient names are glossary keys (`trIng`), item names/descriptions translated via `trName`/`trDesc` with `NAME_FI/NAME_EN/DESC` maps and admin overrides (`overrides.texts`).
- Locale-aware dates/times (`fi-FI`, Europe/Helsinki); prices always decimal point.
- Admin surfaces a **"Missing Finnish translation"** badge and an **Admin → Translations** page listing all FI gaps (names, descriptions, dictionary-key drift).
- **Build-time gate:** `npm run check-i18n` (runs inside `npm run build`) fails the build when EN/FI key sets mismatch — CI-ready.

## 9. Specials, offers & deep links (v3 §25, §27)

- **Offers engine** (`src/lib/v3.ts`): types `percent | fixed | override | bundle | freeItem | freeDelivery`; scope whole/category/items; `minOrder`, weekday list, date window, promo code, `maxUses` (redemption count tracked on order placement); EN/FI title/desc/badge; priority; pause/duplicate/delete in Admin → Offers. **Best single discount wins**; server computes, clients display; discount line appears in cart-adjacent summary, checkout, confirmation and is snapshotted onto the Order (`discount {title, amount, offerId}`).
- Struck-through old price + new price (dot format) on affected menu cards and item sheets (`offerPrice`).
- **Offers strip** on Home + Menu, each chip deep-links to its target.
- **Deep linking:** special card and offer chips are `<Link>`s to `/menu?item=<id>` (or `?cat=`). The menu page scrolls to the card, pulses it ~2 s, and auto-opens the detail sheet — SELECT TOPPING for builders, the pre-order sheet for Halwa Puri. Shareable URLs; reveal animations re-trigger; missing id → toast; unavailable target still navigates but shows the unavailable label/notice. Marquee remains keyboard-focusable with `aria-label` and pauses on hover/focus. Admin can override the special's click target (dish/category/offers).

## 10. ImageUploader (v3 §26) & categories (v3 §28)

- Reusable component: drag-drop or picker, **≤5 MB**, aspect presets **1:1** (circle preview) and **16:9**, client-side center-crop + **WebP** compression, **EN/FI alt text required**, delete/replace. Saves as a data-URL through one interface stub (`POST /api/uploads` — swap for S3/Cloudinary/Uploadthing); lazy-loaded on the public site.
- Admin → Categories: per-category upload feeding the Home circles, EN/FI names, Show/Hide, availability switch, ↑/↓ reorder (order = circle order). No image → branded cream placeholder with the category initial (never a broken image). v2 stagger/hover/click behaviour kept.

## 11. Admin (internal-tool feel)

Tabs: **Dashboard** (today's KPIs, revenue chart, pre-order quick switch) · **Orders** (status timeline control, refunds, PRE-ORDER badge/filter, Sunday portions summary) · **Reservations** · **Menu** (rename, prices, add/remove items & categories, drag reorder, availability switches + bulk, toppings manager, option availability, pre-order panel) · **Specials** (single-dish special editor + live preview) · **Offers** (full CRUD) · **Categories** · **Customers** · **Settings** (pause switch, hours, delivery fee/min/radius, Wolt & Uber Eats URLs, header logo flag, hide-unavailable) · **Content** (per-language copy) · **Translations** · **Audit**.

## 12. Platform links (v3 §20)

Wolt / Uber Eats are **UX benchmarks only** (interaction patterns: sticky nav, quick-add, item sheets, persistent cart, pickup/delivery switch, ETA before paying, itemised summary, live status timeline). An optional *"Also order on Wolt / Uber Eats"* row appears on the Order page and footer when URLs are set (Admin → Settings); direct ordering always dominates. No branding/assets copied.

## 13. Data & persistence (mock backend)

`src/lib/api.ts` + `src/lib/store.tsx` simulate the API over localStorage (`kb_orders`, `kb_reservations`, `kb_users`, `kb_session`, `kb_settings`, `kb_overrides`, `kb_cart`, `kb_lang`). Each stub is annotated with its future endpoint (`POST /api/orders`, `POST /api/checkout`, `POST /api/uploads`, …). Server-side rules already enforced inside `placeOrder`: pre-order validation, unavailable-item rejection, offer redemption counting.

## 14. Acceptance checklist (v3)

- ✅ Banner animates (steam/slice/shimmer/glow, staggered entrance), static under reduced motion, `priority` + fixed aspect (no CLS), blends into cream, no duplicate CTAs.
- ✅ Halwa Puri server-validated pre-order with admin master toggle, cutoff, slots, capacity, EN/FI note.
- ✅ Pre-order date+time in cart chip, checkout, confirmation, tracking and admin queue (badge/filter/summary).
- ✅ Availability toggles (items/categories/toppings/dips/sizes) live in ≤5 s; greyed or hidden by setting; cart blocking + server re-validation; audit log.
- ✅ FI audit: no English-only menu text; `npm run check-i18n` passes in build (199/199 keys).
- ✅ Specials/offers/discounts/images editable in admin, EN/FI, with live previews.
- ✅ Special/offer click lands on the dish (scroll + pulse + sheet) without reload; keyboard accessible.
- ✅ Category uploads appear in Home circles; placeholder when empty.
- ✅ Dot prices everywhere.

## 15. Known limitations / next steps

- Backend is mocked; wire real endpoints (auth, payments, uploads, websockets for live queue).
- `next.config.mjs` uses `images.unoptimized` (plain `<img>` output) — switch to real `next/image` optimisation when deploying with an image loader.
- Offer `maxUses` is per-device (localStorage) until a real backend exists.
- Admin auth is a session-scoped demo gate — replace with real RBAC.

---

# v3.1 change set

## 16. Today's Specials carousel (§29–30)

- Home shows a **horizontally scrollable specials row** (same interaction language as the Featured rail): CSS scroll-snap, touch swipe, mouse drag (click only suppressed after >6 px of movement), trackpad scroll, prev/next arrows on desktop, dot indicators, keyboard ←/→ on the focused track, and a slow ticker auto-scroll that pauses on hover, focus and touch. `prefers-reduced-motion` disables auto-scroll and smooth behaviour — manual scroll only.
- Every card is a real Next.js **`<Link href="/menu?item=<id>">`** wrapping image + text + badge, with `aria-label="View <dish> in the menu"`, cursor-pointer, hover lift and a visible focus ring. Nothing swallows clicks: decorative layers (steam, gradients) are `pointer-events: none`; the special marquee badge from v3 is removed in favour of the carousel.
- Cards show dish image (upload or category photo, placeholder on error), EN/FI name, special price with the old price struck through (dot format), and a small badge (`textEn`/`textFi`, default "Today's Special / Päivän annos"); pre-order dishes also get the Sundays-only badge.
- Data: `settings.todaysSpecials[]` of `{ id, itemId, overridePrice?, discount?, imageUrl?, textEn?, textFi?, start?, end?, sortOrder, active }`; only active specials inside their date window render, sorted by `sortOrder`; a single active special renders cleanly with no arrows; zero → section hidden.
- Admin → Specials: add / duplicate / remove / reorder (↑↓) / activate-pause, dish picker, override price or % discount, EN/FI badge text (missing-FI badge), schedule, card image via the ImageUploader. Live price preview per row.
- Clicking a card lands on `/menu?item=<id>`: the Menu page reads the query on mount **and on every client-side navigation**, scrolls to the card, pulses it ~2 s and opens the right sheet — pizza sheet for pizzas (§17), pre-order sheet for Halwa Puri, detail sheet otherwise.

## 17. Pizza sheet — size + extra toppings (§31)

- Menu cards for all pizza categories are Wolt-style: text left (name, real topping description translated EN/FI — never repeating the name), image right with a round "+" corner button, price "from €10.50". Whole card and "+" open the sheet.
- **Sheet** = bottom sheet on mobile, centered modal on desktop: header (image, name, included toppings) → **required size** (Med default / Perhe, each priced) → **extra toppings** chip grid from the admin topping list (26 items: Jauheliha … Cheddarjuusto; EN/FI labels via glossary + admin overrides; unavailable toppings disabled) → kitchen note → quantity + sticky **"Add to cart · €xx.xx"** with the live total.
- Extras cost **€1.00 (Med) / €2.00 (Perhe)** by default, admin-editable per topping per size (`settings.toppingMeta`); the price switches automatically when the size changes. Toppings already included in the chosen pizza are marked **"Included / Sisältyy"** and are never charged — they can be added again as a paid "double".
- Fantasia & Pannu use the same sheet in builder mode: SELECT TOPPING tier logic from v2 §9 (base price includes the tier minimum; toppings beyond the tier cost the per-variant extra), same live total, note and sticky button.
- Cart line records size, included toppings, chosen extras with prices, and the note (`CartLine.pizza` + `CartLine.note`).
- **Server re-validation in `placeOrder`:** size exists, every extra topping is available, and the line total is recomputed from item data (`pizzaUnitPrice` / `builderUnitPrice`, ±€0.02 tolerance) — the browser total is never trusted; mismatches fail with "Prices changed — please review your cart" in the current language.

## 18. Pizza images (§32)

- One image per pizza: 36 classics + generic Fantasia + generic Pannu at `/public/menu/pizza/<slug>.webp` (1200×1200, top-down on a round light plate, plain `#F4F4F2` background, consistent style).
- Loaded via `next/image`, lazy, with a blur placeholder; caption "Havainnollistava tuotekuva" / "Illustrative product image" bottom-right; missing image → branded cream placeholder with a pizza-slice icon (never a broken image); admin can replace any pizza image (Admin → Menu → Pizza images, ImageUploader 1:1).
- **v3.1.1 (all items):** the pizza-only rule is superseded — **every menu item across all categories** gets a photo card image (175 items, ~142 unique files after `imageKey` sharing; `MenuItem.imageKey` + the manifest `IMAGE_KEY_BY_NAME` map variants onto one file). Files at `/public/menu/<category-slug>/<item-slug>.webp`, 1200×1200 WebP, consistent photo-shoot style, top-down for pizzas/plates/rice/noodles/salads/curries/biryani, 45°/side for burgers/wraps/rolls/drinks/buckets. Caption and branded placeholder (category icon) as before.
- `scripts/list-images.mjs` runs before every build and writes `/menu/index.json` (live coverage truth). Admin → **Item images** tab: ZIP/multi-file bulk import (files named by slug, review screen matched/unmatched/replacing, one file covers all shared variants), per-row quick upload/replace, coverage counters. Item photos also feed Featured Dishes, Today's Specials, Offers chips, cart lines and order tracking.
- **Drinks:** generic unbranded imagery only (plain glasses/cups, no logos); brand names stay in text.
- No third-party (Wolt etc.) imagery is used, copied or hotlinked — all images are generated originals.
- **Status (v3.2):** site-wide FIXED BACKGROUND shipped — `<FixedBackground/>` layer (z:-1, 100lvh) in layout, WebP/JPG/mobile variants, cream overlay via CSS vars; parallax removed (fully static, user directive), `.glass` sections; home hero inline photo removed (bg is the hero). Verified: desktop+mobile screenshots, layer metrics, parallax math.
- **Status:** 138/142 unique generated — every category complete incl. buckets 4/4 (regenerated unbranded), curries 3/3, sides 3/3, drinks 2/5. Only drinks lemon-lime-soda/milk/coffee remain (next batch); 2 inventory items have no imageKey and keep the branded placeholder by design. — all 38 pizzas, 10 specials, burgers×6, zinger×4, wraps×3, kebab×2, kanakebab×2, shawarma×1, grilli×1, falafel×1, salads×1, wings×1, mix×1, koivet×1, fillets×1, fish×1, buckets×1, noodles×1, rice×1, naan×1, curries×1, sides×1, dips×1, drinks×1. All homepage category circles now use consistent generated photos (no legacy stock, no branded bottles, no hands). Remaining 4 render the branded placeholder (3 drinks + 1 no-key item) until generated in follow-up batches (10/turn).

# v3.2 change set

## 19. Admin panel redesign (§33)

The tab-strip admin is replaced by a full **sidebar-shell admin** following the reference interaction model, in the Kuopio Bites palette (teal `#0F3D3E`, cream, burnt-orange gold accents). All functionality of the old tabs is retained; most panels are reused verbatim inside the new views.

- **Shell (`src/app/admin/page.tsx`):** fixed dark-teal sidebar with logo, section search and a collapsible tree (Dashboard; Orders → Live Queue/History/Refunds; Dining → Calendar/Reservations/Slot Settings; Menu → Items/Categories/Toppings/Today's Special/Bulk Pricing; Marketing → Promos & Offers/Subscribers; Customers; Localization → Translation Manager/Coverage Report; Media → Library/Bulk Import/Coverage; Analytics → Sales/Item Performance/Peak Hours; Admin → Staff & Activity; Settings → General/Restaurant Info). Below `lg` the sidebar becomes an off-canvas drawer.
- **Top bar:** global search affordance, EN/FI language switch, orange **quick-create “+”** menu (new item / special / promo / reservation jump), notification bell with pending-order badge, avatar menu with logout.
- **Tab chips:** each opened section is a closable chip; open tabs + active tab persist in `localStorage` (`kb_admin_tabs` / `kb_admin_active`).
- **Data-table pattern (`src/admin/ui.tsx`):** every list view uses one `DataTable` — in-table search, sortable columns, checkbox selection with bulk actions, per-row ⋮ menu, “Showing X of N” pagination with page-size select, skeleton loading rows and branded empty states. `Toolbar` above tables adds cross-cutting filters (count badge), Group By and a primary orange action.
- **Orders:** Live Queue (auto-advance button per row), History, Refunds as three sub-views of one table with status/type/date filters, group-by status/hour, CSV export, and an order-detail drawer with a status timeline, totals breakdown, status select, print ticket (opens print window) and refund with logged reason.
- **Dining:** month calendar with reservation chips + accept/decline drawer, reservation table, and blocked slot/date editors.
- **Menu:** items table (thumbnail, price variants, availability pill toggle, sold-out today-only, per-item editor drawer with General/Pricing/Toppings/Availability/Translation tabs and 1:1 image upload into `settings.itemImages`), bulk pricing spreadsheet per category, toppings master, Today's Special carousel panel with site preview link.
- **Marketing:** Offers engine (existing `OffersTab`) + **Subscribers** — the footer newsletter stub now persists sign-ups to `kb_newsletter` and the admin lists/removes/CSV-exports them.
- **Localization:** translation manager + a coverage report listing items missing FI/EN descriptions and menu photos (jumps to Media coverage).
- **Media:** library grid (generated photos from `/menu/index.json` + custom uploads), ZIP bulk import, coverage report.
- **Analytics:** revenue trend bars (7/14/30d), item performance table, order-volume-by-hour peaks, delivery/pickup split, status mix, CSV exports.
- **Admin:** staff list with Owner/Manager/Kitchen roles (`kb_staff`, demo storage; roles gate future permission checks) and the audit log.
- **Settings:** pause toggle, hours, delivery fee/min/radius, platform URLs, logo choice, hide-unavailable, “reset today's sold-outs”, plus new `settings.announcement` (site announcement strip config) and `settings.pauseMessage`.
- Dashboard: 6 stat cards, 7/30-day revenue chart, top-selling list, live feed, quick actions incl. pause/resume with confirm.
- **Design guidelines** for the whole product (public site + admin) are codified in `/DESIGN_GUIDE.md`.
