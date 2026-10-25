"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { footerLinks } from "@/data/navigation";
import { Clock, ArrowUp, ShieldCheck } from "lucide-react";

export default function Footer() {
  const [timeString, setTimeString] = useState("--:--:--");
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTimeString(now.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer className="relative bg-[#020203] border-t border-white/[0.08] pt-16 pb-12 text-zinc-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="pb-12 mb-12 border-b border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-muted via-brand-primary to-white p-[1px] shadow-lg shadow-brand-primary/20">
              <div className="w-full h-full bg-[#08080a] rounded-[10px] flex items-center justify-center">
                <span className="font-mono font-black text-sm text-white tracking-tighter">AX</span>
              </div>
            </div>
            <div>
              <span className="font-sans font-bold text-lg text-white tracking-tight flex items-center gap-2">
                AXIOM LABS
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.06] text-zinc-400 border border-white/[0.08]">v2.4</span>
              </span>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">Enterprise AI Architecture &amp; Digital Engineering — Demo Site</p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-white/[0.03] border border-white/[0.08] px-4 py-2.5 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" aria-hidden />
              <Clock className="w-4 h-4 text-zinc-400" />
              <span className="text-xs font-mono text-zinc-400">LOCAL TIME</span>
            </div>
            <div className="h-4 w-px bg-white/10" />
            <div className="font-mono font-bold text-sm text-white tabular-nums tracking-wider">{timeString}</div>
            <div className="text-[10px] font-mono text-zinc-400 uppercase">Your Browser</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-16">
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-white font-semibold mb-4">Services</h4>
            <ul className="space-y-2.5 text-xs">
              {footerLinks.services.map((item, idx) => (
                <li key={idx}>
                  <Link href={item.href} className="hover:text-white transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-white font-semibold mb-4">Case Studies</h4>
            <p className="text-[11px] text-zinc-500 mb-3 font-mono">Illustrative — not client results</p>
            <ul className="space-y-2.5 text-xs">
              {footerLinks.work.map((item, idx) => (
                <li key={idx}>
                  <Link href={item.href} className="hover:text-white transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-white font-semibold mb-4">Resources</h4>
            <ul className="space-y-2.5 text-xs">
              {footerLinks.resources.map((item, idx) => (
                <li key={idx}>
                  <Link href={item.href} className="hover:text-white transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-white font-semibold mb-4 flex items-center gap-1.5">
              Demos &amp; Labs <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" aria-hidden />
            </h4>
            <ul className="space-y-2.5 text-xs">
              {footerLinks.demos.map((item, idx) => (
                <li key={idx}>
                  <Link href={item.href} className="hover:text-white transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="col-span-2 md:col-span-1">
            <h4 className="text-xs font-mono uppercase tracking-wider text-white font-semibold mb-4">Company</h4>
            <ul className="space-y-2.5 text-xs mb-6">
              {footerLinks.company.map((item, idx) => (
                <li key={idx}>
                  <Link href={item.href} className="hover:text-white transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-300 mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> No Compliance Claim
              </div>
              <p className="text-[10px] text-zinc-500 leading-normal">
                This demo site makes no SOC2, HIPAA, ISO, or FedRAMP claims. Enterprise use requires independent audit and contracts.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div className="flex flex-wrap items-center gap-2">
            <span>© {new Date().getFullYear()} Axiom Labs — Demo Site. No client relationship implied.</span>
            <span className="text-zinc-700 hidden sm:inline">•</span>
            <span className="text-[11px] font-mono text-zinc-600">All work &amp; metrics shown are illustrative</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              {footerLinks.legal.map((item, idx) => (
                <Link key={idx} href={item.href} className="hover:text-zinc-300 transition-colors">
                  {item.label}
                </Link>
              ))}
            </div>
            <button
              type="button"
              onClick={scrollToTop}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-primary"
              aria-label="Back to top"
            >
              <span>Back to top</span> <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
