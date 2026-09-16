import type { RiskLevel } from "./common";

/** Alert severities, matching the risk scale so colours stay consistent. */
export type AlertSeverity = "critical" | "high" | "medium" | "low";
export type AlertStatus = "open" | "read" | "resolved";

export interface Alert {
  id: string;
  repositoryId: string;
  repositoryName: string;

  severity: AlertSeverity;
  status: AlertStatus;

  title: string;
  body: string;
  /** Stable identifier for the alert class, e.g. "risk_spike". */
  kind: string;

  /** Deep link to the entity that triggered the alert. */
  source: AlertSource | null;

  createdAt: string;
  resolvedAt: string | null;
}

/** A navigable reference back to whatever caused the alert. */
export interface AlertSource {
  type: "commit" | "pull_request" | "file" | "repository";
  id: string;
  label: string;
  href: string;
}

/** A file the model considers most likely to introduce or contain defects. */
export interface Hotspot {
  id: string;
  repositoryId: string;
  path: string;
  language: string;

  riskScore: number;
  riskLevel: RiskLevel;
  complexity: "low" | "medium" | "high";
  testCoverage: number;
  bugCount: number;
  changeCount: number;

  /** Module this file belongs to, used by the risk map. */
  module: string;
  lastChangedAt: string;
}

/** A module grouping in the repository risk map. */
export interface RiskModule {
  id: string;
  name: string;
  /** Aggregate risk across the module's files, 0–100. */
  risk: number;
  riskLevel: RiskLevel;
  fileCount: number;
  /** IDs of modules this one depends on, used to draw the graph. */
  dependsOn: string[];
  /** Position hint for the layout, 0–1 on each axis. */
  layout: { x: number; y: number };
}
