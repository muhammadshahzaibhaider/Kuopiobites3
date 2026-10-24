import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SERVICES, getService } from "@/lib/data/services";
import { CASE_STUDIES } from "@/lib/data/caseStudies";
import { PageHero } from "@/components/PageHero";
import { PageCta } from "@/components/PageCta";
import { MarqueeBand } from "@/components/MarqueeBand";
import { SectionHeading } from "@/components/SectionHeading";
import { Reveal } from "@/components/Reveal";
import { PillButton } from "@/components/PillButton";
import { CaseStudyCard } from "@/components/CaseStudyCard";
import FaqAccordion from "@/components/FaqAccordion";
import { TechIcon } from "@/components/TechIcon";
import { ArrowUpRight } from "@/components/icons";

export function generateStaticParams() {
  return SERVICES.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) return { title: "Service" };
  return {
    title: service.metaTitle,
    description: service.metaDescription,
    openGraph: { title: `${service.title} — ${service.metaTitle}`, description: service.metaDescription },
  };
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) notFound();

  const related = CASE_STUDIES.filter((study) => study.tags.includes(service.title));
  const selected = (related.length >= 2 ? related : CASE_STUDIES).slice(0, 3);
  const siblings = SERVICES.filter((item) => item.slug !== service.slug);

  return (
    <>
      <PageHero
        eyebrow={`Service · ${service.number}`}
        title={
          <>
            {service.hero.headline[0]}{" "}
            <span className="text-white/40">{service.hero.headline[1]}</span>
          </>
        }
        lede={service.hero.lede}
        support={service.hero.support}
        align="left"
        actions={
          <>
            <PillButton href="/contact">Start a project</PillButton>
            <PillButton href="#selected-work" tone="outline">
              See our work
            </PillButton>
          </>
        }
      />

      <MarqueeBand />

      {/* What you get */}
      <section aria-labelledby="included-title" className="content-shell py-section">
        <SectionHeading
          id="included-title"
          lead="What "
          strong="you get"
          description={service.whatsIncludedBlurb}
          align="left"
        />
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {service.deliverables.map((item, index) => (
            <Reveal key={item.title} delay={Math.min(index, 3) * 0.05}>
              <li className="h-full rounded-card border border-hairline bg-white/[0.015] p-6 transition-colors duration-300 hover:border-hairline-strong hover:bg-white/[0.03]">
                <p className="font-mono text-xxs text-muted-dim">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-3 text-lg font-medium tracking-tight text-fg">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
              </li>
            </Reveal>
          ))}
        </ul>
      </section>

      {/* Process */}
      <section aria-labelledby="process-title" className="content-shell pb-section">
        <SectionHeading
          id="process-title"
          lead="How we "
          strong="work"
          description={service.processBlurb}
          align="left"
        />
        <ol className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {service.process.map((phase, index) => (
            <Reveal key={phase.title} delay={index * 0.06}>
              <li className="relative h-full overflow-hidden rounded-card border border-hairline bg-white/[0.015] p-6">
                <span
                  aria-hidden
                  className="absolute -top-3 right-4 text-6xl font-semibold text-white/[0.05]"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="font-mono text-xxs text-muted-dim">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-3 text-lg font-medium tracking-tight text-fg">{phase.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{phase.body}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* Selected work */}
      <section
        id="selected-work"
        aria-labelledby="selected-title"
        className="content-shell scroll-mt-28 pb-section"
      >
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            id="selected-title"
            lead="Selected "
            strong="work"
            description={`Projects we've shipped across ${service.title}. Real outcomes, real users.`}
            align="left"
          />
          <Link
            href="/work"
            className="group inline-flex shrink-0 items-center gap-2 text-sm text-white/80 transition-colors hover:text-fg"
          >
            See all case studies
            <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {selected.map((study) => (
            <li key={study.slug}>
              <CaseStudyCard study={study} />
            </li>
          ))}
        </ul>
      </section>

      {/* Built with + other services */}
      <section aria-labelledby="stack-title" className="content-shell pb-section">
        <div className="grid gap-10 rounded-card border border-hairline bg-white/[0.015] p-6 sm:p-8 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 id="stack-title" className="text-micro uppercase text-muted-dim">
              Built with
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
              Industry-standard tools chosen per project, so your team can inherit and extend the
              work.
            </p>
            <ul className="mt-6 flex flex-wrap gap-2">
              {service.stack.map((tool) => (
                <li
                  key={tool}
                  className="rounded-full border border-hairline bg-white/[0.03] px-3 py-1.5 text-xs text-white/75"
                >
                  {tool}
                </li>
              ))}
            </ul>
            <ul className="mt-6 flex flex-wrap gap-2">
              {service.tools.map((tool) => (
                <li
                  key={tool.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-3 py-1.5 text-xs text-muted"
                >
                  <TechIcon id={tool.id} className="h-3.5 w-3.5 opacity-80" />
                  {tool.name}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-micro uppercase text-muted-dim">Other services</h2>
            <ul className="mt-4 divide-y divide-hairline border-y border-hairline">
              {siblings.map((item) => (
                <li key={item.slug}>
                  <Link
                    href={`/services/${item.slug}`}
                    className="group flex items-center justify-between gap-4 py-3.5"
                  >
                    <span className="flex items-baseline gap-3">
                      <span className="font-mono text-xxs text-muted-dim">{item.number}</span>
                      <span className="text-sm text-white/80 transition-colors group-hover:text-fg">
                        {item.title}
                      </span>
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-muted-dim transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-fg" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq-title" className="content-shell pb-section">
        <SectionHeading
          id="faq-title"
          lead="Frequently "
          strong="asked"
          description="Common questions before kicking off a project."
          align="left"
        />
        <div className="mt-10 max-w-3xl">
          <FaqAccordion items={service.faqs} />
          <p className="mt-6 text-sm text-muted">
            Don&apos;t see yours?{" "}
            <Link href="/contact" className="text-fg underline underline-offset-4">
              Ask the team
            </Link>
            .
          </p>
        </div>
      </section>

      <PageCta title={service.ctaHeadline} body={service.ctaBody}>
        <PillButton href="/contact">Start a project</PillButton>
        <PillButton href="/work" tone="outline">
          See all case studies
        </PillButton>
      </PageCta>
    </>
  );
}
