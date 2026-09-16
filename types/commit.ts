import type { RiskLevel, Trend } from "./common";

/** A single commit that RepoGuard has analyzed. */
export interface Commit {
  id: string;
  /** Full 40-character Git object name. */
  sha: string;
  /** Conventional-commit summary, e.g. "feat: update payment validation". */
  message: string;
  /** Optional extended commit body. */
  body?: string;

  repositoryId: string;
  repositoryName: string;
  branch: string;

  author: CommitAuthor;
  /** ISO 8601. */
  committedAt: string;

  filesChanged: number;
  additions: number;
  deletions: number;

  /** Predicted probability that this change introduces a defect, 0–100. */
  riskScore: number;
  riskLevel: RiskLevel;
  riskTrend: Trend;

  /** True once the ML model has finished scoring this commit. */
  analyzed: boolean;
  /** True if a defect was later confirmed in production for this change. */
  confirmedDefect?: boolean;
}

export interface CommitAuthor {
  /** GitHub login. */
  username: string;
  name: string;
  avatarUrl: string | null;
}

/**
 * The full risk assessment for one commit — the payload behind the commit
 * analysis page and its "Why is this commit risky?" breakdown.
 */
export interface CommitAnalysis {
  commitId: string;
  riskScore: number;
  riskLevel: RiskLevel;

  /** Contributing factors, ordered by weight descending. */
  factors: RiskFactor[];
  /** Files touched, each independently scored. */
  changedFiles: ChangedFile[];
  /** The model's suggested next step for the developer. */
  recommendation: string;
  /** Natural-language explanation of the assessment. */
  explanation: string;

  modelVersion: string;
  /** Confidence of the prediction, 0–1. */
  confidence: number;
  analyzedAt: string;
}

/** One contributing reason behind a risk score. */
export interface RiskFactor {
  key: string;
  label: string;
  /** Share of the total risk contributed, 0–100. Factors sum to ~100. */
  contribution: number;
  /** Magnitude of the underlying signal, 0–100. */
  magnitude: number;
  level: RiskLevel;
  description: string;
}

/** A file touched by a commit, with its own risk assessment. */
export interface ChangedFile {
  path: string;
  language: string;
  additions: number;
  deletions: number;
  riskScore: number;
  riskLevel: RiskLevel;
  /** Unified diff hunks, rendered in the Monaco-based viewer. */
  patch: string;
  /** 1-indexed line numbers the model flagged inside this file's patch. */
  riskMarkers: RiskMarker[];
}

/** A specific line range the model identified as risky. */
export interface RiskMarker {
  /** New-file line number the marker anchors to. */
  line: number;
  level: RiskLevel;
  label: string;
  reason: string;
}

/** A file's aggregate risk profile across its whole history. */
export interface FileRisk {
  path: string;
  language: string;
  riskScore: number;
  riskLevel: RiskLevel;
  complexity: "low" | "medium" | "high";
  testCoverage: number;
  bugCount: number;
  changeCount: number;
  churn: "low" | "medium" | "high";
  contributors: number;
  lastChangedAt: string;
  /** Reasons the file scores as it does, for the detail panel. */
  reasons: string[];
  /** 0–100 risk score over the trailing window. */
  history: RiskHistoryPoint[];
}

export interface RiskHistoryPoint {
  /** ISO date, bucketed by day or week depending on the range. */
  date: string;
  score: number;
}
