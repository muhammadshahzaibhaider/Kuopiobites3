/**
 * ILLUSTRATIVE VENDOR MATRIX — NOT A CERTIFIED COMPARISON
 * Values below are synthetic examples to demonstrate table UI, sorting, and filtering.
 * Do NOT rely on these figures for procurement, compliance, or security decisions.
 * For real evaluations, consult vendor documentation and run your own benchmarks.
 */

export interface VendorPlatform {
  name: string;
  provider: string;
  flagshipModel: string;
  deploymentModels: ("SaaS" | "Dedicated VPC" | "On-Prem / Self-Hosted")[];
  contextWindow: string;
  medianLatencyMs: number; // synthetic example
  dataPrivacyPolicy: string;
  hipaaNote: string;
  soc2Note: string;
  pqcReady: boolean;
  toolCallingAccuracy: string; // illustrative
  bestFitFor: string;
}

export const vendorPlatforms: VendorPlatform[] = [
  {
    name: "OpenAI (Example)",
    provider: "Example Provider A",
    flagshipModel: "Example Model — not a product claim",
    deploymentModels: ["SaaS", "Dedicated VPC"],
    contextWindow: "Illustrative",
    medianLatencyMs: 120,
    dataPrivacyPolicy: "Per vendor docs — verify with provider",
    hipaaNote: "Ask provider for BAA status",
    soc2Note: "Ask provider for current report",
    pqcReady: false,
    toolCallingAccuracy: "Illustrative ~96%",
    bestFitFor: "General demos; verify on your workload",
  },
  {
    name: "Anthropic (Example)",
    provider: "Example Provider B",
    flagshipModel: "Example Model — not a product claim",
    deploymentModels: ["SaaS", "Dedicated VPC"],
    contextWindow: "Illustrative",
    medianLatencyMs: 145,
    dataPrivacyPolicy: "Per vendor docs — verify",
    hipaaNote: "Ask provider for BAA status",
    soc2Note: "Ask provider for current report",
    pqcReady: false,
    toolCallingAccuracy: "Illustrative ~97%",
    bestFitFor: "Long-context demo flows",
  },
  {
    name: "AWS Bedrock (Example)",
    provider: "Example Cloud A",
    flagshipModel: "Multi-model access — check docs",
    deploymentModels: ["SaaS", "Dedicated VPC"],
    contextWindow: "Illustrative",
    medianLatencyMs: 135,
    dataPrivacyPolicy: "Per vendor docs — verify",
    hipaaNote: "Ask provider for BAA status",
    soc2Note: "Ask provider for current report",
    pqcReady: true,
    toolCallingAccuracy: "Illustrative ~96%",
    bestFitFor: "VPC-centric demos",
  },
  {
    name: "Vertex AI (Example)",
    provider: "Example Cloud B",
    flagshipModel: "Illustrative",
    deploymentModels: ["SaaS", "Dedicated VPC"],
    contextWindow: "Illustrative",
    medianLatencyMs: 160,
    dataPrivacyPolicy: "Per vendor docs — verify",
    hipaaNote: "Ask provider for BAA status",
    soc2Note: "Ask provider for current report",
    pqcReady: true,
    toolCallingAccuracy: "Illustrative ~95%",
    bestFitFor: "Media-heavy prototypes",
  },
  {
    name: "Azure OpenAI (Example)",
    provider: "Example Cloud C",
    flagshipModel: "Illustrative",
    deploymentModels: ["SaaS", "Dedicated VPC"],
    contextWindow: "Illustrative",
    medianLatencyMs: 125,
    dataPrivacyPolicy: "Per vendor docs — verify",
    hipaaNote: "Ask provider for BAA status",
    soc2Note: "Ask provider for current report",
    pqcReady: true,
    toolCallingAccuracy: "Illustrative ~96%",
    bestFitFor: "Governance-heavy demos",
  },
  {
    name: "Cohere (Example)",
    provider: "Example Provider C",
    flagshipModel: "Illustrative",
    deploymentModels: ["Dedicated VPC", "On-Prem / Self-Hosted"],
    contextWindow: "Illustrative",
    medianLatencyMs: 95,
    dataPrivacyPolicy: "Per vendor docs — verify",
    hipaaNote: "Ask provider for BAA status",
    soc2Note: "Ask provider for current report",
    pqcReady: false,
    toolCallingAccuracy: "Illustrative ~94%",
    bestFitFor: "Retrieval-oriented demos",
  },
  {
    name: "Sovereign Open-Weights (Example)",
    provider: "Self-Hosted Demo",
    flagshipModel: "Illustrative — e.g., Llama-class models",
    deploymentModels: ["On-Prem / Self-Hosted"],
    contextWindow: "Illustrative",
    medianLatencyMs: 65,
    dataPrivacyPolicy: "Self-managed — you define retention",
    hipaaNote: "You must validate and contract",
    soc2Note: "Your deployment, your audit",
    pqcReady: true,
    toolCallingAccuracy: "Illustrative ~95%",
    bestFitFor: "Isolation-focused conceptual demos",
  },
];
