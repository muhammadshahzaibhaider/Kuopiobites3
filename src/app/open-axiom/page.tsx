"use client";

import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LightRays from "@/components/LightRays";
import { openSourceItems, openSourceCategories } from "@/data/openSource";
import { Copy, Check, Star, GitFork, Code2, ShieldAlert } from "lucide-react";

export default function OpenAxiomPage() {
  const [active, setActive] = useState<string>("All");
  const [copied, setCopied] = useState<string | null>(null);
  const filtered = active === "All" ? openSourceItems : openSourceItems.filter((i) => i.category === active);

  const copy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <>
      <Navbar />
      <main id="main-content" className="min-h-screen pt-32 pb-24 relative overflow-hidden bg-[#030303] text-zinc-100">
        <LightRays />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 text-brand-primary text-xs font-mono font-medium mb-4">
              <Code2 className="w-3.5 h-3.5" /> Open Axiom — Templates & Sketches
            </div>
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-4">Starter Kits for Workshops</h1>
            <p className="text-zinc-400">Templates, UI kits, and agent sketches for learning and prototyping. All projects are <strong className="text-zinc-200">demo quality</strong> — review, test, and adapt before any production use.</p>
            <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2 text-xs text-amber-200">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Not audited or supported software. Verify behavior, dependencies, and privacy in your environment. Use at your own risk as educational material.</span>
            </div>
          </div>

          <div className="flex items-center gap-2 border-b border-white/[0.08] pb-6 mb-12 overflow-x-auto no-scrollbar">
            {openSourceCategories.map((cat) => (
              <button key={cat} onClick={() => setActive(cat)} className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap ${active === cat ? "bg-white text-black" : "bg-white/[0.03] text-zinc-400 border border-white/[0.06] hover:text-white"}`}>
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((item) => (
              <div key={item.id} className="rounded-2xl glass-panel p-6 border border-white/10 flex flex-col justify-between hover:border-brand-primary/30 transition-all hover:-translate-y-1">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-zinc-300">{item.category}</span>
                    {item.featured && <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-primary/20 text-brand-primary">Featured</span>}
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed mb-4">{item.description}</p>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {item.techStack.map((t, i) => (
                      <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-zinc-300 border border-white/[0.06]">{t}</span>
                    ))}
                  </div>
                </div>
                <div className="pt-4 border-t border-white/[0.06]">
                  {item.installCommand && (
                    <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-black/40 border border-white/10 mb-3">
                      <code className="text-xs font-mono text-zinc-300 truncate">{item.installCommand}</code>
                      <button onClick={() => copy(item.installCommand!, item.id)} className="p-1.5 rounded bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300" aria-label="Copy install command">
                        {copied === item.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5" /> {item.stars}</span>
                      <span className="flex items-center gap-1"><GitFork className="w-3.5 h-3.5" /> {item.forks}</span>
                      <span className="px-1.5 py-0.5 rounded bg-white/[0.06] text-zinc-300">{item.license}</span>
                    </div>
                    <a href={item.githubUrl} target="_blank" rel="noreferrer" className="text-brand-primary hover:text-white">GitHub →</a>
                  </div>
                  <p className="text-[11px] text-amber-300/70 mt-3">{item.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
