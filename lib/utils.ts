import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { RiskLevel } from "@/types";

/** Merge conditional class names, letting later Tailwind utilities win. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Canonical numeric thresholds for the risk scale.
 * Kept in one place so the API, the charts, and the badges can never drift.
 */
export const RISK_THRESHOLDS = {
  medium: 40,
  high: 60,
  critical: 80,
} as const;

/** Map a 0–100 risk score onto the application's four-level scale. */
export function riskLevelFromScore(score: number): RiskLevel {
  if (score >= RISK_THRESHOLDS.critical) return "critical";
  if (score >= RISK_THRESHOLDS.high) return "high";
  if (score >= RISK_THRESHOLDS.medium) return "medium";
  return "low";
}

/** Human label for a risk level. Always rendered alongside colour + icon. */
export const RISK_LABEL: Record<RiskLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

/**
 * Tailwind class fragments per risk level. Centralised so risk is expressed
 * identically in every surface of the product.
 */
export const RISK_STYLES: Record<
  RiskLevel,
  { text: string; bg: string; border: string; dot: string; stroke: string }
> = {
  low: {
    text: "text-risk-low",
    bg: "bg-risk-low/10",
    border: "border-risk-low/30",
    dot: "bg-risk-low",
    stroke: "stroke-risk-low",
  },
  medium: {
    text: "text-risk-medium",
    bg: "bg-risk-medium/10",
    border: "border-risk-medium/30",
    dot: "bg-risk-medium",
    stroke: "stroke-risk-medium",
  },
  high: {
    text: "text-risk-high",
    bg: "bg-risk-high/10",
    border: "border-risk-high/30",
    dot: "bg-risk-high",
    stroke: "stroke-risk-high",
  },
  critical: {
    text: "text-risk-critical",
    bg: "bg-risk-critical/10",
    border: "border-risk-critical/30",
    dot: "bg-risk-critical",
    stroke: "stroke-risk-critical",
  },
};

/**
 * Colour for a given score, for chart fills and strokes. Mirrors
 * RISK_STYLES so a Recharts series and a RiskBadge always agree.
 */
export function riskColor(score: number): string {
  return {
    low: "#34d399",
    medium: "#fbbf24",
    high: "#fb923c",
    critical: "#f85149",
  }[riskLevelFromScore(score)];
}

/** "2m", "3h", "5d" — compact relative time for dense tables. */
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";

  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;

  return `${Math.floor(months / 12)}y`;
}

/** Absolute timestamp for tooltips and detail headers. */
export function absoluteTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Group an integer with thin separators: 12800 → "12,800". */
export function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

/** Signed percentage for trend indicators: 4.2 → "+4.2%". */
export function formatDelta(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

/** Truncate a commit SHA to its conventional short form. */
export function shortSha(sha: string): string {
  return sha.slice(0, 7);
}

/** Clamp a number into an inclusive range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
