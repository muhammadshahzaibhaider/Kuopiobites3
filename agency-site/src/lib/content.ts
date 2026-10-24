/**
 * All site copy & data lives here so components stay purely presentational.
 * Swap the brand, links, city and copy in this one file.
 */

export const SITE = {
  brand: "YOUR BRAND",
  tagline: "Building Digital Solutions That Matter",
  description:
    "We empower organizations with AI that turns complex challenges into real-world outcomes.",
  email: "hello@yourbrand.agency",
  linkedin: "https://www.linkedin.com/",
  city: "Gujranwala, PK",
  timeZone: "Asia/Karachi",
  copyrightYear: 2026,
} as const;

export type NavItem = {
  label: string;
  href: string;
  menu?: "services" | "resources";
};

export const PRIMARY_NAV: NavItem[] = [
  { label: "Work", href: "#work" },
  { label: "Company", href: "#company" },
  { label: "Services", href: "#services", menu: "services" },
  { label: "Resources", href: "#resources", menu: "resources" },
];

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

export type Service = {
  number: string;
  slug: string;
  title: string;
  description: string;
  /** One-line version used in the navbar mega-menu. */
  short: string;
  href: string;
  services: string[];
  tools: Tool[];
};

export const SERVICES: Service[] = [
  {
    number: "01",
    slug: "ui-ux-design",
    title: "UI/UX Design",
    short: "Research, flows, UI systems",
    description:
      "End-to-end product design — research, UX flows, polished UI systems, and developer-ready handoff.",
    href: "#work",
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
  },
  {
    number: "02",
    slug: "website-design",
    title: "Website Design",
    short: "Identity, art direction, motion",
    description:
      "Brand-led, conversion-tuned websites — identity, art direction, motion, and storytelling that match the brand.",
    href: "#work",
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
  },
  {
    number: "03",
    slug: "web-development",
    title: "Web Development",
    short: "React, Next.js, Node, edge infra",
    description:
      "Production-grade Next.js, headless CMS, edge infra — SEO, accessibility, and Core Web Vitals built in from day one.",
    href: "#work",
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
  },
  {
    number: "04",
    slug: "ai-development",
    title: "AI Development",
    short: "LLM apps, evals, guardrails",
    description:
      "Production-ready AI — rapid prototyping to deployed models with solid evals, observability, and safety.",
    href: "#work",
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
  },
  {
    number: "05",
    slug: "ai-agents",
    title: "AI Agents",
    short: "Voice & tool-using automation",
    description:
      "Autonomous voice and tool-using agents that handle real workflows — call centers, scheduling, research, and end-to-end task automation.",
    href: "#work",
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
  },
  {
    number: "06",
    slug: "healthcare-apps",
    title: "Healthcare Apps",
    short: "HIPAA telehealth & EHR integrations",
    description:
      "Secure, compliant healthcare software — telehealth, EHR integrations, and clinician tools, built for HIPAA and auditability.",
    href: "#work",
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
  },
];

export type CaseStudy = {
  number: string;
  name: string;
  tags: string[];
  image: string;
  href: string;
};

export const CASE_STUDIES: CaseStudy[] = [
  {
    number: "01",
    name: "Talitrix",
    tags: ["Website Design", "Web Development", "UI/UX Design"],
    image: "/images/case-talitrix.jpg",
    href: "#work",
  },
  {
    number: "02",
    name: "Blue Standard",
    tags: ["Website Design", "Web Development", "UI/UX Design"],
    image: "/images/case-blue-standard.jpg",
    href: "#work",
  },
  {
    number: "03",
    name: "Clinix AI",
    tags: ["AI Development", "AI Agents", "Healthcare Apps"],
    image: "/images/case-clinix.jpg",
    href: "#work",
  },
  {
    number: "04",
    name: "OWASP Foundation",
    tags: ["Website Design", "Web Development", "UI/UX Design"],
    image: "/images/case-owasp.jpg",
    href: "#work",
  },
  {
    number: "05",
    name: "Vidzee",
    tags: ["AI Development", "Website Design", "UI/UX Design"],
    image: "/images/case-vidzee.jpg",
    href: "#work",
  },
  {
    number: "06",
    name: "Feature",
    tags: ["UI/UX Design"],
    image: "/images/case-feature.jpg",
    href: "#work",
  },
];

export type Client = { name: string; mark: "orbit" | "hex" | "spark" | "stack" };

export const CLIENTS: Client[] = [
  { name: "Talitrix", mark: "orbit" },
  { name: "Blue Standard", mark: "spark" },
  { name: "Clinix AI", mark: "hex" },
  { name: "OWASP Foundation", mark: "stack" },
  { name: "Vidzee", mark: "spark" },
  { name: "Feature", mark: "orbit" },
  { name: "Northwind", mark: "stack" },
  { name: "Helix Labs", mark: "hex" },
  { name: "Vertex", mark: "spark" },
  { name: "Axiom", mark: "orbit" },
];

export const RESOURCE_LINKS = [
  {
    label: "Get in Touch",
    href: "#contact",
    description: "Tell us about your project",
  },
  {
    label: "Case Studies",
    href: "#work",
    description: "Results we've shipped",
  },
  {
    label: "Company",
    href: "#company",
    description: "Who we are and how we work",
  },
  {
    label: "Blog",
    href: "#resources",
    description: "Notes on design, AI & engineering",
  },
  {
    label: "Free Templates & Tools",
    href: "#resources",
    description: "Open-source resources, free to use",
  },
];

export const DEMO_LINKS = [
  { label: "IntentIQ", href: "#resources" },
  { label: "Competitor Matrix", href: "#resources" },
  { label: "Data Center GIS", href: "#resources" },
  { label: "Red Team", href: "#resources" },
  { label: "Lie Detector", href: "#resources" },
  { label: "Generative Search", href: "#resources" },
  { label: "Sentiment AI", href: "#resources" },
];

export const FOOTER_SERVICE_LINKS = SERVICES.map((service) => ({
  label: service.title,
  href: `#${service.slug}`,
}));

export const STATS = [
  { value: "100+", label: "Projects Delivered" },
  { value: "99%", label: "Client Satisfaction" },
  { value: "24/7", label: "Support Available" },
] as const;

/** Footer variant of the resources list (last item reads "Open Resources"). */
export const FOOTER_RESOURCE_LINKS = RESOURCE_LINKS.map(({ label, href }) => ({
  label: label === "Free Templates & Tools" ? "Open Resources" : label,
  href,
}));
