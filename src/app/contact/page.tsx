"use client";

import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LightRays from "@/components/LightRays";
import ContactSection from "@/components/ContactSection";
import { ChevronDown, MapPin } from "lucide-react";

const faqs = [
  { q: "Typical kickoff timeline?", a: "After scoping and NDA (if needed), workshops typically mobilize within 5–7 business days. Timelines are estimates — we confirm after discovery." },
  { q: "Do you sign NDAs?", a: "Yes — mutual NDAs before reviewing proprietary specs. We can share a template." },
  { q: "Time-zone coverage?", a: "Remote-first with overlaps across US/EU. We document async updates so handoffs are clear." },
];

export default function ContactPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  return (
    <>
      <Navbar />
      <main id="main-content" className="min-h-screen pt-24 relative overflow-hidden bg-[#030303] text-zinc-100">
        <LightRays />
        <ContactSection />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-5">
              <span className="text-xs font-mono uppercase tracking-widest text-brand-primary font-semibold mb-3 block">GLOBAL REACH — DEMO HUBS</span>
              <h3 className="text-2xl font-bold text-white mb-6">Distributed Studio (Illustrative)</h3>
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-start gap-4">
                  <MapPin className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-white">San Francisco (Concept)</h4>
                    <p className="text-xs text-zinc-400 mt-1">Montgomery St — Americas studio placeholder for layout demonstration.</p>
                  </div>
                </div>
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-start gap-4">
                  <MapPin className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-white">London (Concept)</h4>
                    <p className="text-xs text-zinc-400 mt-1">Shoreditch — EMEA studio placeholder. Addresses are not real locations.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-7">
              <span className="text-xs font-mono uppercase tracking-widest text-brand-primary font-semibold mb-3 block">ENGAGEMENT FAQ</span>
              <h3 className="text-2xl font-bold text-white mb-6">Common Questions</h3>
              <div className="space-y-3">
                {faqs.map((faq, idx) => (
                  <div key={idx} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
                    <button type="button" onClick={() => setOpenFaq(openFaq === idx ? null : idx)} className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4">
                      <span className="text-sm font-semibold text-white">{faq.q}</span>
                      <ChevronDown className={`w-4 h-4 text-brand-primary shrink-0 transition-transform ${openFaq === idx ? "rotate-180" : ""}`} />
                    </button>
                    {openFaq === idx && <div className="px-5 pb-5 text-xs text-zinc-400 leading-relaxed border-t border-white/[0.04] pt-3">{faq.a}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
