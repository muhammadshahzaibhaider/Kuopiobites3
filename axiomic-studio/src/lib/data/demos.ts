export type Demo = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  /** Small label shown above the title, e.g. "Classifier". */
  category: string;
  /** Sample prompts/inputs shown as chips inside the demo UI. */
  samples: string[];
  /** Placeholder output lines for the demo panel. */
  output: { label: string; value: string }[];
  accent: string;
};

export const DEMOS: Demo[] = [
  {
    slug: "intentiq",
    name: "IntentIQ",
    tagline: "Know what a lead actually wants.",
    description:
      "Paste a piece of inbound copy and IntentIQ classifies intent, urgency, and the most likely next action — the same triage pattern we use to route sales conversations.",
    category: "Classification",
    samples: [
      "We need to replace our patient portal before the audit in Q3.",
      "Just exploring options for now, no timeline.",
      "Our agent demo works, but it fails in production. Help.",
    ],
    output: [
      { label: "Intent", value: "Vendor evaluation — active" },
      { label: "Urgency", value: "High · compliance deadline" },
      { label: "Budget signal", value: "Implied, not stated" },
      { label: "Recommended next step", value: "Offer a scoping call this week" },
    ],
    accent: "#a9c7ff",
  },
  {
    slug: "competitor-matrix",
    name: "Competitor Matrix",
    tagline: "Twelve vendors, one honest table.",
    description:
      "A structured comparison surface for evaluating vendors on the criteria that actually decide the purchase, with source links on every claim.",
    category: "Research",
    samples: ["Compare AI agent platforms", "Compare headless CMS options"],
    output: [
      { label: "Vendors scored", value: "12" },
      { label: "Criteria", value: "18 weighted rows" },
      { label: "Evidence", value: "Every claim sourced" },
      { label: "Refresh", value: "Quarterly" },
    ],
    accent: "#9ae6b4",
  },
  {
    slug: "data-center-gis",
    name: "Data Center GIS",
    tagline: "Infrastructure, mapped.",
    description:
      "A geospatial view of data-centre capacity, latency, and power constraints — built to answer siting questions in seconds instead of spreadsheets.",
    category: "Geospatial",
    samples: ["Show low-latency regions in EU", "Where is power constrained?"],
    output: [
      { label: "Regions indexed", value: "42" },
      { label: "Layers", value: "Latency · Power · Fibre" },
      { label: "Query time", value: "Under 200ms" },
      { label: "Export", value: "GeoJSON / CSV" },
    ],
    accent: "#f6ad55",
  },
  {
    slug: "red-team",
    name: "Red Team",
    tagline: "Attack the model before someone else does.",
    description:
      "An adversarial harness that runs a library of prompt-injection, jailbreak, and data-exfiltration probes against your agent and reports what got through.",
    category: "Security",
    samples: ["Run injection suite", "Test tool-call exfiltration"],
    output: [
      { label: "Probes run", value: "148" },
      { label: "Findings", value: "3 high · 7 medium" },
      { label: "Blocked", value: "93.2%" },
      { label: "Report", value: "PDF with reproductions" },
    ],
    accent: "#fc8181",
  },
  {
    slug: "lie-detector",
    name: "Lie Detector",
    tagline: "Does this answer match its sources?",
    description:
      "A grounding check that compares a generated answer against the retrieved passages and flags claims that are unsupported or contradicted.",
    category: "Evaluation",
    samples: ["Check this summary against the policy", "Score answer grounding"],
    output: [
      { label: "Claims checked", value: "14" },
      { label: "Supported", value: "11" },
      { label: "Unsupported", value: "3 (flagged)" },
      { label: "Verdict", value: "Needs review" },
    ],
    accent: "#d6bcfa",
  },
  {
    slug: "generative-search",
    name: "Generative Search",
    tagline: "Answers with receipts.",
    description:
      "Retrieval-augmented search over your documentation that answers in prose, cites the exact passage, and says so when it does not know.",
    category: "Retrieval",
    samples: ["How do refunds work?", "What is the SLA for enterprise?"],
    output: [
      { label: "Documents", value: "1,240 indexed" },
      { label: "Answer style", value: "Prose + citations" },
      { label: "Abstains", value: "When confidence is low" },
      { label: "Latency", value: "~900ms p50" },
    ],
    accent: "#81e6d9",
  },
  {
    slug: "sentiment-ai",
    name: "Sentiment AI",
    tagline: "Read the room, at scale.",
    description:
      "Sentiment and emotion analysis for support transcripts, reviews, and call recordings, with an audit trail showing which spans drove the score.",
    category: "NLP",
    samples: ["Analyse this support thread", "Score this review set"],
    output: [
      { label: "Segments", value: "By sentence" },
      { label: "Labels", value: "Frustration · Relief · Urgency" },
      { label: "Explainability", value: "Highlighted spans" },
      { label: "Export", value: "CSV / webhook" },
    ],
    accent: "#fbb6ce",
  },
];

export function getDemo(slug: string): Demo | undefined {
  return DEMOS.find((demo) => demo.slug === slug);
}
