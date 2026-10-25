"use client";

import React, { useState } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LightRays from "@/components/LightRays";
import ContactForm from "@/components/ContactForm";
import { servicesData } from "@/data/services";
import { ArrowLeft, CheckCircle2, Cpu, Bot, Globe, Layout, Cloud, Shield, Sparkles, ChevronDown, Check } from "lucide-react";

const iconMap: Record<string, React.ReactNode> = {
  Layout: <Layout className="w-8 h-8 text-brand-primary" />,
  Globe: <Globe className="w-8 h-8 text-brand-primary" />,
  Cpu: <Cpu className="w-8 h-8 text-brand-primary" />,
  Bot: <Bot className="w-8 h-8 text-brand-primary" />,
  Shield: <Shield className="w-8 h-8 text-brand-primary" />,
  Cloud: <Cloud className="w-8 h-8 text-brand-primary" />,
};

export default function ServiceDetail({ params }: { params: { slug: string } }) {
  const service = servicesData.find((s) => s.slug === params.slug);
  if (!service) notFound();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <>
      <Navbar />
      <main id="main-content" className="min-h-screen pt-32 pb-24 relative overflow-hidden bg-[#030303] text-zinc-100">
        <LightRays />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 mb-8">
            <Link href="/" className="hover:text-white">Home</Link>
            <span>/</span>
            <Link href="/#services" className="hover:text-white">Services</Link>
            <span>/</span>
            <span className="text-brand-primary">{service.title}</span>
          </div>

          <div className="mb-20 max-w-4xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/30 text-brand-primary text-xs font-mono font-medium mb-6">
              <Sparkles className="w-3.5 h-3.5" /> <span>{service.badge}</span>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">{iconMap[service.iconName] || <Cpu className="w-8 h-8 text-brand-primary" />}</div>
              <div>
                <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">{service.title}</h1>
                <p className="text-xs font-mono text-zinc-400 mt-1">{service.metrics}</p>
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-6 mb-4 leading-tight">{service.heroHeadline}</h2>
            <p className="text-zinc-300 leading-relaxed">{service.longDesc}</p>
            <p className="mt-3 text-xs font-mono text-amber-300/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
              Scope note: timelines and outcomes are illustrative planning aids — every engagement is scoped after discovery, with no outcome guaranteed.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-20">
            <div className="lg:col-span-7">
              <h3 className="text-xs font-mono uppercase tracking-widest text-brand-primary font-semibold mb-6">What You Get — Example Scope</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {service.deliverables.map((d, i) => (
                  <div key={i} className="p-6 rounded-2xl glass-panel border border-white/10">
                    <div className="w-8 h-8 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary mb-4">
                      <Check className="w-4 h-4" />
                    </div>
                    <h4 className="text-sm font-semibold text-white mb-2">{d.title}</h4>
                    <p className="text-xs text-zinc-400 leading-relaxed">{d.description}</p>
                  </div>
                ))}
              </div>

              <div className="mt-12">
                <h3 className="text-xs font-mono uppercase tracking-widest text-brand-primary font-semibold mb-6">How We Work — Phased Sketch</h3>
                <div className="space-y-6 border-l border-white/[0.08] pl-6">
                  {service.processPhases.map((phase) => (
                    <div key={phase.number} className="relative">
                      <div className="absolute -left-[25px] top-1 w-3 h-3 rounded-full bg-brand-primary border-2 border-[#030303]" aria-hidden />
                      <div className="flex items-baseline justify-between gap-4 mb-2">
                        <h4 className="text-base font-semibold text-white">
                          {phase.number} — {phase.title}
                        </h4>
                        <span className="text-xs font-mono text-zinc-400 bg-white/[0.04] px-2 py-1 rounded border border-white/10">{phase.duration}</span>
                      </div>
                      <p className="text-sm text-zinc-400 mb-3">{phase.description}</p>
                      <ul className="space-y-1">
                        {phase.deliverables.map((del, idx) => (
                          <li key={idx} className="text-xs text-zinc-300 flex items-start gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-brand-primary shrink-0 mt-0.5" /> {del}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-3xl glass-panel p-8 border border-white/10 sticky top-24">
                <h3 className="text-lg font-bold text-white mb-1">Start a Scoping Conversation</h3>
                <p className="text-xs text-zinc-400 mb-6">We review and reply within one business day. No compliance or result is promised on this form — delivery depends on deployment config.</p>
                <ContactForm defaultService={service.title} />
              </div>
              <div className="mt-6 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-zinc-400">
                <strong className="text-zinc-200">Tooling:</strong> {service.tools.join(" • ")}
              </div>
            </div>
          </div>

          <div className="max-w-4xl mx-auto">
            <h3 className="text-center text-xs font-mono uppercase tracking-widest text-brand-primary font-semibold mb-6">Questions — Practical Notes</h3>
            <div className="space-y-3">
              {service.faqs.map((faq, idx) => (
                <div key={idx} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
                  <button type="button" onClick={() => setOpenFaq(openFaq === idx ? null : idx)} className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 hover:bg-white/[0.02]">
                    <span className="text-sm font-semibold text-white">{faq.question}</span>
                    <ChevronDown className={`w-4 h-4 text-brand-primary shrink-0 transition-transform ${openFaq === idx ? "rotate-180" : ""}`} />
                  </button>
                  {openFaq === idx && <div className="px-5 pb-5 text-xs text-zinc-400 leading-relaxed border-t border-white/[0.04] pt-3">{faq.answer}</div>}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-16 flex flex-wrap gap-3">
            <Link href="/work" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black text-sm font-semibold">See Illustrative Work <ArrowLeft className="w-4 h-4 rotate-180" /></Link>
            <Link href="/contact" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/10 text-white text-sm">Schedule Review</Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
