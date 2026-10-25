import React from "react";
import Link from "next/link";
import { clientsData } from "@/data/clients";
import { ArrowUpRight, TrendingUp } from "lucide-react";

export default function CaseStudies() {
  const featured = clientsData.slice(0, 6);
  return (
    <section id="work" className="py-24 sm:py-32 relative border-t border-white/[0.08] bg-[#020202]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 text-brand-primary text-xs font-mono font-medium mb-4">
              <span>ILLUSTRATIVE WORK</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">Systems We Use to Teach &amp; Learn.</h2>
            <p className="mt-3 text-base text-zinc-400">
              All dossiers below are <span className="text-zinc-200">synthetic demonstrations</span> of architecture storytelling — not audited client results. Click any card for full disclaimer and concept breakdown.
            </p>
          </div>
          <Link
            href="/work"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-sm text-white transition-colors shrink-0"
          >
            View All Case Studies <TrendingUp className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featured.map((project) => (
            <Link
              key={project.id}
              href={`/work/${project.slug}`}
              className="group relative rounded-2xl overflow-hidden bg-white/[0.03] border border-white/[0.08] hover:border-brand-primary/30 hover:bg-white/[0.05] transition-all p-6 flex flex-col justify-between hover:-translate-y-1"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="text-xs font-mono font-semibold text-white px-2.5 py-1 rounded bg-white/[0.08] border border-white/10">{project.client}</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-brand-primary/10 text-brand-primary border border-brand-primary/20">{project.category}</span>
                </div>
                <div className="p-3 rounded-xl bg-[#09090d] border border-white/[0.06] mb-4 flex items-baseline justify-between">
                  <div>
                    <span className="text-2xl font-extrabold font-mono text-white">{project.impactMetric}</span>
                    <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">{project.impactLabel}</p>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-amber-300 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">Illustrative</span>
                </div>
                <h3 className="text-base font-bold text-white mb-2 group-hover:text-brand-primary transition-colors flex items-center justify-between gap-2">
                  {project.title}
                  <ArrowUpRight className="w-4 h-4 text-zinc-400 group-hover:text-brand-primary" />
                </h3>
                <p className="text-sm text-zinc-400 line-clamp-2 leading-relaxed mb-4">{project.summary}</p>
              </div>
              <div className="pt-4 border-t border-white/[0.06] flex flex-wrap gap-1.5">
                {project.techStack.slice(0, 3).map((tech, i) => (
                  <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-zinc-300 border border-white/[0.06]">
                    {tech}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
