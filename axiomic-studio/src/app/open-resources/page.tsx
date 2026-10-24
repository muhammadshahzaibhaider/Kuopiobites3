import type { Metadata } from "next";
import { RESOURCE_GROUPS, RESOURCE_STATS } from "@/lib/data/resources";
import { PageHero } from "@/components/PageHero";
import { PageCta } from "@/components/PageCta";
import { PillButton } from "@/components/PillButton";
import { Reveal } from "@/components/Reveal";
import { ResourceCard } from "@/components/ResourceCard";

export const metadata: Metadata = {
  title: "Open Resources",
  description:
    "Free, production-ready software: templates, apps, agent skills, and tools. MIT licensed where free — ready to use, fork, and deploy.",
};

export default function OpenResourcesPage() {
  const total = RESOURCE_GROUPS.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <>
      <PageHero
        eyebrow="Open resources"
        title={
          <>
            Browse <span className="text-white/40">all.</span>
          </>
        }
        lede="Free, production-ready software built by our team. Templates, apps, and tools — MIT licensed where free, ready to use, fork, and deploy."
        support="Pro templates are paid once; we email the download to the address you use at checkout."
        align="left"
      >
        <dl className="mt-10 flex flex-wrap gap-3">
          {RESOURCE_STATS.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-hairline bg-white/[0.02] px-5 py-3"
            >
              <dt className="text-micro uppercase text-muted-dim">{stat.label}</dt>
              <dd className="mt-1 text-xl font-medium tracking-tight text-fg">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </PageHero>

      <div className="content-shell pb-section">
        <p className="border-t border-hairline pt-6 text-xs text-muted-dim">
          {total} resources · updated quarterly
        </p>

        {RESOURCE_GROUPS.map((group) => (
          <section
            key={group.title}
            aria-labelledby={`group-${group.title.replace(/\s+/g, "-").toLowerCase()}`}
            className="pt-12"
          >
            <div className="flex items-baseline justify-between gap-4">
              <h2
                id={`group-${group.title.replace(/\s+/g, "-").toLowerCase()}`}
                className="text-2xl font-medium tracking-tight text-fg sm:text-3xl"
              >
                {group.title}
              </h2>
              <span className="text-xxs text-muted-dim">{group.items.length}</span>
            </div>
            {group.title === "Pro templates" ? (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
                Premium templates. Pay once; use the email you want the download sent to.
              </p>
            ) : null}

            <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((resource, index) => (
                <li key={resource.slug}>
                  <Reveal delay={Math.min(index, 2) * 0.05}>
                    <ResourceCard resource={resource} />
                  </Reveal>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <PageCta
        title={
          <>
            Need something <span className="text-white/40">custom?</span>
          </>
        }
        body="We build bespoke digital experiences, AI products, and intelligent software for companies that need to stand out."
      >
        <PillButton href="/contact">Work with us</PillButton>
        <PillButton href="/work" tone="outline">
          See our work
        </PillButton>
      </PageCta>
    </>
  );
}
