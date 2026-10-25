"use client";

import React, { useState, useMemo } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LightRays from "@/components/LightRays";
import { Search, ShieldAlert, Clock } from "lucide-react";

const corpus = [
  { text: "Private RAG pipeline with Qdrant and hybrid retrieval — demo pattern", category: "Architecture", score: 0.92 },
  { text: "Evaluation harness for prompt regressions — demo checklist", category: "Evaluation", score: 0.88 },
  { text: "Next.js App Router streaming with server components — demo outline", category: "Engineering", score: 0.84 },
  { text: "MCP tool contracts for bounded agent access — demo sketch", category: "Agents", score: 0.87 },
];

export default function VectorSearchDemo() {
  const [query, setQuery] = useState("RAG");
  const [cat, setCat] = useState<string>("All");
  const start = performance.now();
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    let list = corpus;
    if (cat !== "All") list = list.filter((c) => c.category === cat);
    if (q) list = list.filter((c) => c.text.toLowerCase().includes(q) || c.category.toLowerCase().includes(q));
    // fake timing: 18-35ms
    return list;
  }, [query, cat]);
  const latency = (18 + Math.random() * 17).toFixed(1);

  return (
    <>
      <Navbar />
      <main id="main-content" className="min-h-screen pt-32 pb-24 relative overflow-hidden bg-[#030303] text-zinc-100">
        <LightRays />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 text-brand-primary text-xs font-mono font-medium mb-4">
              <Search className="w-3.5 h-3.5" /> Interactive Lab — Mock Search
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-4">Vector Search <span className="text-brand-primary">(Demo)</span></h1>
            <p className="text-zinc-400">Type to filter a tiny synthetic corpus. Latency readout is a randomized timer for visual effect — not a benchmark.</p>
            <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2 text-xs text-amber-200">
              <ShieldAlert className="w-4 h-4 shrink-0" /> Illustrative search only. No embeddings or vector DB are queried.
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8">
              <div className="p-4 rounded-2xl bg-[#08080c] border border-white/[0.08] mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <Search className="w-4 h-4 text-zinc-500" />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search demo corpus…" className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-zinc-500" />
                  <span className="text-xs font-mono text-zinc-400 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {latency} ms (demo timer)</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {["All", "Architecture", "Evaluation", "Engineering", "Agents"].map((c) => (
                    <button key={c} onClick={() => setCat(c)} className={`px-3 py-1.5 rounded-full text-xs border ${cat === c ? "bg-white text-black border-white" : "bg-white/[0.04] text-zinc-400 border-white/[0.08]"}`}>{c}</button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {filtered.map((r, i) => (
                  <div key={i} className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm text-white">{r.text}</div>
                      <div className="text-xs font-mono text-zinc-500 mt-1">{r.category}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-mono font-bold text-white">{(r.score * 100).toFixed(1)}%</div>
                      <div className="text-[11px] font-mono text-zinc-400">cosine (demo)</div>
                    </div>
                  </div>
                ))}
                {filtered.length === 0 && <div className="p-8 rounded-2xl border border-white/[0.08] text-center text-zinc-500 text-sm">No demo results for “{query}”.</div>}
              </div>
            </div>
            <div className="lg:col-span-4">
              <div className="p-6 rounded-2xl glass-panel border border-white/10 sticky top-24">
                <h3 className="text-sm font-semibold text-white mb-2">How this demo works</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">Search is a client-side substring filter. Latency is a random number to mimic a stopwatch — no model inference occurs. Use this to discuss UX for real retrieval, not to evaluate a model.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
