import type { AnalysisStage, RepositoryHealth } from "@/types";

/**
 * The analysis pipeline — defined once, consumed everywhere.
 *
 * The stage names, the ordering, and the job contract live here rather than
 * inside a component, because three separate things need to agree on them: the
 * stepper that renders progress, the runner that reports it, and the backend
 * that will eventually own it. Django returns `stages` in exactly this shape, so
 * nothing about the exchange changes when the mock is switched off.
 *
 * The durations are the *nominal* pace of a scripted run. Against the real API
 * they are unused — the job reports its own cursor and the UI simply renders
 * whatever it is told, which is why no timing value escapes this file into a
 * component.
 */

export interface PipelineStage {
  id: string;
  label: string;
  /** Nominal duration of this stage in a scripted run, in milliseconds. */
  durationMs: number;
}

/**
 * The seven stages of a full-history initial scan.
 *
 * Ordered from cheapest to most expensive, which is also the order a user can
 * most easily verify: "connected to GitHub" is either true or it is not, long
 * before they have any way to judge whether the model ran correctly.
 */
export const ANALYSIS_PIPELINE: readonly PipelineStage[] = [
  { id: "connect", label: "Connected to GitHub", durationMs: 700 },
  { id: "fetch", label: "Fetched repository", durationMs: 900 },
  { id: "history", label: "Read commit history", durationMs: 1400 },
  { id: "metrics", label: "Calculated code metrics", durationMs: 1600 },
  { id: "profile", label: "Building reliability profile", durationMs: 1200 },
  { id: "model", label: "Running ML model", durationMs: 1800 },
  { id: "insights", label: "Generating insights", durationMs: 900 },
] as const;

/** Total scripted runtime of the pipeline, in milliseconds. */
export const PIPELINE_DURATION = ANALYSIS_PIPELINE.reduce(
  (total, stage) => total + stage.durationMs,
  0,
);

/**
 * Stage list with the first `completedCount` stages complete and the next one
 * running. Used for static snapshots — the design page and the dashboard
 * placeholder — where there is no job to poll.
 */
export function stageStatesAfter(completedCount: number): AnalysisStage[] {
  return ANALYSIS_PIPELINE.map((stage, index) => ({
    id: stage.id,
    label: stage.label,
    state:
      index < completedCount
        ? "complete"
        : index === completedCount
          ? "running"
          : "waiting",
  }));
}

/**
 * The pipeline as it looks `elapsedMs` into a run.
 *
 * A stage is complete once the cursor has passed its end, running while the
 * cursor is inside it, and waiting otherwise — so exactly one stage is running
 * at any instant, which is what makes the stepper readable.
 */
export function stageStatesAt(
  elapsedMs: number,
  details?: Readonly<Record<string, string>>,
): AnalysisStage[] {
  const clamped = Math.max(0, Math.min(elapsedMs, PIPELINE_DURATION));
  let cursor = 0;

  return ANALYSIS_PIPELINE.map((stage) => {
    const start = cursor;
    cursor += stage.durationMs;

    const state =
      clamped >= cursor ? "complete" : clamped >= start ? "running" : "waiting";

    return {
      id: stage.id,
      label: stage.label,
      state,
      // Details describe work already done, so they are only attached to stages
      // the cursor has reached. A "1,284 commits" label beside a stage that has
      // not started yet is a claim the run has not yet earned.
      detail: state === "waiting" ? undefined : details?.[stage.id],
    };
  });
}

/* -------------------------------------------------------------------------- */
/*  Job contract                                                               */
/* -------------------------------------------------------------------------- */

export type AnalysisJobStatus = "queued" | "running" | "complete" | "failed";

export interface AnalysisJobResult {
  /** The primary repository — the one the baseline branch belongs to. */
  repositoryId: string;
  health: RepositoryHealth;
  /** Count shown on the completion screen before the dashboard exists. */
  insightCount: number;
  /** Files the scan touched, reported for the same reason. */
  fileCount: number;
  /** Commits read to build the baseline. */
  commitCount: number;
}

export interface AnalysisJob {
  id: string;
  repositoryIds: string[];
  status: AnalysisJobStatus;
  /** Overall completion, 0–100, derived from the stage cursor. */
  progress: number;
  stages: AnalysisStage[];
  /** Present only once `status` is "complete". */
  result?: AnalysisJobResult;
  /** ISO 8601. */
  startedAt: string;
}

export interface StartAnalysisInput {
  /** Repositories to bring under monitoring. The first is the primary. */
  repositoryIds: string[];
  /** Baseline branch for the primary repository. */
  branch: string;
}
