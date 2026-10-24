"use client";

import { motion } from "framer-motion";
import { Fragment } from "react";
import Image from "next/image";
import { SITE } from "@/lib/content";
import { PillButton } from "./PillButton";
import StatsOdometer from "./StatsOdometer";
import GodRays from "./GodRays";

/* Two-line composition, mirroring the reference layout. */
const HEADLINE = [
  [
    { text: "Building", className: "font-normal" },
    { text: "Digital", className: "font-light italic text-white/90" },
  ],
  [
    { text: "Solutions", className: "font-semibold" },
    { text: "That", className: "font-normal" },
    { text: "Matter", className: "font-normal" },
  ],
];

const ease = [0.16, 1, 0.3, 1] as const;

export default function Hero() {
  return (
    <section
      id="top"
      aria-labelledby="hero-title"
      className="grain relative isolate flex min-h-dvh flex-col overflow-hidden pt-24"
    >
      {/* Light-ray backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <Image
          src="/images/light-rays.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          quality={85}
          className="object-cover object-top opacity-70"
        />

        {/* Animated sunlight: sits above the photo, under the vignette and content. */}
        <GodRays />

        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,rgba(5,5,5,0.1)_0%,rgba(5,5,5,0.45)_45%,#050505_82%)]" />
        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-b from-transparent via-ink/70 to-ink" />
      </div>

      <div className="content-shell relative flex flex-1 flex-col items-center justify-center py-14 text-center sm:py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/4 left-1/2 -z-10 h-[26rem] w-[min(46rem,92vw)] -translate-x-1/2 rounded-full bg-glow/10 blur-glow motion-safe:animate-pulse-glow"
        />

        <motion.p
          className="flex items-center gap-3 text-eyebrow uppercase text-white/60"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05, ease }}
        >
          <span aria-hidden className="h-px w-6 bg-white/25" />
          {SITE.brand}
          <span aria-hidden className="h-px w-6 bg-white/25" />
        </motion.p>

        <h1
          id="hero-title"
          className="mt-7 text-hero font-medium text-fg sm:mt-9"
          aria-label={SITE.tagline}
        >
          <span aria-hidden>
            {HEADLINE.map((line, lineIndex) => (
              <span key={lineIndex} className="block">
                {lineIndex > 0 ? " " : null}
                {line.map((word, wordIndex) => {
                  const position = lineIndex === 0 ? wordIndex : 2 + wordIndex;
                  return (
                    <Fragment key={word.text}>
                      <motion.span
                        className={`inline-block whitespace-nowrap ${word.className}`}
                        initial={{ opacity: 0, letterSpacing: "0.22em", filter: "blur(8px)" }}
                        animate={{ opacity: 1, letterSpacing: "-0.04em", filter: "blur(0px)" }}
                        transition={{
                          duration: 1.35,
                          delay: 0.16 + position * 0.1,
                          ease,
                        }}
                      >
                        {word.text}
                      </motion.span>
                      {wordIndex < line.length - 1 ? " " : null}
                    </Fragment>
                  );
                })}
              </span>
            ))}
          </span>
        </h1>

        <motion.p
          className="mt-7 max-w-xl text-lede text-muted text-balance"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6, ease }}
        >
          {SITE.description}
        </motion.p>

        <motion.div
          className="mt-9"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.72, ease }}
        >
          <PillButton href="#contact">Start Your Project</PillButton>
        </motion.div>
      </div>

      <div className="relative pb-6 sm:pb-8">
        <StatsOdometer />
      </div>
    </section>
  );
}
