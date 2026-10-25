"use client";

import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LightRays from "@/components/LightRays";
import { ShieldAlert, Sparkles } from "lucide-react";

function analyze(text: string) {
  const lower = text.toLowerCase();
  let positive = 0.25,
    urgency = 0.2,
    skepticism = 0.1,
    neutral = 0.45;
  if (lower.includes("urgent") || lower.includes("asap") || lower.includes("critical")) urgency += 0.5;
  if (lower.includes("love") || lower.includes("great") || lower.includes("excited")) positive += 0.4;
  if (lower.includes("doubt") || lower.includes("skeptical") || lower.includes("concern")) skepticism += 0.5;
  const sum = positive + urgency + skepticism + neutral;
  return {
    Positive: positive / sum,
    Urgency: urgency / sum,
    Skepticism: skepticism / sum,
    Neutral: neutral / sum,
  };
}

const presets = {
  "Enterprise Handover": "We are excited to move forward, but need to address security concerns urgently before sign-off.",
  "Support Escalation": "This is urgent — downtime is affecting our team and we need a clear plan ASAP.",
  "Exploratory Note": "Interesting approach. We have some skepticism about scalability, but open to a pilot.",
};

export default function EmotionAiDemo() {
  const [text, setText] = useState<string>(presets["Enterprise Handover"]);
  const scores = analyze(text);

  return (
    <>
      <Navbar />
      <main id="main-content" className="min-h-screen pt-32 pb-24 relative overflow-hidden bg-[#030303] text-zinc-100">
        <LightRays />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 text-brand-primary text-xs font-mono font-medium mb-4">
              <Sparkles className="w-3.5 h-3.5" /> Interactive Lab — Heuristic Visualizer
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-4">Emotion AI <span className="text-brand-primary">(Demo)</span></h1>
            <p className="text-zinc-400">Paste any text to see a simple heuristic mood breakdown — keyword spotting + normalization for demo radar visuals. Not a model, not a diagnosis.</p>
            <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2 text-xs text-amber-200">
              <ShieldAlert className="w-4 h-4 shrink-0" /> This is a rule-based mock for interaction design — not sentiment AI, not validated on real data.
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7">
              <div className="p-6 rounded-2xl bg-[#08080c] border border-white/[0.08] mb-6">
                <div className="flex gap-2 flex-wrap mb-4">
                  {Object.keys(presets).map((k) => (
                    <button key={k} onClick={() => setText((presets as any)[k])} className="px-3 py-1.5 rounded-full text-xs bg-white/[0.04] text-zinc-300 border border-white/[0.08] hover:text-white">
                      {k}
                    </button>
                  ))}
                </div>
                <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="Type or paste text…" className="w-full p-4 rounded-xl bg-white/[0.03] border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-brand-primary" />
              </div>

              <div className="p-6 rounded-2xl glass-panel border border-white/10">
                <h3 className="text-sm font-semibold text-white mb-4">Radar Breakdown (demo heuristics)</h3>
                <div className="space-y-3">
                  {Object.entries(scores).map(([k, v]) => (
                    <div key={k}>
                      <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-1">
                        <span>{k}</span> <span className="text-white">{(v * 100).toFixed(1)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                        <div className="h-full bg-brand-primary" style={{ width: `${v * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="lg:col-span-5">
              <div className="p-6 rounded-2xl glass-panel border border-white/10 sticky top-24">
                <h3 className="text-sm font-semibold text-white mb-2">How this works</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">Keywords like “urgent”, “love”, and “skeptical” adjust demo weights. Scores are normalized heuristics for visual exploration — not trained weights or validated psychology.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
