import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SERVICES } from "@/lib/data/services";
import { PageHero } from "@/components/PageHero";
import { PageCta } from "@/components/PageCta";
import { PillButton } from "@/components/PillButton";
import { Reveal } from "@/components/Reveal";
import { TechIcon } from "@/components/TechIcon";
import { ArrowUpRight } from "@/components/icons";

export const metadata: Metadata = {
  title: "Services",
  description:
    "UI/UX design, website design, web development, AI development, AI agents, and healthcare apps — one team, end to end.",
};

export default function ServicesIndexPage() {
  return (
    <>
      <PageHero
        eyebrow="Services"
        title={
          <>
            Six ways we <span className="text-white/40">help.</span>
          </>
        }
        lede="Design, engineering, and AI in one team. Start anywhere — most projects touch at least three of these."
        align="left"
      />

      <div className="content-shell pb-section">
        <ul className="grid gap-5 md:grid-cols-2">
          {SERVICES.map((service, index) => (
            <li key={service.slug}>
              <Reveal delay={Math.min(index, 3) * 0.05}>
                <Link
                  href={`/services/${service.slug}`}
                  className="group flex h-full flex-col gap-5 rounded-card border border-hairline bg-white/[0.015] p-6 transition-[background-color,border-color,transform] duration-300 ease-expo hover:-translate-y-1 hover:border-hairline-strong hover:bg-white/[0.04] sm:p-8"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="font-mono text-xxs text-muted-dim">{service.number}</span>
                    <span className="grid h-9 w-9 place-items-center rounded-full border border-hairline text-muted transition-colors duration-300 group-hover:border-white/30 group-hover:text-fg">
                      <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-medium tracking-tight text-fg">{service.title}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{service.description}</p>
                  </div>
                  <ul className="flex flex-wrap gap-2">
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
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>

        <div className="mt-10 overflow-hidden rounded-card border border-hairline">
          <div className="relative aspect-[21/9]">
            <Image
              src="/images/light-arc.jpg"
              alt=""
              fill
              sizes="(min-width: 1280px) 1216px, 100vw"
              className="object-cover opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-micro uppercase text-white/50">Not sure where to start?</p>
              <p className="max-w-md text-lg text-fg">
                Send us the problem. We&apos;ll tell you which of these you actually need.
              </p>
            </div>
          </div>
        </div>
      </div>

      <PageCta
        title={
          <>
            One team, <span className="text-white/40">end to end.</span>
          </>
        }
        body="Design and engineering sit together here, so nothing gets lost between them."
      >
        <PillButton href="/contact">Start Your Project</PillButton>
        <PillButton href="/work" tone="outline">
          See our work
        </PillButton>
      </PageCta>
    </>
  );
}
