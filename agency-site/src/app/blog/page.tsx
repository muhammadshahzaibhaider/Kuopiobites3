import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { PageCta } from "@/components/PageCta";
import { PillButton } from "@/components/PillButton";
import BlogList from "@/components/BlogList";

export const metadata: Metadata = {
  title: "Blog & Insights",
  description:
    "Thoughts on AI, product development, and digital innovation — from the team building it.",
};

export default function BlogPage() {
  return (
    <>
      <PageHero
        eyebrow="Resources"
        title={
          <>
            Blog &amp; <span className="text-white/40">Insights</span>
          </>
        }
        lede="Thoughts on AI, product development, and digital innovation."
        align="left"
      />

      <section aria-label="Articles" className="content-shell pb-section">
        <BlogList />
      </section>

      <PageCta
        title={
          <>
            Have a project <span className="text-white/40">in mind?</span>
          </>
        }
        body="Let's build something that matters."
      >
        <PillButton href="/contact">Start Your Project</PillButton>
      </PageCta>
    </>
  );
}
