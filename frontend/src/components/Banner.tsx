"use client";
import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { useLang } from "@/lib/i18n";

/**
 * Full-width brand banner (wordmark artwork) with percentage-positioned
 * overlay animations: steam over the pizza "O", lifting slice, biryani-pan
 * shimmer, tower glow. Static under prefers-reduced-motion. Transform/opacity
 * only — no layout shift.
 */
export default function Banner() {
  const reduce = useReducedMotion();
  const { t } = useLang();

  const img = (clip?: string) => (
    <Image
      src="/brand/kuopio-bites-banner-transparent.png"
      alt={t("banner.alt")}
      fill
      priority
      sizes="100vw"
      style={{ objectFit: "contain", mixBlendMode: "multiply", clipPath: clip }}
    />
  );

  return (
    <div className="relative mx-auto w-full max-w-4xl" style={{ aspectRatio: "2 / 1" }} aria-label={t("banner.alt")}>
      {reduce ? (
        img()
      ) : (
        <>
          {/* entrance: wordmark rises, tagline follows */}
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            {img("inset(0 0 30% 0)")}
          </motion.div>
          {/* 1 · steam over the pizza "O" (~27% x) */}
          <div className="pointer-events-none absolute" style={{ left: "24%", top: "8%", width: "6%" }} aria-hidden>
            {[0, 1, 2].map((i) => (
              <svg key={i} viewBox="0 0 14 34" className="absolute h-8 w-3 fill-gold animate-steam" style={{ left: `${i * 30}%`, animationDelay: `${i * 0.7}s` }}>
                <path d="M7 0C10 6 3 10 6 16c3 6-2 10 1 18 4-8-1-12 2-18 3-6-4-10-2-16z" />
              </svg>
            ))}
          </div>

          {/* 2 · lifted slice over the cut slice (~30% x, 30% y) */}
          <motion.svg
            viewBox="0 0 40 44"
            className="pointer-events-none absolute w-[4.5%]"
            style={{ left: "28.2%", top: "27%" }}
            animate={{ y: [0, -5, 0], rotate: [0, -3, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden
          >
            <path d="M20 42 L2 6 A22 22 0 0 1 38 6 Z" fill="none" />
          </motion.svg>

          {/* 3 · shimmer + steam over the biryani pan (~50% x) */}
          <motion.div
            className="pointer-events-none absolute rounded-full"
            style={{ left: "46%", top: "30%", width: "9%", aspectRatio: "1", background: "radial-gradient(circle, rgba(244,155,88,.5) 0%, rgba(244,155,88,0) 70%)" }}
            animate={{ opacity: [0.15, 0.6, 0.15], scale: [1, 1.12, 1] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden
          />

          {/* 4 · tower glow (~69.5% x, 26% y) */}
          <motion.div
            className="pointer-events-none absolute rounded-full bg-gold-soft blur-md"
            style={{ left: "68.6%", top: "24%", width: "2.2%", aspectRatio: "1" }}
            animate={{ opacity: [0.2, 0.7, 0.2] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden
          />
        </>
      )}
    </div>
  );
}
