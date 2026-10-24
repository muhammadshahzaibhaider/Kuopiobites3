import Image from "next/image";
import Link from "next/link";
import type { CaseStudy } from "@/lib/data/caseStudies";
import { ArrowUpRight } from "./icons";

export function TagPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-hairline bg-white/[0.03] px-2.5 py-1 text-xxs leading-none text-muted">
      {children}
    </span>
  );
}

/** Grid card used on /work and in "Selected work" blocks. */
export function CaseStudyCard({ study, sizes }: { study: CaseStudy; sizes?: string }) {
  return (
    <Link
      href={`/case-study/${study.slug}`}
      className="group flex flex-col rounded-card border border-hairline bg-white/[0.015] p-3 transition-[background-color,border-color,transform] duration-300 ease-expo hover:-translate-y-1 hover:border-hairline-strong hover:bg-white/[0.04]"
    >
      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-ink-soft">
        <Image
          src={study.image}
          alt={`${study.name} project preview`}
          fill
          sizes={sizes ?? "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"}
          className="object-cover transition-transform duration-500 ease-expo group-hover:scale-[1.04]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent"
        />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-3 pt-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xxs text-muted-dim">{study.number}</p>
            <h3 className="mt-1.5 text-xl font-medium tracking-tight text-fg">{study.name}</h3>
          </div>
          <ArrowUpRight className="mt-1 h-5 w-5 shrink-0 text-muted transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-fg" />
        </div>
        <p className="text-sm text-muted">{study.tagline}</p>
        <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
          {study.tags.map((tag) => (
            <TagPill key={tag}>{tag}</TagPill>
          ))}
        </div>
      </div>
    </Link>
  );
}
