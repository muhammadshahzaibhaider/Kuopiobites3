/**
 * ILLUSTRATIVE DEMO DATA — NOT CLIENT RESULTS
 * All case studies below are synthetic examples created to demonstrate
 * presentation patterns, information architecture, and design system usage.
 * No metrics represent verified customer outcomes. Do not interpret as
 * performance claims, guarantees, or audited results.
 */

export interface ClientCaseStudy {
  id: string;
  slug: string;
  title: string;
  client: string;
  tagline: string;
  category: "AI Apps" | "Websites" | "Enterprise";
  // Metrics below are CONCEPTUAL TARGETS for illustration, not measured results
  impactMetric: string;
  impactLabel: string;
  year: string;
  duration: string;
  summary: string;
  challenge: string;
  solution: string;
  architectureHighlights: { title: string; description: string }[];
  results: string[];
  techStack: string[];
  disclaimer: string;
}

export const clientCategories = ["All", "AI Apps", "Websites", "Enterprise"] as const;

const ILLUSTRATIVE_NOTE =
  "Illustrative concept — not a measured client outcome or guarantee. For demonstration of problem/solution framing only.";

export const clientsData: ClientCaseStudy[] = [
  {
    id: "strata-systems",
    slug: "strata-systems",
    title: "Autonomous Cloud Incident Resolution Engine",
    client: "Strata Systems",
    tagline: "Concept exploration: multi-agent telemetry analysis and remediation workflow",
    category: "AI Apps",
    impactMetric: "84%",
    impactLabel: "Illustrative target: reduction in triage time (not a measured result)",
    year: "2026",
    duration: "Concept · 4 Months",
    summary:
      "Demonstration dossier: how an autonomous triage mesh could ingest distributed traces, correlate historical incidents, and propose sandboxed remediation steps — presented as an architecture concept, not a deployed customer system.",
    challenge:
      "Illustrative problem: alert fatigue across multi-cloud environments with manual log correlation averaging lengthy resolution cycles. This scenario is fabricated to show product-thinking, not a client engagement.",
    solution:
      "Concept solution: a private-cluster agent mesh that ingests traces, maps post-mortems via vector search, and drafts canary plans for human approval. All components below are architectural sketches for demo purposes.",
    architectureHighlights: [
      { title: "Sandbox Verification (Concept)", description: "Illustrative: isolated verification before staged rollout — not a production guarantee." },
      { title: "Private Telemetry Correlation (Concept)", description: "Demonstration of tenant-bound trace correlation without cross-tenant data export." },
      { title: "Escalation Guardrails (Concept)", description: "Example policy engine that routes high-impact incidents to human operators." },
    ],
    results: [
      "ILLUSTRATIVE: Example target — reduce tier-1 triage time in a simulated environment",
      "ILLUSTRATIVE: Example target — free engineering hours by automating alert grouping",
      "ILLUSTRATIVE: Example target — sub-5-minute draft remediation in a demo harness",
    ],
    techStack: ["Next.js", "Python", "FastAPI", "Temporal", "Qdrant", "Kubernetes", "Tailwind CSS"],
    disclaimer: ILLUSTRATIVE_NOTE,
  },
  {
    id: "zenith-health",
    slug: "zenith-health",
    title: "Clinician Intelligence & Documentation Copilot",
    client: "Zenith Health AI",
    tagline: "Concept: ambient documentation assistant for clinical workflows — illustrative only",
    category: "AI Apps",
    impactMetric: "~78%",
    impactLabel: "Illustrative concept target (not a clinical study result)",
    year: "2026",
    duration: "Concept · 6 Months",
    summary:
      "Synthetic case study demonstrating an interface for ambient transcription and EHR context retrieval. No HIPAA claim is made here — compliance requires independent audit and BAA execution, which this demo does not represent.",
    challenge:
      "Fictional scenario: clinicians navigating EHRs face documentation bottlenecks. This narrative exists solely to illustrate UX mapping, not an actual client pain or outcome.",
    solution:
      "Concept: a zero-retention prototype with sub-second search and structured note generation. No protected health information was processed; no clinical validation exists.",
    architectureHighlights: [
      { title: "Interoperability Mock (Concept)", description: "Illustrative FHIR/HL7 sync pattern — not certified or audited." },
      { title: "On-Premises Inference Sketch", description: "Demo architecture showing how private inference could work in principle." },
      { title: "Ambient Parsing Prototype", description: "Concept transcript-to-SOAP flow for workshop discussion." },
    ],
    results: [
      "ILLUSTRATIVE: Demo goal — faster mock chart completion in a test harness",
      "ILLUSTRATIVE: Demo goal — reduced clicks in a prototype EHR sandbox",
      "ILLUSTRATIVE: Internal workshop satisfaction score from a simulated pilot (not a study)",
    ],
    techStack: ["React", "TypeScript", "Tailwind CSS", "vLLM", "Rust", "WebSockets", "HL7/FHIR"],
    disclaimer: ILLUSTRATIVE_NOTE,
  },
  {
    id: "vortex-capital",
    slug: "vortex-capital",
    title: "Market Sentiment & Execution Engine",
    client: "Vortex Capital",
    tagline: "Workshop prototype: low-latency filing and transcript analysis",
    category: "Enterprise",
    impactMetric: "<12ms",
    impactLabel: "Illustrative latency goal in a controlled load test — not a trading result",
    year: "2025",
    duration: "Concept · 5 Months",
    summary:
      "Demo dossier for parsing earnings transcripts into structured signals under artificial lab conditions. No trading performance or regulatory claim is made.",
    challenge:
      "Invented context: latency and parsing accuracy tradeoffs when handling nuanced filings. For demonstration of system design, not financial advice or results.",
    solution:
      "Concept pipeline with domain-tuned embeddings and deterministic circuit-breakers, shown as a slide architecture — no live market deployment is implied.",
    architectureHighlights: [
      { title: "Buffered Stream Ingest (Concept)", description: "Illustrative kernel-bypass style ingest path." },
      { title: "Domain Tokenizer (Concept)", description: "Demo vocabulary model for financial phrasing." },
      { title: "Deterministic Risk Limits (Concept)", description: "Example hardware-enforced thresholds in a simulation." },
    ],
    results: [
      "ILLUSTRATIVE: Example latency target from synthetic audio to signal in a lab run",
      "ILLUSTRATIVE: Example parsing coverage on a curated filing set — not a guarantee",
      "ILLUSTRATIVE: Hypothetical efficiency framing for workshop purposes",
    ],
    techStack: ["C++20", "Next.js", "Python", "CUDA", "Redis Enterprise", "Apache Kafka", "WebSockets"],
    disclaimer: ILLUSTRATIVE_NOTE,
  },
  {
    id: "helix-cyber",
    slug: "helix-cyber",
    title: "Edge Security & Defense Operations Console",
    client: "Helix Cybersecurity",
    tagline: "Simulated telemetry console — not a security guarantee or certification",
    category: "Enterprise",
    impactMetric: "99%+",
    impactLabel: "Illustrative mock detection coverage in synthetic traffic — not a guarantee",
    year: "2025",
    duration: "Concept · 3 Months",
    summary:
      "Interactive simulation of an attack-surface dashboard. Security claims here are placeholders; no SOC2, ISO, or FedRAMP certification is implied.",
    challenge:
      "Fabricated problem: high event volume requiring prioritization. Used to frame information-density UX, not to describe a real incident.",
    solution:
      "Concept: telemetry graph, rule synthesis, and edge mitigation simulation with seeded demo data and randomized streams.",
    architectureHighlights: [
      { title: "Threat Graph Demo", description: "Seeded MITRE-style technique map for visual exploration." },
      { title: "Crypto Rotation Sketch", description: "Concept rotation flow — not quantum-audited or certified." },
      { title: "Synthetic Patch Preview", description: "Demo of how a mitigation rule could be previewed before approval." },
    ],
    results: [
      "ILLUSTRATIVE: Simulated containment rate on seeded data — not real-world coverage",
      "ILLUSTRATIVE: Mock throughput in a local stress script",
      "ILLUSTRATIVE: Example policy enforcement overhead in a test rig",
    ],
    techStack: ["Next.js", "Rust", "Tailwind CSS", "eBPF", "ClickHouse", "Wasm", "TypeScript"],
    disclaimer: ILLUSTRATIVE_NOTE,
  },
  {
    id: "nova-commerce",
    slug: "nova-commerce",
    title: "Headless Commerce & Personalization Mesh",
    client: "Nova Commerce",
    tagline: "Storefront concept: edge rendering and personalization patterns",
    category: "Websites",
    impactMetric: "+41%",
    impactLabel: "Illustrative conversion target from a design hypothesis — not a measured lift",
    year: "2025",
    duration: "Concept · 4 Months",
    summary:
      "Template-style retail concept showing headless catalog, visual recommendations, and localized checkout as UX patterns — not a verified business outcome.",
    challenge:
      "Synthetic narrative: slow loads and fragmented inventory as a design prompt, not a client diagnosis or benchmark.",
    solution:
      "Concept Next.js storefront with edge caching and vector recommendations, demonstrated with dummy catalog data and no brand logos.",
    architectureHighlights: [
      { title: "Edge-Cached Catalog (Concept)", description: "Demo ISR/edge cache strategy for product pages." },
      { title: "Visual Recommendations (Demo)", description: "Mock embedding retrieval on dummy catalog items." },
      { title: "Localized Checkout Flow (Concept)", description: "Illustrative checkout with simulated payment — no processing." },
    ],
    results: [
      "ILLUSTRATIVE: Target LCP improvement in a synthetic audit — not a measured gain",
      "ILLUSTRATIVE: Example session-to-cart flow in a prototype walkthrough",
      "ILLUSTRATIVE: Hypothetical reduction in build-to-ship time for demonstration",
    ],
    techStack: ["Next.js", "TypeScript", "Tailwind CSS", "Stripe Mock", "Algolia Mock", "Cloudflare Edge"],
    disclaimer: ILLUSTRATIVE_NOTE,
  },
  {
    id: "pulse-matrix",
    slug: "pulse-matrix",
    title: "Logistics Route Optimization & Dispatch Console",
    client: "Pulse Matrix",
    tagline: "Planning console concept: fleet telemetry and predictive dispatch",
    category: "Enterprise",
    impactMetric: "28%",
    impactLabel: "Illustrative efficiency hypothesis — not a measured fuel or time saving",
    year: "2025",
    duration: "Concept · 4 Months",
    summary:
      "Workshop case for visualizing fleet routes and dispatch decisions with simulated map data. No logistics result is claimed.",
    challenge:
      "Fabricated scenario: manual dispatch under volatile demand — used to illustrate algorithmic scaffolding and UX, not a real operation.",
    solution:
      "Concept: predictive ETA, exception alerting, and auto-rebalance suggestions surfaced in a demo dashboard with seeded telemetry.",
    architectureHighlights: [
      { title: "Live Fleet Map (Demo)", description: "Simulated GPS traces and heatmaps with synthetic events." },
      { title: "ETA Prediction Mock", description: "Illustrative model output with confidence bands — not validated." },
      { title: "Auto-Rebalance Suggestions (Concept)", description: "Demo rules for workshop discussion." },
    ],
    results: [
      "ILLUSTRATIVE: Example on-time improvement in a simulated week",
      "ILLUSTRATIVE: Example fuel-use reduction in a model run — not a customer result",
      "ILLUSTRATIVE: Mock dispatch lead-time reduction in a prototype",
    ],
    techStack: ["Next.js", "Python", "PostGIS", "Mapbox Mock", "Kubernetes", "Tailwind CSS"],
    disclaimer: ILLUSTRATIVE_NOTE,
  },
  {
    id: "synthetix-labs",
    slug: "synthetix-labs",
    title: "Multimodal Media Synthesis Studio",
    client: "Synthetix Labs",
    tagline: "Creator-tool concept: audio & media generation pipeline demo",
    category: "AI Apps",
    impactMetric: "92%",
    impactLabel: "Illustrative turnaround compression in a demo pipeline — not a guarantee",
    year: "2026",
    duration: "Concept · 5 Months",
    summary:
      "Concept media studio showing model orchestration and render queues. Output quality here is demonstrative; no production studio claim is made.",
    challenge:
      "Synthetic prompt: long turnarounds across stitching voice, music, and visuals — framed to discuss orchestration, not a client engagement.",
    solution:
      "Prototype pipeline that chains models, caches intermediates, and exposes a review queue — all running on seeded prompts for demo purposes.",
    architectureHighlights: [
      { title: "Orchestrated Render Graph (Concept)", description: "Demo DAG for voice → music → visuals with manual approval gates." },
      { title: "Intermediate Caching (Concept)", description: "Example cache of embeddings to speed re-renders in a test run." },
      { title: "Review Queue UX", description: "Illustrative approval and versioning flow for workshop review." },
    ],
    results: [
      "ILLUSTRATIVE: Example draft-to-publish time in a seeded project",
      "ILLUSTRATIVE: Example reuse rate for cached voice clones in a demo set",
      "ILLUSTRATIVE: Workshop approval-time reduction on sample assets",
    ],
    techStack: ["Next.js", "Python", "WebGL Mock", "Tailwind CSS", "FFmpeg Mock", "WebSockets"],
    disclaimer: ILLUSTRATIVE_NOTE,
  },
];
