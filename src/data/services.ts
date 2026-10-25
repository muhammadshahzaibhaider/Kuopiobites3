export interface ServicePhase {
  number: string;
  title: string;
  duration: string;
  description: string;
  deliverables: string[];
}

export interface ServiceFAQ {
  question: string;
  answer: string;
}

export interface ServiceItem {
  id: string;
  slug: string;
  title: string;
  badge: string;
  heroHeadline: string;
  shortDesc: string;
  longDesc: string;
  iconName: string;
  metrics: string;
  deliverables: { title: string; description: string }[];
  processPhases: ServicePhase[];
  faqs: ServiceFAQ[];
  tools: string[];
}

export const servicesData: ServiceItem[] = [
  {
    id: "ui-ux-design",
    slug: "ui-ux-design",
    title: "UI/UX Design",
    badge: "Product Strategy",
    heroHeadline: "Precision Interfaces for Complex Workflows",
    shortDesc:
      "Human-centered interfaces, telemetry dashboards, and design systems focused on clarity and speed.",
    longDesc:
      "We explore interface patterns for high-consequence environments — from operations dashboards to AI assistants — balancing information density with calm, accessible interaction design.",
    iconName: "Layout",
    metrics: "Designed to meet WCAG 2.1 AA contrast targets",
    deliverables: [
      { title: "Research & Journey Mapping", description: "Task-flow audits and operator interviews to clarify mental models and edge states." },
      {
        title: "Flows & Wireframes",
        description: "State diagrams covering success, empty, error, and offline scenarios.",
      },
      {
        title: "Design System & Prototypes",
        description: "Tokenized components and interactive prototypes for stakeholder review.",
      },
      {
        title: "Visual Direction",
        description: "Type, color, and spacing foundations tuned for dark-mode ergonomics and accessibility.",
      },
      { title: "Motion Guidance", description: "Transition specs that aid orientation without distracting from tasks." },
      { title: "Handoff & Documentation", description: "Specs and breakpoint guidance to align design and engineering." },
    ],
    processPhases: [
      {
        number: "01",
        title: "Discover & Scope",
        duration: "Weeks 1–2",
        description: "Align on journeys, constraints, and success criteria.",
        deliverables: ["PRD draft", "Architecture map", "Heuristic audit"],
      },
      {
        number: "02",
        title: "Architecture & Wireframes",
        duration: "Weeks 3–4",
        description: "Map flows and validate with low-fidelity tests.",
        deliverables: ["Clickable wireframe", "State diagram", "Accessibility baseline"],
      },
      {
        number: "03",
        title: "Visual System & Prototypes",
        duration: "Weeks 5–6",
        description: "Build polished components and interaction choreography.",
        deliverables: ["Figma system", "High-fidelity prototype", "Component matrix"],
      },
      {
        number: "04",
        title: "Handoff & QA",
        duration: "Weeks 7–8",
        description: "Sync tokens to code and review builds for fidelity.",
        deliverables: ["Component specs", "Review checklist", "Accessibility review"],
      },
    ],
    faqs: [
      {
        question: "How do design tokens reach production?",
        answer:
          "We use a token pipeline that exports Figma variables into Tailwind config and CSS custom properties. Engineers consume the same scale in code, so spacing, color, and type stay consistent.",
      },
      {
        question: "Can you handle data-dense enterprise UIs?",
        answer:
          "Yes — our workshops focus on density, scanning, and zero visual fatigue, but final suitability depends on user testing with your operators and domain experts.",
      },
    ],
    tools: ["Figma", "Tailwind CSS", "Storybook", "Radix UI", "Framer Motion"],
  },
  {
    id: "website-design",
    slug: "website-design",
    title: "Website Design",
    badge: "Brand & Motion",
    heroHeadline: "Digital Flagships That Explain Complex Products Clearly",
    shortDesc: "Narrative-driven sites with editorial layout, motion, and performance budgets.",
    longDesc:
      "We shape digital flagships that make technical products understandable. Layout, motion, and copy work together to establish credibility while keeping pages fast and accessible.",
    iconName: "Globe",
    metrics: "Aims for Lighthouse 95+ and <1s LCP (per-project verification required)",
    deliverables: [
      { title: "Identity & Direction", description: "Positioning and visual language foundations." },
      { title: "Editorial Layouts", description: "Story flow and hierarchy for authority and clarity." },
      { title: "Motion & Interactions", description: "Scroll-linked reveals and canvas accents that respect reduced-motion." },
      { title: "Conversion Structure", description: "Intent-driven navigation and contextual CTAs." },
      { title: "Performance Budget", description: "CLS/LCP targets and asset strategy documented up front." },
      { title: "Iterative Refinement", description: "Heuristic reviews and stakeholder feedback loops." },
    ],
    processPhases: [
      {
        number: "01",
        title: "Positioning & Strategy",
        duration: "Week 1",
        description: "Define edge, audience, and conversion goals.",
        deliverables: ["Creative brief", "Moodboard", "Sitemap"],
      },
      {
        number: "02",
        title: "Concepting",
        duration: "Weeks 2–3",
        description: "Explore directions and hero treatments.",
        deliverables: ["Art directions", "Hero prototype", "Narrative draft"],
      },
      {
        number: "03",
        title: "Responsive Layouts",
        duration: "Weeks 4–5",
        description: "Design desktop, tablet, and mobile with motion specs.",
        deliverables: ["Responsive pages", "Motion guide", "Asset list"],
      },
      {
        number: "04",
        title: "QA & Launch Prep",
        duration: "Weeks 6–7",
        description: "Review fidelity and performance checkpoints.",
        deliverables: ["QA audit", "Performance check", "Launch checklist"],
      },
    ],
    faqs: [
      {
        question: "How do you keep motion performant?",
        answer:
          "We cap canvas work to lightweight shaders that pause off-screen, use modern image formats, and avoid third-party bloat. Every project sets a performance budget and tests against it.",
      },
      {
        question: "Do you handle copy and imagery?",
        answer:
          "We can draft technical copy and create iconography with your team, refining tone through review cycles to match your audience.",
      },
    ],
    tools: ["Next.js", "Tailwind CSS", "Figma", "GSAP", "Lenis Scroll"],
  },
  {
    id: "website-development",
    slug: "website-development",
    title: "Web Development",
    badge: "Next.js & Edge",
    heroHeadline: "Modern Web Platforms That Ship and Scale",
    shortDesc: "App Router, server components, and edge caching — built with accessibility in mind.",
    longDesc:
      "We build modern web apps with type-safe APIs, streaming server components, and resilient data sources for consistent global performance.",
    iconName: "Cpu",
    metrics: "Edge delivery targets documented per environment — verify in your infra",
    deliverables: [
      { title: "App Router Architecture", description: "Streaming RSC and instant hydration where beneficial." },
      { title: "Headless CMS Integration", description: "Connectors for common CMS and commerce stacks." },
      { title: "APIs & Realtime", description: "Typed contracts and WebSocket patterns for collaborative state." },
      { title: "Offline & Responsive", description: "Graceful fallbacks and mobile ergonomics." },
      { title: "SEO & Caching", description: "Metadata, structured data, and CDN strategy." },
      { title: "Security Baseline", description: "CSP, audit, and CI checks as a starting point — not a certification." },
    ],
    processPhases: [
      {
        number: "01",
        title: "Architecture & Scaffolding",
        duration: "Week 1",
        description: "Set repo standards and CI pipelines.",
        deliverables: ["Monorepo setup", "Schema models", "CI/CD pipelines"],
      },
      {
        number: "02",
        title: "Components & Data Layer",
        duration: "Weeks 2–4",
        description: "Build primitives, endpoints, and caching.",
        deliverables: ["React components", "API contracts", "CMS hydration"],
      },
      {
        number: "03",
        title: "Integration & Tuning",
        duration: "Weeks 5–6",
        description: "Optimize waterfalls and verify under load.",
        deliverables: ["Load reports", "Cache verification", "SEO validation"],
      },
      {
        number: "04",
        title: "Deployment & Handoff",
        duration: "Week 7",
        description: "DNS, previews, and docs.",
        deliverables: ["Cutover plan", "Architecture docs", "Monitoring plan"],
      },
    ],
    faqs: [
      {
        question: "Why App Router?",
        answer:
          "Server components can reduce client JavaScript and enable streamed HTML, but the right balance depends on your content and interactivity needs.",
      },
      {
        question: "Can you integrate with existing backends?",
        answer:
          "Yes — we regularly connect to REST/gRPC services, databases, and SSO. We map contracts early to surface mismatches before building UI.",
      },
    ],
    tools: ["Next.js 14", "React 18", "TypeScript", "Tailwind CSS", "PostgreSQL", "Cloudflare Edge"],
  },
  {
    id: "ai-development",
    slug: "ai-development",
    title: "AI Development",
    badge: "Foundation Models",
    heroHeadline: "Production AI With Evaluation From Day One",
    shortDesc: "Custom RAG, fine-tuning, and evals — scoped to verifiable pipelines, not hype.",
    longDesc:
      "We help teams move AI from demo to dependable patterns: retrieval, adaptation, and evaluation with clear human oversight. No compliance or outcome guarantee is implied — evaluation is a practice, not a promise.",
    iconName: "Bot",
    metrics: "Latency and accuracy are measured per workload — no universal claim",
    deliverables: [
      { title: "RAG & Vector Search", description: "Chunking, retrieval, and reranking patterns for knowledge bases." },
      { title: "Adaptation & Quantization", description: "Lightweight adaptation workflows and hosting tradeoffs." },
      { title: "Evals & Guardrails", description: "Test suites and fallback strategies to catch regressions." },
      { title: "Multimodal Patterns", description: "Transcription, OCR, and vision prompts where relevant." },
      { title: "Observability", description: "Tracing and dashboards to reason about cost and quality." },
      { title: "Sizing & Runbooks", description: "Infra guidance and operational checklists." },
    ],
    processPhases: [
      {
        number: "01",
        title: "Data Audit & Baseline",
        duration: "Weeks 1–2",
        description: "Review hygiene and establish evaluation targets.",
        deliverables: ["Cleansing plan", "Golden dataset outline", "Feasibility note"],
      },
      {
        number: "02",
        title: "Prototype & Benchmarks",
        duration: "Weeks 3–4",
        description: "Compare models and retrieval strategies.",
        deliverables: ["RAG sandbox", "Comparison matrix", "Recall benchmark"],
      },
      {
        number: "03",
        title: "Hardening & Review",
        duration: "Weeks 5–7",
        description: "Add safety checks, redaction, and regression tests.",
        deliverables: ["Guardrail sketch", "Redaction draft", "Regression evals"],
      },
      {
        number: "04",
        title: "Deploy & Observe",
        duration: "Weeks 8–9",
        description: "Ship with telemetry and runbooks.",
        deliverables: ["Inference plan", "Dashboard outline", "Runbook draft"],
      },
    ],
    faqs: [
      {
        question: "How do you protect proprietary data?",
        answer:
          "We default to isolated perimeters like VPCs or on-prem clusters and document data flows. Independent review and contractual terms determine final privacy posture — this page makes no certification claim.",
      },
      {
        question: "RAG or fine-tuning?",
        answer:
          "RAG suits dynamic knowledge and citations; fine-tuning suits tone, syntax, or latency. We prototype both against your eval set before recommending.",
      },
    ],
    tools: ["PyTorch", "vLLM", "Qdrant", "Ollama", "LangChain", "TensorRT-LLM"],
  },
  {
    id: "ai-agents",
    slug: "ai-agents",
    title: "AI Agents",
    badge: "Autonomous Systems",
    heroHeadline: "Agents That Plan, Ask, and Act Within Bounds",
    shortDesc: "Multi-agent sketches with tool calling, memory, and human-in-the-loop checkpoints.",
    longDesc:
      "We workshop agent behaviors that plan, use tools, and escalate gracefully — with sandboxes and verification so humans stay in control.",
    iconName: "Bot",
    metrics: "Accuracy depends on eval sets — workshop-defined, not guaranteed",
    deliverables: [
      { title: "Voice & Telephony Concepts", description: "Turn-taking, interruption, and tone explorations." },
      { title: "Tool-Using Agents (MCP)", description: "Standard tool protocols to connect agents to your APIs safely." },
      { title: "Orchestration Sketches", description: "Planner/executor patterns with persistence." },
      { title: "Memory & Context", description: "Vector memory concepts and retention policies." },
      { title: "Sandbox Execution", description: "Isolated runs and verification before production effects." },
      { title: "Human Review Points", description: "Thresholds that route ambiguity back to operators." },
    ],
    processPhases: [
      {
        number: "01",
        title: "Workflow Mapping",
        duration: "Weeks 1–2",
        description: "Capture SOPs and permission boundaries.",
        deliverables: ["Capability matrix", "Tool schema draft", "Escalation policy"],
      },
      {
        number: "02",
        title: "Mesh Sketch & Tools",
        duration: "Weeks 3–4",
        description: "Build sandbox and tool contracts.",
        deliverables: ["Orchestrator sandbox", "MCP endpoints draft", "Unit tests"],
      },
      {
        number: "03",
        title: "Review UI & Safety",
        duration: "Weeks 5–6",
        description: "Design operator views and replay logs.",
        deliverables: ["Console mock", "Audit log draft", "Canary checklist"],
      },
      {
        number: "04",
        title: "Pilot & Learn",
        duration: "Weeks 7–8",
        description: "Run shadow pilots and refine.",
        deliverables: ["Pilot report", "Handoff plan", "Eval pipe outline"],
      },
    ],
    faqs: [
      {
        question: "What prevents errors?",
        answer:
          "Constraints: sandboxes, read-only defaults, verification steps, and human thresholds. No system is error-proof; the aim is to bound blast radius and make decisions auditable.",
      },
      {
        question: "What is MCP?",
        answer:
          "Model Context Protocol — an open pattern for connecting models to tools and data with versioned schemas. We use it to avoid one-off integrations.",
      },
    ],
    tools: ["MCP", "Temporal", "Docker", "Python", "FastAPI", "Redis"],
  },
  {
    id: "healthcare-apps",
    slug: "healthcare-apps",
    title: "Healthcare Apps",
    badge: "Clinical Concepts",
    heroHeadline: "Clinical-Focused Software, Carefully Scoped",
    shortDesc: "Explorations for telehealth and FHIR sync — with explicit no-claims posture on compliance.",
    longDesc:
      "We prototype healthcare-adjacent flows with privacy, audit, and interoperability patterns in mind. This page makes NO HIPAA, SOC2, or HITRUST claim — certification requires independent audit, contracts, and deployment review beyond any studio site.",
    iconName: "Shield",
    metrics: "Compliance requires independent audit and BAA — no certification claimed here",
    deliverables: [
      { title: "Privacy Awareness", description: "Data minimization and retention sketches to discuss with counsel." },
      { title: "Telehealth Patterns", description: "Consult flows and messaging patterns for discovery only." },
      { title: "Interoperability Spikes", description: "Mock FHIR/HL7 syncs to test feasibility — not certified." },
      { title: "Support Dashboards", description: "Trend and alert concepts for clinical review — not diagnostic." },
      { title: "Audit & Access Drafts", description: "Log and RBAC outlines for compliance planning — no claim." },
      { title: "Operational Planning", description: "Draft runbooks and incident checklists for stakeholder review." },
    ],
    processPhases: [
      {
        number: "01",
        title: "Discovery & Constraints",
        duration: "Weeks 1–2",
        description: "Map clinical context and non-functional needs.",
        deliverables: ["Context note", "Constraint list", "FHIR resource map (draft)"],
      },
      {
        number: "02",
        title: "Secure Prototype",
        duration: "Weeks 3–5",
        description: "Build mock gateways and test harnesses.",
        deliverables: ["Auth sketch", "Test harness", "Data flow diagram"],
      },
      {
        number: "03",
        title: "Validation & Review",
        duration: "Weeks 6–8",
        description: "Usability and security review with your experts.",
        deliverables: ["Review notes", "Usability notes", "Risk register update"],
      },
      {
        number: "04",
        title: "Planning & Handoff",
        duration: "Weeks 9–10",
        description: "Plan deployment and operations with your team.",
        deliverables: ["Deployment plan", "Runbook draft", "Handoff checklist"],
      },
    ],
    faqs: [
      {
        question: "Do you sign a BAA?",
        answer:
          "BAAs are contractual and deployment-specific. This site makes no BAA promise. During scoping, we discuss architecture patterns and note that formal compliance requires legal, audit, and infrastructure review.",
      },
      {
        question: "How should we think about FHIR integration risk?",
        answer:
          "We recommend spikes with idempotency, FHIR validation, and clinician review. Direct integration with hospital systems needs coordinated testing — we treat it as high-risk until proven in your environment.",
      },
    ],
    tools: ["FHIR R4", "HL7", "React", "TypeScript", "Next.js", "WebRTC", "PostgreSQL"],
  },
];
