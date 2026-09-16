import * as React from "react";

import { cn, riskColor } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * ScoreBar — an inline horizontal metric with its value.
 *
 * The workhorse for dense comparative data: repository health rows, hotspot
 * coverage columns, module risk lists. The bar is redundant reinforcement; the
 * number is always rendered, so the bar can be zero-width without losing
 * meaning.
 */
export function ScoreBar({
  value,
  /** Maximum the value is measured against. */
  max = 100,
  label,
  /** Tint by the risk scale instead of a neutral accent. */
  riskAware = false,
  color,
  className,
  valueClassName,
  showValue = true,
  suffix = "%",
  size = "md",
}: {
  value: number;
  max?: number;
  label?: React.ReactNode;
  riskAware?: boolean;
  color?: string;
  className?: string;
  valueClassName?: string;
  showValue?: boolean;
  suffix?: string;
  size?: "sm" | "md";
}) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const fill = color ?? (riskAware ? riskColor(percentage) : "var(--color-accent)");

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label || showValue ? (
        <div className="flex items-baseline justify-between gap-3">
          {label ? (
            <span className="truncate text-[13px] text-muted-foreground">{label}</span>
          ) : (
            <span />
          )}
          {showValue ? (
            <span
              className={cn(
                "font-mono text-[13px] tabular-nums text-foreground",
                valueClassName,
              )}
            >
              {value}
              {suffix}
            </span>
          ) : null}
        </div>
      ) : null}

      <div
        className={cn(
          "w-full overflow-hidden rounded-full bg-elevated",
          size === "sm" ? "h-1" : "h-1.5",
        )}
        role="presentation"
      >
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${percentage}%`, backgroundColor: fill }}
        />
      </div>
    </div>
  );
}

/**
 * StatRow — a label/value pair on a hairline row.
 *
 * Use these instead of cards when the content is a list of comparable facts.
 * This is the layout that keeps settings, repository metadata, and analysis
 * summaries from turning into a grid of identical boxes.
 */
export function StatRow({
  label,
  value,
  mono = false,
  className,
  hint,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  mono?: boolean;
  className?: string;
  hint?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 border-b border-border py-2.5 last:border-0",
        className,
      )}
    >
      <div className="min-w-0">
        <span className="text-[13px] text-muted-foreground">{label}</span>
        {hint ? (
          <p className="mt-0.5 text-xs leading-relaxed text-faint">{hint}</p>
        ) : null}
      </div>
      <span
        className={cn(
          "shrink-0 text-[13px] text-foreground",
          mono && "font-mono tabular-nums",
        )}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * MetricGrid — labelled metrics in a tight grid, for the header strip of a
 * detail page. Not cards: bare figures with dividers between them.
 */
export function MetricGrid({
  items,
  columns = 4,
  loading = false,
  className,
}: {
  items: { label: string; value: React.ReactNode; mono?: boolean }[];
  columns?: 2 | 3 | 4 | 5;
  loading?: boolean;
  className?: string;
}) {
  const cols = {
    2: "grid-cols-2",
    3: "grid-cols-2 sm:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-4",
    5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
  }[columns];

  if (loading) {
    return (
      <div className={cn("grid divide-x divide-border", cols, className)}>
        {Array.from({ length: items.length || columns }).map((_, index) => (
          <div key={index} className="px-4 first:pl-0">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2.5 h-6 w-14" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <dl className={cn("grid divide-x divide-border", cols, className)}>
      {items.map((item) => (
        <div key={item.label} className="min-w-0 px-4 first:pl-0">
          <dt className="text-[11px] font-medium uppercase tracking-wider text-faint">
            {item.label}
          </dt>
          <dd
            className={cn(
              "mt-1.5 text-xl font-semibold leading-none tracking-tight text-foreground",
              item.mono !== false && "font-mono tabular-nums",
            )}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
