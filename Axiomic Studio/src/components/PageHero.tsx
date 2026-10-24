import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Reveal } from "./Reveal";

type PageHeroProps = {
  eyebrow?: string;
  title: ReactNode;
  lede?: string;
  support?: string;
  actions?: ReactNode;
  /** Renders the light-ray artwork behind the copy. */
  rays?: boolean;
  align?: "center" | "left";
  className?: string;
  children?: ReactNode;
};

/** Shared interior-page hero: light rays, eyebrow, oversized title, lede, CTAs. */
export function PageHero({
  eyebrow,
  title,
  lede,
  support,
  actions,
  rays = true,
  align = "center",
  className,
  children,
}: PageHeroProps) {
  const centered = align === "center";

  return (
    <section className={cn("grain relative isolate overflow-hidden pt-32 pb-16 sm:pt-40 sm:pb-20", className)}>
      {rays ? (
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <Image
            src="/images/light-rays.webp"
            alt=""
            fill
            priority
            sizes="100vw"
            quality={85}
            className="object-cover object-top opacity-55"
          />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,rgba(5,5,5,0.15)_0%,rgba(5,5,5,0.6)_50%,#050505_85%)]" />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b from-transparent to-ink" />
        </div>
      ) : null}

      <div
        className={cn(
          "content-shell flex flex-col",
          centered ? "items-center text-center" : "items-start text-left",
        )}
      >
        {eyebrow ? (
          <Reveal>
            <p className="flex items-center gap-3 text-eyebrow uppercase text-white/60">
              <span aria-hidden className="h-px w-6 bg-white/25" />
              {eyebrow}
            </p>
          </Reveal>
        ) : null}

        <Reveal delay={0.05} className={cn("mt-6", centered && "w-full")}>
          <h1 className="text-hero font-medium text-fg">{title}</h1>
        </Reveal>

        {lede ? (
          <Reveal delay={0.1}>
            <p
              className={cn(
                "mt-7 max-w-2xl text-lede text-white/75",
                centered && "mx-auto text-balance",
              )}
            >
              {lede}
            </p>
          </Reveal>
        ) : null}

        {support ? (
          <Reveal delay={0.14}>
            <p
              className={cn(
                "mt-4 max-w-2xl text-sm leading-relaxed text-muted",
                centered && "mx-auto text-pretty",
              )}
            >
              {support}
            </p>
          </Reveal>
        ) : null}

        {actions ? (
          <Reveal delay={0.18}>
            <div className={cn("mt-9 flex flex-wrap gap-3", centered && "justify-center")}>
              {actions}
            </div>
          </Reveal>
        ) : null}

        {children}
      </div>
    </section>
  );
}
