import React from "react";

const partners = [
  "STRATA", "ZENITH", "VORTEX", "HELIX", "NOVA", "PULSE", "SYNTHETIX",
  "STRATA", "ZENITH", "VORTEX", "HELIX", "NOVA", "PULSE", "SYNTHETIX",
];

export default function LogoStrip() {
  return (
    <section className="relative py-8 overflow-hidden border-y border-white/[0.06] bg-[#020203]">
      <p className="text-center text-[11px] font-mono uppercase tracking-widest text-zinc-500 mb-4">Illustrative partner marks — for layout demonstration only</p>
      <div className="flex overflow-hidden">
        <div className="flex animate-marquee will-change-transform">
          {partners.map((p, i) => (
            <div key={i} className="flex items-center gap-3 px-8 shrink-0">
              <div className="w-7 h-7 rounded bg-white/[0.04] border border-white/10 flex items-center justify-center text-[10px] font-mono text-zinc-300">
                {p.slice(0, 2)}
              </div>
              <span className="text-sm font-mono tracking-widest text-zinc-400">{p}</span>
              <span className="text-zinc-600">•</span>
            </div>
          ))}
        </div>
        <div className="flex animate-marquee will-change-transform" aria-hidden>
          {partners.map((p, i) => (
            <div key={`a-${i}`} className="flex items-center gap-3 px-8 shrink-0">
              <div className="w-7 h-7 rounded bg-white/[0.04] border border-white/10 flex items-center justify-center text-[10px] font-mono text-zinc-300">
                {p.slice(0, 2)}
              </div>
              <span className="text-sm font-mono tracking-widest text-zinc-400">{p}</span>
              <span className="text-zinc-600">•</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
