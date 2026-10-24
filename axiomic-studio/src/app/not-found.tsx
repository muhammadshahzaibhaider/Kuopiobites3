import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { PillButton } from "@/components/PillButton";
import { ArrowUpRight } from "@/components/icons";
import { SERVICES } from "@/lib/data/services";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <>
      <PageHero
        eyebrow="404"
        title={
          <>
            Off the <span className="text-white/40">map.</span>
          </>
        }
        lede="That page doesn't exist — or it moved. Try one of these instead."
        actions={
          <>
            <PillButton href="/">Back home</PillButton>
            <PillButton href="/work" tone="outline">
              See our work
            </PillButton>
          </>
        }
      />

      <div className="content-shell pb-section">
        <div className="border-t border-hairline pt-8">
          <p className="text-micro uppercase text-muted-dim">Popular pages</p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((service) => (
              <li key={service.slug}>
                <Link
                  href={`/services/${service.slug}`}
                  className="group flex items-center justify-between gap-3 rounded-xl border border-hairline px-4 py-3 text-sm text-white/80 transition-colors hover:border-hairline-strong hover:bg-white/[0.04] hover:text-fg"
                >
                  {service.title}
                  <ArrowUpRight className="h-4 w-4 text-muted-dim transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
