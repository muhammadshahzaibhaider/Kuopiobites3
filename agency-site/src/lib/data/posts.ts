export type PostBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "subheading"; text: string }
  | { type: "list"; items: string[] }
  | { type: "quote"; text: string };

export type Post = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  dateISO: string;
  readTime: string;
  author: string;
  image: string;
  featured?: boolean;
  body: PostBlock[];
};

export const BLOG_CATEGORIES = [
  "All",
  "AI Agents",
  "Model Training",
  "AI Economics",
  "AI Strategy",
  "AI Governance",
];

export const POSTS: Post[] = [
  {
    slug: "building-ai-agents-that-survive-production",
    title: "Building AI Agents That Survive Production",
    excerpt:
      "Most agent demos never survive contact with real users. Here is what separates a flashy prototype from an agent your team can actually run every day.",
    category: "AI Agents",
    date: "Jun 8, 2026",
    dateISO: "2026-06-08",
    readTime: "6 min read",
    author: "YOUR BRAND",
    image: "/images/blog/agents.jpg",
    featured: true,
    body: [
      {
        type: "paragraph",
        text: "Every leadership team has now seen the demo. An autonomous agent reads a request, calls a few tools, and finishes a task that used to take a person an afternoon. It is genuinely impressive — and it is also where most agent initiatives quietly stall.",
      },
      {
        type: "paragraph",
        text: "The distance between a demo that works once on stage and a system that works ten thousand times a week in front of real customers is enormous, and it is rarely about the model. It is about engineering, governance, and operational discipline.",
      },
      { type: "heading", text: "Why demos do not become systems" },
      {
        type: "paragraph",
        text: "A demo optimises for the happy path. It assumes clean input, a cooperative user, available tools, and a forgiving audience. Production offers none of those guarantees. Inputs are messy, users are adversarial or simply confused, third-party APIs time out, and a single wrong action can create a refund, a compliance incident, or a lost customer.",
      },
      {
        type: "paragraph",
        text: "The reframe that helps executives is this: you are not buying a model, you are building a system that happens to use a model. Budget, staffing, and timelines should reflect that.",
      },
      { type: "heading", text: "The anatomy of a production agent" },
      {
        type: "list",
        items: [
          "The model and the prompt — treat prompts as versioned assets with tests and a change history.",
          "Tools and actions — narrow permissions, validated inputs, and a clearly understood blast radius.",
          "Memory and context — most apparent reasoning failures are actually context failures.",
          "The control loop — the layer that decides when to stop, retry, or escalate.",
        ],
      },
      { type: "subheading", text: "Guardrails are the product" },
      {
        type: "paragraph",
        text: "It is tempting to treat guardrails as a safety tax bolted onto the real work. In production, the guardrails are the work. They are what let you give an agent genuine authority without taking on unbounded risk.",
      },
      {
        type: "quote",
        text: "The model gets you the demo. The system gets you the results. Budget for the system.",
      },
      { type: "heading", text: "Keep humans in the loop where it counts" },
      {
        type: "paragraph",
        text: "The most reliable way to deploy an agent into a high-stakes workflow is to start in draft-only mode. The agent does the work and proposes an action; a person approves it. This protects you while trust is earned, generates a labelled dataset, and gives your team a gradual on-ramp instead of a cliff edge.",
      },
      {
        type: "paragraph",
        text: "Over time you graduate the narrow task types where the agent is consistently correct to one-click approval, and later to full autonomy — while keeping a human gate on the rare, expensive, or ambiguous cases.",
      },
      { type: "heading", text: "Measuring whether it works" },
      {
        type: "paragraph",
        text: "Before launch, define what success and failure look like in numbers: correct actions, escalations, cost per task, and time saved against the previous process. Those metrics turn a vibe into a business case, and they tell you exactly which task types are ready for more autonomy.",
      },
    ],
  },
  {
    slug: "fine-tuning-vs-rag-vs-prompting",
    title: "Fine-Tuning vs RAG vs Prompting: A Decision Framework",
    excerpt:
      "Three ways to make a model do what your business needs, and a clear framework for choosing the right one without burning budget on the wrong approach.",
    category: "Model Training",
    date: "Jun 7, 2026",
    dateISO: "2026-06-07",
    readTime: "6 min read",
    author: "YOUR BRAND",
    image: "/images/blog/fine-tuning.jpg",
    body: [
      {
        type: "paragraph",
        text: "When an AI feature underperforms, the instinct is to reach for training. In practice, most failures are context failures: the model never had the information it needed. Choosing between prompting, retrieval, and fine-tuning is a sequencing decision, not a matter of taste.",
      },
      { type: "heading", text: "Start with prompting" },
      {
        type: "paragraph",
        text: "A well-structured prompt with clear instructions, examples, and an output schema resolves a surprising share of problems. It is cheap, reversible, and takes hours rather than weeks. If a prompt can reach the quality bar, stop there.",
      },
      { type: "heading", text: "Add retrieval when knowledge is the gap" },
      {
        type: "paragraph",
        text: "If the model is right but out of date — or needs to cite your policies, products, or documents — retrieval is the answer. Chunking strategy and grounding matter more than model choice, and retrieval updates with your data instead of requiring another training run.",
      },
      { type: "heading", text: "Fine-tune when behaviour is the gap" },
      {
        type: "list",
        items: [
          "Knowledge changes often → retrieval.",
          "Tone, format, or reasoning style is consistently wrong → fine-tuning.",
          "Latency or cost per call is the bottleneck → smaller tuned model, or better routing.",
          "You cannot describe what good looks like in examples → you are not ready to train.",
        ],
      },
      {
        type: "quote",
        text: "Fine-tuning is a commitment. Retrieval is a habit. Prompting is a conversation.",
      },
      { type: "heading", text: "Always measure before you commit" },
      {
        type: "paragraph",
        text: "Whichever path you choose, build the eval set first. Without a baseline, you cannot tell whether the training run helped or whether you simply got lucky with the demo data.",
      },
    ],
  },
  {
    slug: "what-ai-model-training-actually-costs",
    title: "What AI Model Training Actually Costs",
    excerpt:
      "Training is the number everyone asks about, but inference is usually the bigger bill. A clear-eyed look at the real economics of building and running AI.",
    category: "AI Economics",
    date: "Jun 6, 2026",
    dateISO: "2026-06-06",
    readTime: "6 min read",
    author: "YOUR BRAND",
    image: "/images/blog/training-costs.jpg",
    body: [
      {
        type: "paragraph",
        text: "Ask what an AI feature cost and most teams quote the training run. That number is memorable but rarely decisive. Over a year of real usage, inference, evaluation, and human review usually dominate the bill.",
      },
      { type: "heading", text: "The four line items" },
      {
        type: "list",
        items: [
          "Data — collection, labelling, cleaning, and the review that never quite ends.",
          "Training — compute for the run, plus the failed runs nobody budgets for.",
          "Inference — cost per request times requests, which grows quietly with adoption.",
          "Operations — evaluation suites, monitoring, and the people who act on alerts.",
        ],
      },
      { type: "heading", text: "Design for unit economics early" },
      {
        type: "paragraph",
        text: "Cache what is cacheable, route easy requests to cheap models, cap context where it is not needed, and measure spend per completed task rather than per token. A feature that is 20% less clever but 5× cheaper is usually the one that ships.",
      },
      {
        type: "quote",
        text: "If you cannot state your cost per successful task, you do not yet know if the feature works.",
      },
    ],
  },
  {
    slug: "from-pilot-to-platform-enterprise-ai",
    title: "From Pilot to Platform: An Operating Model for Enterprise AI",
    excerpt:
      "Most enterprises have plenty of AI pilots and very little AI in production. The gap is not technology, it is the operating model. Here is how to close it.",
    category: "AI Strategy",
    date: "Jun 5, 2026",
    dateISO: "2026-06-05",
    readTime: "6 min read",
    author: "YOUR BRAND",
    image: "/images/blog/pilot-to-platform.jpg",
    body: [
      {
        type: "paragraph",
        text: "Pilots are designed to prove possibility. Platforms are designed to survive contact with an organisation. The transition between the two is where most enterprise AI programmes lose momentum — not because the models failed, but because nothing was built to operate them.",
      },
      { type: "heading", text: "Name an owner for every layer" },
      {
        type: "paragraph",
        text: "Data, model behaviour, evaluation, and the workflow itself each need a person accountable for them. Programmes that assign the whole thing to an innovation lab end up with impressive experiments and no production system.",
      },
      { type: "heading", text: "Make the boring parts first-class" },
      {
        type: "list",
        items: [
          "A shared eval harness, so quality claims are comparable across teams.",
          "A model gateway for keys, quotas, logging, and provider failover.",
          "A review workflow for high-stakes actions, with a queue and an SLA.",
          "A cost dashboard that product managers can read without a finance degree.",
        ],
      },
      { type: "heading", text: "Fund outcomes, not experiments" },
      {
        type: "paragraph",
        text: "Give each initiative a number it must move — hours saved, tickets deflected, revenue captured — and a date to hit it. Programmes that cannot state the number usually cannot state why they should continue.",
      },
    ],
  },
  {
    slug: "evaluating-ai-evals-metrics-trust",
    title: "Evaluating AI: Evals, Metrics, and Trust for the Boardroom",
    excerpt:
      "You cannot govern what you cannot measure. A practical guide to evaluating AI systems, the metrics that matter, and how to report on them at the board level.",
    category: "AI Governance",
    date: "Jun 4, 2026",
    dateISO: "2026-06-04",
    readTime: "6 min read",
    author: "YOUR BRAND",
    image: "/images/blog/evaluating-ai.jpg",
    body: [
      {
        type: "paragraph",
        text: "Boards do not need a lecture on transformer architecture. They need to know what the system is allowed to do, how often it does it correctly, what happens when it fails, and who is accountable. Each of those is measurable.",
      },
      { type: "heading", text: "Build the eval set before the product" },
      {
        type: "paragraph",
        text: "A task-specific set of cases, with agreed reference answers, is the cheapest governance artefact you will ever produce. It turns subjective debate about quality into a number that survives staff changes.",
      },
      { type: "heading", text: "The four numbers worth reporting" },
      {
        type: "list",
        items: [
          "Task success rate against the eval set, trended over releases.",
          "Escalation rate — how often the system defers to a human.",
          "Cost per successful task, including review time.",
          "Incident count and time to detection, with the worst case documented.",
        ],
      },
      { type: "heading", text: "Write down the worst case" },
      {
        type: "paragraph",
        text: "For every action the system can take, describe the worst plausible outcome and the control that limits it. If that sentence is uncomfortable to write, the control is missing.",
      },
      {
        type: "quote",
        text: "Governance is not a document. It is a set of numbers someone is accountable for.",
      },
    ],
  },
];

export function getPost(slug: string): Post | undefined {
  return POSTS.find((post) => post.slug === slug);
}

export function getRelatedPosts(slug: string, count = 3): Post[] {
  return POSTS.filter((post) => post.slug !== slug).slice(0, count);
}
