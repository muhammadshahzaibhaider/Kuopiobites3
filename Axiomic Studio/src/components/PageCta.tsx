import Image from "next/image";
import type { ReactNode } from "react";
import { Reveal } from "./Reveal";

/** Bottom-of-page conversion panel, shared by every interior page. */
export function PageCta({
  title,
  body,
  children,
  image = "/images/light-arc.jpg",
}: {
  title: ReactNode;
  body?: string;
  children: ReactNode;
  image?: string;
}) {
  return (
    <section className="relative isolate overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <Image src={image} alt="" fill sizes="100vw" className="object-cover object-bottom opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-b from-ink via-ink/40 to-ink" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/70 via-transparent to-ink/70" />
      </div>

      <div className="content-shell flex flex-col items-center gap-7 py-section-lg text-center">
        <Reveal>
          <h2 className="mx-auto max-w-3xl text-section text-fg">{title}</h2>
        </Reveal>
        {body ? (
          <Reveal delay={0.06}>
            <p className="mx-auto max-w-xl text-lede text-muted text-balance">{body}</p>
          </Reveal>
        ) : null}
        <Reveal delay={0.1}>
          <div className="flex flex-wrap justify-center gap-3">{children}</div>
        </Reveal>
      </div>
    </section>
  );
}
