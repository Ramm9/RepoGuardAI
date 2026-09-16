import type { MonitoringState, Trend } from "./common";

/** A connected GitHub repository under monitoring. */
export interface Repository {
  id: string;
  name: string;
  /** "owner/name" — the canonical GitHub identifier. */
  fullName: string;
  owner: string;
  description: string | null;
  language: string;
  visibility: "public" | "private" | "internal";
  defaultBranch: string;

  /** Composite reliability score, 0–100. Higher is healthier. */
  health: number;
  healthTrend: Trend;

  /** Current aggregate defect probability across the default branch, 0–100. */
  risk: number;
  riskTrend: Trend;

  commitsAnalyzed: number;
  openAlerts: number;
  criticalAlerts: number;
  testCoverage: number;
  contributorCount: number;

  monitoring: MonitoringState;
  /** ISO 8601 timestamps, serialized as strings over the wire. */
  lastCommitAt: string;
  lastAnalyzedAt: string;
  updatedAt: string;
  monitoredSince: string;
}

/** The health score decomposed into its five weighted components. */
export interface RepositoryHealth {
  repositoryId: string;
  /** Composite score, 0–100. */
  score: number;
  trend: Trend;
  breakdown: HealthComponent[];
  /** ISO timestamp of the analysis this score was computed from. */
  computedAt: string;
}

export interface HealthComponent {
  key: "codeQuality" | "testing" | "stability" | "security" | "reliability";
  label: string;
  /** 0–100. */
  score: number;
  /** Relative weight in the composite score, 0–1. */
  weight: number;
  trend: Trend;
}

/** An auto-generated, human-readable observation about a repository. */
export interface RepositoryInsight {
  id: string;
  repositoryId: string;
  severity: "info" | "positive" | "warning" | "critical";
  title: string;
  body: string;
  /** Where the developer should go to act on it, if anywhere. */
  href?: string;
  createdAt: string;
}

/** A branching strategy surfaced with the repository, used by filters. */
export interface BranchRef {
  name: string;
  isDefault: boolean;
  lastCommitAt: string;
  risk: number;
}
