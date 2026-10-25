export interface OpenSourceItem {
  id: string;
  slug: string;
  title: string;
  category: "Agent Skills" | "Templates" | "Apps" | "Tools";
  description: string;
  stars: string;
  forks: string;
  license: string;
  techStack: string[];
  installCommand?: string;
  githubUrl: string;
  demoUrl?: string;
  featured?: boolean;
  note: string;
}

export const openSourceItems: OpenSourceItem[] = [
  {
    id: "forensic-research-engine",
    slug: "forensic-research-engine",
    title: "Forensic Research Engine",
    category: "Agent Skills",
    description:
      "Illustrative agent skill sketch for research assistance — ingests docs and drafts structured notes for human review. Demo-only; no accuracy claim.",
    stars: "1.4k",
    forks: "180",
    license: "MIT",
    techStack: ["Python", "FastAPI", "Pydantic"],
    installCommand: "pip install axiom-forensic-engine",
    githubUrl: "https://github.com/axiomlabs/forensic-research-engine",
    featured: true,
    note: "Demo project — treat as template, not audited software. Verify behavior in your environment.",
  },
  {
    id: "orbitly-saas",
    slug: "orbitly-saas",
    title: "Orbitly — SaaS Engine Template",
    category: "Templates",
    description:
      "Next.js SaaS starter template with example light-ray styling and placeholder billing — not a production-ready billing integration.",
    stars: "3.2k",
    forks: "410",
    license: "MIT",
    techStack: ["Next.js 14", "Tailwind CSS", "TypeScript"],
    installCommand: "npx create-axiom-template orbitly",
    githubUrl: "https://github.com/axiomlabs/orbitly-template",
    featured: true,
    note: "Illustrative template — review and test before deployment.",
  },
  {
    id: "prism-chat",
    slug: "prism-chat",
    title: "Prism — Conversational UI Kit",
    category: "Templates",
    description: "Demo chat UI with streaming placeholders and markdown — illustrative, not a managed service.",
    stars: "4.5k",
    forks: "620",
    license: "MIT",
    techStack: ["React", "TypeScript", "Tailwind CSS"],
    installCommand: "npx create-axiom-template prism-chat",
    githubUrl: "https://github.com/axiomlabs/prism-chat",
    featured: true,
    note: "UI demonstration only.",
  },
  {
    id: "nexus-enterprise-ai",
    slug: "nexus-enterprise-ai",
    title: "Nexus AI — Dashboard Template",
    category: "Templates",
    description: "Dashboard template for demo telemetry and latency widgets with dummy data.",
    stars: "2.1k",
    forks: "275",
    license: "MIT",
    techStack: ["Next.js", "Tailwind CSS", "Recharts"],
    installCommand: "npx create-axiom-template nexus-ai",
    githubUrl: "https://github.com/axiomlabs/nexus-ai-template",
    note: "Demo data only — replace with your own metrics.",
  },
  {
    id: "studio-veil",
    slug: "studio-veil",
    title: "Studio Veil — Portfolio Template",
    category: "Templates",
    description: "Editorial portfolio template with dark theme and case-study placeholders.",
    stars: "1.8k",
    forks: "190",
    license: "MIT",
    techStack: ["Next.js", "Framer Motion", "Tailwind CSS"],
    installCommand: "npx create-axiom-template studio-veil",
    githubUrl: "https://github.com/axiomlabs/studio-veil",
    note: "Template for exploration — not an agency endorsement.",
  },
  {
    id: "groundwork-starter",
    slug: "groundwork-starter",
    title: "Groundwork — Minimal Starter",
    category: "Templates",
    description: "Minimal baseline with accessibility and performance checklists as documentation.",
    stars: "980",
    forks: "115",
    license: "MIT",
    techStack: ["Next.js", "TypeScript", "Tailwind CSS"],
    installCommand: "npx create-axiom-template groundwork",
    githubUrl: "https://github.com/axiomlabs/groundwork",
    note: "Use as a starting point and verify Lighthouse in your deployment.",
  },
  {
    id: "signal-chat-app",
    slug: "signal-chat-app",
    title: "Signal — Local Assistant Demo",
    category: "Apps",
    description: "Concept local assistant running via placeholder adapters — no telemetry claim is independently verified.",
    stars: "5.1k",
    forks: "780",
    license: "Apache-2.0",
    techStack: ["Electron", "React", "Tailwind CSS"],
    githubUrl: "https://github.com/axiomlabs/signal-app",
    featured: true,
    note: "Concept demonstration — privacy posture requires your own review.",
  },
  {
    id: "meridian-workflow-engine",
    slug: "meridian-workflow-engine",
    title: "Meridian — Workflow Orchestrator",
    category: "Tools",
    description: "Python sketch for DAG workflows with verification hooks — demo quality.",
    stars: "2.8k",
    forks: "340",
    license: "MIT",
    techStack: ["Python", "FastAPI", "Redis"],
    installCommand: "pip install meridian-agents",
    githubUrl: "https://github.com/axiomlabs/meridian",
    note: "Demo framework — evaluate failure modes in your setting.",
  },
];

export const openSourceCategories = ["All", "Agent Skills", "Templates", "Apps", "Tools"] as const;
