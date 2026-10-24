export type ResourceStatus = "Live" | "Coming soon";
export type ResourceKind = "Agent Skill" | "Template" | "App" | "Tool" | "Pro template";

export type Resource = {
  slug: string;
  name: string;
  blurb: string;
  kind: ResourceKind;
  status: ResourceStatus;
  /** Pro items show a one-time price. */
  price?: string;
  /** Tailwind gradient for the generated card artwork. */
  gradient: string;
};

export type ResourceGroup = { title: string; items: Resource[] };

export const RESOURCE_GROUPS: ResourceGroup[] = [
  {
    title: "Templates",
    items: [
      {
        slug: "orbitly",
        name: "Orbitly",
        blurb: "SaaS landing page template",
        kind: "Template",
        status: "Live",
        gradient: "from-[#1d2b53] via-[#0b1020] to-[#050505]",
      },
      {
        slug: "nexus-ai",
        name: "Nexus AI",
        blurb: "Enterprise AI landing page template",
        kind: "Template",
        status: "Live",
        gradient: "from-[#0f3d3e] via-[#0a2020] to-[#050505]",
      },
      {
        slug: "studio-veil",
        name: "Studio Veil",
        blurb: "Creative agency landing page template",
        kind: "Template",
        status: "Coming soon",
        gradient: "from-[#3b1d53] via-[#1a0b20] to-[#050505]",
      },
      {
        slug: "prism",
        name: "Prism",
        blurb: "Chat AI landing page template",
        kind: "Template",
        status: "Coming soon",
        gradient: "from-[#53351d] via-[#20150b] to-[#050505]",
      },
      {
        slug: "groundwork",
        name: "Groundwork",
        blurb: "Home services website template",
        kind: "Template",
        status: "Live",
        gradient: "from-[#1d5335] via-[#0b2015] to-[#050505]",
      },
    ],
  },
  {
    title: "Apps",
    items: [
      {
        slug: "rhym3",
        name: "Rhym3",
        blurb: "AI music generator — beats, playlists & creation",
        kind: "App",
        status: "Live",
        gradient: "from-[#531d45] via-[#200b1a] to-[#050505]",
      },
      {
        slug: "vidzee",
        name: "Vidzee",
        blurb: "Listing photos to cinematic videos",
        kind: "App",
        status: "Live",
        gradient: "from-[#2b1d53] via-[#100b20] to-[#050505]",
      },
      {
        slug: "signal",
        name: "Signal",
        blurb: "Open-source AI chat application",
        kind: "App",
        status: "Coming soon",
        gradient: "from-[#1d3f53] via-[#0b1820] to-[#050505]",
      },
      {
        slug: "groundwork-starter",
        name: "Groundwork Starter",
        blurb: "Open-source SaaS starter — auth, billing, DB",
        kind: "App",
        status: "Coming soon",
        gradient: "from-[#2d5335] via-[#101f14] to-[#050505]",
      },
    ],
  },
  {
    title: "Agent Skills",
    items: [
      {
        slug: "forensic-research-engine",
        name: "Forensic Research Engine",
        blurb: "Agent skill for deep investigative research",
        kind: "Agent Skill",
        status: "Live",
        gradient: "from-[#1d2b53] via-[#0b1020] to-[#050505]",
      },
      {
        slug: "frontier-model-training-architect",
        name: "Frontier Model Training Architect",
        blurb: "Agent skill for frontier ML training strategy",
        kind: "Agent Skill",
        status: "Live",
        gradient: "from-[#3d1d53] via-[#170b20] to-[#050505]",
      },
    ],
  },
  {
    title: "Tools",
    items: [
      {
        slug: "meridian",
        name: "Meridian",
        blurb: "Open-source AI workflow automation tool",
        kind: "Tool",
        status: "Coming soon",
        gradient: "from-[#1d4a53] via-[#0b1c20] to-[#050505]",
      },
    ],
  },
  {
    title: "Pro templates",
    items: [
      {
        slug: "antimatter-agency",
        name: "Agency & Studio",
        blurb: "Premium agency and studio landing template",
        kind: "Pro template",
        status: "Live",
        price: "$99",
        gradient: "from-[#533f1d] via-[#20180b] to-[#050505]",
      },
    ],
  },
];

export const RESOURCE_STATS = [
  { value: "8", label: "Live" },
  { value: "5", label: "In development" },
  { value: "MIT", label: "License" },
];
