import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CASE_STUDIES, getCaseStudy, getNextCaseStudy } from "@/lib/data/caseStudies";
import { PageHero } from "@/components/PageHero";
import { PageCta } from "@/components/PageCta";
import { PillButton } from "@/components/PillButton";
import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { TagPill } from "@/components/CaseStudyCard";
import { ArrowUpRight } from "@/components/icons";

export function generateStaticParams() {
  return CASE_STUDIES.map((study) => ({ slug: study.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const study = getCaseStudy(slug);
  if (!study) return { title: "Case study" };
  return {
    title: study.metaTitle,
    description: study.metaDescription,
    openGraph: { title: `${study.name} — Case Study`, images: [{ url: study.image }] },
  };
}

export default async function CaseStudyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const study = getCaseStudy(slug);
  if (!study) notFound();

  const next = getNextCaseStudy(study.slug);

  return (
    <>
      <PageHero
        eyebrow={`Case study · ${study.number}`}
        title={study.headline}
        lede={study.tagline}
        align="left"
      >
        <div className="mt-6 flex flex-wrap gap-1.5">
          {study.tags.map((tag) => (
            <TagPill key={tag}>{tag}</TagPill>
          ))}
        </div>
      </PageHero>

      {/* Hero image */}
      <div className="content-shell">
        <Reveal>
          <div className="relative aspect-[16/9] overflow-hidden rounded-preview border border-hairline bg-ink-soft">
            <Image
              src={study.heroImage}
              alt={`${study.name} project hero`}
              fill
              priority
              sizes="(min-width: 1280px) 1216px, 100vw"
              className="object-cover"
            />
          </div>
        </Reveal>
      </div>

      {/* Summary + meta */}
      <section aria-labelledby="summary-title" className="content-shell py-section">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-16">
          <Reveal>
            <h2 id="summary-title" className="text-micro uppercase text-muted-dim">
              Summary
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/75 sm:text-xl">
              {study.summary}
            </p>
          </Reveal>

          <Reveal delay={0.08}>
            <dl className="grid gap-7 border-t border-hairline pt-6 sm:grid-cols-2 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
              <Meta label="Tech stack">
                <ul className="flex flex-wrap gap-1.5">
                  {study.tech.map((item) => (
                    <li key={item}>
                      <TagPill>{item}</TagPill>
                    </li>
                  ))}
                </ul>
              </Meta>
              <Meta label="Length of project">
                <p className="text-sm text-white/75">{study.duration}</p>
              </Meta>
              <Meta label="Focus areas">
                <ul className="flex flex-col gap-1.5">
                  {study.focusAreas.map((item) => (
                    <li key={item} className="text-sm text-white/75">
                      {item}
                    </li>
                  ))}
                </ul>
              </Meta>
              <Meta label="Engagement">
                <p className="text-sm text-white/75">{study.engagement}</p>
              </Meta>
            </dl>
          </Reveal>
        </div>
      </section>

      {/* Narrative sections */}
      <section aria-labelledby="impact-title" className="content-shell pb-section">
        <SectionHeading id="impact-title" lead="Built for " strong="impact" align="left" />
        <div className="mt-12 flex flex-col gap-16 sm:gap-20">
          {study.sections.map((section, index) => (
            <Reveal key={section.title} delay={0.04}>
              <article className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
                <div className={index % 2 === 1 ? "lg:order-2" : undefined}>
                  <h3 className="text-2xl font-medium tracking-tight text-fg sm:text-3xl">
                    {section.title}
                  </h3>
                  <p className="mt-4 max-w-lg text-base leading-relaxed text-muted">
                    {section.body}
                  </p>
                </div>
                {section.image ? (
                  <div
                    className={`relative aspect-[16/11] overflow-hidden rounded-preview border border-hairline bg-ink-soft ${
                      index % 2 === 1 ? "lg:order-1" : ""
                    }`}
                  >
                    <Image
                      src={section.image}
                      alt={`${study.name}: ${section.title}`}
                      fill
                      sizes="(min-width: 1024px) 560px, 100vw"
                      className="object-cover"
                    />
                  </div>
                ) : null}
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Key stats */}
      <section aria-labelledby="stats-title" className="content-shell pb-section">
        <SectionHeading id="stats-title" lead="Key " strong="stats" align="left" />
        <dl className="mt-10 grid gap-px overflow-hidden rounded-card border border-hairline bg-hairline sm:grid-cols-3">
          {study.stats.map((stat) => (
            <div key={stat.title} className="bg-ink p-6 sm:p-8">
              <dt className="text-lg font-medium tracking-tight text-fg">{stat.title}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-muted">{stat.body}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* How it works */}
      <section aria-labelledby="build-title" className="content-shell pb-section">
        <SectionHeading
          id="build-title"
          lead="How it "
          strong="works"
          description="The build."
          align="left"
        />
        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {study.howItWorks.map((step, index) => (
            <Reveal key={step.title} delay={index * 0.06}>
              <li className="h-full rounded-card border border-hairline bg-white/[0.015] p-6">
                <p className="font-mono text-xxs text-muted-dim">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-3 text-lg font-medium tracking-tight text-fg">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* Next project */}
      <section className="content-shell pb-section" aria-labelledby="next-title">
        <div className="border-t border-hairline pt-8">
          <h2 id="next-title" className="text-micro uppercase text-muted-dim">
            Next project
          </h2>
          <Link
            href={`/case-study/${next.slug}`}
            className="group mt-5 grid gap-6 rounded-card border border-hairline bg-white/[0.015] p-3 transition-colors duration-300 hover:border-hairline-strong hover:bg-white/[0.04] sm:grid-cols-[1fr_320px] sm:items-center"
          >
            <div className="order-2 p-4 sm:order-1">
              <h3 className="text-2xl font-medium tracking-tight text-fg sm:text-3xl">{next.name}</h3>
              <p className="mt-2 text-sm text-muted">{next.tagline}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm text-white/80">
                View case study
                <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </span>
            </div>
            <div className="relative order-1 aspect-[16/10] overflow-hidden rounded-2xl bg-ink-soft sm:order-2">
              <Image
                src={next.image}
                alt=""
                fill
                sizes="320px"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              />
            </div>
          </Link>
        </div>
      </section>

      <PageCta
        title={
          <>
            Have a similar <span className="text-white/40">challenge?</span>
          </>
        }
        body="Tell us where you're stuck. We'll tell you how we'd approach it — and whether it's a fit."
      >
        <PillButton href="/contact">Start a Project</PillButton>
        <PillButton href="/work" tone="outline">
          See all work
        </PillButton>
      </PageCta>
    </>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-micro uppercase text-muted-dim">{label}</dt>
      <dd className="mt-3">{children}</dd>
    </div>
  );
}
