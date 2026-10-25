import React from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import LogoStrip from "@/components/LogoStrip";
import StatsSection from "@/components/StatsSection";
import ServicesGrid from "@/components/ServicesGrid";
import CaseStudies from "@/components/CaseStudies";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";
import { Terminal, Shield, RefreshCw } from "lucide-react";

export default function Home() {
  return (
    <>
      <Navbar />
      <main id="main-content" className="min-h-screen">
        <Hero />
        <LogoStrip />
        <StatsSection />
        <ServicesGrid />

        <section id="capabilities" className="py-24 border-t border-white/[0.08] bg-[#020203] relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 text-brand-light text-xs font-mono font-medium mb-4">
                <span>OUR APPROACH</span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">Evaluation Over Assumptions.</h2>
              <p className="mt-4 text-base text-zinc-400 leading-relaxed">
                Many AI efforts falter on untested assumptions and hidden drift. We start with eval sets, sandboxes, and operable checkpoints so decisions are reviewable — not hopeful.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-8 rounded-2xl glass-panel border border-white/10 hover:border-brand-primary/40 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary mb-6">
                  <Terminal className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Tool Contracts</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Typed, bounded tool access via MCP-style patterns so agents interact with your systems predictably and audibly.
                </p>
              </div>
              <div className="p-8 rounded-2xl glass-panel border border-white/10 hover:border-brand-primary/40 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary mb-6">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Human Oversight</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Sensitive actions stay human-approved. We model confidence thresholds and escalation paths before anything touches production.
                </p>
              </div>
              <div className="p-8 rounded-2xl glass-panel border border-white/10 hover:border-brand-primary/40 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary mb-6">
                  <RefreshCw className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Continuous Evals</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Every change is checked against a golden set. Regressions surface early — no claims, just measured tradeoffs.
                </p>
              </div>
            </div>
          </div>
        </section>

        <CaseStudies />
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}
