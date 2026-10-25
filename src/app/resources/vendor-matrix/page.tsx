"use client";

import React, { useState, useMemo } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LightRays from "@/components/LightRays";
import { vendorPlatforms } from "@/data/vendorMatrix";
import { ArrowUpDown, Download, ShieldAlert } from "lucide-react";

type SortKey = "name" | "medianLatencyMs" | "toolCallingAccuracy";

export default function VendorMatrixPage() {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filter, setFilter] = useState<string>("All");

  const filtered = useMemo(() => {
    let list = [...vendorPlatforms];
    if (filter !== "All") {
      list = list.filter((v) => v.deploymentModels.includes(filter as any));
    }
    list.sort((a, b) => {
      let av: any, bv: any;
      if (sortKey === "medianLatencyMs") {
        av = a.medianLatencyMs; bv = b.medianLatencyMs;
      } else if (sortKey === "toolCallingAccuracy") {
        av = a.toolCallingAccuracy; bv = b.toolCallingAccuracy;
      } else {
        av = a.name; bv = b.name;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [sortKey, sortDir, filter]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const exportCsv = () => {
    const headers = ["Name", "Provider", "Deployment", "Latency(ms) illustrative", "Note"];
    const rows = filtered.map((v) => [v.name, v.provider, v.deploymentModels.join("|"), String(v.medianLatencyMs), v.bestFitFor].map((s) => `"${s.replace(/"/g, '""')}"`).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "axiom-vendor-matrix-illustrative.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Navbar />
      <main id="main-content" className="min-h-screen pt-32 pb-24 relative overflow-hidden bg-[#030303] text-zinc-100">
        <LightRays />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-8">
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-4 leading-tight">AI Vendor Matrix <span className="text-brand-primary">— Illustrative</span></h1>
            <p className="text-zinc-400">An interactive table to explore <em className="text-zinc-200">example</em> deployment models and synthetic latency figures. This is a UI demonstration — not a procurement recommendation or audit.</p>
            <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2 text-xs text-amber-200">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>All values are synthetic placeholders. Verify pricing, limits, compliance, and performance directly with vendors before making decisions. No certification is claimed here.</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-2 flex-wrap">
              {["All", "SaaS", "Dedicated VPC", "On-Prem / Self-Hosted"].map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={`px-3.5 py-2 rounded-full text-xs font-medium border ${filter === f ? "bg-white text-black border-white" : "bg-white/[0.03] text-zinc-400 border-white/[0.08] hover:text-white"}`}>
                  {f}
                </button>
              ))}
            </div>
            <button onClick={exportCsv} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-medium border border-white/10">
              <Download className="w-4 h-4" /> Export CSV (illustrative)
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#08080c]">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.03] border-b border-white/[0.08]">
                <tr className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                  <th className="text-left px-4 py-3">
                    <button onClick={() => toggleSort("name")} className="flex items-center gap-1 hover:text-white">Vendor <ArrowUpDown className="w-3.5 h-3.5" /></button>
                  </th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Provider</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Deployment</th>
                  <th className="text-left px-4 py-3">
                    <button onClick={() => toggleSort("medianLatencyMs")} className="flex items-center gap-1 hover:text-white">Latency (ms) <ArrowUpDown className="w-3.5 h-3.5" /></button>
                  </th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Illustrative Accuracy</th>
                  <th className="text-left px-4 py-3">Fit (Demo)</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr key={v.name} className="border-b border-white/[0.06] hover:bg-white/[0.02]">
                    <td className="px-4 py-4">
                      <div className="font-semibold text-white">{v.name}</div>
                      <div className="text-xs text-zinc-500 font-mono">{v.flagshipModel}</div>
                    </td>
                    <td className="px-4 py-4 text-zinc-300 hidden sm:table-cell">{v.provider}</td>
                    <td className="px-4 py-4 text-zinc-400 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {v.deploymentModels.map((d) => (
                          <span key={d} className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/[0.06] border border-white/10 text-zinc-300">{d}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4 font-mono text-white">{v.medianLatencyMs}<span className="text-zinc-500 text-xs ml-1">ms* demo</span></td>
                    <td className="px-4 py-4 text-zinc-300 hidden lg:table-cell">{v.toolCallingAccuracy}</td>
                    <td className="px-4 py-4 text-zinc-400 text-xs max-w-[240px]">{v.bestFitFor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] font-mono text-zinc-500 mt-4">*Latency is illustrative and not measured. Test your own workload.</p>
        </div>
      </main>
      <Footer />
    </>
  );
}
