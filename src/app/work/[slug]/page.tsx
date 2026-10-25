import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LightRays from "@/components/LightRays";
import ContactSection from "@/components/ContactSection";
import { clientsData } from "@/data/clients";
import { ArrowLeft, ArrowRight, CheckCircle2, ShieldAlert, ArrowUpRight } from "lucide-react";

interface Props { params: { slug: string } }

export function generateStaticParams() {
  return clientsData.map((s) => ({ slug: s.slug }));
}

export function generateMetadata({ params }: Props) {
  const study = clientsData.find((s) => s.slug === params.slug);
  if (!study) return { title: "Not Found | Axiom Labs" };
  return { title: `${study.title} — ${study.client} | Axiom Labs`, description: study.summary };
}

export default function CaseStudyDetail({ params }: Props) {
  const idx = clientsData.findIndex((s) => s.slug === params.slug);
  if (idx === -1) notFound();
  const study = clientsData[idx];
  const prev = idx > 0 ? clientsData[idx - 1] : clientsData[clientsData.length - 1];
  const next = idx < clientsData.length - 1 ? clientsData[idx + 1] : clientsData[0];

  return (
    <>
      <Navbar />
      <main id="main-content" className="min-h-screen pt-32 pb-24 relative overflow-hidden bg-[#030303] text-zinc-100">
        <LightRays />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 mb-8">
            <Link href="/" className="hover:text-white">Home</Link>
            <span>/</span>
            <Link href="/work" className="hover:text-white">Work</Link>
            <span>/</span>
            <span className="text-brand-primary">{study.client}</span>
          </div>

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 mb-8 text-xs text-amber-200">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-100">Illustrative Dossier — Not a Client Result:</strong> {study.disclaimer}. All metrics and outcomes below are conceptual placeholders for demo purposes.
            </div>
          </div>

          <div className="mb-14">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="text-xs font-mono font-bold text-white px-3 py-1 rounded-md bg-white/[0.08] border border-white/10">{study.client}</span>
              <span className="text-xs font-mono text-brand-primary px-2.5 py-0.5 rounded-full bg-brand-primary/10 border border-brand-primary/20">{study.category}</span>
              <span className="text-xs font-mono text-zinc-400">{study.year} • {study.duration}</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4 leading-tight">{study.title}</h1>
            <p className="text-lg text-zinc-300 leading-relaxed font-light max-w-3xl">{study.tagline}</p>
          </div>

          <div className="p-8 sm:p-10 rounded-2xl border border-brand-primary/20 bg-gradient-to-r from-brand-primary/10 via-[#0c0c12] to-transparent mb-16 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <div className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight font-mono">{study.impactMetric}</div>
              <div className="text-sm text-zinc-300 font-medium mt-1">{study.impactLabel}</div>
              <p className="text-[11px] font-mono text-amber-300 mt-2">Illustrative target — not a measured result</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-amber-300 bg-amber-500/10 px-3.5 py-2 rounded-full border border-amber-500/20 shrink-0">
              <ShieldAlert className="w-4 h-4" /> Illustrative Metric
            </div>
          </div>

          <div className="mb-16">
            <h2 className="text-xs font-mono uppercase tracking-widest text-brand-primary mb-3 font-semibold">Executive Summary</h2>
            <p className="text-lg text-zinc-200 leading-relaxed">{study.summary}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
              <span className="text-xs font-mono uppercase tracking-wider text-amber-400 font-semibold mb-3 block">Illustrative Context</span>
              <h3 className="text-xl font-bold text-white mb-4">Framed Challenge</h3>
              <p className="text-zinc-300 text-sm leading-relaxed">{study.challenge}</p>
            </div>
            <div className="p-8 rounded-2xl bg-brand-primary/[0.04] border border-brand-primary/20">
              <span className="text-xs font-mono uppercase tracking-wider text-brand-primary font-semibold mb-3 block">Concept Exploration</span>
              <h3 className="text-xl font-bold text-white mb-4">Explored Approach</h3>
              <p className="text-zinc-300 text-sm leading-relaxed">{study.solution}</p>
            </div>
          </div>

          {study.architectureHighlights.length > 0 && (
            <div className="mb-16">
              <h2 className="text-xs font-mono uppercase tracking-widest text-brand-primary mb-3 font-semibold">Technical Highlights</h2>
              <h3 className="text-2xl font-bold text-white mb-6">Concept Pillars (Demo)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {study.architectureHighlights.map((hl, i) => (
                  <div key={i} className="p-6 rounded-xl bg-[#09090d] border border-white/[0.08]">
                    <span className="text-xs font-mono text-zinc-500 mb-2 block">0{i + 1}</span>
                    <h4 className="text-base font-semibold text-white mb-2">{hl.title}</h4>
                    <p className="text-xs text-zinc-400 leading-relaxed">{hl.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-16 p-8 sm:p-10 rounded-2xl bg-[#08080c] border border-white/[0.08]">
            <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-400 mb-2 font-semibold">Illustrative Outcomes — Not Guarantees</h2>
            <h3 className="text-2xl font-bold text-white mb-6">What “Could” Look Like in a Demo Run</h3>
            <div className="grid grid-cols-1 gap-4">
              {study.results.map((r, idx) => (
                <div key={idx} className="flex items-start gap-3.5 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <CheckCircle2 className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
                  <span className="text-sm text-zinc-200 leading-relaxed">{r}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-16">
            <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-3">Stack (Demo)</h3>
            <div className="flex flex-wrap gap-2">
              {study.techStack.map((t, i) => (
                <span key={i} className="text-xs font-mono px-3 py-1.5 rounded-full bg-white/[0.04] text-zinc-300 border border-white/10">
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-white/[0.08] pt-10">
            <Link href={`/work/${prev.slug}`} className="group p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-brand-primary/30 hover:bg-white/[0.04] transition-all">
              <div className="text-xs font-mono text-zinc-500 flex items-center gap-2 mb-2">
                <ArrowLeft className="w-4 h-4" /> Previous Dossier
              </div>
              <div className="text-sm font-semibold text-white group-hover:text-brand-primary">{prev.client} — {prev.title}</div>
            </Link>
            <Link href={`/work/${next.slug}`} className="group p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-brand-primary/30 hover:bg-white/[0.04] transition-all text-right">
              <div className="text-xs font-mono text-zinc-500 flex items-center justify-end gap-2 mb-2">
                Next Dossier <ArrowRight className="w-4 h-4" />
              </div>
              <div className="text-sm font-semibold text-white group-hover:text-brand-primary">{next.client} — {next.title}</div>
            </Link>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-xs text-zinc-400 leading-relaxed">
            <strong className="text-zinc-200">Transparency note:</strong> This page is part of a demonstration site for Axiom Labs. References to impact, accuracy, or business lift are fictional examples to showcase narrative and layout — they are not endorsements, certifications, or promises.
          </div>
        </div>

        <ContactSection service={study.title} />
      </main>
      <Footer />
    </>
  );
}
