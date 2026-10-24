import Image from "next/image";
import { PillButton } from "./PillButton";
import { Reveal } from "./Reveal";

export default function CtaSection() {
  return (
    <section
      id="contact"
      aria-labelledby="cta-title"
      className="relative isolate overflow-hidden"
    >
      {/* Curved light horizon, blended into the footer below. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <Image
          src="/images/light-arc.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-bottom opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink via-ink/30 to-ink" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/70 via-transparent to-ink/70" />
      </div>

      <div className="content-shell flex flex-col items-center gap-9 py-section-lg text-center">
        <Reveal>
          <h2 id="cta-title" className="mx-auto max-w-4xl text-section text-fg">
            We turn bold ideas into{" "}
            <span className="text-white/40">powerful digital realities.</span>
          </h2>
        </Reveal>
        <Reveal delay={0.08}>
          <PillButton href="/contact">Let&apos;s work together</PillButton>
        </Reveal>
      </div>
    </section>
  );
}
