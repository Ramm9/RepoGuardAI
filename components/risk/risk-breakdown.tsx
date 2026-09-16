"use client";

import * as React from "react";
import { motion } from "motion/react";

import { cn, RISK_STYLES } from "@/lib/utils";
import { RiskBadge } from "@/components/risk/risk-badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { RiskFactor } from "@/types";

/**
 * RiskBreakdown — "Why is this commit risky?"
 *
 * Horizontal contribution bars, ordered by weight. Each bar carries its
 * percentage inline rather than on an axis, and hovering reveals the underlying
 * signal magnitude and a plain-language description. This is the component that
 * turns a bare probability into something a developer can act on.
 */
export function RiskBreakdown({
  factors,
  className,
  /** Cap the list; the remainder collapse into a summary row. */
  limit,
  showDescriptions = false,
}: {
  factors: RiskFactor[];
  className?: string;
  limit?: number;
  showDescriptions?: boolean;
}) {
  const ordered = React.useMemo(
    () => [...factors].sort((a, b) => b.contribution - a.contribution),
    [factors],
  );

  const visible = limit ? ordered.slice(0, limit) : ordered;
  const hidden = limit ? ordered.slice(limit) : [];
  const hiddenTotal = hidden.reduce((sum, factor) => sum + factor.contribution, 0);

  return (
    <div className={cn("flex flex-col", className)}>
      <ul className="flex flex-col">
        {visible.map((factor, index) => (
          <li
            key={factor.key}
            className="border-b border-border py-3 first:pt-0 last:border-0"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="group flex flex-col gap-2 text-left">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="flex items-center gap-2 text-[13px] font-medium text-foreground">
                      {factor.label}
                      <RiskBadge
                        level={factor.level}
                        size="sm"
                        hideIcon
                        className="hidden sm:inline-flex"
                      />
                    </span>
                    <span className="font-mono text-[13px] tabular-nums text-muted-foreground">
                      {factor.contribution}%
                    </span>
                  </div>

                  {/* Contribution bar. The track is the full weight; the fill is
                      this factor's share of the total risk. */}
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-elevated">
                    <motion.div
                      className={cn("h-full rounded-full", RISK_STYLES[factor.level].dot)}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${factor.contribution}%` }}
                      viewport={{ once: true, margin: "-40px" }}
                      transition={{
                        duration: 0.7,
                        delay: index * 0.06,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    />
                  </div>

                  {showDescriptions ? (
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {factor.description}
                    </p>
                  ) : null}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium text-foreground">{factor.label}</p>
                <p className="mt-1 text-muted-foreground">{factor.description}</p>
                <p className="mt-1.5 font-mono text-[11px] text-faint">
                  Signal magnitude {factor.magnitude}/100 · contributes{" "}
                  {factor.contribution}% of total risk
                </p>
              </TooltipContent>
            </Tooltip>
          </li>
        ))}
      </ul>

      {hidden.length > 0 ? (
        <div className="flex items-baseline justify-between gap-4 border-t border-border pt-3">
          <span className="text-[13px] text-muted-foreground">
            {hidden.length} other factor{hidden.length === 1 ? "" : "s"}
          </span>
          <span className="font-mono text-[13px] tabular-nums text-faint">
            {hiddenTotal}%
          </span>
        </div>
      ) : null}
    </div>
  );
}

/**
 * RiskFactorList — the compact checklist form of the same data, used in the
 * right-hand panel of the commit analysis page.
 */
export function RiskFactorList({
  factors,
  className,
}: {
  factors: RiskFactor[];
  className?: string;
}) {
  const ordered = React.useMemo(
    () => [...factors].sort((a, b) => b.contribution - a.contribution),
    [factors],
  );

  return (
    <ul className={cn("flex flex-col gap-2.5", className)}>
      {ordered.map((factor) => (
        <li key={factor.key} className="flex items-start gap-2.5">
          <span
            aria-hidden="true"
            className={cn(
              "mt-[5px] size-1.5 shrink-0 rounded-full",
              RISK_STYLES[factor.level].dot,
            )}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[13px] text-foreground">{factor.label}</span>
              <span className="font-mono text-xs tabular-nums text-faint">
                {factor.contribution}%
              </span>
            </div>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {factor.description}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
