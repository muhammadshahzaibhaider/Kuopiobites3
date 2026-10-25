"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { servicesData } from "@/data/services";
import { headerNavLinks } from "@/data/navigation";
import { Menu, X, ChevronDown, ArrowRight, Sparkles, Cpu, Bot, Globe, Layout, Cloud, Shield } from "lucide-react";

const iconMap: Record<string, React.ReactNode> = {
  Layout: <Layout className="w-5 h-5 text-brand-primary" />,
  Globe: <Globe className="w-5 h-5 text-brand-primary" />,
  Cpu: <Cpu className="w-5 h-5 text-brand-primary" />,
  Bot: <Bot className="w-5 h-5 text-brand-primary" />,
  Shield: <Shield className="w-5 h-5 text-brand-primary" />,
  Cloud: <Cloud className="w-5 h-5 text-brand-primary" />,
};

export default function Navbar() {
  const [megaOpen, setMegaOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMegaOpen(false);
        setResourcesOpen(false);
        setMobileOpen(false);
      }
    };
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setMegaOpen(false);
        setResourcesOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, []);

  return (
    <header
      ref={ref}
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-[#030303]/90 backdrop-blur-md border-b border-white/[0.08] py-3 shadow-2xl shadow-black/80" : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50 rounded-lg"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-muted via-brand-primary to-white p-[1px] shadow-lg shadow-brand-primary/20 group-hover:shadow-brand-primary/40 transition-shadow">
              <div className="w-full h-full bg-[#08080a] rounded-[7px] flex items-center justify-center">
                <span className="text-white font-mono font-black text-sm tracking-tighter">AX</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-base tracking-tight text-white flex items-center gap-1.5">
                AXIOM LABS <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden />
              </span>
              <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-400">AI &amp; Systems Studio</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setMegaOpen(!megaOpen);
                  setResourcesOpen(false);
                }}
                onMouseEnter={() => setMegaOpen(true)}
                aria-expanded={megaOpen}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium transition-colors ${
                  megaOpen ? "text-white bg-white/[0.08]" : "text-zinc-300 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                Services <ChevronDown className={`w-4 h-4 transition-transform ${megaOpen ? "rotate-180 text-brand-primary" : "text-zinc-400"}`} />
              </button>
            </div>
            <Link href="/work" className="px-3.5 py-2 rounded-full text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/[0.04]">
              Work
            </Link>
            <Link href="/company" className="px-3.5 py-2 rounded-full text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/[0.04]">
              Company
            </Link>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setResourcesOpen(!resourcesOpen);
                  setMegaOpen(false);
                }}
                onMouseEnter={() => setResourcesOpen(true)}
                aria-expanded={resourcesOpen}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium transition-colors ${
                  resourcesOpen ? "text-white bg-white/[0.08]" : "text-zinc-300 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                Resources <ChevronDown className={`w-4 h-4 transition-transform ${resourcesOpen ? "rotate-180 text-brand-primary" : "text-zinc-400"}`} />
              </button>
              {resourcesOpen && (
                <div
                  onMouseLeave={() => setResourcesOpen(false)}
                  className="absolute top-full left-0 mt-2 w-80 rounded-2xl bg-[#0c0c10]/95 backdrop-blur-2xl border border-white/[0.1] p-3 shadow-2xl shadow-black/90"
                >
                  <div className="space-y-1">
                    <Link
                      href="/resources/vendor-matrix"
                      onClick={() => setResourcesOpen(false)}
                      className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/[0.06] group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center shrink-0">
                        <Globe className="w-4 h-4 text-brand-primary" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white group-hover:text-brand-primary flex items-center gap-1.5">
                          AI Vendor Matrix
                          <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-brand-primary/20 text-brand-primary font-mono">Interactive</span>
                        </div>
                        <p className="text-xs text-zinc-400">Illustrative comparison — not a procurement recommendation</p>
                      </div>
                    </Link>
                    <Link
                      href="/open-axiom"
                      onClick={() => setResourcesOpen(false)}
                      className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/[0.06] group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        <Cpu className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">Open Axiom</div>
                        <p className="text-xs text-zinc-400">Templates &amp; starter kits — demo quality</p>
                      </div>
                    </Link>
                    <Link
                      href="/blog"
                      onClick={() => setResourcesOpen(false)}
                      className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/[0.06] group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                        <Layout className="w-4 h-4 text-blue-400" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">Technical Blog</div>
                        <p className="text-xs text-zinc-400">Patterns and checklists — educational</p>
                      </div>
                    </Link>
                  </div>
                </div>
              )}
            </div>
            <Link href="/contact" className="px-3.5 py-2 rounded-full text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/[0.04]">
              Contact
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/contact"
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider bg-white text-black hover:bg-zinc-200 transition-all"
            >
              Start Project <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
              className="md:hidden p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {megaOpen && (
        <div onMouseLeave={() => setMegaOpen(false)} className="hidden md:block absolute top-full inset-x-0 bg-[#08080c]/95 backdrop-blur-2xl border-b border-white/[0.1] shadow-2xl shadow-black/90">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-12 gap-8">
              <div className="col-span-8">
                <div className="flex items-center justify-between mb-5">
                  <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">Core Capabilities</span>
                  <Link href="/#services" onClick={() => setMegaOpen(false)} className="text-xs text-brand-primary hover:text-brand-hover font-medium flex items-center gap-1">
                    View All <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {servicesData.map((service) => (
                    <Link
                      key={service.id}
                      href={`/services/${service.slug}`}
                      onClick={() => setMegaOpen(false)}
                      className="group p-4 rounded-xl border border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.06] hover:border-brand-primary/30 transition-all flex items-start gap-3.5"
                    >
                      <div className="p-2.5 rounded-lg bg-[#0e0e14] border border-white/[0.08] group-hover:border-brand-primary/40 transition-all">
                        {iconMap[service.iconName] || <Cpu className="w-5 h-5 text-brand-primary" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-white group-hover:text-brand-primary transition-colors">{service.title}</h4>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-zinc-400">{service.badge}</span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{service.shortDesc}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
              <div className="col-span-4 border-l border-white/[0.08] pl-8 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-brand-primary" />
                    <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">Featured Concept</span>
                  </div>
                  <div className="p-5 rounded-xl border border-brand-primary/20 bg-gradient-to-b from-brand-primary/10 via-brand-muted/5 to-transparent">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-brand-primary font-semibold">Illustrative Dossier</span>
                    <h5 className="text-base font-semibold text-white mt-1.5 mb-2">Strata Systems: Incident Triage Concept</h5>
                    <p className="text-xs text-zinc-300 leading-relaxed mb-4">Example architecture for autonomous triage — illustrative, not a deployed result. Shows agent mesh and sandbox verification patterns.</p>
                    <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 mb-4">
                      <span className="px-2 py-0.5 rounded bg-white/[0.06] text-white">Concept</span>
                      <span className="px-2 py-0.5 rounded bg-white/[0.06] text-white">Demo</span>
                    </div>
                    <Link
                      href="/work/strata-systems"
                      onClick={() => setMegaOpen(false)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-brand-primary/30 hover:bg-brand-primary/50 px-3.5 py-2 rounded-lg border border-brand-primary/40 transition-all"
                    >
                      View Dossier <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-400">
                  <span>Have a real problem?</span>
                  <Link href="/contact" onClick={() => setMegaOpen(false)} className="text-white hover:text-brand-primary underline">
                    Talk to us
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {mobileOpen && (
        <div className="md:hidden fixed inset-x-0 top-[65px] bottom-0 bg-[#060608]/98 backdrop-blur-2xl border-b border-white/[0.1] overflow-y-auto p-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">Navigation</span>
              <div className="flex flex-col space-y-1">
                {[
                  { href: "/work", label: "Work" },
                  { href: "/company", label: "Company" },
                  { href: "/resources/vendor-matrix", label: "Vendor Matrix" },
                  { href: "/open-axiom", label: "Open Axiom" },
                  { href: "/blog", label: "Blog" },
                  { href: "/contact", label: "Contact" },
                ].map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setMobileOpen(false)}
                    className="px-3 py-2 rounded-lg text-base font-medium text-white hover:bg-white/[0.08]"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="pt-4 border-t border-white/[0.08]">
              <span className="text-xs font-mono uppercase tracking-widest text-zinc-400 block mb-3">Services</span>
              <div className="grid grid-cols-1 gap-2">
                {servicesData.map((s) => (
                  <Link
                    key={s.id}
                    href={`/services/${s.slug}`}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] text-sm text-zinc-200"
                  >
                    <span>{s.title}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <div className="pt-6 border-t border-white/[0.08] mt-6">
            <Link href="/contact" onClick={() => setMobileOpen(false)} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white text-black font-semibold text-sm uppercase tracking-wider">
              Start Project <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
