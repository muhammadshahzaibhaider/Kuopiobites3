# Axiomic Studio — multi-page agency site

A pixel-focused recreation of the Antimatter AI agency site's **multi-page**
structure, built with **Next.js (App Router) + TypeScript + Tailwind CSS v4 +
Framer Motion**. Dark near-black canvas, one cool-blue glow, oversized
tight-tracked headings, hairline cards, scroll-triggered reveals, and a light-ray
hero used across pages.

It lives in `axiomic-studio/`, a self-contained app that does not touch the
Kuopio Bites application elsewhere in this repository. On Vercel it is the
**axiomic-studio** project with `axiomic-studio` as its root directory.

> The folder is deliberately lowercase and space-free: Vercel derives serverless
> function names from the root-directory path, and a space there fails the build
> with `invalid_function_name`. The product name is still **Axiomic Studio**
> everywhere in the UI, metadata and copy.

```bash
cd axiomic-studio
npm ci
npm run dev      # http://localhost:3001
npm run build && npm run start
```

---

## Page map (30 routes)

| Route | What it is |
| --- | --- |
| `/` | Home — light-ray hero, odometer stats, 6 service cards, case-study list with hover preview, logo marquee, CTA |
| `/work` | All case studies with client-side tag filtering |
| `/case-study/[slug]` | 6 case studies: hero, summary + tech stack meta, 3 narrative sections, key stats, "how it works", next project |
| `/services` | Services index — the six disciplines |
| `/services/[slug]` | 6 service pages: hero, what you get (6), process (4), selected work, built-with, other services, FAQ accordion, CTA |
| `/company` | Story, dotted globe of studios/hubs, pillars, core beliefs, CTA |
| `/contact` | Enquiry form (validated, accessible) + contact column with live clock and "what happens next" |
| `/blog` | Article index with category filter and a featured post |
| `/blog/[slug]` | 5 articles: breadcrumb, meta, hero image, article body, author aside, related posts |
| `/open-resources` | Templates, apps, agent skills, tools, pro templates |
| `/demos` | 7 interactive demos |
| `/demos/[slug]` | Each demo: simulated interactive panel + how the pattern works |
| `/not-found` | 404 with popular destinations |
| `/robots.txt`, `/sitemap.xml`, `/icon.svg` | Generated metadata routes |

Every dynamic route is statically prerendered via `generateStaticParams`, and
`sitemap.xml` is generated from the data modules — add an item to the data and
it appears in the sitemap automatically.

## File structure

```
axiomic-studio/
├── next.config.ts · postcss.config.mjs · tsconfig.json · package.json
├── public/
│   ├── logo.svg
│   └── images/
│       ├── light-rays.webp · light-arc.jpg · nav-feature.jpg · og.jpg
│       ├── case-*.jpg            # home/work thumbnails (6)
│       ├── case/*.jpg            # in-article case-study visuals (6)
│       └── blog/*.jpg            # article headers (5)
└── src/
    ├── app/
    │   ├── layout.tsx            # fonts, metadata, skip link, nav + footer shell
    │   ├── page.tsx              # home
    │   ├── work/page.tsx
    │   ├── case-study/[slug]/page.tsx
    │   ├── services/page.tsx · services/[slug]/page.tsx
    │   ├── company/page.tsx · contact/page.tsx
    │   ├── blog/page.tsx · blog/[slug]/page.tsx
    │   ├── open-resources/page.tsx
    │   ├── demos/page.tsx · demos/[slug]/page.tsx
    │   ├── not-found.tsx · robots.ts · sitemap.ts · icon.svg
    │   └── globals.css           # ALL design tokens
    ├── components/
    │   ├── Navbar.tsx            # real routes, active states, mega-menu, mobile sheet
    │   ├── Footer.tsx            # contact, services, resources, demos, clock
    │   ├── PageHero.tsx          # shared interior hero (light rays)
    │   ├── PageCta.tsx           # shared light-arc conversion panel
    │   ├── Hero.tsx · StatsOdometer.tsx · SectionHeading.tsx
    │   ├── ServicesSection.tsx · ServiceCard.tsx
    │   ├── CaseStudyList.tsx     # home hover-preview list
    │   ├── CaseStudyCard.tsx · TagPill · WorkGrid.tsx
    │   ├── TrustedBy.tsx · LogoMarquee.tsx · MarqueeBand.tsx
    │   ├── CtaSection.tsx · PillButton.tsx · Reveal.tsx · MotionProvider.tsx
    │   ├── BlogList.tsx · PostCard.tsx · Prose.tsx
    │   ├── ResourceCard.tsx · DemoPanel.tsx · FaqAccordion.tsx
    │   ├── ContactForm.tsx · LocalClock.tsx · WorldMap.tsx
    │   ├── Logo.tsx · TechIcon.tsx · icons.tsx · ScrollProgress.tsx
    └── lib/
        ├── content.ts            # brand, nav, footer links, stats, clients
        ├── data/services.ts      # 6 services + full detail-page content
        ├── data/caseStudies.ts   # 6 case studies + full detail content
        ├── data/posts.ts         # 5 articles as typed content blocks
        ├── data/resources.ts     # open-resources catalogue
        ├── data/demos.ts         # 7 demo definitions
        └── cn.ts
```

## Customising

| What | Where |
| --- | --- |
| Brand, email, city, timezone, socials, copyright | `src/lib/content.ts` → `SITE` |
| Top nav + dropdowns, footer columns, stats, clients | `src/lib/content.ts` |
| Services (cards **and** their detail pages) | `src/lib/data/services.ts` |
| Case studies (cards **and** their pages) | `src/lib/data/caseStudies.ts` |
| Articles | `src/lib/data/posts.ts` |
| Open-resources catalogue | `src/lib/data/resources.ts` |
| Demos | `src/lib/data/demos.ts` |
| Logo mark | `src/components/Logo.tsx` + `public/logo.svg` |
| Colours / type scale / spacing / radii / motion | `src/app/globals.css` → `@theme` |
| Contact form endpoint | `src/components/ContactForm.tsx` (stubbed submit) |
| Demo "model" call | `src/components/DemoPanel.tsx` (simulated output) |

## Design tokens (no magic numbers in components)

| Token | Value |
| --- | --- |
| `--color-ink` / `-soft` / `-raised` | `#050505` / `#0a0a0a` / `#101010` |
| `--color-fg` / `-muted` / `-muted-dim` | `#f4f4f5` / `#9ca3af` / `#6b7280` |
| `--color-hairline` / `-strong` | `rgb(255 255 255 / .1)` / `.22` |
| `--color-glow` | `#a9c7ff` |
| `--text-hero` / `--text-section` / `--text-lede` | `clamp(2.75rem,7.2vw,6.5rem)` / `clamp(2.25rem,5vw,4.5rem)` / `clamp(1rem,1.35vw,1.19rem)` |
| `--text-eyebrow` / `-micro` / `-xxs` / `-ui` | `11px + .28em` / `10px` / `11px` / `13px` |
| `--spacing-section` / `-lg` / `--container-content` | `6rem` / `8rem` / `80rem` |
| `--radius-card` / `-preview` | `1rem` / `1.75rem` |
| `--shadow-glow` / `-lift` / `-pill`, `--blur-glow` | cool glow / drop / halo / 120px |
| `--ease-expo` | `cubic-bezier(.16,1,.3,1)` |
| `--animate-marquee` | `46s linear infinite` |

## Motion & interaction

- `Reveal` gives every section a 26px fade-up on first scroll into view.
- Home hero reveals the H1 word by word (opacity + tracking + blur).
- Odometer digits roll 0→9→target when the row enters the viewport.
- Case-study hover swaps a sticky preview; `/work` and `/blog` filters are
  instant and `aria-pressed` driven.
- Mega-menu opens on hover **and** focus, closes on Escape, outside click, or
  route change; the mobile sheet locks scroll, traps Tab, and auto-closes on
  navigation.
- FAQ and mobile accordions are single-open, `aria-expanded` + `aria-controls`.
- Demo panel streams mock results into an `aria-live` region.
- `prefers-reduced-motion`: `MotionConfig reducedMotion="user"` drops
  transform/layout animation, a CSS media query parks the odometer on its final
  digits, the marquee stops, and all CSS durations collapse.

## Accessibility & SEO

- One `<h1>` per page (verified across all 30 routes), `main#main`, a skip link,
  `aria-labelledby` on sections, visible focus rings.
- Two-tone headings are split into spans, so each carries an `aria-label` with
  the natural reading ("Our Services", "Case Studies").
- Form: labels, `aria-invalid`, `aria-describedby`, error focus management.
- Metadata: per-page titles/descriptions, Open Graph per article and case study,
  generated `sitemap.xml` + `robots.txt`, `noindex` on the 404.
- `next/image` everywhere with `sizes`, AVIF/WebP, priority only on heroes;
  self-hosted Geist variable fonts; fully static output.

## Verification (this build)

`tsc --noEmit` clean · `next build` green with 30 static routes · crawl of all
67 pages/linked targets returns **0 broken internal links**, **0 missing
descriptions**, exactly **one `<h1>` per page** · `sitemap.xml` lists 32 URLs.

## Deploying (Vercel + Supabase)

The app is its own Vercel project, **axiomic-studio**, connected to the
`muhammadshahzaibhaider/Kuopiobites3` repository with `axiomic-studio` as the
root directory. The Kuopio Bites projects (`kuopiobites`, `kuopio-bites`) are
untouched.

| Item | Value |
| --- | --- |
| Vercel project | `axiomic-studio` — root `axiomic-studio`, framework Next.js |
| Supabase project | `Axiomic Studio` (`yubspfjyaxyuepcwlobh`, ap-south-1) — separate from Kuopio Bites |
| Build | `next build`, no custom commands; static pages + one serverless route |

### Contact form → Supabase

`src/components/ContactForm.tsx` validates client-side, then `POST`s to
`/api/leads`. The route re-validates and inserts into `public.leads` through
Supabase's REST API, so no SDK is bundled. Create the table with
`supabase/leads.sql`.

Environment variables (Vercel → Settings → Environment Variables, or a local
`.env.local` from `.env.example`):

| Key | Notes |
| --- | --- |
| `SUPABASE_URL` | `https://yubspfjyaxyuepcwlobh.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only; never prefixed with `NEXT_PUBLIC_` |

If either variable is missing the route still returns `ok: true, stored: false`,
so the form keeps working while you wire the project up.

`leads` has RLS enabled with no public policies — rows are only reachable with
the service-role key, i.e. never from the browser.
