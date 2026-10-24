# Animated god-rays

A pure **HTML + CSS** sunlight overlay that brings the rays already painted into
the hero photograph to life. **No JavaScript**, no image changes — the effect is a
separate layer above the photo and below all page content.

- Live in this app: the home hero (`/`)
- Standalone, copy-paste demo: [`/god-rays-demo.html`](http://localhost:3001/god-rays-demo.html)
  (source: `public/god-rays-demo.html`)

---

## 1. What was inspected first

The home hero (`src/components/Hero.tsx`) is already set up in a way that makes
this safe to layer:

```tsx
<section className="grain relative isolate flex min-h-dvh flex-col overflow-hidden pt-24">
  {/* backdrop wrapper: creates its own stacking context at z-index -10 */}
  <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
    <Image src="/images/light-rays.webp" fill priority className="object-cover object-top opacity-70" />

    {/* ← the new layer goes here */}

    <div className="absolute inset-0 bg-[radial-gradient(...)]" />   {/* vignette  */}
    <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-b ..." /> {/* bottom fade */}
  </div>

  {/* hero copy, CTA, stats — normal flow, painted above the backdrop */}
</section>
```

Three properties matter:

| Property | Why it matters |
| --- | --- |
| `isolate` on the `<section>` | Contains the effect's `mix-blend-mode`, so `screen` blends against the photo instead of the whole page. |
| `-z-10` backdrop wrapper | Everything inside it sits behind the content automatically. |
| `overflow-hidden` | Beams drifting sideways can never create a horizontal scrollbar. |

The background image is **not touched**: same `src`, same `object-cover object-top
opacity-70`.

---

## 2. Where the code lives

| File | Role |
| --- | --- |
| `src/components/GodRays.tsx` | Markup: 1 glow + 12 beams + 10 dust motes. Each beam passes its numbers in as CSS custom properties. Server component — ships no JS. |
| `src/app/globals.css` (end of file) | `.god-rays`, `.god-ray`, `.god-dust`, the two keyframes, responsive + reduced-motion rules. All tunables are variables at the top of the block. |
| `src/components/Hero.tsx` | One-line insertion `<GodRays />` between the image and the vignette. |
| `public/god-rays-demo.html` | Self-contained page (marked `COPY FROM HERE` / `COPY TO HERE`) for other projects. |

### Integration in this repo

```tsx
<Image src="/images/light-rays.webp" alt="" fill priority sizes="100vw"
       quality={85} className="object-cover object-top opacity-70" />

{/* Animated sunlight: above the photo, under the vignette and content. */}
<GodRays />

<div className="absolute inset-0 bg-[radial-gradient(...)]" />
```

Order is deliberate: rays blend with the photo **first**, then the vignette tones
them down so the H1 stays legible.

### Using it in a non-Next.js page

Open `public/god-rays-demo.html`, copy the block between the two banner comments
(CSS) and the `<div class="god-rays">…</div>` markup, then:

1. Put the markup **immediately after** your background `<img>` (or the element
   with the background image).
2. Make sure the parent is `position: relative` and, ideally,
   `isolation: isolate`.
3. Keep the content (nav, headline, buttons) in normal flow — or give it
   `position: relative; z-index: 2` — so it sits above `z-index: 0` rays.

```html
<section class="hero">                     <!-- position: relative; isolation: isolate -->
  <img class="hero__bg" src="your-image.jpg" alt="" />  <!-- untouched -->
  <div class="god-rays" aria-hidden="true"> … </div>    <!-- the effect -->
  <div class="hero__content"> … </div>                   <!-- above it -->
</section>
```

---

## 3. How it works (and why it stays vertical)

Each beam is a **tall, narrow, un-rotated `div`**:

- **Shape** — `width: var(--w)` (20–140 px), `height: 94%`, `top: 0`.
- **Horizontal placement** — `left: var(--x)` plus `margin-left: calc(var(--w) / -2)`
  centres the beam **without** using `transform`, because `transform` is reserved
  for the animation.
- **Feathered edges** — a 90° `linear-gradient` that is transparent at 0% and
  100% and brightest at 50%.
- **Top-to-bottom fade** — `mask-image: linear-gradient(to bottom, …)` so the
  light is strong where it enters the frame and dissolves before the ground.
- **Blending** — `mix-blend-mode: screen` + `filter: blur(6–14px)`.
- **Motion** — only `translate3d(x, 0, 0)` and `scaleX()` plus `opacity`, driven
  by one keyframe pair with `infinite alternate` and `ease-in-out`. Nothing ever
  rotates or skews, so rays stay at exactly 90° to the ground.

Desynchronisation comes from per-beam numbers: durations span **8 s – 20 s** and
delays are **negative** (e.g. `-6.5s`), so every beam starts mid-cycle and they
never pulse in lockstep.

---

## 4. Aligning beams with the rays in your image

Beam positions are percentages of the hero width, so they scale with the viewport.
To match your photo:

1. Open the page, make the browser window the size you care most about (e.g.
   1440 × 900 — the image is cropped by `object-cover`, so alignment is
   viewport-dependent).
2. Take a screenshot and drag a guide from the top-centre (where the light
   enters) to each visible ray.
3. Read the horizontal position as a fraction of the viewport width → that is
   your `--x` percentage. Brighter rays get higher `--o`; wider rays get bigger
   `--w` and `--blur`.

Current mapping in this project (rays fan out from ~50 %):

| `--x` | `--w` | `--o` | `--dur` | `--drift` | `--blur` | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 15 % | 118 px | 0.10 | 17 s | 22 px | 13 px | far left, faint (hidden < 768 px) |
| 24 % | 62 px | 0.16 | 12 s | 14 px | 9 px | |
| 30 % | 34 px | 0.22 | 9 s | 18 px | 7 px | narrow, bright |
| 35 % | 96 px | 0.12 | 19 s | 26 px | 13 px | wide, soft (hidden < 768 px) |
| 41 % | 48 px | 0.25 | 11 s | 12 px | 8 px | brightest |
| 47 % | 140 px | 0.09 | 20 s | 30 px | 14 px | widest (hidden < 768 px) |
| 50 % | 26 px | 0.24 | 8 s | 10 px | 6 px | centre, fastest |
| 55 % | 70 px | 0.14 | 15 s | 20 px | 10 px | |
| 61 % | 40 px | 0.20 | 10 s | 16 px | 7 px | |
| 68 % | 104 px | 0.11 | 18 s | 24 px | 12 px | (hidden < 768 px) |
| 76 % | 54 px | 0.17 | 13 s | 15 px | 9 px | |
| 84 % | 30 px | 0.08 | 16 s | 21 px | 11 px | far right, faint (hidden < 768 px) |

In React, edit the `BEAMS` array in `src/components/GodRays.tsx`. In plain HTML,
edit the inline `style="--x:…;--w:…"` on each `.god-ray`. To move **all** the
rays (e.g. your sun sits at 62 %), shift every `--x` by the same amount — or add
`left` offset on `.god-rays` itself.

---

## 5. Tuning cheatsheet

All in the `--god-ray-*` block at the top of the CSS:

| Variable | Effect |
| --- | --- |
| `--god-ray-color` | Warmth of the light. `255 240 200` = warm white; `255 224 170` = golden; `235 245 255` = cool moonlight. |
| `--god-ray-blend` | `screen` (adds light, best on dark photos) or `soft-light` (gentler). |
| `--god-ray-pulse-min` | Lowest opacity multiplier in the pulse. `0.45` → beam dips to 45 % of base. Raise toward `0.8` for an almost-static look. |
| `--god-ray-scale-min/max` | Width breathing. `0.95 → 1.1` is subtle; keep the two values close for calm. |
| `--god-ray-height` | Where the beams stop (94 % of the hero). Lower it so rays die out above the ground line. |
| `--god-ray-glow-opacity` | Strength of the bloom where light enters the frame. |
| `--god-ray-dust-opacity` | Visibility of the floating motes. |
| per-beam `--dur` / `--delay` | Speed / phase. Keep durations distinct (8–20 s) or the scene starts to look synchronised. |

To add a beam: duplicate one `--x` line, change `--x`, `--w`, `--o`, `--dur`,
`--delay` (negative), `--drift`, `--blur`. To calm the scene overall, raise
`--god-ray-pulse-min` and lower `--god-ray-scale-max` before touching durations.

---

## 6. Performance & accessibility

- **GPU-only animation** — `translate3d`, `scaleX` and `opacity`; nothing that
  triggers layout or paint. `will-change` is set on the animated elements.
- **Contained** — the layer uses `pointer-events: none` (never blocks a click)
  and `overflow: hidden`. It deliberately avoids `contain: paint`/`isolation`
  on the ray layer itself: either would create a blending boundary and stop
  `screen` from mixing with the photograph underneath.
- **Responsive** — the five widest/lowest-opacity beams carry
  `god-ray--optional` and are hidden below 768 px (12 → 7 visible beams); blur,
  height and glow are also reduced, and dust is switched off.
- **Reduced motion** — `@media (prefers-reduced-motion: reduce)` removes both
  animations entirely: the beams become still, slightly dimmer light and the
  dust is hidden. Nothing pulses.
- **No content impact** — the layer is `aria-hidden` decorative markup inside the
  existing `aria-hidden` backdrop, so screen readers and tab order are unchanged.
- **No JS payload** — `GodRays` is a server component; the effect is compiled CSS.
