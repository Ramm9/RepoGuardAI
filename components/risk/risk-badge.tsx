import * as React from "react";
import {
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  Siren,
  type LucideIcon,
} from "lucide-react";

import { cn, RISK_LABEL, RISK_STYLES, riskLevelFromScore } from "@/lib/utils";
import type { RiskLevel } from "@/types";

/**
 * The canonical risk icon per level.
 *
 * Accessibility rule for this product: risk is NEVER communicated by colour
 * alone. Every risk surface renders icon + label + colour together, and the
 * icon is what a colour-blind or monochrome-display user reads first.
 */
const RISK_ICON: Record<RiskLevel, LucideIcon> = {
  low: ShieldCheck,
  medium: ShieldQuestion,
  high: ShieldAlert,
  critical: Siren,
};

export interface RiskBadgeProps extends React.ComponentProps<"span"> {
  /** 0–100 risk score. The level is derived, never passed separately. */
  score?: number;
  /** Explicit level, for cases where the API supplies it directly. */
  level?: RiskLevel;
  /** Show the numeric score alongside the label. */
  showScore?: boolean;
  size?: "sm" | "md" | "lg";
  /** Hide the leading icon. Use only where the icon is rendered adjacently. */
  hideIcon?: boolean;
}

/**
 * RiskBadge — the single component through which risk level reaches the screen.
 *
 * Centralising it guarantees LOW/MEDIUM/HIGH/CRITICAL look and read identically
 * in the commit table, the PR list, the hotspot map, and the alert centre.
 */
function RiskBadge({
  score,
  level,
  showScore = false,
  size = "md",
  hideIcon = false,
  className,
  ...props
}: RiskBadgeProps) {
  const resolved: RiskLevel =
    level ?? (typeof score === "number" ? riskLevelFromScore(score) : "low");

  const styles = RISK_STYLES[resolved];
  const Icon = RISK_ICON[resolved];

  const sizes = {
    sm: "h-5 gap-1 rounded-sm px-1.5 text-[11px] [&_svg]:size-3",
    md: "h-6 gap-1.5 rounded-sm px-2 text-xs [&_svg]:size-3.5",
    lg: "h-7 gap-2 rounded-md px-2.5 text-[13px] [&_svg]:size-4",
  } as const;

  return (
    <span
      data-slot="risk-badge"
      data-risk={resolved}
      // Announces as "High risk, 78 percent" rather than reading the raw glyph.
      aria-label={`${RISK_LABEL[resolved]} risk${typeof score === "number" ? `, ${score} percent` : ""}`}
      className={cn(
        "inline-flex items-center border font-medium whitespace-nowrap",
        styles.text,
        styles.bg,
        styles.border,
        sizes[size],
        className,
      )}
      {...props}
    >
      {hideIcon ? null : <Icon aria-hidden="true" />}
      <span className="uppercase tracking-wide">{RISK_LABEL[resolved]}</span>
      {showScore && typeof score === "number" ? (
        <span className="font-mono tabular-nums opacity-90">{score}%</span>
      ) : null}
    </span>
  );
}

/**
 * RiskScore — the oversized numeric treatment used at the top of commit and PR
 * analysis pages, where the score itself is the headline.
 */
function RiskScore({
  score,
  level,
  size = "xl",
  className,
}: {
  score: number;
  level?: RiskLevel;
  size?: "md" | "lg" | "xl";
  className?: string;
}) {
  const resolved = level ?? riskLevelFromScore(score);
  const styles = RISK_STYLES[resolved];

  const sizes = {
    md: "text-3xl",
    lg: "text-5xl",
    xl: "text-7xl",
  } as const;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline gap-1.5">
        <span
          className={cn(
            "font-mono font-semibold leading-[0.9] tabular-nums tracking-tighter",
            styles.text,
            sizes[size],
          )}
        >
          {score}
        </span>
        <span className="font-mono text-xl font-medium text-faint">%</span>
      </div>
      <RiskBadge score={score} level={resolved} size="lg" />
    </div>
  );
}

/** A small solid dot tinted by risk level. For dense legends and list rows. */
function RiskDot({
  level,
  className,
}: {
  level: RiskLevel;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block size-1.5 rounded-full", RISK_STYLES[level].dot, className)}
    />
  );
}

export { RiskBadge, RiskScore, RiskDot, RISK_ICON };
