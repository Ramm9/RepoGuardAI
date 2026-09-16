import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { DeltaBadge } from "@/components/metrics/trend-indicator";
import { Skeleton } from "@/components/ui/skeleton";
import type { Trend } from "@/types";

/**
 * MetricCard — a KPI tile.
 *
 * Deliberately compact. The spec warns against oversized KPI cards, so this is
 * a 3-row layout at 13px/28px type sizes with no decorative padding: label,
 * value, delta. Optional `detail` carries a secondary clause like
 * "2 critical".
 */
export interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  /** Rendered as a small unit or suffix after the value. */
  suffix?: string;
  trend?: Trend;
  /** Unit appended to the trend delta. */
  trendUnit?: string;
  /** Secondary line beneath the value, e.g. "2 critical". */
  detail?: React.ReactNode;
  icon?: LucideIcon;
  /** Tint for the value itself — used when the metric IS a risk score. */
  valueClassName?: string;
  className?: string;
  loading?: boolean;
}

export function MetricCard({
  label,
  value,
  suffix,
  trend,
  trendUnit = "%",
  detail,
  icon: Icon,
  valueClassName,
  className,
  loading = false,
}: MetricCardProps) {
  if (loading) {
    return (
      <Card className={cn("p-4", className)}>
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-7 w-16" />
        <Skeleton className="mt-3 h-4 w-14" />
      </Card>
    );
  }

  return (
    <Card className={cn("group p-4 transition-colors duration-150 hover:border-border-strong", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-faint">
          {label}
        </span>
        {Icon ? (
          <Icon
            className="size-3.5 text-faint transition-colors duration-150 group-hover:text-muted-foreground"
            aria-hidden="true"
          />
        ) : null}
      </div>

      <div className="mt-3 flex items-baseline gap-1">
        <span
          className={cn(
            "font-mono text-2xl font-semibold leading-none tracking-tight tabular-nums text-foreground",
            valueClassName,
          )}
        >
          {value}
        </span>
        {suffix ? (
          <span className="font-mono text-sm text-faint">{suffix}</span>
        ) : null}
      </div>

      <div className="mt-3 flex min-h-5 items-center gap-2">
        {trend ? <DeltaBadge trend={trend} unit={trendUnit} /> : null}
        {detail ? (
          <span className="truncate text-xs text-muted-foreground">{detail}</span>
        ) : null}
      </div>
    </Card>
  );
}
