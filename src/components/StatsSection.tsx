"use client";

import React from "react";
import RollingNumber from "./RollingNumber";
import { Award, CheckCircle2, TrendingUp, Clock } from "lucide-react";

export default function StatsSection() {
  return (
    <section className="relative py-16 border-y border-white/[0.08] bg-black/40 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-[11px] font-mono uppercase tracking-widest text-zinc-500 mb-8">
          Studio signals — illustrative operating context, not client guarantees
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-2 text-zinc-400">
              <Award className="w-4 h-4 text-brand-primary" />
              <span className="text-xs uppercase font-mono tracking-wider">Prototypes Shipped</span>
            </div>
            <div className="flex items-baseline text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight">
              <RollingNumber value={74} duration={1800} suffix="+" />
            </div>
            <p className="text-xs text-zinc-400 mt-2">Internal &amp; workshop prototypes across enterprise, fintech &amp; health-themed explorations.</p>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-2 text-zinc-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-xs uppercase font-mono tracking-wider">Workshop NPS</span>
            </div>
            <div className="flex items-baseline text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight">
              <RollingNumber value={99.4} decimals={1} duration={2000} suffix="%" />
            </div>
            <p className="text-xs text-zinc-400 mt-2">Self-reported satisfaction from workshop retros — not a customer study.</p>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-2 text-zinc-400">
              <TrendingUp className="w-4 h-4 text-brand-light" />
              <span className="text-xs uppercase font-mono tracking-wider">Eval Fidelity</span>
            </div>
            <div className="flex items-baseline text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight">
              <RollingNumber value={94.8} decimals={1} duration={2200} suffix="%" />
            </div>
            <p className="text-xs text-zinc-400 mt-2">Example accuracy in synthetic evals — illustrative, not production.</p>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-2 text-zinc-400">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-xs uppercase font-mono tracking-wider">Studio Availability</span>
            </div>
            <div className="flex items-baseline text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight font-mono">
              <span>24/7</span>
            </div>
            <p className="text-xs text-zinc-400 mt-2">Async updates across time zones — demo scheduling, not on-call SLA.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
