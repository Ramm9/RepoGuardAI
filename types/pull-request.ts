import type { RiskLevel } from "./common";

/** Lifecycle of a pull request as GitHub reports it. */
export type PullRequestState = "open" | "merged" | "closed" | "draft";

export interface PullRequest {
  id: string;
  /** PR number within the repository, e.g. 84. */
  number: number;
  title: string;

  repositoryId: string;
  repositoryName: string;

  author: {
    username: string;
    name: string;
    avatarUrl: string | null;
  };

  state: PullRequestState;
  sourceBranch: string;
  targetBranch: string;

  filesChanged: number;
  additions: number;
  deletions: number;
  commits: number;

  /** Predicted regression probability for this PR, 0–100. */
  riskScore: number;
  riskLevel: RiskLevel;

  /** True once the ML model has scored the PR as a whole. */
  analyzed: boolean;
  /** True if review is currently blocked pending action. */
  needsReview: boolean;

  createdAt: string;
  updatedAt: string;
  mergedAt: string | null;
}

/** The detailed assessment shown on the pull request page. */
export interface PullRequestAnalysis {
  pullRequestId: string;
  riskScore: number;
  riskLevel: RiskLevel;
  /** The model's verdict on the likelihood of a regression. */
  regressionRisk: RiskLevel;
  /** Concrete steps the reviewer should take, in priority order. */
  recommendedActions: string[];
  /** Files in the PR, each scored independently. */
  files: PullRequestFile[];
  explanation: string;
  confidence: number;
  analyzedAt: string;
}

export interface PullRequestFile {
  path: string;
  additions: number;
  deletions: number;
  riskScore: number;
  riskLevel: RiskLevel;
}
