import type { Metadata } from "next";
import { CASE_STUDIES } from "@/lib/data/caseStudies";
import { PageHero } from "@/components/PageHero";
import { PageCta } from "@/components/PageCta";
import { PillButton } from "@/components/PillButton";
import WorkGrid from "@/components/WorkGrid";

export const metadata: Metadata = {
  title: "Work",
  description:
    "Selected case studies across product design, web engineering, AI development, and healthcare software.",
};

export default function WorkPage() {
  return (
    <>
      <PageHero
        eyebrow={`Selected work · ${CASE_STUDIES.length} projects`}
        title="Work."
        lede="Proven results, measurable impact — explore the transformations we've delivered."
        align="left"
      />

      <section aria-label="Project grid" className="content-shell pb-section">
        <WorkGrid />
      </section>

      <PageCta
        title={
          <>
            Your project could be <span className="text-white/40">next.</span>
          </>
        }
        body="Tell us what you're building. We'll come back with an approach, a team, and a timeline."
      >
        <PillButton href="/contact">Start Your Project</PillButton>
        <PillButton href="/services/ui-ux-design" tone="outline">
          Explore Services
        </PillButton>
      </PageCta>
    </>
  );
}
