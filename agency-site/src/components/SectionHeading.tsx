import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Reveal } from "./Reveal";

type SectionHeadingProps = {
  /** Muted, lighter-weight first part of the word-pair, e.g. "Our". */
  lead: string;
  /** Bold white second part, e.g. "Services". */
  strong: string;
  description?: ReactNode;
  id?: string;
  eyebrow?: string;
  align?: "center" | "left";
  className?: string;
};

export function SectionHeading({
  lead,
  strong,
  description,
  id,
  eyebrow,
  align = "center",
  className,
}: SectionHeadingProps) {
  const centered = align === "center";
  return (
    <Reveal
      className={cn(
        "flex flex-col gap-5",
        centered ? "items-center text-center" : "items-start text-left",
        className,
      )}
    >
      {eyebrow ? <p className="text-eyebrow uppercase text-muted">{eyebrow}</p> : null}
      <h2 id={id} className="text-section" aria-label={`${lead} ${strong}`.trim()}>
        <span aria-hidden className="title-lead">
          {lead}
        </span>
        <span aria-hidden className="title-strong">
          {strong}
        </span>
      </h2>
      {description ? (
        <p
          className={cn(
            "text-lede max-w-2xl text-muted",
            centered ? "mx-auto text-balance" : "text-pretty",
          )}
        >
          {description}
        </p>
      ) : null}
    </Reveal>
  );
}
