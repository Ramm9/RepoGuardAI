import { ArrowDown, ArrowRight, ArrowUp, type LucideIcon } from "lucide-react";

import { cn, formatDelta } from "@/lib/utils";
import type { Trend } from "@/types";

/**
 * TrendIndicator — a signed change with direction, magnitude, and sentiment.
 *
 * The important distinction this component encodes: direction is not sentiment.
 * Rising risk is bad; rising coverage is good. The arrow shows direction, the
 * colour shows whether that direction is favourable, and the accessible label
 * spells out both so neither is inferred from colour.
 */
const DIRECTION_ICON: Record<Trend["direction"], LucideIcon> = {
  up: ArrowUp,
  down: ArrowDown,
  flat: ArrowRight,
};

export function TrendIndicator({
  trend,
  className,
  size = "md",
  /** Append the unit to the delta, e.g. "%" or "pts". */
  unit = "%",
  /** Override the rendered text entirely while keeping the icon and colour. */
  label,
  showIcon = true,
}: {
  trend: Trend;
  className?: string;
  size?: "sm" | "md";
  unit?: string;
  label?: string;
  showIcon?: boolean;
}) {
  const Icon = DIRECTION_ICON[trend.direction];

  const tone = {
    positive: "text-risk-low",
    negative: "text-risk-critical",
    neutral: "text-faint",
  }[trend.sentiment];

  const directionWord = {
    up: "increased",
    down: "decreased",
    flat: "unchanged",
  }[trend.direction];

  const rendered = label ?? `${formatDelta(trend.delta)}${unit === "%" ? "" : ` ${unit}`}`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium tabular-nums whitespace-nowrap",
        size === "sm" ? "text-[11px]" : "text-xs",
        tone,
        className,
      )}
      // Screen readers hear the judgement, not the arrow glyph.
      aria-label={`${directionWord} by ${Math.abs(trend.delta).toFixed(1)} ${unit === "%" ? "percent" : unit}, which is ${
        trend.sentiment === "positive"
          ? "an improvement"
          : trend.sentiment === "negative"
            ? "a regression"
            : "no material change"
      }`}
    >
      {showIcon && trend.direction !== "flat" ? (
        <Icon className="size-3" aria-hidden="true" />
      ) : null}
      {showIcon && trend.direction === "flat" ? (
        <span aria-hidden="true" className="text-faint">
          —
        </span>
      ) : null}
      <span aria-hidden="true">{rendered}</span>
    </span>
  );
}

/**
 * DeltaBadge — a boxed trend, for KPI rows where the change needs to read as a
 * discrete token rather than inline text.
 */
export function DeltaBadge({
  trend,
  unit = "%",
  className,
}: {
  trend: Trend;
  unit?: string;
  className?: string;
}) {
  const tone = {
    positive: "border-risk-low/25 bg-risk-low/8 text-risk-low",
    negative: "border-risk-critical/25 bg-risk-critical/8 text-risk-critical",
    neutral: "border-border bg-elevated text-muted-foreground",
  }[trend.sentiment];

  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-sm border px-1.5",
        tone,
        className,
      )}
    >
      <TrendIndicator
        trend={trend}
        size="sm"
        unit={unit}
        showIcon
        className="text-current"
      />
    </span>
  );
}
