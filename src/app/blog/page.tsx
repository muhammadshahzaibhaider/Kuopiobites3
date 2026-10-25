"use client";

import React, { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LightRays from "@/components/LightRays";
import { blogPosts, blogCategories } from "@/data/blog";
import { FileText, Clock, ArrowUpRight } from "lucide-react";

export default function BlogIndex() {
  const [active, setActive] = useState<string>("All");
  const filtered = active === "All" ? blogPosts : blogPosts.filter((p) => p.category === active);
  return (
    <>
      <Navbar />
      <main id="main-content" className="min-h-screen pt-32 pb-24 relative overflow-hidden bg-[#030303] text-zinc-100">
        <LightRays />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 text-brand-primary text-xs font-mono font-medium mb-4">
              <FileText className="w-3.5 h-3.5" /> Technical Notes — Educational
            </div>
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-4">Patterns &amp; Field Notes</h1>
            <p className="text-zinc-400">Short, practical posts on orchestration, evals, and engineering tradeoffs — for workshop discussion, not prescriptions. All content is illustrative.</p>
          </div>

          <div className="flex items-center gap-2 border-b border-white/[0.08] pb-6 mb-12 overflow-x-auto no-scrollbar">
            {blogCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActive(cat)}
                className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap ${active === cat ? "bg-white text-black" : "bg-white/[0.03] text-zinc-400 border border-white/[0.06] hover:text-white"}`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {filtered.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group p-8 rounded-2xl glass-panel border border-white/10 hover:border-brand-primary/30 hover:bg-white/[0.04] transition-all hover:-translate-y-1"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary">{post.category}</span>
                  <span className="text-xs font-mono text-zinc-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> {post.readingTime}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white group-hover:text-brand-primary mb-3 flex items-start justify-between gap-2">
                  {post.title} <ArrowUpRight className="w-5 h-5 text-zinc-500 group-hover:text-brand-primary shrink-0" />
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed mb-4">{post.excerpt}</p>
                <div className="text-xs text-zinc-500 font-mono">{post.author} • {post.date}</div>
                <p className="text-[11px] text-amber-300/80 mt-3">{post.disclaimer}</p>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
