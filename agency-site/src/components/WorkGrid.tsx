"use client";

import { useState } from "react";
import { CASE_STUDIES } from "@/lib/data/caseStudies";
import { cn } from "@/lib/cn";
import { CaseStudyCard } from "@/components/CaseStudyCard";

const TAGS = ["All", "UI/UX Design", "Website Design", "Web Development", "AI Development", "AI Agents", "Healthcare Apps"];

export default function WorkGrid() {
  const [active, setActive] = useState("All");

  const visible = CASE_STUDIES.filter(
    (study) => active === "All" || study.tags.includes(active),
  );

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter case studies by service">
        {TAGS.map((tag) => {
          const count =
            tag === "All"
              ? CASE_STUDIES.length
              : CASE_STUDIES.filter((study) => study.tags.includes(tag)).length;
          const pressed = active === tag;
          return (
            <button
              key={tag}
              type="button"
              aria-pressed={pressed}
              disabled={count === 0}
              onClick={() => setActive(tag)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs transition-colors duration-200",
                pressed
                  ? "border-white bg-white text-ink"
                  : "border-hairline text-muted hover:border-hairline-strong hover:text-fg",
                count === 0 && "cursor-not-allowed opacity-40 hover:border-hairline hover:text-muted",
              )}
            >
              {tag}
              <span className={cn("tabular-nums", pressed ? "text-ink/50" : "text-muted-dim")}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-muted-dim" aria-live="polite">
        Showing {visible.length} of {CASE_STUDIES.length} projects
      </p>

      <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((study) => (
          <li key={study.slug}>
            <CaseStudyCard study={study} />
          </li>
        ))}
      </ul>
    </div>
  );
}
