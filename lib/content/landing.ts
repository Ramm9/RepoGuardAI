import {
  Braces,
  FileSearch,
  GitPullRequestArrow,
  Github,
  Layers,
  LineChart,
  MessageSquareCode,
  Radar,
  ShieldAlert,
  Webhook,
  type LucideIcon,
} from "lucide-react";

import type { DiffLine } from "@/components/code/code-diff";
import type { RiskFactor } from "@/types";
import type { RiskModule } from "@/types";

/**
 * Landing page content.
 *
 * Marketing copy and its illustrative figures live here rather than inside the
 * section components, so a section file describes layout and a content file
 * describes claims. Editing the pitch never means editing JSX.
 *
 * Nothing in this file goes through the service layer, and that is deliberate:
 * these are worked examples chosen to explain the product, not live data. The
 * app surfaces read from services/*; the public site does not.
 */

/* ==========================================================================
   Pipeline — the product's core explanation
   ========================================================================== */

export interface PipelineStage {
  id: string;
  label: string;
  icon: LucideIcon;
  headline: string;
  detail: string;
  /** Technical artefacts this stage actually consumes or produces. */
  artefacts: string[];
}

export const PIPELINE_STAGES: PipelineStage[] = [
  {
    id: "activity",
    label: "GitHub Activity",
    icon: Github,
    headline: "Read the repository as it changes.",
    detail:
      "A webhook delivers every push, pull request, and review event. RepoGuard requests read-only scopes and holds no source code after analysis completes.",
    artefacts: ["push", "pull_request", "review", "check_run"],
  },
  {
    id: "intelligence",
    label: "Code Intelligence",
    icon: Braces,
    headline: "Extract the signals that precede defects.",
    detail:
      "Each change is parsed for structural and historical features: complexity deltas, coverage of the touched paths, ownership depth, and the defect history of the files involved.",
    artefacts: ["complexity", "coverage", "ownership", "churn"],
  },
  {
    id: "prediction",
    label: "ML Risk Prediction",
    icon: Radar,
    headline: "Score the change against past outcomes.",
    detail:
      "A gradient-boosted classifier trained on this organization's own commit history and linked incidents returns a calibrated probability that the change introduces a defect.",
    artefacts: ["score 0–100", "confidence", "model version"],
  },
  {
    id: "explanation",
    label: "Risk Explanation",
    icon: MessageSquareCode,
    headline: "Show the reasoning, not just the number.",
    detail:
      "Every score decomposes into weighted contributing factors, each traced back to the specific lines and files that produced it. A score you cannot interrogate is a score nobody acts on.",
    artefacts: ["factor weights", "line markers", "affected files"],
  },
  {
    id: "action",
    label: "Developer Action",
    icon: GitPullRequestArrow,
    headline: "Put it where the decision is made.",
    detail:
      "Results surface as a pull request check, a dashboard alert, and a reviewable diff — so the highest-risk changes get the deepest review before they merge.",
    artefacts: ["PR check", "alert", "review queue"],
  },
];

/* ==========================================================================
   Capabilities
   ========================================================================== */

export interface Capability {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Short technical proof point rendered in mono beneath the copy. */
  proof: string;
}

export const CAPABILITIES: Capability[] = [
  {
    id: "commit-risk",
    title: "Commit risk scoring",
    description:
      "Every commit is scored as it lands, with the contributing factors ranked by weight and traced to the lines that caused them.",
    icon: ShieldAlert,
    proof: "score · confidence · factor weights",
  },
  {
    id: "pr-analysis",
    title: "Pull request analysis",
    description:
      "Aggregate risk across a branch, surfaced as a status check so the signal arrives before the merge button does.",
    icon: GitPullRequestArrow,
    proof: "GitHub check run",
  },
  {
    id: "hotspots",
    title: "Risk hotspots",
    description:
      "Files ranked by predicted defect likelihood, combining complexity, coverage gaps, churn, and prior incident history.",
    icon: FileSearch,
    proof: "ranked by predicted defect density",
  },
  {
    id: "map",
    title: "Repository risk map",
    description:
      "Module-level risk plotted across the dependency graph, so you can see which fragile components everything else relies on.",
    icon: Layers,
    proof: "modules · dependencies · aggregate risk",
  },
  {
    id: "trends",
    title: "Reliability trends",
    description:
      "Risk over time per repository, team, and author — measured against deployments and incidents rather than in isolation.",
    icon: LineChart,
    proof: "7d · 30d · 90d · 1y",
  },
  {
    id: "integration",
    title: "Webhook integration",
    description:
      "Connect a repository once. Analysis runs automatically on every subsequent push and pull request, with no CI changes required.",
    icon: Webhook,
    proof: "no pipeline configuration",
  },
];

/* ==========================================================================
   Worked example — the commit the landing page explains
   ========================================================================== */

export const EXAMPLE_COMMIT = {
  sha: "4f2a91c8e3d7b1a05c6f",
  message: "feat: update payment validation thresholds",
  author: "priya.raman",
  branch: "main",
  repository: "acme/payments-api",
  score: 78,
  confidence: 0.91,
  modelVersion: "v2.4.1",
  filesChanged: 6,
  additions: 312,
  deletions: 48,
} as const;

export const EXAMPLE_FACTORS: RiskFactor[] = [
  {
    key: "coverage",
    label: "Test coverage gap",
    contribution: 31,
    magnitude: 84,
    level: "critical",
    description:
      "Payment validation paths changed with no corresponding test additions.",
  },
  {
    key: "complexity",
    label: "Cyclomatic complexity",
    contribution: 24,
    magnitude: 71,
    level: "high",
    description:
      "The modified function now carries 14 branches, up from 9 before this change.",
  },
  {
    key: "history",
    label: "Prior defect density",
    contribution: 22,
    magnitude: 66,
    level: "high",
    description:
      "This module has produced 7 production incidents in the last 90 days.",
  },
  {
    key: "churn",
    label: "Recent churn",
    contribution: 14,
    magnitude: 48,
    level: "medium",
    description:
      "Touched by 5 contributors across 19 commits in the past two weeks.",
  },
  {
    key: "size",
    label: "Change size",
    contribution: 9,
    magnitude: 27,
    level: "low",
    description: "312 additions and 48 deletions across 6 files.",
  },
];

export const EXAMPLE_HEALTH_BREAKDOWN = [
  { label: "Test coverage", score: 74 },
  { label: "Code complexity", score: 88 },
  { label: "Defect history", score: 79 },
  { label: "Review depth", score: 91 },
  { label: "Change stability", score: 81 },
];

/* ==========================================================================
   Worked example — the diff, with the model's line-level annotations
   ========================================================================== */

export const EXAMPLE_DIFF_PATH = "src/payments/validation.py";

export const EXAMPLE_DIFF: DiffLine[] = [
  {
    kind: "hunk",
    oldLine: null,
    newLine: null,
    content: "@@ -84,12 +84,26 @@ def validate_charge(request, account):",
  },
  {
    kind: "context",
    oldLine: 84,
    newLine: 84,
    content: "    amount = request.get('amount')",
  },
  {
    kind: "context",
    oldLine: 85,
    newLine: 85,
    content: "    currency = request.get('currency', 'USD')",
  },
  {
    kind: "remove",
    oldLine: 86,
    newLine: null,
    content: "    if amount > account.limit:",
  },
  {
    kind: "remove",
    oldLine: 87,
    newLine: null,
    content: "        raise LimitExceeded(account.id)",
  },
  {
    kind: "add",
    oldLine: null,
    newLine: 86,
    content: "    threshold = account.limit * RISK_MULTIPLIER",
    risk: {
      level: "critical",
      reason:
        "New threshold calculation on a payment authorization path with no test covering it.",
    },
  },
  {
    kind: "add",
    oldLine: null,
    newLine: 87,
    content: "    if amount > threshold and not account.is_trusted:",
    risk: {
      level: "high",
      reason:
        "Compound condition raises branch count from 9 to 14 in this function.",
    },
  },
  {
    kind: "add",
    oldLine: null,
    newLine: 88,
    content: "        raise LimitExceeded(account.id)",
  },
  {
    kind: "add",
    oldLine: null,
    newLine: 89,
    content: "    elif amount > threshold:",
    risk: {
      level: "high",
      reason:
        "Trusted accounts now bypass the limit check entirely — behaviour change, not a refactor.",
    },
  },
  {
    kind: "add",
    oldLine: null,
    newLine: 90,
    content: "        log.warning('limit bypassed for %s', account.id)",
  },
  {
    kind: "context",
    oldLine: 88,
    newLine: 91,
    content: "",
  },
  {
    kind: "context",
    oldLine: 89,
    newLine: 92,
    content: "    return Charge.create(account, amount, currency)",
  },
];

/* ==========================================================================
   Worked example — the repository risk map
   ========================================================================== */

export const EXAMPLE_MODULES: RiskModule[] = [
  {
    id: "payments",
    name: "payments",
    risk: 84,
    riskLevel: "critical",
    fileCount: 42,
    dependsOn: ["core", "ledger"],
    layout: { x: 0.34, y: 0.22 },
  },
  {
    id: "ledger",
    name: "ledger",
    risk: 71,
    riskLevel: "high",
    fileCount: 28,
    dependsOn: ["core"],
    layout: { x: 0.62, y: 0.16 },
  },
  {
    id: "core",
    name: "core",
    risk: 46,
    riskLevel: "medium",
    fileCount: 56,
    dependsOn: [],
    layout: { x: 0.5, y: 0.58 },
  },
  {
    id: "auth",
    name: "auth",
    risk: 63,
    riskLevel: "high",
    fileCount: 19,
    dependsOn: ["core"],
    layout: { x: 0.14, y: 0.62 },
  },
  {
    id: "api",
    name: "api",
    risk: 38,
    riskLevel: "low",
    fileCount: 34,
    dependsOn: ["payments", "auth", "core"],
    layout: { x: 0.2, y: 0.9 },
  },
  {
    id: "notifications",
    name: "notifications",
    risk: 29,
    riskLevel: "low",
    fileCount: 12,
    dependsOn: ["core"],
    layout: { x: 0.84, y: 0.58 },
  },
  {
    id: "reporting",
    name: "reporting",
    risk: 52,
    riskLevel: "medium",
    fileCount: 23,
    dependsOn: ["ledger", "core"],
    layout: { x: 0.74, y: 0.88 },
  },
];

/* ==========================================================================
   Architecture — how the system is actually built
   ========================================================================== */

export interface ArchitectureLayer {
  id: string;
  title: string;
  stack: string;
  responsibilities: string[];
}

export const ARCHITECTURE: ArchitectureLayer[] = [
  {
    id: "frontend",
    title: "Frontend",
    stack: "Next.js · TypeScript · Tailwind",
    responsibilities: [
      "Renders analysis, never performs it",
      "Server state through TanStack Query",
      "No GitHub credentials in client code",
    ],
  },
  {
    id: "api",
    title: "API",
    stack: "Django REST Framework",
    responsibilities: [
      "Owns the GitHub App installation token",
      "Serves scores, factors, and history",
      "Enforces per-repository authorization",
    ],
  },
  {
    id: "analysis",
    title: "Analysis",
    stack: "Python · Celery workers",
    responsibilities: [
      "Feature extraction from diffs",
      "Model inference and calibration",
      "Runs off the request path",
    ],
  },
  {
    id: "storage",
    title: "Storage",
    stack: "PostgreSQL",
    responsibilities: [
      "Scores, factors, and trends",
      "Metadata only — no source retained",
      "Per-tenant isolation",
    ],
  },
];
