import React from "react";
import ContactForm from "./ContactForm";
import { ShieldCheck, Mail, Globe } from "lucide-react";

export default function ContactSection({ service }: { service?: string }) {
  return (
    <section id="contact" className="py-24 sm:py-32 relative border-t border-white/[0.08] bg-[#030303]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          <div className="lg:col-span-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 text-brand-primary text-xs font-mono font-medium mb-4">
              <span>START AN ENGAGEMENT</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">Let&apos;s Build Something Useful.</h2>
            <p className="mt-4 text-base text-zinc-400 leading-relaxed">
              Whether you need an agent workflow sketch, an eval harness outline, or a Next.js performance review — we reply within one business day on weekdays.
            </p>
            <div className="mt-10 space-y-4">
              <div className="flex items-center gap-3 text-xs text-zinc-300 font-mono">
                <ShieldCheck className="w-5 h-5 text-brand-primary" /> No compliance claim — scoping starts with questions, not promises
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-300 font-mono">
                <Mail className="w-5 h-5 text-brand-primary" /> Direct line with engineers — not a sales funnel
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-300 font-mono">
                <Globe className="w-5 h-5 text-brand-primary" /> Remote-first, async-friendly
              </div>
            </div>
            <div className="mt-12 pt-8 border-t border-white/[0.08] text-xs text-zinc-500 font-mono">
              <div>Studio: San Francisco • London • Remote</div>
              <div className="mt-1">Inquiries: contact@axiomlabs.agency (demo address)</div>
            </div>
          </div>
          <div className="lg:col-span-7">
            <div className="rounded-3xl glass-panel p-8 sm:p-10 border border-white/10 shadow-2xl">
              <ContactForm defaultService={service} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
