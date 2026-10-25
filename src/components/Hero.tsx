import React from "react";
import Link from "next/link";
import LightRays from "./LightRays";
import { ArrowRight, Sparkles, ShieldCheck, Zap, Terminal } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative pt-36 pb-20 md:pt-44 md:pb-28 overflow-hidden flex flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-8">
      <LightRays />

      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-panel border border-brand-primary/30 text-zinc-300 text-xs font-mono mb-8 hover:border-brand-primary/60 transition-colors">
        <span className="flex h-2 w-2 relative" aria-hidden>
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-primary" />
        </span>
        <span className="text-zinc-200">Axiom Labs Studio</span>
        <span className="text-zinc-500">•</span>
        <span className="text-brand-primary">Enterprise AI &amp; Systems Architecture</span>
      </div>

      <h1 className="max-w-4xl text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white mb-6 leading-[1.08]">
        Architecting Digital Systems That <span className="bg-gradient-to-r from-white via-zinc-200 to-brand-primary bg-clip-text text-transparent">Think, Scale, and Matter.</span>
      </h1>

      <p className="max-w-2xl text-base sm:text-lg md:text-xl text-zinc-400 mb-10 leading-relaxed font-normal">
        Axiom Labs partners with technology teams to explore sovereign AI patterns, agent orchestration, and precision digital products — through workshops, prototypes, and clear evaluation.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto mb-14">
        <Link
          href="/contact"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-full bg-brand-primary hover:bg-brand-hover text-white text-sm font-semibold transition-all duration-200 shadow-xl shadow-brand-primary/25 hover:shadow-brand-primary/40 hover:-translate-y-0.5"
        >
          <span>Schedule Architecture Review</span> <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          href="/work"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full glass-panel hover:bg-white/[0.08] text-zinc-300 hover:text-white text-sm font-semibold transition-all duration-200 border border-white/10 hover:border-white/20"
        >
          <span>Explore Illustrative Work</span>
        </Link>
      </div>

      <p className="text-[11px] font-mono text-zinc-500 mb-8 max-w-2xl text-center">
        Note: Case studies and metrics on this site are <span className="text-zinc-300">illustrative concepts</span> for demonstration — not verified client results or guarantees. See each dossier for disclaimers.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 max-w-4xl w-full border-t border-white/[0.08] pt-8 text-left">
        {[
          { title: "< 85ms Latency Target", desc: "Example streaming goal in lab — not a SLA", icon: <Zap className="w-4 h-4" /> },
          { title: "Privacy by Design", desc: "No compliance claim — review required", icon: <ShieldCheck className="w-4 h-4" /> },
          { title: "MCP Patterns", desc: "Tool-use exploration", icon: <Terminal className="w-4 h-4" /> },
          { title: "Evaluation First", desc: "Evals over promises", icon: <Sparkles className="w-4 h-4" /> },
        ].map((chip) => (
          <div key={chip.title} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <div className="p-2 rounded-md bg-brand-primary/10 text-brand-primary shrink-0">{chip.icon}</div>
            <div>
              <div className="text-xs font-semibold text-white">{chip.title}</div>
              <div className="text-[11px] text-zinc-400">{chip.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
