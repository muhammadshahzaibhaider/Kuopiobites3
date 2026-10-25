"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LightRays from "@/components/LightRays";
import { ShieldAlert, Activity, Filter } from "lucide-react";

const techniques = [" prompt-injection ", " model-inversion ", " data-exfiltration ", " tool-abuse "];
const logsSeed = [
  { level: "Critical", msg: "Simulated prompt injection attempt on edge gateway (seeded demo)" },
  { level: "Info", msg: "Synthetic WAF rule preview generated — human review required" },
  { level: "AI-Assisted", msg: "Heuristic flag: anomalous tool sequence in sandbox" },
  { level: "Agent-Level", msg: "Sandboxed agent proposed patch — awaiting approval" },
];

export default function ThreatMonitorDemo() {
  const [attacks, setAttacks] = useState(14847);
  const [activeFilter, setActiveFilter] = useState("All");
  const [logs, setLogs] = useState(logsSeed);

  useEffect(() => {
    const id = setInterval(() => setAttacks((a) => a + Math.floor(Math.random() * 5)), 1200);
    const logId = setInterval(() => {
      setLogs((prev) => {
        const next = [...prev];
        next.unshift({ level: ["Critical", "Info", "AI-Assisted", "Agent-Level"][Math.floor(Math.random() * 4)], msg: `Demo event ${Date.now().toString().slice(-4)} — synthetic` });
        return next.slice(0, 20);
      });
    }, 2000);
    return () => { clearInterval(id); clearInterval(logId); };
  }, []);

  const filteredLogs = activeFilter === "All" ? logs : logs.filter((l) => l.level === activeFilter);

  return (
    <>
      <Navbar />
      <main id="main-content" className="min-h-screen pt-32 pb-24 relative overflow-hidden bg-[#030303] text-zinc-100">
        <LightRays />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 text-brand-primary text-xs font-mono font-medium mb-4">
              <Activity className="w-3.5 h-3.5" /> Interactive Lab — Simulated
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-4">ATOM Threat Monitor <span className="text-brand-primary">(Demo)</span></h1>
            <p className="text-zinc-400">Live-updating simulation with seeded telemetry. No real attacks, no real infrastructure — just a responsive UI sketch with synthetic streams. Security claims below are placeholders.</p>
            <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2 text-xs text-amber-200">
              <ShieldAlert className="w-4 h-4 shrink-0" /> This is a simulation. Not a SOC tool, not a certification. Do not use for security decisions.
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8">
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-6 rounded-2xl bg-[#08080c] border border-white/[0.08]">
                  <div className="text-xs font-mono text-zinc-400 mb-1">Demo Threat Counter (simulated)</div>
                  <div className="text-4xl font-extrabold font-mono text-white tabular-nums">{attacks.toLocaleString()}</div>
                  <div className="text-xs text-zinc-500">Attacks / 24h — illustrative counter</div>
                </div>
                <div className="p-6 rounded-2xl bg-[#08080c] border border-white/[0.08]">
                  <div className="text-xs font-mono text-zinc-400 mb-2">MITRE-style Heatmap (mock)</div>
                  <div className="grid grid-cols-4 gap-2">
                    {Array.from({ length: 16 }).map((_, i) => (
                      <div key={i} className="h-10 rounded bg-white/[0.04] border border-white/[0.06] hover:bg-brand-primary/20 transition-colors flex items-center justify-center text-[10px] font-mono text-zinc-400">
                        T{i + 1}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-[#08080c] border border-white/[0.08] overflow-hidden">
                <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">Defense Log (synthetic)</span>
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-zinc-500 hidden sm:block" />
                    {["All", "Critical", "AI-Assisted", "Agent-Level"].map((f) => (
                      <button key={f} onClick={() => setActiveFilter(f)} className={`px-3 py-1.5 rounded-full text-xs border ${activeFilter === f ? "bg-white text-black border-white" : "bg-white/[0.04] text-zinc-400 border-white/[0.08]"}`}>{f}</button>
                    ))}
                  </div>
                </div>
                <div className="max-h-[360px] overflow-y-auto p-4 space-y-2 font-mono text-xs">
                  {filteredLogs.map((log, i) => (
                    <div key={i} className="flex items-start gap-3 p-2 rounded bg-white/[0.02] border border-white/[0.04]">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-zinc-300 shrink-0 mt-0.5">{log.level}</span>
                      <span className="text-zinc-400">{log.msg}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="lg:col-span-4">
              <div className="p-6 rounded-2xl glass-panel border border-white/10 sticky top-24">
                <h3 className="text-sm font-semibold text-white mb-2">How this demo works</h3>
                <p className="text-xs text-zinc-400 leading-relaxed mb-4">All numbers tick on intervals with random increments. Logs are generated locally with no backend. This showcases state and streaming UI patterns — not detection capability.</p>
                <ul className="text-xs text-zinc-400 space-y-1">
                  <li>• Seeded heatmap cells (no real techniques)</li>
                  <li>• Synthetic auto-scrolling log</li>
                  <li>• No network calls, no persistence</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
