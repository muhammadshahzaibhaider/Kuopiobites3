import type { Metadata } from "next";
import { SITE } from "@/lib/content";
import { PageHero } from "@/components/PageHero";
import { PageCta } from "@/components/PageCta";
import { SectionHeading } from "@/components/SectionHeading";
import { Reveal } from "@/components/Reveal";
import { PillButton } from "@/components/PillButton";
import { MarqueeBand } from "@/components/MarqueeBand";
import { WorldMap } from "@/components/WorldMap";

export const metadata: Metadata = {
  title: "Company",
  description:
    "A design-led AI studio turning complex challenges into measurable results. Our story, how we think, and what we believe.",
};

const PILLARS = [
  {
    title: "Design-first innovation",
    body: "Award-winning interfaces and web experiences, grounded in research rather than taste alone.",
  },
  {
    title: "Engineering excellence",
    body: "Typed, tested, observable systems — React, Next.js, Node, and AI architectures that scale.",
  },
  {
    title: "Real-world impact",
    body: "From healthcare to enterprise AI, every engagement is measured against an outcome, not a deliverable.",
  },
];

const BELIEFS = [
  { title: "Design first, always", body: "Every product starts with empathy and storytelling." },
  { title: "AI should amplify people", body: "Not replace them. The human stays in the loop where it counts." },
  { title: "Impact or it doesn't count", body: "Innovation is only meaningful when it moves a number that matters." },
  { title: "Fast, but never careless", body: "We move quickly — never at the cost of quality or integrity." },
];

export default function CompanyPage() {
  return (
    <>
      <PageHero
        eyebrow="Company"
        title={
          <>
            Companies create products.{" "}
            <span className="text-white/40">We create impact.</span>
          </>
        }
        lede="We're a design-led AI studio turning complex challenges into measurable results."
        align="left"
        actions={
          <>
            <PillButton href="#story">Our story</PillButton>
            <PillButton href="/contact" tone="outline">
              Work with us
            </PillButton>
          </>
        }
      />

      <MarqueeBand label="Trusted by teams worldwide" />

      {/* Story */}
      <section id="story" aria-labelledby="story-title" className="content-shell scroll-mt-28 py-section">
        <SectionHeading id="story-title" lead="Our " strong="story" align="left" />
        <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
          <Reveal>
            <div className="flex flex-col gap-5 text-base leading-relaxed text-muted">
              <p>
                {SITE.brand} operates at the intersection of cutting-edge technology and
                transformative design. We are a small, senior team of designers and engineers who
                prefer to build a few things properly rather than many things quickly.
              </p>
              <p>
                Founded in {SITE.city} by designers and engineers who had spent years watching good
                ideas die in handoffs, we set out to make AI accessible, human, and visually
                inspiring — and to keep design and engineering in the same room while doing it.
              </p>
              <p className="text-white/75">
                Today we work with teams across healthcare, security, and enterprise software, from
                first prototype to production and beyond.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.08} className="justify-self-center lg:justify-self-end">
            <WorldMap />
          </Reveal>
        </div>
      </section>

      {/* Things that matter */}
      <section aria-labelledby="pillars-title" className="content-shell pb-section">
        <SectionHeading id="pillars-title" lead="Things that " strong="matter" align="left" />
        <ul className="mt-10 grid gap-4 md:grid-cols-3">
          {PILLARS.map((pillar, index) => (
            <Reveal key={pillar.title} delay={index * 0.06}>
              <li className="h-full rounded-card border border-hairline bg-white/[0.015] p-6 transition-colors duration-300 hover:border-hairline-strong hover:bg-white/[0.03]">
                <p className="font-mono text-xxs text-muted-dim">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-3 text-lg font-medium tracking-tight text-fg">{pillar.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{pillar.body}</p>
              </li>
            </Reveal>
          ))}
        </ul>
      </section>

      {/* How we think */}
      <section aria-labelledby="beliefs-title" className="content-shell pb-section">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-16">
          <SectionHeading
            id="beliefs-title"
            lead="How we "
            strong="think"
            description="We don't just build products — we build momentum."
            align="left"
          />
          <ol className="grid gap-px overflow-hidden rounded-card border border-hairline bg-hairline sm:grid-cols-2">
            {BELIEFS.map((belief, index) => (
              <li key={belief.title} className="bg-ink p-6">
                <p className="font-mono text-xxs text-muted-dim">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-3 text-base font-medium tracking-tight text-fg">
                  {belief.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{belief.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <PageCta
        title={
          <>
            Let&apos;s create something <span className="text-white/40">that matters.</span>
          </>
        }
        body="We've built AI for good, for growth, and for greater impact. What will we build with you?"
      >
        <PillButton href="/contact">Start a Project</PillButton>
        <PillButton href="/work" tone="outline">
          Explore Our Work
        </PillButton>
      </PageCta>
    </>
  );
}
