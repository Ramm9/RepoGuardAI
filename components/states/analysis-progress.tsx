"use client";

import { motion, useReducedMotion } from "motion/react";
import { Check, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { stageStatesAfter } from "@/lib/analysis/pipeline";
import type { AnalysisStage } from "@/types";

/**
 * AnalysisProgress — the stepper shown while the ML pipeline runs.
 *
 * The spec is explicit that an expensive analysis job must never render a bare
 * "Loading…". Instead the real stages of the pipeline are named and marked
 * complete / running / waiting, so the user can see that work is progressing
 * through identifiable steps rather than hanging on an opaque spinner.
 */
export function AnalysisProgress({
  stages,
  className,
  title = "Repository Analysis",
  /** Overall completion, 0–100. Derived from the stages when omitted. */
  progress,
}: {
  stages: AnalysisStage[];
  className?: string;
  title?: string;
  progress?: number;
}) {
  const computed =
    progress ??
    Math.round(
      (stages.filter((stage) => stage.state === "complete").length /
        Math.max(1, stages.length)) *
        100,
    );

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-5",
        className,
      )}
      // Announce progress changes without stealing focus.
      role="status"
      aria-live="polite"
      aria-label={`${title}: ${computed} percent complete`}
    >
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-[13px] font-semibold tracking-tight text-foreground">
          {title}
        </h3>
        <span className="font-mono text-xs tabular-nums text-faint">
          {computed}%
        </span>
      </div>

      <Progress value={computed} className="mt-3" />

      <ol className="mt-5 flex flex-col">
        {stages.map((stage, index) => (
          <AnalysisStageRow
            key={stage.id}
            stage={stage}
            isLast={index === stages.length - 1}
          />
        ))}
      </ol>
    </div>
  );
}

function AnalysisStageRow({
  stage,
  isLast,
}: {
  stage: AnalysisStage;
  isLast: boolean;
}) {
  const { state } = stage;
  // The sweep below is animated by JS, not CSS, so the global
  // `prefers-reduced-motion` override in globals.css does not reach it. The
  // spinner is a sufficient cue on its own, so the bar is simply dropped.
  const reduceMotion = useReducedMotion();

  return (
    <li className="relative flex items-start gap-3 pb-4 last:pb-0">
      {/* Connector rule between steps. */}
      {!isLast ? (
        <span
          aria-hidden="true"
          className={cn(
            "absolute left-[7px] top-5 h-[calc(100%-1.25rem)] w-px",
            state === "complete" ? "bg-accent/35" : "bg-border",
          )}
        />
      ) : null}

      <span className="relative z-10 mt-0.5 flex size-[15px] shrink-0 items-center justify-center">
        {state === "complete" ? (
          <span className="flex size-[15px] items-center justify-center rounded-full bg-accent/15 ring-1 ring-accent/40">
            <Check className="size-2.5 text-accent" strokeWidth={3} />
          </span>
        ) : state === "running" ? (
          <Loader2 className="size-[15px] animate-spin text-accent" />
        ) : (
          <span className="size-[15px] rounded-full border border-border-strong bg-surface" />
        )}
      </span>

      <div className="min-w-0 flex-1 -mt-px">
        <div className="flex items-center justify-between gap-3">
          <span
            className={cn(
              "text-[13px] transition-colors duration-200",
              state === "waiting" ? "text-faint" : "text-foreground",
            )}
          >
            {stage.label}
          </span>
          {stage.detail ? (
            <span className="shrink-0 font-mono text-[11px] text-faint">
              {stage.detail}
            </span>
          ) : null}
        </div>

        {/* A slow sweep under the active row communicates ongoing work. */}
        {state === "running" && !reduceMotion ? (
          <motion.div
            className="mt-1.5 h-px w-full overflow-hidden bg-border"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="h-full w-1/3 bg-accent/70"
              animate={{ x: ["-100%", "300%"] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
            />
          </motion.div>
        ) : null}
      </div>
    </li>
  );
}

/**
 * The canonical stage list for an initial repository analysis, as it appears
 * before any job has started — the first four stages already complete.
 *
 * Derived from `lib/analysis/pipeline.ts` rather than written out again: the
 * labels a user reads here and the labels the API sends back must be the same
 * strings, and two lists is how they stop being.
 */
export const INITIAL_ANALYSIS_STAGES: AnalysisStage[] = stageStatesAfter(4);
