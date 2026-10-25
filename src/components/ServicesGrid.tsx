import React from "react";
import Link from "next/link";
import { servicesData } from "@/data/services";
import { Cpu, Bot, Globe, Layout, Cloud, Shield, ArrowUpRight, Check } from "lucide-react";

const iconMap: Record<string, React.ReactNode> = {
  Layout: <Layout className="w-6 h-6 text-brand-primary" />,
  Globe: <Globe className="w-6 h-6 text-brand-primary" />,
  Cpu: <Cpu className="w-6 h-6 text-brand-primary" />,
  Bot: <Bot className="w-6 h-6 text-brand-primary" />,
  Shield: <Shield className="w-6 h-6 text-brand-primary" />,
  Cloud: <Cloud className="w-6 h-6 text-brand-primary" />,
};

export default function ServicesGrid() {
  return (
    <section id="services" className="py-24 sm:py-32 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 text-brand-primary text-xs font-mono font-medium mb-4">
            <span>DISCIPLINE &amp; EXPERTISE</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">Specialized Pillars for Demanding Contexts.</h2>
          <p className="mt-4 text-base sm:text-lg text-zinc-400 leading-relaxed">
            Each engagement is a workshop-led exploration — not a template. We frame problems, prototype quickly, and evaluate with you. No outcome is guaranteed; progress is measured in learning and shipped artifacts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {servicesData.map((service) => (
            <article
              key={service.id}
              className="group relative rounded-2xl glass-panel p-7 flex flex-col justify-between transition-all duration-300 hover:border-brand-primary/50 hover:bg-[#0c0c11]/80 hover:shadow-xl hover:shadow-brand-primary/10 hover:-translate-y-1"
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="p-3 rounded-xl bg-white/[0.05] border border-white/10 group-hover:border-brand-primary/40 group-hover:bg-brand-primary/10 transition-colors">
                    {iconMap[service.iconName] || <Cpu className="w-6 h-6 text-brand-primary" />}
                  </div>
                  <span className="text-[11px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-zinc-300">{service.badge}</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2.5 tracking-tight group-hover:text-brand-primary transition-colors">{service.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed mb-6">{service.shortDesc}</p>
                <div className="space-y-2 mb-6 border-t border-white/[0.06] pt-5">
                  <div className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-2">Example Scope</div>
                  {service.deliverables.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-zinc-300">
                      <Check className="w-3.5 h-3.5 text-brand-primary shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{item.title}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between">
                <div className="text-xs font-mono text-zinc-400">
                  <span className="text-zinc-500">Note: </span>
                  <span className="text-white font-medium">{service.metrics}</span>
                </div>
                <Link href={`/services/${service.slug}`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-primary group-hover:text-white transition-colors">
                  <span>Explore</span> <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </Link>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-16 text-center">
          <Link href="/services/ai-development" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors">
            <span>Need a custom assessment?</span>
            <span className="text-brand-primary font-semibold underline underline-offset-4">Explore Our AI Development Outline →</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
