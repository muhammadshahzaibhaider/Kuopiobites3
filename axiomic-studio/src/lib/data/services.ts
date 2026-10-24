export type ToolId =
  | "figma"
  | "framer"
  | "webflow"
  | "react"
  | "next"
  | "node"
  | "flutter"
  | "docker"
  | "typescript"
  | "openai"
  | "pytorch"
  | "langchain"
  | "supabase"
  | "livekit"
  | "pinecone"
  | "twilio"
  | "aws"
  | "fhir";

export type Tool = { id: ToolId; name: string };

export type ServiceDeliverable = { title: string; body: string };
export type ServicePhase = { title: string; body: string };
export type Faq = { question: string; answer: string };

export type Service = {
  number: string;
  slug: string;
  title: string;
  /** One-liner used inside the navbar mega-menu. */
  short: string;
  /** Card copy on the home page. */
  description: string;
  /** Four bullet items on the home page card. */
  services: string[];
  tools: Tool[];

  /* ── Service detail page ── */
  metaTitle: string;
  metaDescription: string;
  hero: {
    headline: [string, string];
    lede: string;
    support: string;
  };
  whatsIncludedBlurb: string;
  deliverables: ServiceDeliverable[];
  processBlurb: string;
  process: ServicePhase[];
  /** "Built with" list on the detail page. */
  stack: string[];
  faqs: Faq[];
  ctaHeadline: string;
  ctaBody: string;
};

export const SERVICES: Service[] = [
  {
    number: "01",
    slug: "ui-ux-design",
    title: "UI/UX Design",
    short: "Research, flows, UI systems",
    description:
      "End-to-end product design — research, UX flows, polished UI systems, and developer-ready handoff.",
    services: [
      "User Research & Strategy",
      "UX Flows & Wireframes",
      "UI Systems & Prototypes",
      "Design Ops & Dev Handoff",
    ],
    tools: [
      { id: "figma", name: "Figma" },
      { id: "framer", name: "Framer" },
      { id: "webflow", name: "Webflow" },
    ],
    metaTitle: "UI/UX Design",
    metaDescription:
      "Product design from research and flows to polished UI systems and developer-ready handoff.",
    hero: {
      headline: ["You think it.", "We design it."],
      lede: "Research, flows, and UI systems with dev-ready handoff. Design that turns ideas into experiences people love.",
      support:
        "From research and flows to polished UI systems and developer-ready handoff — product design that turns complex ideas into experiences people love.",
    },
    whatsIncludedBlurb:
      "End-to-end product design — not just screens, but the research, systems, and handoff that make them shippable.",
    deliverables: [
      {
        title: "User Research & Strategy",
        body: "Interviews, journey mapping, and competitive analysis that ground every design decision in real user needs and business goals.",
      },
      {
        title: "UX Flows & Wireframes",
        body: "Information architecture, task flows, and low-fi wireframes that validate structure before a single pixel is polished.",
      },
      {
        title: "UI Systems & Prototypes",
        body: "Component libraries, design tokens, and high-fidelity prototypes your team can test, iterate on, and ship from.",
      },
      {
        title: "Visual Design & Brand",
        body: "Typography, color, iconography, and layout systems that feel cohesive across web, mobile, and marketing surfaces.",
      },
      {
        title: "Interaction Design",
        body: "Micro-interactions, states, and motion specs that guide users through complex workflows without friction.",
      },
      {
        title: "Design Ops & Dev Handoff",
        body: "Figma specs, Storybook entries, and engineering-ready documentation so build teams move fast without guesswork.",
      },
    ],
    processBlurb:
      "A focused 4-phase sprint. Most product design engagements land in 6–10 weeks.",
    process: [
      {
        title: "Discover",
        body: "Stakeholder workshops, user interviews, and an audit of existing flows. We leave with a clear problem statement and success metrics.",
      },
      {
        title: "Define",
        body: "Personas, journey maps, and information architecture. Wireframes validate structure before visual design begins.",
      },
      {
        title: "Design",
        body: "High-fidelity UI, component systems, and interactive prototypes. Stakeholders sign off on the experience, not static mocks.",
      },
      {
        title: "Deliver",
        body: "Engineering-ready specs, design tokens, and optional pair sessions with your dev team through launch.",
      },
    ],
    stack: ["Figma", "FigJam", "Framer", "Storybook", "Lottie", "Zeroheight"],
    faqs: [
      {
        question: "How long does a typical UI/UX project take?",
        answer:
          "Most product design engagements run 6–10 weeks from kickoff. Larger platform redesigns or multi-product systems can run 12–16 weeks. You get a detailed schedule before the first invoice.",
      },
      {
        question: "Do you only design, or do you build too?",
        answer:
          "Both. Design and engineering sit in the same team, so the handoff is a conversation rather than a document drop. Many clients keep us through build and launch.",
      },
      {
        question: "What does pricing look like?",
        answer:
          "Fixed-scope sprints are priced per phase, so you always know what a milestone costs. Ongoing design partnerships are billed monthly with a rolling two-week notice.",
      },
      {
        question: "Can you work with our existing design system?",
        answer:
          "Yes. We can extend your current library, audit and modernise it, or build a new one that maps cleanly onto your component code.",
      },
      {
        question: "Do you conduct user research?",
        answer:
          "Whenever the budget allows. Even a short five-interview round changes the design more than a week of guessing, and we recommend it on every product engagement.",
      },
    ],
    ctaHeadline: "Ready for a product users actually love?",
    ctaBody:
      "Tell us about the problem you're solving. We'll come back with an approach and timeline within 48 hours.",
  },
  {
    number: "02",
    slug: "website-design",
    title: "Website Design",
    short: "Identity, art direction, motion",
    description:
      "Brand-led, conversion-tuned websites — identity, art direction, motion, and storytelling that match the brand.",
    services: [
      "Brand & Visual Identity",
      "Art Direction & Storytelling",
      "Motion & Micro-interactions",
      "Conversion Design Systems",
    ],
    tools: [
      { id: "figma", name: "Figma" },
      { id: "framer", name: "Framer" },
      { id: "webflow", name: "Webflow" },
    ],
    metaTitle: "Website Design",
    metaDescription:
      "Brand-led, conversion-tuned website design: identity, art direction, motion, and storytelling.",
    hero: {
      headline: ["Sites that feel", "like the brand."],
      lede: "Brand-led, conversion-tuned websites — identity, art direction, motion, and storytelling that match the brand.",
      support:
        "We design marketing sites that carry a point of view: a clear story, a confident visual system, and motion that guides rather than decorates.",
    },
    whatsIncludedBlurb:
      "A complete marketing surface — story, system, and the components your team will reuse long after launch.",
    deliverables: [
      {
        title: "Brand & Visual Identity",
        body: "Logo systems, typography, color, and art direction that give the site a distinct, ownable look from the first scroll.",
      },
      {
        title: "Art Direction & Storytelling",
        body: "Narrative structure, page sequencing, and imagery direction that make the value obvious without a wall of copy.",
      },
      {
        title: "Motion & Micro-interactions",
        body: "Scroll choreography, hover states, and transition specs that add polish while staying fast and accessible.",
      },
      {
        title: "Conversion Design Systems",
        body: "Reusable sections, CTA patterns, and form flows tuned to the moments where visitors decide to talk to you.",
      },
      {
        title: "Responsive Craft",
        body: "Component-level layouts for phone, tablet, and large desktop — designed on a real grid, not a shrunken mockup.",
      },
      {
        title: "Design-to-Build Handoff",
        body: "Tokenised styles, annotated components, and a build review pass so the live site matches the design.",
      },
    ],
    processBlurb:
      "Two discovery weeks, then design in the browser. Most marketing sites launch in 4–8 weeks.",
    process: [
      {
        title: "Position",
        body: "Audience, competitors, and proof. We agree on the single idea the site has to land and how success gets measured.",
      },
      {
        title: "Direction",
        body: "Two art-direction routes with real copy, not lorem ipsum. You pick a direction before we design every page.",
      },
      {
        title: "Design",
        body: "Page-by-page design with the component system built alongside, reviewed in weekly working sessions.",
      },
      {
        title: "Launch",
        body: "Build support, QA across breakpoints, performance pass, and a short handover of the system your team inherits.",
      },
    ],
    stack: ["Figma", "Framer", "Webflow", "After Effects", "Lottie", "Spline"],
    faqs: [
      {
        question: "Do you write the copy?",
        answer:
          "We write the structural copy and partner with your team or a copywriter on long-form messaging. Either way, we design with real words, never placeholders.",
      },
      {
        question: "Can you redesign without losing our SEO?",
        answer:
          "Yes. We map existing URLs, preserve rankings with redirects, and keep semantic structure intact through the rebuild.",
      },
      {
        question: "How many design revisions are included?",
        answer:
          "Two rounds per page type are included. Because we review in weekly sessions, most feedback is resolved before it becomes a revision.",
      },
      {
        question: "Do you design in Figma or in code?",
        answer:
          "Figma for the system and exploration, then we validate the real thing in the browser. Final motion and spacing decisions happen where users will see them.",
      },
      {
        question: "What if we already have a brand?",
        answer:
          "Then we extend it. We can work strictly inside your guidelines or propose a light refresh if the current identity is holding the site back.",
      },
    ],
    ctaHeadline: "Ready for a site that looks like you?",
    ctaBody:
      "Send us the brand and the goal. We'll reply with a direction, a page plan, and a timeline within 48 hours.",
  },
  {
    number: "03",
    slug: "web-development",
    title: "Web Development",
    short: "React, Next.js, Node, edge infra",
    description:
      "Production-grade Next.js, headless CMS, edge infra — SEO, accessibility, and Core Web Vitals built in from day one.",
    services: [
      "Frontend Platforms (React / Next)",
      "Backend APIs & Microservices (Node)",
      "Mobile & Cross-platform (Flutter)",
      "CI/CD & Cloud Ops (Docker)",
    ],
    tools: [
      { id: "react", name: "React" },
      { id: "next", name: "Next.js" },
      { id: "node", name: "Node" },
      { id: "flutter", name: "Flutter" },
      { id: "docker", name: "Docker" },
    ],
    metaTitle: "Web Development",
    metaDescription:
      "Production-grade React and Next.js engineering with SEO, accessibility, and Core Web Vitals built in.",
    hero: {
      headline: ["Built to ship.", "Built to last."],
      lede: "Production-grade Next.js, headless CMS, edge infra — SEO, accessibility, and Core Web Vitals built in from day one.",
      support:
        "We build the front end and the platform behind it: typed code, tested flows, and infrastructure your team can operate without us.",
    },
    whatsIncludedBlurb:
      "Full-stack delivery with the boring parts done properly — types, tests, observability, and documentation.",
    deliverables: [
      {
        title: "Frontend Platforms (React / Next)",
        body: "App Router architecture, server components where they help, and a component library that matches the design system exactly.",
      },
      {
        title: "Backend APIs & Microservices (Node)",
        body: "Typed contracts, input validation, and datastore design that keep the surface area small and the failure modes obvious.",
      },
      {
        title: "Mobile & Cross-platform (Flutter)",
        body: "One codebase for iOS and Android when a native app is the right answer, sharing the same API and design language.",
      },
      {
        title: "CI/CD & Cloud Ops (Docker)",
        body: "Reproducible builds, preview deployments, environment parity, and monitoring so releases stop being events.",
      },
      {
        title: "Performance & SEO Engineering",
        body: "Core Web Vitals budgets, structured data, sitemaps, and image pipelines treated as product requirements, not cleanup.",
      },
      {
        title: "Accessibility & QA",
        body: "Keyboard paths, focus management, screen-reader checks, and automated tests in CI so regressions get caught early.",
      },
    ],
    processBlurb:
      "Short discovery, then two-week increments with a working preview at the end of every one.",
    process: [
      {
        title: "Architect",
        body: "Data model, routes, integration map, and a written decision record for the choices that will be expensive to reverse.",
      },
      {
        title: "Build",
        body: "Vertical slices end to end — a real page, real data, real deploy — rather than layers that only meet at the end.",
      },
      {
        title: "Harden",
        body: "Error states, empty states, auth boundaries, rate limits, analytics events, and the test suite that protects them.",
      },
      {
        title: "Operate",
        body: "Monitoring, runbooks, and a handover session. We stay on call through the first weeks of traffic.",
      },
    ],
    stack: ["TypeScript", "React", "Next.js", "Node", "PostgreSQL", "Docker", "Vercel"],
    faqs: [
      {
        question: "Which stack do you recommend?",
        answer:
          "TypeScript, React, and Next.js for most products, Node for services, PostgreSQL for data, and a managed platform for hosting. We pick boring technology on purpose unless a requirement says otherwise.",
      },
      {
        question: "Can you take over an existing codebase?",
        answer:
          "Yes. We start with a short audit — dependency risk, test coverage, performance, and deployment health — then agree on a stabilisation plan before adding features.",
      },
      {
        question: "How do you handle accessibility?",
        answer:
          "WCAG 2.2 AA is the baseline. Semantic markup, visible focus, keyboard-complete flows, and automated checks in CI, with manual screen-reader passes on key journeys.",
      },
      {
        question: "Who owns the code?",
        answer:
          "You do, from the first commit. It lives in your repository, on your accounts, with documentation and a handover session at the end of the engagement.",
      },
      {
        question: "Do you provide ongoing support?",
        answer:
          "Yes. Most clients keep a monthly retainer for improvements, dependency updates, and monitoring response, with an agreed response window.",
      },
    ],
    ctaHeadline: "Ready for an engineering partner?",
    ctaBody:
      "Share your roadmap or the thing that keeps breaking. We'll propose an architecture and a first increment.",
  },
  {
    number: "04",
    slug: "ai-development",
    title: "AI Development",
    short: "LLM apps, evals, guardrails",
    description:
      "Production-ready AI — rapid prototyping to deployed models with solid evals, observability, and safety.",
    services: [
      "LLM Apps & Agents (RAG / Tools)",
      "Fine-tuning & Prompt Optimization",
      "Model Evals, Guardrails & Monitoring",
      "Vision, NLP & Speech Pipelines",
    ],
    tools: [
      { id: "openai", name: "OpenAI" },
      { id: "pytorch", name: "PyTorch" },
      { id: "langchain", name: "LangChain" },
      { id: "supabase", name: "Supabase" },
    ],
    metaTitle: "AI Development",
    metaDescription:
      "Production-ready AI: LLM apps, RAG, fine-tuning, evaluation, guardrails, and observability.",
    hero: {
      headline: ["From prototype", "to production AI."],
      lede: "Production-ready AI — rapid prototyping to deployed models with solid evals, observability, and safety.",
      support:
        "We build AI features that behave the same on the ten-thousandth request as they did in the demo, with the evaluation and monitoring to prove it.",
    },
    whatsIncludedBlurb:
      "The full path from a promising prototype to a system with numbers behind it, plus the guardrails to keep it there.",
    deliverables: [
      {
        title: "LLM Apps & RAG",
        body: "Retrieval pipelines, chunking strategy, and grounding that keep answers accurate and traceable to source documents.",
      },
      {
        title: "Agents & Tool Use",
        body: "Narrow, permissioned tools with validated inputs, plus the orchestration layer that decides when to stop, retry, or escalate.",
      },
      {
        title: "Fine-tuning & Prompt Optimization",
        body: "When prompting stalls, we build the dataset, run the training job, and measure whether the tuned model actually earns its cost.",
      },
      {
        title: "Evaluation & Guardrails",
        body: "Golden datasets, regression suites, output checks, and human review queues — the parts that turn a demo into a product.",
      },
      {
        title: "Vision, NLP & Speech",
        body: "Document extraction, classification, transcription, and voice interfaces wired into the workflows people already use.",
      },
      {
        title: "Observability & Cost Control",
        body: "Traces, latency and spend dashboards, caching, and model routing so quality and unit economics stay visible.",
      },
    ],
    processBlurb:
      "One week to a working prototype, then a measurable path to production.",
    process: [
      {
        title: "Frame",
        body: "Define the task, the acceptable error rate, and the cost ceiling. A use case without a number is a hobby, not a project.",
      },
      {
        title: "Prototype",
        body: "A working end-to-end slice on real data within the first week, so the team can judge output quality early.",
      },
      {
        title: "Evaluate",
        body: "Build the eval set, measure baselines, and iterate on retrieval, prompting, or fine-tuning until the numbers hold.",
      },
      {
        title: "Ship & Watch",
        body: "Deploy behind flags with human-in-the-loop where it matters, then monitor drift, cost, and escalation rates.",
      },
    ],
    stack: ["Python", "TypeScript", "OpenAI", "PyTorch", "pgvector", "LangChain", "LangSmith"],
    faqs: [
      {
        question: "RAG or fine-tuning?",
        answer:
          "Start with retrieval plus prompting. It is cheaper, updates with your data, and is auditable. Fine-tune when the problem is behaviour or tone rather than knowledge.",
      },
      {
        question: "How do you measure quality?",
        answer:
          "A task-specific eval set built with your team, scored automatically where possible and by humans where it matters. Every release runs against it.",
      },
      {
        question: "What does it cost to run?",
        answer:
          "Depends on volume, model mix, and context size. We instrument spend per task from week one and design caching and routing to keep it predictable.",
      },
      {
        question: "Can our data stay private?",
        answer:
          "Yes. We work with providers that do not train on your data, deploy in your cloud when required, and keep PII out of prompts by design.",
      },
      {
        question: "Do you handle compliance?",
        answer:
          "We build the audit logs, access controls, and data-retention rules your policy requires, and document model behaviour for review.",
      },
    ],
    ctaHeadline: "Ready to put AI to work?",
    ctaBody:
      "Bring us the workflow, not the buzzword. We'll scope a prototype and tell you honestly whether AI is the right tool.",
  },
  {
    number: "05",
    slug: "ai-agents",
    title: "AI Agents",
    short: "Voice & tool-using automation",
    description:
      "Autonomous voice and tool-using agents that handle real workflows — call centers, scheduling, research, and end-to-end task automation.",
    services: [
      "Voice Agents & Call Centers",
      "Tool-using LLM Agents",
      "Multi-provider Orchestration",
      "Knowledge Base & Memory",
    ],
    tools: [
      { id: "livekit", name: "LiveKit" },
      { id: "pinecone", name: "Pinecone" },
      { id: "twilio", name: "Twilio" },
      { id: "typescript", name: "TypeScript" },
    ],
    metaTitle: "AI Agents",
    metaDescription:
      "Voice and tool-using AI agents for real workflows: call centers, scheduling, research, and task automation.",
    hero: {
      headline: ["Agents that", "do the work."],
      lede: "Autonomous voice and tool-using agents that handle real workflows — call centers, scheduling, research, and end-to-end task automation.",
      support:
        "We deploy agents into the unglamorous middle of your operations, with the guardrails and escalation paths that make autonomy safe.",
    },
    whatsIncludedBlurb:
      "Agents wired into your systems, not a chat window bolted to the side of them.",
    deliverables: [
      {
        title: "Voice Agents & Call Handling",
        body: "Low-latency speech pipelines, interruption handling, and warm transfers to humans when the conversation leaves the script.",
      },
      {
        title: "Tool-using LLM Agents",
        body: "Narrow, versioned tools with validated inputs so every action has a known blast radius and a clear audit trail.",
      },
      {
        title: "Multi-provider Orchestration",
        body: "Model routing and failover across providers so a single outage or price change does not take the workflow down.",
      },
      {
        title: "Knowledge Base & Memory",
        body: "Retrieval over your policies and history, with per-customer memory that stays accurate and expires when it should.",
      },
      {
        title: "Human-in-the-loop",
        body: "Draft-and-approve modes, review queues, and per-task graduation so autonomy is earned rather than switched on.",
      },
      {
        title: "Monitoring & Evals",
        body: "Decision logs in plain language, escalation dashboards, and eval suites that run on every prompt or model change.",
      },
    ],
    processBlurb:
      "Pick one bounded workflow, run it in shadow mode, then graduate task types as the numbers prove out.",
    process: [
      {
        title: "Map",
        body: "Observe the real workflow and its edge cases. We choose tasks by volume, rule clarity, and the cost of getting them wrong.",
      },
      {
        title: "Shadow",
        body: "The agent proposes, your team approves. We collect labelled decisions and fix context gaps before any autonomy goes live.",
      },
      {
        title: "Graduate",
        body: "Task types that clear the accuracy bar move to one-click, then to full autonomy, with a human gate kept on the rest.",
      },
      {
        title: "Scale",
        body: "Add channels, languages, and integrations while the eval suite and dashboards keep quality from drifting.",
      },
    ],
    stack: ["LiveKit", "Twilio", "OpenAI", "Pinecone", "Redis", "Next.js"],
    faqs: [
      {
        question: "How accurate are voice agents today?",
        answer:
          "For bounded, well-documented intents, very good. For open-ended conversation in noisy environments, you still need transfer logic. We design around that instead of pretending otherwise.",
      },
      {
        question: "What happens when the agent is unsure?",
        answer:
          "It says so and escalates. An agent that recognises uncertainty and routes to a person is more valuable than one that guesses confidently.",
      },
      {
        question: "Can it use our internal tools?",
        answer:
          "Yes, through scoped integrations with least-privilege credentials. Each tool gets explicit permissions and input validation.",
      },
      {
        question: "How do you prevent costly mistakes?",
        answer:
          "Value and frequency caps, approval gates on expensive actions, sandbox modes for testing, and a documented worst-case scenario for every action an agent can take.",
      },
      {
        question: "How fast can we go live?",
        answer:
          "A shadow-mode pilot on one workflow typically runs 3–5 weeks. Full autonomy is a later phase, decided by your data rather than the calendar.",
      },
    ],
    ctaHeadline: "Ready to hire your first agent?",
    ctaBody:
      "Show us the workflow your team repeats every day. We'll tell you which parts an agent can own and which stay human.",
  },
  {
    number: "06",
    slug: "healthcare-apps",
    title: "Healthcare Apps",
    short: "HIPAA telehealth & EHR integrations",
    description:
      "Secure, compliant healthcare software — telehealth, EHR integrations, and clinician tools, built for HIPAA and auditability.",
    services: [
      "HIPAA & PHI Compliance",
      "Telehealth & Patient Portals",
      "EHR Integrations (FHIR / HL7)",
      "Audit Logging & Access Controls",
    ],
    tools: [
      { id: "fhir", name: "FHIR" },
      { id: "aws", name: "AWS" },
      { id: "twilio", name: "Twilio" },
      { id: "next", name: "Next.js" },
    ],
    metaTitle: "Healthcare Apps",
    metaDescription:
      "Secure, compliant healthcare software: telehealth, patient portals, FHIR/HL7 integrations, and auditable access.",
    hero: {
      headline: ["Clinical software", "clinicians trust."],
      lede: "Secure, compliant healthcare software — telehealth, EHR integrations, and clinician tools, built for HIPAA and auditability.",
      support:
        "We build for the realities of care delivery: busy clinicians, strict privacy rules, and systems that cannot lose a message.",
    },
    whatsIncludedBlurb:
      "Compliance is a design constraint, not a phase at the end. Every decision is made with PHI handling in mind.",
    deliverables: [
      {
        title: "HIPAA & PHI Compliance",
        body: "Minimum-necessary data flows, encryption in transit and at rest, retention rules, and a documented security posture for review.",
      },
      {
        title: "Telehealth & Patient Portals",
        body: "Scheduling, video visits, messaging, and results — accessible on the phones patients actually own.",
      },
      {
        title: "EHR Integrations (FHIR / HL7)",
        body: "Bidirectional sync with the systems of record, versioned contracts, and reconciliation for the messages that fail.",
      },
      {
        title: "Clinician Workflow Tools",
        body: "Charting, triage, and handoff screens designed alongside the people who will use them at 2am.",
      },
      {
        title: "Audit Logging & Access Controls",
        body: "Role-based access, break-glass flows, and immutable audit trails that hold up in a compliance review.",
      },
      {
        title: "Accessibility & Reliability",
        body: "WCAG-conscious interfaces, uptime targets, and graceful degradation when a third-party service goes down.",
      },
    ],
    processBlurb:
      "Discovery with compliance and clinical stakeholders, then incremental delivery with a security review before launch.",
    process: [
      {
        title: "Assess",
        body: "Threat model, data-flow mapping, and a build-vs-buy review of the systems you already pay for.",
      },
      {
        title: "Design",
        body: "Flows co-designed with clinicians and patients, including the unhappy paths that occur daily in care settings.",
      },
      {
        title: "Build & Validate",
        body: "Secure engineering with audit logging from the first commit, tested against synthetic PHI throughout.",
      },
      {
        title: "Launch & Assure",
        body: "Security review, penetration test coordination, staff training materials, and post-launch monitoring.",
      },
    ],
    stack: ["Next.js", "TypeScript", "PostgreSQL", "FHIR", "HL7", "AWS", "Twilio"],
    faqs: [
      {
        question: "Do you sign BAAs?",
        answer:
          "Yes. We sign business associate agreements with our clients and work only with subprocessors who will do the same.",
      },
      {
        question: "Can you integrate with our EHR?",
        answer:
          "If it exposes FHIR or HL7, usually. For systems with only vendor-specific APIs, we scope the integration during discovery before committing to a timeline.",
      },
      {
        question: "How do you test without real patient data?",
        answer:
          "Synthetic datasets that preserve the awkward edge cases, plus a staging environment with production-like configuration and no PHI.",
      },
      {
        question: "What about accessibility requirements?",
        answer:
          "We target WCAG 2.2 AA and follow Section 508 expectations, with manual testing on assistive technology for core patient journeys.",
      },
      {
        question: "Do you support audit reviews?",
        answer:
          "We provide architecture documentation, data-flow diagrams, and access-control evidence, and we can join calls with your compliance team.",
      },
    ],
    ctaHeadline: "Ready to build for better care?",
    ctaBody:
      "Tell us about the clinical workflow and the constraint that scares you most. We'll come back with a safe path to launch.",
  },
];

export function getService(slug: string): Service | undefined {
  return SERVICES.find((service) => service.slug === slug);
}

export const SERVICE_LINKS = SERVICES.map((service) => ({
  label: service.title,
  href: `/services/${service.slug}`,
}));
