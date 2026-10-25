export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  category: "Architecture" | "Strategy" | "Economics" | "Evaluation";
  excerpt: string;
  content: string;
  author: string;
  date: string;
  readingTime: string;
  disclaimer: string;
}

export const blogPosts: BlogPost[] = [
  {
    id: "multi-agent-orchestration",
    slug: "multi-agent-orchestration",
    title: "Multi-Agent Orchestration Without Chaos: A Pattern Catalog",
    category: "Architecture",
    excerpt:
      "A workshop guide to planner/executor/verifier splits, bounded tool use, and replayable logs — with failure modes highlighted.",
    content: `Orchestration patterns matter more than model size when reliability is on the line. This note collects small, testable patterns — task decomposition, tool contracts via MCP, and human escalation thresholds — that we use in discovery workshops.

All examples are illustrative and trimmed for readability. Latency and accuracy numbers refer to lab scripts, not production systems. Treat any benchmark here as a prompt for your own evals, not a result you can copy.`,
    author: "Axiom Labs Studio",
    date: "2026-02-10",
    readingTime: "6 min",
    disclaimer: "Illustrative guidance — validate any pattern against your own eval set before production.",
  },
  {
    id: "rag-vs-fine-tuning",
    slug: "rag-vs-fine-tuning",
    title: "RAG vs. Fine-Tuning: When to Use Which (and When to Use Both)",
    category: "Strategy",
    excerpt:
      "A decision framework for grounding vs. adaptation, with eval checklists and a small migration sketch.",
    content: `Grounding (RAG) adds citations and freshness. Adaptation (fine-tuning) adds tone and latency wins. Most teams need both — but sequencing matters. Start with evals, add grounding, then consider adaptation only if your golden set shows persistent gaps.

No universal accuracy is promised here. The tables in this post are hypothetical weights to structure discussion, not prescriptions.`,
    author: "Axiom Labs Studio",
    date: "2026-01-18",
    readingTime: "8 min",
    disclaimer: "Educational material — not performance advice. Measure on your data.",
  },
  {
    id: "training-economics",
    slug: "training-economics",
    title: "What Training Economics Actually Look Like in Practice",
    category: "Economics",
    excerpt:
      "From FLOPs to people: cost drivers, GPU sizing heuristics, and why eval spend is not optional.",
    content: `FLOPs tables are tidy; real budgets are not. This post walks through sizing heuristics, mixed-precision tradeoffs, and where teams under-invest (evaluations and data hygiene). Figures are rounded examples to reason from, not quotes.

If you take one thing away: spend earlier on evals and data cleaning than on larger runs. That practice generalizes better than any single table here.`,
    author: "Axiom Labs Studio",
    date: "2025-12-05",
    readingTime: "7 min",
    disclaimer: "Example figures for discussion — obtain vendor quotes and run your own estimates.",
  },
  {
    id: "synthetic-evals",
    slug: "synthetic-evals",
    title: "Synthetic Evals That Deserve Trust",
    category: "Evaluation",
    excerpt: "How to make synthetic test sets useful — and how to avoid fooling yourself.",
    content: `Synthetic evals help when human labels are scarce, but they amplify bias if misused. We outline a lightweight recipe: seed with real tasks, filter with human review, and track label drift over time. Confidence thresholds belong in code, not in vibes.

The datasets referenced here are fabricated mini-sets for the post. For your project, build a gold set that reflects your actual users and failure costs.`,
    author: "Axiom Labs Studio",
    date: "2025-11-20",
    readingTime: "5 min",
    disclaimer: "Illustrative eval patterns — requires human review and domain validation.",
  },
];

export const blogCategories = ["All", "Architecture", "Strategy", "Economics", "Evaluation"] as const;
