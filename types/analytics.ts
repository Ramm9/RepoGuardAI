import type { RiskLevel, TimeRange, Trend } from "./common";

/** A single point in a time series. `date` is an ISO 8601 string. */
export interface SeriesPoint {
  date: string;
  value: number;
  /** Optional secondary series, e.g. the high-risk band on a risk chart. */
  secondary?: number;
}

/** Wrapper for every chart payload so charts share one shape. */
export interface MetricSeries {
  metric: string;
  label: string;
  unit: string;
  points: SeriesPoint[];
  average: number;
  peak: number;
  trend: Trend;
}

/** Everything the analytics workspace renders, in one payload. */
export interface AnalyticsOverview {
  range: TimeRange;
  riskTrend: MetricSeries;
  riskDistribution: RiskDistributionBucket[];
  coverageTrend: MetricSeries;
  churnTrend: MetricSeries;
  healthTrend: MetricSeries;
  topRiskyFiles: RiskyFileSummary[];
  topRiskyModules: RiskyModuleSummary[];
  summary: AnalyticsSummary;
}

export interface AnalyticsSummary {
  averageRisk: number;
  riskTrend: Trend;
  totalCommits: number;
  highRiskCommits: number;
  averageCoverage: number;
  coverageTrend: Trend;
  defectRate: number;
}

export interface RiskDistributionBucket {
  level: RiskLevel;
  label: string;
  /** Number of changes in this bucket. */
  count: number;
  /** Share of the total, 0–100. */
  percentage: number;
}

export interface RiskyFileSummary {
  path: string;
  repositoryName: string;
  riskScore: number;
  riskLevel: RiskLevel;
  changeCount: number;
}

export interface RiskyModuleSummary {
  name: string;
  repositoryName: string;
  risk: number;
  riskLevel: RiskLevel;
  fileCount: number;
}

/** Team-level engineering activity. Deliberately not a developer ranking. */
export interface TeamActivity {
  members: TeamMemberActivity[];
  totals: {
    commits: number;
    pullRequests: number;
    reviews: number;
    repositories: number;
  };
}

export interface TeamMemberActivity {
  username: string;
  name: string;
  avatarUrl: string | null;
  role: "owner" | "maintainer" | "member" | "viewer";

  /** Repositories this person owns or primarily maintains. */
  ownedRepositories: string[];
  commits: number;
  pullRequests: number;
  reviews: number;
  /** Mean risk of the changes they authored — presented as distribution, not score. */
  averageChangeRisk: number;
  riskDistribution: Record<RiskLevel, number>;
  lastActiveAt: string;
}

/** An entry in the dashboard's recent activity timeline. */
export interface ActivityEvent {
  id: string;
  kind: "commit" | "pull_request" | "hotspot" | "health" | "alert" | "analysis";
  title: string;
  subtitle: string;
  repositoryName: string;
  /** Present when the event carries a risk score. */
  riskScore?: number;
  riskLevel?: RiskLevel;
  /** Present when the event carries a signed change, e.g. "+7 points". */
  delta?: number;
  createdAt: string;
  href: string;
}

/** Dashboard headline metrics. */
export interface DashboardSummary {
  health: { score: number; trend: Trend };
  risk: { score: number; trend: Trend };
  commitsAnalyzed: { count: number; trend: Trend };
  alerts: { total: number; critical: number; high: number; trend: Trend };
}
