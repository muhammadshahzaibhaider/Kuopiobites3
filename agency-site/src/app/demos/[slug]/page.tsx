import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DEMOS, getDemo } from "@/lib/data/demos";
import { PageHero } from "@/components/PageHero";
import { PageCta } from "@/components/PageCta";
import { PillButton } from "@/components/PillButton";
import { Reveal } from "@/components/Reveal";
import DemoPanel from "@/components/DemoPanel";
import { ArrowUpRight } from "@/components/icons";

export function generateStaticParams() {
  return DEMOS.map((demo) => ({ slug: demo.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const demo = getDemo(slug);
  if (!demo) return { title: "Demo" };
  return { title: `${demo.name} demo`, description: demo.description };
}

export default async function DemoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const demo = getDemo(slug);
  if (!demo) notFound();

  const others = DEMOS.filter((item) => item.slug !== demo.slug).slice(0, 3);

  return (
    <>
      <PageHero
        eyebrow={`Demo · ${demo.category}`}
        title={demo.name}
        lede={demo.tagline}
        support={demo.description}
        align="left"
        actions={
          <>
            <PillButton href="/contact">Build this for me</PillButton>
            <PillButton href="/demos" tone="outline">
              All demos
            </PillButton>
          </>
        }
      />

      <div className="content-shell pb-section">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-12">
          <Reveal>
            <DemoPanel demo={demo} />
          </Reveal>

          <Reveal delay={0.08}>
            <div className="rounded-card border border-hairline bg-white/[0.015] p-6">
              <h2 className="text-micro uppercase text-muted-dim">How this pattern works</h2>
              <ol className="mt-5 flex flex-col gap-5">
                {[
                  {
                    title: "Structured input",
                    body: "The interface collects a single, well-defined input rather than an open prompt.",
                  },
                  {
                    title: "Model + schema",
                    body: "The model returns typed fields, not prose, so the UI can render consistent output.",
                  },
                  {
                    title: "Guardrails",
                    body: "Low-confidence results are flagged instead of smoothed over.",
                  },
                  {
                    title: "Audit",
                    body: "Every run is logged with its input, output, and model version.",
                  },
                ].map((step, index) => (
                  <li key={step.title} className="flex gap-3">
                    <span className="font-mono text-xxs text-muted-dim">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>
                      <span className="block text-sm text-fg">{step.title}</span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                        {step.body}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="mt-4 rounded-card border border-hairline p-6">
              <h2 className="text-micro uppercase text-muted-dim">Try another</h2>
              <ul className="mt-4 flex flex-col gap-3">
                {others.map((item) => (
                  <li key={item.slug}>
                    <Link
                      href={`/demos/${item.slug}`}
                      className="group flex items-center justify-between gap-3 text-sm text-white/75 transition-colors hover:text-fg"
                    >
                      {item.name}
                      <ArrowUpRight className="h-4 w-4 text-muted-dim transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>

      <PageCta
        title={
          <>
            Ready to productionise <span className="text-white/40">this pattern?</span>
          </>
        }
        body="We'll scope the data, the evals, and the guardrails before a line of code ships."
      >
        <PillButton href="/contact">Start a Project</PillButton>
        <PillButton href="/services/ai-development" tone="outline">
          AI Development
        </PillButton>
      </PageCta>
    </>
  );
}
