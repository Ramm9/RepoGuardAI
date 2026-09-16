import type { AnalysisStage, RiskFactor, Trend } from "@/types";
import { INITIAL_ANALYSIS_STAGES } from "@/components/states/analysis-progress";

/**
 * Specimens for the design sheet.
 *
 * These are deliberately local rather than pulled from the service layer. A spec
 * sheet must render a fixed, known sample so a visual regression is attributable
 * to the component rather than to a shifting fixture — the product's real data
 * comes from the service layer, which this sheet does not exercise.
 */

/** The five factors behind the 78% HIGH commit used across all product mockups. */
export const SPEC_FACTORS: RiskFactor[] = [
  {
    key: "coverage",
    label: "Test coverage",
    contribution: 31,
    magnitude: 88,
    level: "critical",
    description:
      "Edited logic in src/payments/ has 12% coverage, well below the 74% repository baseline.",
  },
  {
    key: "complexity",
    label: "Cyclomatic complexity",
    contribution: 24,
    magnitude: 74,
    level: "high",
    description:
      "Three modified functions exceed a complexity of 15, against a team median of 7.",
  },
  {
    key: "history",
    label: "Historical defect rate",
    contribution: 22,
    magnitude: 69,
    level: "high",
    description:
      "Files in this change have been implicated in 6 production incidents over 90 days.",
  },
  {
    key: "churn",
    label: "Recent churn",
    contribution: 14,
    magnitude: 52,
    level: "medium",
    description:
      "The same files were rewritten twice in the trailing two weeks.",
  },
  {
    key: "size",
    label: "Change size",
    contribution: 9,
    magnitude: 34,
    level: "low",
    description:
      "312 additions across 9 files — within the range the model considers routine.",
  },
];

export const SPEC_HEALTH_BREAKDOWN = [
  { label: "Test coverage", score: 74 },
  { label: "Change stability", score: 88 },
  { label: "Review latency", score: 81 },
  { label: "Defect recurrence", score: 92 },
  { label: "Dependency freshness", score: 69 },
];

export const SPEC_TRENDS: Record<string, Trend> = {
  riskUp: { direction: "up", delta: 12.4, sentiment: "negative" },
  coverageUp: { direction: "up", delta: 4.2, sentiment: "positive" },
  incidentsDown: { direction: "down", delta: 18.0, sentiment: "positive" },
  coverageDown: { direction: "down", delta: 6.1, sentiment: "negative" },
  flat: { direction: "flat", delta: 0, sentiment: "neutral" },
};

/** A mid-flight analysis, for the progress stepper specimen. */
export const SPEC_ANALYSIS_STAGES: AnalysisStage[] = INITIAL_ANALYSIS_STAGES;

/** The table on the data-display section: real commit-shaped rows. */
export const SPEC_COMMITS = [
  {
    sha: "4f2a91c8e3d7b1a05c6f",
    message: "feat: retry payment capture on gateway timeout",
    author: "rmorales",
    risk: 78,
    files: 9,
    delta: "+312 −48",
  },
  {
    sha: "b81c05fa72e94d3a1c88f",
    message: "refactor: extract ledger reconciliation",
    author: "jpark",
    risk: 54,
    files: 21,
    delta: "+840 −610",
  },
  {
    sha: "9e30b7d41acf62805b2e1",
    message: "fix: correct timezone offset in settlement",
    author: "aruiz",
    risk: 37,
    files: 3,
    delta: "+18 −9",
  },
  {
    sha: "c47d9e210ba35f86d0c14",
    message: "chore: bump django from 5.0.2 to 5.0.6",
    author: "dependabot",
    risk: 12,
    files: 2,
    delta: "+14 −14",
  },
];
