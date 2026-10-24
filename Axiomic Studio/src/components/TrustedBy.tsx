import { Reveal } from "./Reveal";
import LogoMarquee from "./LogoMarquee";

export default function TrustedBy() {
  return (
    <section
      id="clients"
      aria-labelledby="clients-title"
      className="relative isolate overflow-hidden py-section"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-64 w-[min(52rem,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-glow/[0.06] blur-glow"
      />
      <div className="content-shell">
        <Reveal className="flex flex-col items-center gap-4 text-center">
          <h2
            id="clients-title"
            className="text-section"
            aria-label="Trusted by Industry Leaders"
          >
            <span aria-hidden className="title-lead">
              Trusted by
            </span>{" "}
            <span aria-hidden className="title-strong">
              Industry Leaders
            </span>
          </h2>
          <p className="text-lede text-muted">Powering Innovation for Companies Worldwide</p>
        </Reveal>
      </div>

      <Reveal className="mt-12 sm:mt-14" delay={0.1}>
        <LogoMarquee />
      </Reveal>
    </section>
  );
}
