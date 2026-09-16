import type { MonitoringState } from "./common";

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  githubUsername: string | null;
  createdAt: string;
}

/** The authenticated user's GitHub connection, as the backend reports it. */
export interface GitHubConnection {
  connected: boolean;
  username: string | null;
  avatarUrl: string | null;
  /** Scopes granted to the installation. */
  scopes: string[];
  connectedAt: string | null;
  /** True if GitHub has rejected the stored credential. */
  expired: boolean;
}

export interface GitHubWebhook {
  id: string;
  repositoryId: string;
  repositoryName: string;
  url: string;
  active: boolean;
  lastDeliveryAt: string | null;
  /** HTTP status of the most recent delivery. */
  lastDeliveryStatus: number | null;
}

/** A repository available to connect, before monitoring is enabled. */
export interface AvailableRepository {
  id: string;
  name: string;
  fullName: string;
  owner: string;
  description: string | null;
  language: string;
  visibility: "public" | "private" | "internal";
  defaultBranch: string;
  stars: number;
  openIssues: number;
  lastCommitAt: string;
  updatedAt: string;
  monitoring: MonitoringState;
}

/** User-configurable analysis and notification preferences. */
export interface AnalysisSettings {
  analyzeEveryPush: boolean;
  analyzePullRequests: boolean;
  dependencyAnalysis: boolean;
  advancedCodeAnalysis: boolean;
  /** Inclusive lower bound for the HIGH band, 0–100. */
  highRiskThreshold: number;
  /** Inclusive lower bound for the CRITICAL band, 0–100. */
  criticalRiskThreshold: number;
}

export interface NotificationSettings {
  email: boolean;
  browser: boolean;
  github: boolean;
  /** Only notify at or above this severity. */
  minimumSeverity: "low" | "medium" | "high" | "critical";
}

/** A pending step in the post-signup onboarding sequence. */
export interface OnboardingState {
  connectGitHub: boolean;
  selectRepository: boolean;
  selectBranch: boolean;
  initialAnalysis: boolean;
  completedAt: string | null;
}
