/**
 * Shared primitives used across every domain type.
 *
 * These mirror the shape the Django REST Framework serializers are expected to
 * return, so swapping the mock service layer for live HTTP changes nothing in
 * the component tree.
 */

/** The application's four-level risk scale. Never rendered as colour alone. */
export type RiskLevel = "low" | "medium" | "high" | "critical";

/** Direction of change for a metric over the selected window. */
export type TrendDirection = "up" | "down" | "flat";

/** Whether a movement in a metric is good news, which is not the same as up. */
export type TrendSentiment = "positive" | "negative" | "neutral";

export interface Trend {
  direction: TrendDirection;
  /** Percentage change over the comparison window, e.g. 4.2 */
  delta: number;
  sentiment: TrendSentiment;
}

/** Monitoring lifecycle for a connected repository. */
export type MonitoringState = "active" | "paused" | "error" | "pending";

/** Time windows offered by every time-series surface in the product. */
export type TimeRange = "7d" | "30d" | "90d" | "6m" | "1y";

/** Standard DRF pagination envelope. */
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

/** Every list endpoint accepts these for server-side searching and sorting. */
export interface ListParams extends PaginationParams {
  search?: string;
  ordering?: string;
}

/** Analysis lifecycle stages, surfaced as step indicators in the UI. */
export type AnalysisStageState = "complete" | "running" | "waiting";

export interface AnalysisStage {
  id: string;
  label: string;
  state: AnalysisStageState;
  /** Optional sub-label, e.g. a count or an elapsed duration. */
  detail?: string;
}
