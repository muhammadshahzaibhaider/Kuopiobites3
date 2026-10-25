"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LightRays from "@/components/LightRays";
import { ShieldAlert, Mic, Activity } from "lucide-react";

const scenarios = {
  "Executive Pitch": { tremor: "4.2 Hz (demo)", stress: 22 },
  "Incident Call": { tremor: "7.8 Hz (demo)", stress: 68 },
  "Forensic Witness": { tremor: "5.1 Hz (demo)", stress: 41 },
};

export default function VoiceSentimentDemo() {
  const [scenario, setScenario] = useState<keyof typeof scenarios>("Executive Pitch");
  const [bars, setBars] = useState<number[]>(Array.from({ length: 24 }).map(() => 20));

  useEffect(() => {
    const id = setInterval(() => setBars((prev) => prev.map(() => 10 + Math.random() * 80)), 200);
    return () => clearInterval(id);
  }, [scenario]);

  const data = scenarios[scenario];

  return (
    <>
      <Navbar />
      <main id="main-content" className="min-h-screen pt-32 pb-24 relative overflow-hidden bg-[#030303] text-zinc-100">
        <LightRays />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 text-brand-primary text-xs font-mono font-medium mb-4">
              <Mic className="w-3.5 h-3.5" /> Interactive Lab — Synthetic Visualizer
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-4">Voice Sentiment <span className="text-brand-primary">(Demo)</span></h1>
            <p className="text-zinc-400">Animated frequency bars and seeded stress gauges — for interaction design demonstration only. No audio is recorded, no biometric claim is made.</p>
            <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2 text-xs text-amber-200">
              <ShieldAlert className="w-4 h-4 shrink-0" /> No audio capture, no diagnosis. Tremor/stress figures are randomized placeholders.
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8">
              <div className="flex gap-2 mb-6">
                {(Object.keys(scenarios) as Array<keyof typeof scenarios>).map((k) => (
                  <button key={k} onClick={() => setScenario(k)} className={`px-4 py-2 rounded-full text-xs font-medium border ${scenario === k ? "bg-white text-black border-white" : "bg-white/[0.04] text-zinc-400 border-white/[0.08]"}`}>{k}</button>
                ))}
              </div>

              <div className="p-6 rounded-2xl bg-[#08080c] border border-white/[0.08] mb-6">
                <div className="flex items-end gap-1 h-40 mb-4">
                  {bars.map((h, i) => (
                    <div key={i} className="flex-1 bg-brand-primary/80 rounded-t" style={{ height: `${h}%` }} aria-hidden />
                  ))}
                </div>
                <div className="flex items-center gap-6 text-xs font-mono text-zinc-400">
                  <span>Mic: demo visualizer (no input)</span>
                  <span className="flex items-center gap-1"><Activity className="w-3.5 h-3.5" /> Live (simulated)</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
                  <div className="text-xs font-mono text-zinc-400 mb-1">Micro-tremor (Hz)</div>
                  <div className="text-2xl font-mono font-bold text-white">{data.tremor}</div>
                  <div className="text-xs text-zinc-500">Randomized demo value</div>
                </div>
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
                  <div className="text-xs font-mono text-zinc-400 mb-1">Stress Probability</div>
                  <div className="text-2xl font-mono font-bold text-white">{data.stress}%</div>
                  <div className="text-xs text-zinc-500">Seeded per scenario</div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-4">
              <div className="p-6 rounded-2xl glass-panel border border-white/10 sticky top-24">
                <h3 className="text-sm font-semibold text-white mb-2">What this shows</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">This page demonstrates animated spectrum bars and scenario switching. Audio privacy is respected by not capturing any audio — bars animate from random values.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
