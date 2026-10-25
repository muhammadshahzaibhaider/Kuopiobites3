"use client";

import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LightRays from "@/components/LightRays";
import { ShieldAlert, SlidersHorizontal } from "lucide-react";

const mockAccounts = [
  { name: "Atlas Robotics (Demo)", signals: ["Pricing page revisit", "API docs viewed 8×", "Team invite sent"], intent: 92 },
  { name: "Nimbus Health (Demo)", signals: ["Comparison blog read", "Demo video 70% watched"], intent: 67 },
  { name: "Forge Capital (Demo)", signals: ["Security whitepaper opened"], intent: 54 },
];

export default function IntentIqDemo() {
  const [threshold, setThreshold] = useState(70);
  const filtered = mockAccounts.filter((a) => a.intent >= threshold);
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <>
      <Navbar />
      <main id="main-content" className="min-h-screen pt-32 pb-24 relative overflow-hidden bg-[#030303] text-zinc-100">
        <LightRays />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 text-brand-primary text-xs font-mono font-medium mb-4">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Interactive Lab — Mock Pipeline
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-4">Buyer Intent IQ <span className="text-brand-primary">(Demo)</span></h1>
            <p className="text-zinc-400">Adjust sensitivity to filter dummy accounts by synthetic intent scores. No real leads are used or contacted.</p>
            <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2 text-xs text-amber-200">
              <ShieldAlert className="w-4 h-4 shrink-0" /> Illustrative pipeline only. Scores are fabricated for UI exploration.
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7">
              <div className="p-6 rounded-2xl bg-[#08080c] border border-white/[0.08] mb-8">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">Sensitivity Threshold</span>
                  <span className="text-sm font-mono text-white">{threshold}</span>
                </div>
                <input type="range" min={50} max={100} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className="w-full accent-brand-primary" aria-label="Intent threshold" />
                <p className="text-xs text-zinc-500 mt-2">Showing {filtered.length} of {mockAccounts.length} demo accounts at ≥ {threshold}</p>
              </div>

              <div className="space-y-4">
                {filtered.map((acct) => (
                  <div key={acct.name} className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{acct.name}</h3>
                      <ul className="mt-2 space-y-1">
                        {acct.signals.map((s, i) => (
                          <li key={i} className="text-xs text-zinc-400">• {s}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-2xl font-mono font-bold text-white">{acct.intent}</div>
                      <div className="text-[11px] font-mono text-zinc-400">Intent Score</div>
                      <button
                        onClick={() => setDraft(`Hi ${acct.name} team — based on your recent ${acct.signals[0].toLowerCase()}, here is a quick note on evaluation patterns for your stack. (Demo draft — not sent.)`)}
                        className="mt-3 px-3 py-1.5 rounded-full bg-white text-black text-xs font-semibold"
                      >
                        Draft Outreach
                      </button>
                    </div>
                  </div>
                ))}
                {filtered.length === 0 && <div className="p-8 rounded-2xl border border-white/[0.08] text-center text-zinc-500 text-sm">No demo accounts above this threshold. Try lowering it.</div>}
              </div>
            </div>
            <div className="lg:col-span-5">
              <div className="p-6 rounded-2xl glass-panel border border-white/10 sticky top-24">
                <h3 className="text-sm font-semibold text-white mb-2">Generated Draft (Demo)</h3>
                {draft ? (
                  <div className="p-4 rounded-xl bg-black/40 border border-white/10 text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">{draft}</div>
                ) : (
                  <p className="text-xs text-zinc-400">Select “Draft Outreach” to see a templated note (not sent, not personalized beyond the demo).</p>
                )}
                <p className="text-[11px] text-zinc-500 mt-4">No email is sent from this page. This simulates composition only.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
