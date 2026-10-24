"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { CASE_STUDIES } from "@/lib/content";
import { cn } from "@/lib/cn";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";
import { ArrowUpRight } from "./icons";

const ease = [0.16, 1, 0.3, 1] as const;

function Tags({ tags }: { tags: string[] }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center rounded-full border border-hairline bg-white/[0.03] px-2.5 py-1 text-xxs leading-none text-muted"
        >
          {tag}
        </span>
      ))}
    </span>
  );
}

export default function CaseStudyList() {
  const [active, setActive] = useState(0);

  return (
    <section id="work" aria-labelledby="work-title" className="relative py-section lg:py-section-lg">
      <div className="content-shell">
        <SectionHeading
          id="work-title"
          lead="Case"
          strong="Studies"
          description={
            <>
              <span className="block">Proven results, measurable impact — explore</span>
              <span className="block">the transformations we&apos;ve delivered.</span>
            </>
          }
        />

        <div className="mt-12 grid gap-10 lg:mt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-start lg:gap-16">
          {/* Desktop: interactive list */}
          <div className="hidden lg:block">
            <ul className="border-t border-hairline">
              {CASE_STUDIES.map((study, index) => {
                const isActive = index === active;
                return (
                  <li key={study.name} className="border-b border-hairline">
                    <Link
                      href={study.href}
                      onMouseEnter={() => setActive(index)}
                      onFocus={() => setActive(index)}
                      className="group flex items-center gap-5 py-6"
                    >
                      <span
                        className={cn(
                          "font-mono text-xxs transition-colors duration-200",
                          isActive ? "text-fg" : "text-muted-dim",
                        )}
                      >
                        {study.number}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block text-2xl font-medium tracking-tight transition-colors duration-200",
                            isActive ? "text-fg" : "text-white/45",
                          )}
                        >
                          {study.name}
                        </span>
                        <span className="mt-2 block">
                          <Tags tags={study.tags} />
                        </span>
                      </span>
                      <ArrowUpRight
                        className={cn(
                          "h-5 w-5 shrink-0 transition-all duration-300 ease-expo",
                          isActive
                            ? "-translate-y-0.5 translate-x-0.5 text-fg"
                            : "text-muted-dim",
                        )}
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Desktop: sticky preview */}
          <div className="hidden lg:block">
            <div className="sticky top-28">
              <div className="relative aspect-[16/11] overflow-hidden rounded-preview border border-hairline bg-ink-soft">
                {CASE_STUDIES.map((study, index) => (
                  <motion.div
                    key={study.name}
                    className="absolute inset-0"
                    initial={false}
                    animate={{
                      opacity: index === active ? 1 : 0,
                      scale: index === active ? 1 : 1.04,
                    }}
                    transition={{ duration: 0.55, ease }}
                    aria-hidden={index !== active}
                  >
                    <Image
                      src={study.image}
                      alt={`${study.name} project preview`}
                      fill
                      sizes="(min-width: 1024px) 620px, 100vw"
                      className="object-cover"
                      priority={index === 0}
                    />
                  </motion.div>
                ))}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/5 to-transparent"
                />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5">
                  <p className="text-sm font-medium text-white/85">{CASE_STUDIES[active].name}</p>
                  <p className="text-micro uppercase text-white/45">View case study</p>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile / tablet: stacked cards */}
          <ul className="grid gap-10 lg:hidden">
            {CASE_STUDIES.map((study, index) => (
              <li key={study.name}>
                <Reveal delay={Math.min(index, 2) * 0.05}>
                  <Link href={study.href} className="group block">
                    <div className="relative aspect-[16/10] overflow-hidden rounded-preview border border-hairline bg-ink-soft">
                      <Image
                        src={study.image}
                        alt={`${study.name} project preview`}
                        fill
                        sizes="(min-width: 640px) 90vw, 100vw"
                        className="object-cover transition-transform duration-500 ease-expo group-hover:scale-[1.03]"
                      />
                      <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent"
                      />
                    </div>
                    <div className="mt-4 flex items-start justify-between gap-4">
                      <div>
                        <p className="font-mono text-xxs text-muted-dim">{study.number}</p>
                        <p className="mt-1.5 text-xl font-medium tracking-tight text-fg">
                          {study.name}
                        </p>
                        <span className="mt-2.5 block">
                          <Tags tags={study.tags} />
                        </span>
                      </div>
                      <ArrowUpRight className="mt-1 h-5 w-5 shrink-0 text-muted transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
