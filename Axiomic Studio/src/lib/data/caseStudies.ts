export type CaseStudySection = { title: string; body: string; image?: string };

export type CaseStudy = {
  number: string;
  slug: string;
  name: string;
  tags: string[];
  /** Home page / grid thumbnail. */
  image: string;
  /** 1:1-ish hero image on the detail page. */
  heroImage: string;

  /* ── Detail page ── */
  metaTitle: string;
  metaDescription: string;
  headline: string;
  tagline: string;
  summary: string;
  tech: string[];
  duration: string;
  focusAreas: string[];
  engagement: string;
  sections: CaseStudySection[];
  stats: { title: string; body: string }[];
  howItWorks: { title: string; body: string }[];
};

const CARD_TAGS = {
  design: "UI/UX Design",
  website: "Website Design",
  build: "Web Development",
  ai: "AI Development",
  agents: "AI Agents",
  health: "Healthcare Apps",
} as const;

export const CASE_STUDIES: CaseStudy[] = [
  {
    number: "01",
    slug: "talitrix",
    name: "Talitrix",
    tags: [CARD_TAGS.website, CARD_TAGS.build, CARD_TAGS.design],
    image: "/images/case-talitrix.jpg",
    heroImage: "/images/case-talitrix.jpg",
    metaTitle: "Talitrix",
    metaDescription:
      "A cinematic, Apple-style product reveal for a wearable supervision platform — design, motion, and Next.js engineering.",
    headline: "Talitrix.",
    tagline: "The standard for modern supervision.",
    summary:
      "Talitrix needed a marketing presence that matched the sophistication of their product: a unified platform pairing wearable hardware with behavioural intelligence software for the justice system. We designed and built a cinematic product-reveal experience — a hushed, theatrical scroll sequence on a high-performance Next.js foundation — establishing Talitrix as the premium standard in modern supervision technology.",
    tech: ["Next.js", "React", "TypeScript", "Tailwind CSS", "Framer Motion", "Vercel"],
    duration: "6 weeks from concept to launch.",
    focusAreas: [
      "Product & UX Design",
      "Scroll storytelling",
      "Motion & micro-interactions",
      "High-performance web engineering",
      "Marketing site architecture",
    ],
    engagement: "Creative direction, web design, frontend engineering, and launch.",
    sections: [
      {
        title: "A cinematic hardware reveal",
        body: "Deep vault-black backgrounds are broken by volumetric amber light, putting the wearable hardware at the centre of the story. The device is revealed through a frame sequence pinned to the viewport: as visitors scroll, it rotates through key features, creating the pacing of a premium keynote rather than a brochure.",
        image: "/images/case/talitrix-detail.jpg",
      },
      {
        title: "Motion with intent",
        body: "Scroll-linked motion is deliberate, never ambient. The device responds only to scroll position, while interface cards float in with small parallax differentials. A spring-damped progress value keeps the sequence smooth on trackpads, wheel mice, and touch without hijacking the page.",
      },
      {
        title: "Dignity by design",
        body: "The narrative highlights tamper detection and biometric sensing without turning them into spectacle. Bespoke interface mockups for the platform's modules sit above the hardware canvas, showing how data moves from wrist to dashboard in a single, legible flow.",
      },
    ],
    stats: [
      {
        title: "90-frame sequence",
        body: "A scrubbable hardware reveal tied directly to scroll position.",
      },
      { title: "60fps performance", body: "Optimised rendering and hardware-accelerated animation." },
      {
        title: "One ecosystem",
        body: "A cohesive narrative connecting wearable hardware with three software modules.",
      },
    ],
    howItWorks: [
      {
        title: "Canvas architecture",
        body: "A single canvas is pinned across four scenes. Pre-loaded frames are drawn against scroll progress with requestAnimationFrame so the sequence never stutters on first view.",
      },
      {
        title: "Scroll synchronisation",
        body: "A normalised scroll value drives the frame index, decoupled from layout so the rest of the page stays in normal flow and remains crawlable.",
      },
      {
        title: "Layered storytelling",
        body: "Copy, annotations, and UI cards sit in the document flow over the sticky canvas. Each block is pinned for its own slice of scroll, letting the story unfold step by step.",
      },
    ],
  },
  {
    number: "02",
    slug: "blue-standard",
    name: "Blue Standard",
    tags: [CARD_TAGS.website, CARD_TAGS.build, CARD_TAGS.design],
    image: "/images/case-blue-standard.jpg",
    heroImage: "/images/case-blue-standard.jpg",
    metaTitle: "Blue Standard",
    metaDescription:
      "A luxury lifestyle brand site with editorial art direction, a modular merchandising system, and fast commerce-ready pages.",
    headline: "Blue Standard.",
    tagline: "Curated luxury, discovered.",
    summary:
      "Blue Standard is a curated lifestyle brand that needed a storefront as considered as the objects it sells. We built an editorial system — oversized typography, a disciplined grid, and product storytelling that reads like a magazine — on infrastructure that keeps pages fast as the catalogue grows.",
    tech: ["Next.js", "TypeScript", "Tailwind CSS", "Sanity", "Vercel"],
    duration: "8 weeks from kickoff to launch.",
    focusAreas: [
      "Brand & art direction",
      "Editorial layout system",
      "Headless CMS architecture",
      "Commerce-ready components",
    ],
    engagement: "Art direction, web design, CMS build, and frontend engineering.",
    sections: [
      {
        title: "Editorial first",
        body: "The homepage behaves like a magazine cover: one dominant story, generous whitespace, and a typographic hierarchy that makes product photography feel like a feature spread. Navigation recedes so the collection can lead.",
        image: "/images/case/blue-standard-detail.jpg",
      },
      {
        title: "A system, not a set of pages",
        body: "Every layout is assembled from a small library of editorial blocks — feature, split, grid, quote — so the team can publish a new story in an afternoon without touching code or breaking the rhythm.",
      },
      {
        title: "Fast by default",
        body: "Images are served at exact display sizes, fonts are subset and self-hosted, and routes are statically rendered where possible. The result is a catalogue that stays quick even as the collection multiplies.",
      },
    ],
    stats: [
      { title: "1.1s LCP", body: "Largest Contentful Paint on a mid-tier mobile device." },
      { title: "8 layouts", body: "Reusable editorial blocks powering every page in the store." },
      { title: "Zero page builders", body: "Content editors publish without a single plugin or theme update." },
    ],
    howItWorks: [
      {
        title: "Content model",
        body: "Products, collections, and stories are modelled as typed documents, with references that keep merchandising consistent across every surface.",
      },
      {
        title: "Design tokens",
        body: "Type, colour, spacing, and radii live in one token layer shared by design and code, so a brand tweak is a one-line change.",
      },
      {
        title: "Preview workflow",
        body: "Draft stories render on a preview URL for review, then publish through the same pipeline — no staging drift.",
      },
    ],
  },
  {
    number: "03",
    slug: "clinix-ai",
    name: "Clinix AI",
    tags: [CARD_TAGS.ai, CARD_TAGS.agents, CARD_TAGS.health, CARD_TAGS.design],
    image: "/images/case-clinix.jpg",
    heroImage: "/images/case-clinix.jpg",
    metaTitle: "Clinix AI",
    metaDescription:
      "A clinician-facing AI assistant with vitals summarisation, audited access, and human-in-the-loop review.",
    headline: "Clinix AI.",
    tagline: "Clinical intelligence, in the room.",
    summary:
      "Clinix AI set out to give clinicians an assistant that reads the chart so they don't have to. We designed and built a vitals-and-notes copilot that drafts summaries, flags trends, and hands every decision back to a human — with audit logging and least-privilege access throughout.",
    tech: ["Next.js", "TypeScript", "Python", "PostgreSQL", "OpenAI", "AWS"],
    duration: "14 weeks from discovery to pilot.",
    focusAreas: [
      "Clinical workflow design",
      "LLM summarisation & evals",
      "PHI-safe architecture",
      "Clinician dashboard engineering",
    ],
    engagement: "Product design, AI engineering, and a supervised pilot rollout.",
    sections: [
      {
        title: "Designed at the bedside",
        body: "We shadowed clinicians across shifts before drawing a screen. The result is a dashboard built for interrupted attention: one clear summary, a colour-coded trend strip, and a single action that returns the clinician to their own notes.",
        image: "/images/case/clinix-detail.jpg",
      },
      {
        title: "Draft, then approve",
        body: "The assistant proposes; the clinician decides. Every generated summary is visibly labelled, editable, and never auto-committed to the record. That single design constraint removed most of the trust problem.",
      },
      {
        title: "Evidence, not vibes",
        body: "Before launch we built an eval set of de-identified cases with clinician-approved reference summaries. Every prompt or model change runs against it, and regressions block the release.",
      },
    ],
    stats: [
      { title: "38% faster", body: "Median time to a complete pre-visit summary in the pilot." },
      { title: "94% agreement", body: "Clinician-rated accuracy on the evaluation set." },
      { title: "Full audit trail", body: "Every suggestion, edit, and acceptance is logged and reviewable." },
    ],
    howItWorks: [
      {
        title: "Retrieval over records",
        body: "A scoped retrieval layer pulls only the minimum necessary context for the current patient and encounter, with PHI filtered before it reaches a model.",
      },
      {
        title: "Structured output",
        body: "Responses are parsed into typed fields — not paragraphs — so the interface can render sections, cite sources, and highlight low-confidence items.",
      },
      {
        title: "Continuous evaluation",
        body: "Synthetic and de-identified cases run nightly. Metrics on accuracy, omission, and latency gate every deployment.",
      },
    ],
  },
  {
    number: "04",
    slug: "owasp-foundation",
    name: "OWASP Foundation",
    tags: [CARD_TAGS.website, CARD_TAGS.build, CARD_TAGS.design],
    image: "/images/case-owasp.jpg",
    heroImage: "/images/case-owasp.jpg",
    metaTitle: "OWASP Foundation",
    metaDescription:
      "A global security community platform: event discovery, documentation, and accessible design at scale.",
    headline: "OWASP Foundation.",
    tagline: "Open security, made navigable.",
    summary:
      "A global community producing an enormous body of security knowledge needed a front door that respected both the depth of the material and the patience of a first-time visitor. We rebuilt the site around discovery: clear paths into projects, chapters, and events, with an accessible design system the community could extend.",
    tech: ["Next.js", "TypeScript", "Tailwind CSS", "MDX", "Cloudflare"],
    duration: "10 weeks, delivered in three increments.",
    focusAreas: [
      "Information architecture",
      "Design system for contributors",
      "Accessibility (WCAG 2.2 AA)",
      "Global performance",
    ],
    engagement: "IA, design system, frontend engineering, and contributor documentation.",
    sections: [
      {
        title: "Taming the archive",
        body: "Thousands of pages were reorganised around what people come to do — learn a topic, find a project, join a chapter, attend an event — rather than the org chart of the foundation.",
        image: "/images/case/owasp-detail.jpg",
      },
      {
        title: "A system for contributors",
        body: "Because the community writes much of the content, the design system ships with plain-language usage rules and copy-paste patterns. Consistency stopped depending on who was editing.",
      },
      {
        title: "Accessible by contract",
        body: "Keyboard paths, contrast, focus order, and reduced-motion behaviour were acceptance criteria on every component, not a remediation phase at the end.",
      },
    ],
    stats: [
      { title: "AA across the board", body: "WCAG 2.2 AA verified on every core journey." },
      { title: "62% faster", body: "Median page load improvement on mobile networks." },
      { title: "40+ components", body: "Documented, reusable, and community-extendable." },
    ],
    howItWorks: [
      {
        title: "Content inventory",
        body: "Every URL was catalogued, mapped to a new home, and redirected so years of inbound links kept working.",
      },
      {
        title: "Progressive enhancement",
        body: "Core navigation and content render without JavaScript; interactive filtering layers on top for capable browsers.",
      },
      {
        title: "Docs as a deliverable",
        body: "Component docs, editing guides, and a contribution checklist shipped alongside the code.",
      },
    ],
  },
  {
    number: "05",
    slug: "vidzee",
    name: "Vidzee",
    tags: [CARD_TAGS.ai, CARD_TAGS.website, CARD_TAGS.design],
    image: "/images/case-vidzee.jpg",
    heroImage: "/images/case-vidzee.jpg",
    metaTitle: "Vidzee",
    metaDescription:
      "A generative video product: an editing interface and marketing site built around a single, fast workflow.",
    headline: "Vidzee.",
    tagline: "Listing photos, into cinematic video.",
    summary:
      "Vidzee turns a handful of property photos into a polished video tour. We designed the generation flow and the editing surface, then built the marketing site that explains it in one screen — because the product's value is only believable when the output is on display.",
    tech: ["Next.js", "TypeScript", "Python", "FFmpeg", "S3", "OpenAI"],
    duration: "9 weeks to a public beta.",
    focusAreas: [
      "Generative workflow design",
      "Timeline & preview UI",
      "Job queue architecture",
      "Product marketing site",
    ],
    engagement: "Product design, frontend engineering, and pipeline integration.",
    sections: [
      {
        title: "One flow, no menus",
        body: "Upload, choose a style, adjust the beat, export. We removed every control that did not change the output and kept the three that did, so a first-time user can produce a publishable tour in under five minutes.",
        image: "/images/case/vidzee-detail.jpg",
      },
      {
        title: "Honest progress",
        body: "Generation takes time, so the interface shows what is actually happening — analysing photos, matching music, rendering scenes — with an accurate estimate rather than a fake spinner.",
      },
      {
        title: "Show the output",
        body: "The marketing site leads with finished videos, not feature grids. A comparison slider lets visitors see the source photos and the result in the same frame.",
      },
    ],
    stats: [
      { title: "4.2 min", body: "Median time from upload to a finished video." },
      { title: "3 controls", body: "The entire creative surface, deliberately." },
      { title: "82% export rate", body: "Sessions that end in a downloaded video." },
    ],
    howItWorks: [
      {
        title: "Queue, don't block",
        body: "Render jobs run in a worker pool with progress events streamed to the client, so the tab can close and resume without losing work.",
      },
      {
        title: "Style as data",
        body: "Music, pacing, and transitions are described as presets rather than hard-coded, letting the team ship new looks without a release.",
      },
      {
        title: "Preview at cost",
        body: "Low-resolution previews render first; the full export only runs after the user approves, keeping compute spend proportional to intent.",
      },
    ],
  },
  {
    number: "06",
    slug: "feature",
    name: "Feature",
    tags: [CARD_TAGS.design],
    image: "/images/case-feature.jpg",
    heroImage: "/images/case-feature.jpg",
    metaTitle: "Feature",
    metaDescription:
      "A mobile-first product design engagement: research, flows, and a design system for a consumer finance app.",
    headline: "Feature.",
    tagline: "Money, made legible.",
    summary:
      "Feature is a consumer finance app whose numbers were technically correct and emotionally unreadable. We rebuilt the experience around comprehension — one primary figure per screen, plain-language explanations, and a design system the team could extend without a designer in the room.",
    tech: ["Figma", "Framer", "Storybook", "React Native"],
    duration: "7 weeks of design, then two sprints of build support.",
    focusAreas: [
      "User research",
      "Information hierarchy",
      "Design system",
      "Accessible data visualisation",
    ],
    engagement: "Research, product design, design system, and engineering pairing.",
    sections: [
      {
        title: "Read the number first",
        body: "Interviews surfaced the same complaint repeatedly: people could not tell whether they were fine. Every screen now answers one question with one number, and the detail lives a tap away rather than competing for attention.",
        image: "/images/case/feature-detail.jpg",
      },
      {
        title: "Colour that means something",
        body: "A strict semantic palette replaced decorative gradients. Status colour is reserved for status, and every state is also labelled in text — the interface still works in greyscale.",
      },
      {
        title: "A system the team owns",
        body: "Tokens, components, and usage notes were handed over in Storybook, with a recorded walkthrough. Two months later the team had shipped three features without a designer.",
      },
    ],
    stats: [
      { title: "+27% task success", body: "Unmoderated usability testing, before and after." },
      { title: "34 components", body: "Documented, tokenised, and shipped in Storybook." },
      { title: "0 design tickets", body: "For the first three features after handover." },
    ],
    howItWorks: [
      {
        title: "Start with the question",
        body: "Each screen is defined by the one question it answers, written down before any layout work begins.",
      },
      {
        title: "Test in a week",
        body: "Prototypes went to five users every week, so we learned cheaply and often instead of validating at the end.",
      },
      {
        title: "Handover as a workshop",
        body: "The engineering team built two components with us during the final sprint, so the system's intent survived the transition.",
      },
    ],
  },
];

export function getCaseStudy(slug: string): CaseStudy | undefined {
  return CASE_STUDIES.find((study) => study.slug === slug);
}

export function getNextCaseStudy(slug: string): CaseStudy {
  const index = CASE_STUDIES.findIndex((study) => study.slug === slug);
  return CASE_STUDIES[(index + 1) % CASE_STUDIES.length];
}
