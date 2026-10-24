"use client";

import { motion, useInView } from "framer-motion";
import type { CSSProperties } from "react";
import { useRef } from "react";
import { STATS } from "@/lib/content";

const DIGITS = Array.from({ length: 10 }, (_, index) => index);

/**
 * Slot-machine digit column. Renders 0–9 twice and rolls the strip to the
 * target glyph when the row scrolls into view. The strip's resting state is
 * declared as a custom property so the reduced-motion stylesheet can park it
 * on the final value without any JS.
 */
function Digit({ digit, active, delay }: { digit: number; active: boolean; delay: number }) {
  const offset = `${-(10 + digit)}em`;

  return (
    <span className="inline-flex h-[1em] w-[0.62em] items-center justify-center overflow-hidden">
      <motion.span
        className="odometer-strip flex flex-col leading-none will-change-transform"
        style={{ "--roll-offset": offset } as CSSProperties}
        initial={{ y: "0em" }}
        animate={active ? { y: offset } : { y: "0em" }}
        transition={{ duration: 1.7, delay }}
      >
        {[...DIGITS, ...DIGITS].map((value, index) => (
          <span key={index} className="flex h-[1em] items-center justify-center tabular-nums">
            {value}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

function Odometer({ value, active, delay = 0 }: { value: string; active: boolean; delay?: number }) {
  let digitCount = 0;

  return (
    <span className="inline-flex items-center tabular-nums">
      <span className="sr-only">{value}</span>
      <span aria-hidden className="inline-flex items-center">
        {Array.from(value).map((character, index) => {
          if (!/\d/.test(character)) {
            return (
              <span key={`${character}-${index}`} className="inline-block">
                {character}
              </span>
            );
          }
          const position = digitCount;
          digitCount += 1;
          return (
            <Digit
              key={`${character}-${index}`}
              digit={Number(character)}
              active={active}
              delay={delay + position * 0.09}
            />
          );
        })}
      </span>
    </span>
  );
}

export default function StatsOdometer() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-120px" });

  return (
    <div ref={ref} className="content-shell">
      <dl className="grid border-t border-hairline sm:grid-cols-3 sm:divide-x sm:divide-hairline">
        {STATS.map((stat, index) => (
          <div
            key={stat.label}
            className="flex flex-col-reverse items-center gap-2 border-b border-hairline px-4 py-7 last:border-b-0 sm:border-b-0 sm:py-9"
          >
            <dt className="text-center text-xxs uppercase tracking-[0.2em] text-muted">
              {stat.label}
            </dt>
            <dd className="text-4xl font-medium tracking-tight text-fg sm:text-5xl">
              <Odometer value={stat.value} active={inView} delay={index * 0.15} />
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
