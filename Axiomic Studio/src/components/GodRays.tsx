import type { CSSProperties } from "react";

/**
 * Animated god-rays overlay.
 *
 * Sits *inside* the hero's backdrop wrapper, directly above the background
 * image and below the darkening vignette, so it:
 *   • blends with the photo (mix-blend-mode: screen),
 *   • is toned down by the vignette for text legibility,
 *   • stays behind all hero content (the wrapper is z-index: -10).
 *
 * Pure CSS: no JavaScript runs. Every beam is a straight, un-rotated div whose
 * horizontal position, width, opacity, drift, blur, duration and delay come
 * from CSS custom properties declared inline below.
 */
type Beam = {
  /** Horizontal centre of the beam, as a % of the viewport. */
  left: number;
  /** Beam width in px (20–140). */
  width: number;
  /** Base opacity (0.05–0.25). */
  opacity: number;
  /** Animation duration in seconds (8–20). */
  duration: number;
  /** Negative delays desynchronise the loops from the very first frame. */
  delay: number;
  /** Horizontal drift in px, ± this value (10–30). */
  drift: number;
  /** Blur in px (6–14). */
  blur: number;
  /** Hidden below 768px to keep mobile compositing cheap. */
  optional?: boolean;
};

/* Beams fan out from the bright column at the top-centre of the background,
   widening and softening as they move outwards — mirroring the rays already
   painted into /images/light-rays.webp. */
const BEAMS: Beam[] = [
  { left: 15, width: 118, opacity: 0.1, duration: 17, delay: -1, drift: 22, blur: 13, optional: true },
  { left: 24, width: 62, opacity: 0.16, duration: 12, delay: -3, drift: 14, blur: 9 },
  { left: 30, width: 34, opacity: 0.22, duration: 9, delay: -6, drift: 18, blur: 7 },
  { left: 35, width: 96, opacity: 0.12, duration: 19, delay: -2, drift: 26, blur: 13, optional: true },
  { left: 41, width: 48, opacity: 0.25, duration: 11, delay: -8, drift: 12, blur: 8 },
  { left: 47, width: 140, opacity: 0.09, duration: 20, delay: -5, drift: 30, blur: 14, optional: true },
  { left: 50, width: 26, opacity: 0.24, duration: 8, delay: -1.5, drift: 10, blur: 6 },
  { left: 55, width: 70, opacity: 0.14, duration: 15, delay: -7, drift: 20, blur: 10 },
  { left: 61, width: 40, opacity: 0.2, duration: 10, delay: -4, drift: 16, blur: 7 },
  { left: 68, width: 104, opacity: 0.11, duration: 18, delay: -9, drift: 24, blur: 12, optional: true },
  { left: 76, width: 54, opacity: 0.17, duration: 13, delay: -2.5, drift: 15, blur: 9 },
  { left: 84, width: 30, opacity: 0.08, duration: 16, delay: -6.5, drift: 21, blur: 11, optional: true },
];

/* Dust motes drift upward inside the 2–3 brightest beams. */
const DUST = [
  { left: 29, size: 3, delay: -2, duration: 15, drift: 10 },
  { left: 31, size: 2, delay: -7, duration: 19, drift: -8 },
  { left: 40, size: 4, delay: -4, duration: 17, drift: 12 },
  { left: 42, size: 2, delay: -11, duration: 21, drift: -10 },
  { left: 49, size: 3, delay: -6, duration: 14, drift: 8 },
  { left: 51, size: 2, delay: -13, duration: 23, drift: -12 },
  { left: 55, size: 3, delay: -1, duration: 18, drift: 14 },
  { left: 60, size: 2, delay: -9, duration: 20, drift: -6 },
  { left: 62, size: 3, delay: -5, duration: 16, drift: 9 },
  { left: 75, size: 2, delay: -15, duration: 22, drift: -11 },
];

export default function GodRays({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`god-rays ${className}`.trim()}>
      {/* Soft bloom where the light enters the frame. */}
      <div className="god-rays__glow" />

      {BEAMS.map((beam, index) => {
        const style = {
          "--x": `${beam.left}%`,
          "--w": `${beam.width}px`,
          "--o": beam.opacity,
          "--dur": `${beam.duration}s`,
          "--delay": `${beam.delay}s`,
          "--drift": `${beam.drift}px`,
          "--blur": `${beam.blur}px`,
        } as CSSProperties;

        return (
          <div
            key={index}
            className={`god-ray${beam.optional ? " god-ray--optional" : ""}`}
            style={style}
          />
        );
      })}

      <div className="god-rays__dust">
        {DUST.map((mote, index) => {
          const style = {
            "--x": `${mote.left}%`,
            "--size": `${mote.size}px`,
            "--dur": `${mote.duration}s`,
            "--delay": `${mote.delay}s`,
            "--dust-x": `${mote.drift}px`,
          } as CSSProperties;
          return <span key={index} className="god-dust" style={style} />;
        })}
      </div>
    </div>
  );
}
