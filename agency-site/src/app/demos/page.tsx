import type { Metadata } from "next";
import Link from "next/link";
import { DEMOS } from "@/lib/data/demos";
import { PageHero } from "@/components/PageHero";
import { PageCta } from "@/components/PageCta";
import { PillButton } from "@/components/PillButton";
import { Reveal } from "@/components/Reveal";
import { ArrowUpRight } from "@/components/icons";

export const metadata: Metadata = {
  title: "Demos",
  description:
    "Interactive demos of the AI patterns we build with: intent classification, retrieval, red-teaming, grounding checks, and more.",
};

export default function DemosPage() {
  return (
    <>
      <PageHero
        eyebrow="Demos"
        title={
          <>
            Ideas you can <span className="text-white/40">click.</span>
          </>
        }
        lede="Seven small, interactive surfaces showing the AI patterns we build with — no signup, no sales gate."
        align="left"
      />

      <div className="content-shell pb-section">
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {DEMOS.map((demo, index) => (
            <li key={demo.slug}>
              <Reveal delay={Math.min(index, 3) * 0.05}>
                <Link
                  href={`/demos/${demo.slug}`}
                  className="group flex h-full flex-col rounded-card border border-hairline bg-white/[0.015] p-6 transition-[background-color,border-color,transform] duration-300 ease-expo hover:-translate-y-1 hover:border-hairline-strong hover:bg-white/[0.04]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 text-xxs uppercase tracking-[0.2em] text-muted-dim">
                      <span
                        aria-hidden
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: demo.accent }}
                      />
                      {demo.category}
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-muted transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-fg" />
                  </div>
                  <h2 className="mt-4 text-xl font-medium tracking-tight text-fg">{demo.name}</h2>
                  <p className="mt-1.5 text-sm text-white/70">{demo.tagline}</p>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{demo.description}</p>
                  <span className="mt-auto pt-5 text-xs text-white/70">Open demo →</span>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>

      <PageCta
        title={
          <>
            Want this wired to <span className="text-white/40">your data?</span>
          </>
        }
        body="Every demo here started as a client deliverable. We can build the production version."
      >
        <PillButton href="/contact">Talk to us</PillButton>
        <PillButton href="/services/ai-development" tone="outline">
          AI Development
        </PillButton>
      </PageCta>
    </>
  );
}
