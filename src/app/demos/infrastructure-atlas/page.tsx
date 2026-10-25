"use client";

import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LightRays from "@/components/LightRays";
import { Map, ShieldAlert, Search } from "lucide-react";

const nodes = [
  { id: "ashburn", name: "Ashburn (Demo)", region: "US-East", power: "Illustrative 12MW", ping: 42 },
  { id: "sv", name: "Silicon Valley (Demo)", region: "US-West", power: "Illustrative 10MW", ping: 18 },
  { id: "frankfurt", name: "Frankfurt (Demo)", region: "EU-Central", power: "Illustrative 14MW", ping: 88 },
  { id: "london", name: "London (Demo)", region: "EU-West", power: "Illustrative 9MW", ping: 74 },
  { id: "tokyo", name: "Tokyo (Demo)", region: "AP-East", power: "Illustrative 11MW", ping: 142 },
  { id: "singapore", name: "Singapore (Demo)", region: "AP-South", power: "Illustrative 8MW", ping: 156 },
];

export default function InfraAtlasDemo() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<(typeof nodes)[0] | null>(null);
  const filtered = nodes.filter((n) => n.name.toLowerCase().includes(query.toLowerCase()) || n.region.toLowerCase().includes(query.toLowerCase()));

  return (
    <>
      <Navbar />
      <main id="main-content" className="min-h-screen pt-32 pb-24 relative overflow-hidden bg-[#030303] text-zinc-100">
        <LightRays />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 text-brand-primary text-xs font-mono font-medium mb-4">
              <Map className="w-3.5 h-3.5" /> Interactive Lab — Mock Map
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-4">Infrastructure Atlas <span className="text-brand-primary">(Demo)</span></h1>
            <p className="text-zinc-400">Explore illustrative data center nodes and synthetic ping calculations. No real locations, power figures, or fiber routes are asserted.</p>
            <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2 text-xs text-amber-200">
              <ShieldAlert className="w-4 h-4 shrink-0" /> All nodes and metrics are fabricated for layout demonstration. Do not use for planning.
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7">
              <div className="p-4 rounded-2xl bg-[#08080c] border border-white/[0.08] mb-6 flex items-center gap-3">
                <Search className="w-4 h-4 text-zinc-500" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter demo nodes… (e.g., Tokyo, EU, Ashburn)" className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-zinc-500" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filtered.map((n) => (
                  <button key={n.id} onClick={() => setSelected(n)} className={`text-left p-5 rounded-2xl border transition-all ${selected?.id === n.id ? "bg-brand-primary/10 border-brand-primary/30" : "bg-white/[0.02] border-white/[0.08] hover:border-white/[0.15]"}`}>
                    <div className="text-sm font-semibold text-white">{n.name}</div>
                    <div className="text-xs font-mono text-zinc-400">{n.region}</div>
                    <div className="mt-3 flex items-center gap-2 text-xs">
                      <span className="px-2 py-1 rounded bg-white/[0.06] border border-white/10 text-zinc-300">Ping {n.ping}ms (demo)</span>
                      <span className="text-zinc-500">{n.power}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="lg:col-span-5">
              <div className="p-6 rounded-2xl glass-panel border border-white/10 sticky top-24 min-h-[280px]">
                {selected ? (
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">{selected.name}</h3>
                    <p className="text-xs text-zinc-400">Region: <span className="text-zinc-200">{selected.region}</span></p>
                    <p className="text-xs text-zinc-400 mt-1">Power (illustrative): {selected.power}</p>
                    <p className="text-xs text-zinc-400 mt-1">Live ping: <span className="font-mono text-white">{(selected.ping + Math.random() * 4).toFixed(1)} ms</span> — randomized demo</p>
                    <div className="mt-6 p-3 rounded-xl bg-black/40 border border-white/10 text-xs text-zinc-300">
                      Fiber route sketch: clickable line shows seeded path; no real-world route is implied.
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-400">Select a demo node to see its illustrative details and randomized ping.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
