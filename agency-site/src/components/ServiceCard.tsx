import Link from "next/link";
import type { Service } from "@/lib/content";
import { TechIcon } from "./TechIcon";
import { Reveal } from "./Reveal";
import { ArrowUpRight } from "./icons";

export function ServiceCard({ service, index }: { service: Service; index: number }) {
  return (
    <Reveal delay={index * 0.05}>
      <Link
        id={service.slug}
        href={service.href}
        className="group relative block scroll-mt-28 rounded-card border border-hairline bg-white/[0.015] p-6 transition-[background-color,border-color,box-shadow,transform] duration-300 ease-expo hover:-translate-y-0.5 hover:border-hairline-strong hover:bg-white/[0.035] hover:shadow-glow sm:p-8 lg:p-10"
      >
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            <div className="flex items-start justify-between gap-4">
              <span className="font-mono text-xxs text-muted-dim">{service.number}</span>
              <span className="grid h-9 w-9 place-items-center rounded-full border border-hairline text-muted transition-colors duration-300 group-hover:border-white/30 group-hover:text-fg">
                <ArrowUpRight className="h-4 w-4 transition-transform duration-300 ease-expo group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </div>

            <h3 className="mt-5 text-2xl font-medium tracking-tight text-fg transition-transform duration-300 ease-expo group-hover:translate-x-1 sm:text-3xl lg:text-4xl">
              {service.title}
            </h3>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted">{service.description}</p>

            <div className="mt-7">
              <p className="text-micro uppercase text-white/35">Services</p>
              <ul className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                {service.services.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-white/70">
                    <span
                      aria-hidden
                      className="mt-2 h-1 w-1 shrink-0 rounded-full bg-white/30 transition-colors duration-300 group-hover:bg-glow/80"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-col justify-end lg:col-span-5">
            <p className="text-micro uppercase text-white/35">Tools</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {service.tools.map((tool) => (
                <li
                  key={tool.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-white/[0.03] px-3 py-1.5 text-xs text-muted transition-colors duration-300 group-hover:border-white/15 group-hover:text-white/80"
                >
                  <TechIcon id={tool.id} className="h-3.5 w-3.5 opacity-80" />
                  {tool.name}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Link>
    </Reveal>
  );
}
