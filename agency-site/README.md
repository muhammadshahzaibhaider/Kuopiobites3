# YOUR BRAND — agency homepage

A pixel-focused recreation of the Antimatter AI agency homepage layout in
**Next.js (App Router) + TypeScript + Tailwind CSS v4 + Framer Motion**.
Dark, near-black, one soft cool-blue glow, oversized tight-tracked headings,
hairline cards, scroll-triggered reveals and a rolling stat odometer.

It lives in its own folder (`agency-site/`) so it does not touch the existing
Kuopio Bites application in this repository. It is a fully self-contained app —
run it from this directory.

```bash
cd agency-site
npm install
npm run dev      # http://localhost:3001
npm run build && npm run start
```

---

## File structure

```
agency-site/
├── next.config.ts              # image formats/qualities, dev origins, no powered-by
├── postcss.config.mjs          # @tailwindcss/postcss
├── tsconfig.json               # strict TS, "@/*" → src/*
├── package.json
├── public/
│   ├── logo.svg                # ← swap for your own logo mark
│   └── images/
│       ├── light-rays.webp     # hero light-ray backdrop (1376×768)
│       ├── light-arc.jpg       # curved light horizon behind the CTA
│       ├── nav-feature.jpg     # "Our latest work" card in the services mega-menu
│       ├── case-talitrix.jpg   # 6 case-study thumbnails
│       ├── case-blue-standard.jpg
│       ├── case-clinix.jpg
│       ├── case-owasp.jpg
│       ├── case-vidzee.jpg
│       ├── case-feature.jpg
│       └── og.jpg              # 1200×630 social image
└── src/
    ├── app/
    │   ├── layout.tsx          # fonts, metadata, skip link, MotionProvider
    │   ├── page.tsx            # section composition for the single page
    │   ├── globals.css         # ALL design tokens + base/utilities
    │   ├── icon.svg            # favicon
    │   ├── robots.ts
    │   └── sitemap.ts
    ├── components/
    │   ├── Navbar.tsx          # sticky blur bar, mega-menu, resources menu,
    │   │                       # full-screen mobile sheet + accordions
    │   ├── Hero.tsx            # light-ray hero + animated H1 + stats slot
    │   ├── StatsOdometer.tsx   # slot-machine digit rollers (100+, 99%, 24/7)
    │   ├── SectionHeading.tsx  # two-tone "Our" + "Services" word-pair titles
    │   ├── ServicesSection.tsx # 6 numbered service cards
    │   ├── ServiceCard.tsx     # one card: number, title, copy, bullets, tool chips
    │   ├── CaseStudyList.tsx   # hover-swapped sticky preview (desktop)
    │   │                       # stacked cards (mobile)
    │   ├── TrustedBy.tsx       # heading + marquee band
    │   ├── LogoMarquee.tsx     # infinite grayscale logo marquee w/ fade masks
    │   ├── CtaSection.tsx      # curved light-arc headline + pill CTA
    │   ├── Footer.tsx          # contact, services, resources, demos, clock
    │   ├── LocalClock.tsx      # live HH:MM:SS in the studio timezone
    │   ├── ScrollProgress.tsx  # hairline reading-progress bar
    │   ├── PillButton.tsx      # white pill CTA with circled arrow
    │   ├── Reveal.tsx          # shared scroll fade-up wrapper
    │   ├── MotionProvider.tsx  # MotionConfig reducedMotion="user"
    │   ├── Logo.tsx            # atom mark + YOUR BRAND wordmark
    │   ├── TechIcon.tsx        # 24px monochrome tool glyphs for the chips
    │   └── icons.tsx           # arrows, chevrons, menu, LinkedIn, client marks
    └── lib/
        ├── content.ts          # ← every string, link, service, case study, stat
        └── cn.ts               # class-name joiner
```

## Where to customise

| What | File |
| --- | --- |
| Brand name, email, city, timezone, copyright year | `src/lib/content.ts` → `SITE` |
| Nav items, services, tools, case studies, clients, footer links, stats | `src/lib/content.ts` |
| Logo mark | `src/components/Logo.tsx` (SVG) and `public/logo.svg` |
| Colours, type scale, spacing rhythm, radii, shadows, motion | `src/app/globals.css` → `@theme` |
| Images | drop replacements into `public/images/` keeping the same filenames |

## Design tokens (all in `globals.css`, no magic numbers in components)

| Token | Value | Used for |
| --- | --- | --- |
| `--color-ink` / `-soft` / `-raised` | `#050505` / `#0a0a0a` / `#101010` | page, panels, cards |
| `--color-fg` / `-muted` / `-muted-dim` | `#f4f4f5` / `#9ca3af` / `#6b7280` | primary / secondary / tertiary text |
| `--color-hairline` / `-strong` | `rgb(255 255 255 / .1)` / `.22` | 1px borders, dividers |
| `--color-glow` | `#a9c7ff` | the single cool-blue accent + hover glows |
| `--text-hero` | `clamp(2.75rem, 7.2vw, 6.5rem)` | H1 |
| `--text-section` | `clamp(2.25rem, 5vw, 4.5rem)` | section titles |
| `--text-eyebrow` / `-micro` / `-xxs` / `-ui` | `11px + .28em` track / `10px` / `11px` / `13px` | labels |
| `--spacing-section` / `-lg` | `6rem` / `8rem` | `py-24`–`py-32` rhythm |
| `--container-content` | `80rem` | 1280px max content width |
| `--radius-card` / `-preview` | `1rem` / `1.75rem` | cards / image frames |
| `--shadow-glow` / `-lift` / `-pill` | cool glow / deep drop / white halo | hover + pill CTA |
| `--ease-expo` | `cubic-bezier(.16,1,.3,1)` | every 200–300ms transition |
| `--animate-marquee` | `46s linear infinite` | logo marquee |

## Motion

- `Reveal` wraps each section block: 26px fade-up, `once`, 0.75s, expo ease.
- Hero H1 letters are revealed word-by-word (`opacity` + `letter-spacing` +
  `blur`), then the lede and pill land.
- Stats roll 0→9→target when the row enters the viewport (`useInView`), one
  column at a time.
- Case-study preview cross-fades + scales on hover/focus of a project name.
- Marquee pauses on hover; the whole track is duplicated for a seamless loop.
- `prefers-reduced-motion`: `MotionConfig reducedMotion="user"` drops
  transform animations, a CSS media query parks the odometer on its final
  digits, the marquee stops, and all CSS animation/transition durations are
  collapsed globally.

## Accessibility & performance notes

- Semantic landmarks (`header`, `nav[aria-label]`, `main`, `section[aria-labelledby]`, `footer`),
  a skip link, and a visible focus ring (`--color-glow`).
- Mega-menu buttons expose `aria-expanded` / `aria-controls`; Escape closes,
  outside pointer-down closes, and the panel opens on focus for keyboard users.
- The mobile sheet is a `dialog` with `aria-modal`, scroll lock, focus move and
  a Tab loop; accordions use `aria-expanded` + `aria-controls`.
- Decorative art is `alt=""` + `aria-hidden`; case-study thumbnails carry
  descriptive alt text; the odometer exposes one `sr-only` value so screen
  readers never hear the rolling digits.
- `next/image` everywhere (AVIF/WebP, `sizes`, priority on the hero), local
  assets, ~32 KB hero backdrop, self-hosted Geist variable fonts, static
  prerender (`○ /`) and `robots.txt` + `sitemap.xml`.
