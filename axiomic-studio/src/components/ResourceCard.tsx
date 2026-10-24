import Link from "next/link";
import type { Resource } from "@/lib/data/resources";
import { cn } from "@/lib/cn";
import { ArrowUpRight } from "./icons";

export function ResourceCard({ resource }: { resource: Resource }) {
  const live = resource.status === "Live";

  return (
    <div className="group flex flex-col overflow-hidden rounded-card border border-hairline bg-white/[0.015] transition-colors duration-300 hover:border-hairline-strong hover:bg-white/[0.04]">
      {/* Generated artwork — a gradient plate with the item's initial. */}
      <div className="relative aspect-[16/9] overflow-hidden">
        <div className={cn("absolute inset-0 bg-gradient-to-br", resource.gradient)} />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.14] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:36px_36px]"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-5xl font-semibold tracking-tight text-white/15 transition-transform duration-500 ease-expo group-hover:scale-105">
            {resource.name.charAt(0)}
          </span>
        </div>
        <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 p-4">
          <span className="rounded-full border border-white/15 bg-ink/40 px-2.5 py-1 text-micro uppercase text-white/70 backdrop-blur">
            {resource.kind}
          </span>
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-micro uppercase",
              live
                ? "bg-white text-ink"
                : "border border-white/20 bg-ink/40 text-white/60 backdrop-blur",
            )}
          >
            {resource.status}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-medium tracking-tight text-fg">{resource.name}</h3>
          {resource.price ? (
            <span className="rounded-full border border-hairline px-2.5 py-1 text-xxs text-white/70">
              {resource.price}
            </span>
          ) : null}
        </div>
        <p className="text-sm leading-relaxed text-muted">{resource.blurb}</p>

        <div className="mt-auto flex items-center justify-between pt-4">
          <span className="text-xxs uppercase text-muted-dim">
            {live ? "Open source" : "In development"}
          </span>
          <Link
            href="/contact"
            className="inline-flex items-center gap-1.5 text-sm text-white/80 transition-colors hover:text-fg"
            aria-label={`${live ? "Get" : "Ask about"} ${resource.name}`}
          >
            {live ? "View" : "Notify me"}
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
