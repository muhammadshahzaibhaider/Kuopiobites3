import Image from "next/image";
import LogoMarquee from "./LogoMarquee";

/** Compact "trusted by" band used on interior pages. */
export function MarqueeBand({ label = "Trusted by teams worldwide" }: { label?: string }) {
  return (
    <section aria-label={label} className="relative isolate overflow-hidden border-y border-hairline">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <Image
          src="/images/light-arc.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-center opacity-25"
        />
        <div className="absolute inset-0 bg-ink/60" />
      </div>
      <div className="content-shell py-8">
        <p className="mb-5 text-center text-micro uppercase text-muted-dim">{label}</p>
        <LogoMarquee />
      </div>
    </section>
  );
}
