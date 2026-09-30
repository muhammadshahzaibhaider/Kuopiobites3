/**
 * Site-wide FULLY STATIONARY background: a dedicated `position: fixed` layer
 * (NOT background-attachment: fixed, which breaks on iOS Safari) holding an
 * optimized <picture> (WebP + JPG fallback, smaller source on mobile).
 *
 * - The image covers the viewport, centered, no-repeat, and NEVER moves:
 *   no scroll listeners, no transforms, no parallax.
 * - A brand overlay sits on top; its colour/opacity come from CSS variables
 *   (--fixed-bg-overlay / --fixed-bg-overlay-opacity) so any page can retune it.
 */
export default function FixedBackground() {
  return (
    <div className="fixed-bg" aria-hidden>
      <picture className="block h-full w-full">
        <source media="(max-width: 768px)" type="image/webp" srcSet="/img/bg-mobile.webp" />
        <source type="image/webp" srcSet="/img/bg.webp" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/hero.jpg" alt="" className="h-full w-full object-cover object-center" />
      </picture>
      {/* brand overlay — tunable via CSS variables */}
      <div className="fixed-bg__overlay" />
    </div>
  );
}
