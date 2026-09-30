"use client";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";
import { useShop } from "@/lib/store";
import { Steam } from "./ui";
import FixedBackground from "@/components/FixedBackground";

/* The stationary food-collage backdrop lives ONLY on the landing page;
   every other route keeps the original solid cream page background. */
export function FixedBackgroundGate() {
  const pathname = usePathname();
  return pathname === "/" ? <FixedBackground /> : null;
}

/* Branded initial loader: pizza slice orbit + steam */
export function Splash() {
  const reduce = useReducedMotion();
  const [show, setShow] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShow(false), reduce ? 200 : 1100);
    return () => clearTimeout(t);
  }, [reduce]);
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[90] grid place-items-center bg-cream"
          exit={{ opacity: 0, transition: { duration: 0.45 } }}
          aria-hidden
        >
          <div className="relative grid place-items-center">
            <Steam className="absolute -top-9 left-1/2 -translate-x-1/2" />
            <svg viewBox="0 0 100 100" className="h-20 w-20 animate-spinSlow motion-reduce:animate-none">
              <path d="M50 6 L88 78 A44 44 0 0 1 12 78 Z" fill="#E8792B" />
              <path d="M50 14 L82 75 A37 37 0 0 1 18 75 Z" fill="#F49B58" />
              <circle cx="50" cy="46" r="5" fill="#12433F" />
              <circle cx="38" cy="64" r="5" fill="#12433F" />
              <circle cx="62" cy="64" r="5" fill="#12433F" />
              <circle cx="50" cy="62" r="3" fill="#2e7d32" />
            </svg>
            <p className="mt-4 font-display text-lg font-black tracking-wide text-cherry">
              KUOPIO BITES
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Toasts() {
  const { toasts } = useShop();
  return (
    <div className="pointer-events-none fixed bottom-24 left-1/2 z-[80] flex -translate-x-1/2 flex-col items-center gap-2 lg:bottom-8">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className={
              "rounded-full px-5 py-2.5 text-sm font-black shadow-lift " +
              (t.kind === "ok" ? "bg-cherry text-cream" : "bg-brick text-cream")
            }
          >
            {t.msg}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/**
 * Page transition — enter-only animation keyed by pathname.
 * FIX (v2 §18): the previous AnimatePresence mode="wait" exit/enter cycle could
 * leave newly mounted pages invisible after client-side navigation. Enter-only
 * keyed transitions remount fresh on every route change (fresh IntersectionObserver
 * registrations for scroll reveals) and can never strand content.
 */
export function PageFade({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  return (
    <motion.div
      key={pathname}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

/* Sticky mobile CTA bar */
export function MobileCTA() {
  const pathname = usePathname();
  const { cartOpen } = useShop();
  const { t } = useLang();
  const hide =
    pathname.startsWith("/order") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/track") ||
    cartOpen;
  return (
    <div
      className={
        "fixed inset-x-0 bottom-0 z-40 border-t-2 border-gold/50 bg-cream/95 p-3 backdrop-blur-md lg:hidden " +
        (hide ? "hidden" : "block")
      }
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div className="flex gap-3">
        <Link
          href="/order"
          className="min-h-[48px] flex-1 rounded-full bg-cherry-bright text-center font-black leading-[48px] text-cream shadow-lift active:scale-[0.98]"
        >
          {t("cta.order")}
        </Link>
        <Link
          href="/dining"
          className="min-h-[48px] flex-1 rounded-full border-2 border-cherry text-center font-black leading-[44px] text-cherry active:scale-[0.98]"
        >
          {t("cta.dining")}
        </Link>
      </div>
    </div>
  );
}
