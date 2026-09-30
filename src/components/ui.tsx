"use client";
import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import React, { useState } from "react";
import { cx } from "@/lib/format";
import { orderingInfo } from "@/lib/hours";
import { useLang } from "@/lib/i18n";
import { useShop } from "@/lib/store";
import type { Tag } from "@/lib/types";
import { CATEGORY_ICON, CATEGORY_SLUG, itemImagePath } from "@/lib/images";
import { MENU } from "@/lib/menu";

/* Scroll-reveal wrapper: fade + rise, respects reduced motion */
export function Reveal({
  children,
  delay = 0,
  className,
  y = 26,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  y?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y }}
      whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px", amount: 0.1 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function Stagger({
  children,
  className,
  gap = 0.07,
}: {
  children: React.ReactNode;
  className?: string;
  gap?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial="hide"
      whileInView="show"
      viewport={{ once: true, margin: "-40px", amount: 0.05 }}
      variants={{
        hide: {},
        show: { transition: { staggerChildren: reduce ? 0 : gap } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={{
        hide: reduce ? { opacity: 0 } : { opacity: 0, y: 22 },
        show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function SectionHead({
  kicker,
  title,
  sub,
  center,
}: {
  kicker?: string;
  title: string;
  sub?: string;
  center?: boolean;
}) {
  return (
    <Reveal className={cx("mb-8", center && "text-center")}>
      {kicker && (
        <p className="font-script text-2xl text-gold-deep -rotate-1">{kicker}</p>
      )}
      <h2 className="mt-1 text-3xl sm:text-4xl font-black tracking-tight text-cherry">
        {title}
      </h2>
      <div className={cx("gold-rule mt-4 w-24", center && "mx-auto")} />
      {sub && <p className="mt-3 max-w-2xl text-cherry/80">{sub}</p>}
    </Reveal>
  );
}

export function TagBadge({ tag }: { tag: Tag }) {
  const { t } = useLang();
  if (tag === "veg")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#2e7d32]/10 px-2 py-0.5 text-[11px] font-bold text-[#2e6b31]">
        <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 fill-current"><circle cx="6" cy="6" r="4" /></svg>
        {t("tag.veg")}
      </span>
    );
  if (tag === "spicy")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-brick/10 px-2 py-0.5 text-[11px] font-bold text-brick">
        🌶 {t("tag.spicy")}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-bold text-gold-deep">
      ★ {t("tag.fav")}
    </span>
  );
}

export function OpenBadge({ big }: { big?: boolean }) {
  const { settings } = useShop();
  const { t, dayName } = useLang();
  const st = orderingInfo(settings);
  const label = st.paused
    ? t("open.paused")
    : st.open
      ? `${t("open.now")} ${st.info.closeAt}`
      : st.info.nextDay === 0
        ? `${t("open.closed")} ${st.info.openAt}`
        : `${t("open.closedDay")} ${st.info.nextDay === 1 ? t("open.tomorrow") : dayName(st.info.nextDay!)} ${st.info.openAt}`;
  return (
    <span
      className={cx(
        "inline-flex items-center gap-2 rounded-full border font-bold",
        big ? "px-4 py-2 text-sm" : "px-3 py-1 text-xs",
        st.open && !st.paused
          ? "border-[#2e7d32]/30 bg-[#2e7d32]/10 text-[#2e6b31]"
          : "border-brick/30 bg-brick/10 text-brick"
      )}
    >
      <span className="relative flex h-2.5 w-2.5">
        {st.open && !st.paused && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2e7d32] opacity-60 motion-reduce:hidden" />
        )}
        <span
          className={cx(
            "relative inline-flex h-2.5 w-2.5 rounded-full",
            st.open && !st.paused ? "bg-[#2e7d32]" : "bg-brick"
          )}
        />
      </span>
      {label}
    </span>
  );
}

/* Rising steam wisps, like the logo */
export function Steam({ className }: { className?: string }) {
  return (
    <div className={cx("pointer-events-none flex gap-1.5", className)} aria-hidden>
      {[0, 1, 2].map((i) => (
        <svg
          key={i}
          viewBox="0 0 14 34"
          className="h-8 w-3.5 fill-gold animate-steam motion-reduce:animate-none"
          style={{ animationDelay: `${i * 0.5}s` }}
        >
          <path d="M7 0C10 6 3 10 6 16c3 6-2 10 1 18 4-8-1-12 2-18 3-6-4-10-2-16z" />
        </svg>
      ))}
    </div>
  );
}

export function QtyStepper({
  qty,
  onChange,
  small,
}: {
  qty: number;
  onChange: (q: number) => void;
  small?: boolean;
}) {
  const btn = cx(
    "grid place-items-center rounded-full border border-cherry/25 bg-cream text-cherry font-black transition hover:bg-cherry hover:text-cream active:scale-90",
    small ? "h-8 w-8 min-h-[32px]" : "h-11 w-11 min-h-[44px]"
  );
  return (
    <div className="inline-flex items-center gap-2">
      <button type="button" aria-label="Decrease" className={btn} onClick={() => onChange(qty - 1)}>
        −
      </button>
      <span className="min-w-[1.5rem] text-center font-black tabular-nums">{qty}</span>
      <button type="button" aria-label="Increase" className={btn} onClick={() => onChange(qty + 1)}>
        +
      </button>
    </div>
  );
}

export function BtnPrimary({
  children,
  className,
  pulse,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { pulse?: boolean }) {
  return (
    <button
      {...rest}
      className={cx(
        "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-cherry-bright px-6 py-3 font-bold text-cream shadow-lift transition-all duration-200 hover:-translate-y-0.5 hover:bg-cherry active:translate-y-0 active:scale-[0.97] motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        pulse && "motion-safe:animate-pulseSoft",
        className
      )}
    >
      {children}
    </button>
  );
}

export function BtnGhost({
  children,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={cx(
        "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border-2 border-cherry px-6 py-3 font-bold text-cherry transition-all duration-200 hover:-translate-y-0.5 hover:bg-cherry hover:text-cream active:scale-[0.97] motion-reduce:hover:translate-y-0",
        className
      )}
    >
      {children}
    </button>
  );
}

/* ── menu item image (v3.1 §32) ── */
const BLUR_SVG = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjRGNEYyIi8+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMTUiIGZpbGw9IiNFQURGQzAiLz48L3N2Zz4=";

/**
 * Photo card image for any menu item. Upload → manifest path → branded
 * category placeholder (never a broken image). Caption EN/FI bottom-right.
 */
export function MenuImage({
  item,
  className,
  sizes = "(max-width: 640px) 96px, 200px",
  srcOverride,
}: {
  item: import("@/lib/types").MenuItem;
  className?: string;
  sizes?: string;
  srcOverride?: string;
}) {
  const { settings } = useShop();
  const { t } = useLang();
  const [failed, setFailed] = useState(false);
  const src = srcOverride ?? settings.itemImages[item.id]?.src ?? itemImagePath(item);
  const icon = CATEGORY_ICON[CATEGORY_SLUG[item.cat] ?? ""] ?? "🍽";
  return (
    <div className={cx("relative aspect-square w-full overflow-hidden bg-[#F4F4F2]", className)}>
      {failed ? (
        <div className="grid h-full w-full place-items-center bg-cream-deep" role="img" aria-label={item.name}>
          <span aria-hidden className="grid h-[62%] w-[62%] place-items-center rounded-full bg-cream text-3xl shadow-card">
            {icon}
          </span>
        </div>
      ) : (
        <Image
          src={src}
          alt={item.name}
          width={1200}
          height={1200}
          sizes={sizes}
          loading="lazy"
          placeholder="blur"
          blurDataURL={BLUR_SVG}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      )}
      <span className="pointer-events-none absolute inset-x-1 bottom-0.5 text-right text-[8px] font-bold leading-[1.15] text-cherry/50">
        {t("img.caption")}
      </span>
    </div>
  );
}

/** @deprecated alias kept for the pizza sheet/cards */
export const PizzaImage = MenuImage;

/** Small photo thumb for a cart/order line — falls back to the category placeholder. */
export function LineThumb({
  itemId,
  name,
  size = 56,
}: {
  itemId: string;
  name: string;
  size?: number;
}) {
  const { effectiveMenu } = useShop();
  const { lang } = useLang();
  const item = effectiveMenu(MENU, lang).find((m) => m.id === itemId);
  if (!item)
    return (
      <span
        aria-hidden
        className="grid shrink-0 place-items-center rounded-xl bg-cream-deep text-cherry/40"
        style={{ width: size, height: size }}
      >
        🍽
      </span>
    );
  return <MenuImage item={item} sizes={`${size * 2}px`} className="rounded-xl" />;
}
