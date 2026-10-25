"use client";

import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LightRays from "@/components/LightRays";
import { ChevronDown, ShieldCheck, Sparkles, Users, Target, Award } from "lucide-react";
import Link from "next/link";

const faqs = [
  {
    q: "Do you sign NDAs before deep dives?",
    a: "Yes — mutual NDAs are standard before reviewing schemas, datasets, or architecture docs. Ask us for a template during scoping.",
  },
  {
    q: "What do you not promise?",
    a: "We do not promise specific business metrics, model accuracy, latency, or compliance outcomes. We scope hypotheses, build evaluable prototypes, and document tradeoffs so you can decide with evidence.",
  },
  {
    q: "How do you handle data privacy in demos?",
    a: "Demos use synthetic or dummy data. For production planning, we map data flows and recommend perimeters, but formal privacy/compliance posture requires your legal and security review — this site makes no certification claim.",
  },
];

export default function CompanyPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <>
      <Navbar />
      <main id="main-content" className="min-h-screen pt-32 pb-24 relative overflow-hidden bg-[#030303] text-zinc-100">
        <LightRays />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 text-brand-primary text-xs font-mono font-medium mb-6">
            <Sparkles className="w-3.5 h-3.5" /> Company — Demo Narrative
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight mb-6">Companies create products. Axiom explores impact.</h1>
          <p className="text-lg text-zinc-400 leading-relaxed max-w-3xl">
            Axiom Labs is a studio narrative for workshops: we prototype, measure, and document — so teams can choose what to invest in next with clearer evidence. No guarantees, just rigor and honesty.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 mb-20">
            <div className="p-8 rounded-2xl glass-panel border border-white/10">
              <Users className="w-8 h-8 text-brand-primary mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Design-First, but Evaluated</h3>
              <p className="text-sm text-zinc-400">Interfaces are sketched early, tested with tasks, and refined against observability — not opinion.</p>
            </div>
            <div className="p-8 rounded-2xl glass-panel border border-white/10">
              <Target className="w-8 h-8 text-brand-primary mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Engineering Excellence, Scoped</h3>
              <p className="text-sm text-zinc-400">We size infrastructure honestly and document runbooks before scaling.</p>
            </div>
            <div className="p-8 rounded-2xl glass-panel border border-white/10">
              <Award className="w-8 h-8 text-brand-primary mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Impact, Not Hype</h3>
              <p className="text-sm text-zinc-400">Impact is claimed only after independent measurement. Our demos are teaching tools.</p>
            </div>
          </div>

          <div className="p-8 rounded-2xl bg-[#08080c] border border-white/[0.08] mb-16">
            <h2 className="text-xs font-mono uppercase tracking-widest text-brand-primary mb-3">Studio Pillars</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { n: "01", title: "Code as Proof", text: "We keep contracts typed and behaviors logged so reviews are concrete." },
                { n: "02", title: "Human Sovereignty", text: "Agents suggest; humans decide. Escalation is designed, not accidental." },
                { n: "03", title: "Velocity via Clarity", text: "Speed follows from clear requirements and thin, tested slices." },
              ].map((p) => (
                <div key={p.n} className="border-l-2 border-brand-primary/30 pl-6">
                  <span className="text-3xl font-extrabold font-mono text-brand-primary mb-3 block">{p.n}</span>
                  <h3 className="text-lg font-bold text-white mb-2">{p.title}</h3>
                  <p className="text-sm text-zinc-400">{p.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="max-w-4xl mx-auto mb-16">
            <div className="text-center mb-10">
              <span className="text-xs font-mono uppercase tracking-widest text-brand-primary font-semibold">TRANSPARENCY</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white">Frequently Asked Questions</h2>
            </div>
            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <div key={idx} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
                  <button type="button" onClick={() => setOpenFaq(openFaq === idx ? null : idx)} className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4">
                    <span className="text-sm font-semibold text-white">{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-brand-primary transition-transform ${openFaq === idx ? "rotate-180" : ""}`} />
                  </button>
                  {openFaq === idx && <div className="px-5 pb-5 text-xs text-zinc-400 leading-relaxed border-t border-white/[0.04] pt-3">{faq.a}</div>}
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-zinc-400 text-center">
            Studio status: demo site. No client relationship or compliance certification is implied. Partnership is scoped after discovery.
          </div>

          <div className="mt-12 flex flex-wrap gap-3 justify-center">
            <Link href="/work" className="px-6 py-3 rounded-full bg-white text-black font-semibold text-sm">Browse Illustrative Work</Link>
            <Link href="/contact" className="px-6 py-3 rounded-full border border-white/10 text-white text-sm">Contact Studio</Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
