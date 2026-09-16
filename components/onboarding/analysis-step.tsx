"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  CheckCircle2,
  FileCode2,
  GitCommitHorizontal,
  Lightbulb,
  Timer,
} from "lucide-react";

import { formatNumber } from "@/lib/utils";
import { useAnalysisJob } from "@/hooks/use-onboarding";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AnalysisProgress } from "@/components/states/analysis-progress";
import { ErrorState } from "@/components/states/error-state";
import { HealthScore } from "@/components/metrics/progress-ring";
import { MetricCard } from "@/components/metrics/metric-card";
import { AuthHeading } from "@/components/auth/auth-layout";
import type { AnalysisJob } from "@/lib/analysis/pipeline";
import type { AvailableRepository } from "@/types";

/**
 * Step 4 — the initial analysis. Signature visual #5.
 *
 * The screen holds three states and never blurs them: running, failed, and
 * scored. Running is not a spinner — it names each stage of the pipeline and
 * shows which one is executing, because the wait here is the first real wait in
 * the product and an opaque one would set the wrong expectation for every
 * analysis afterwards.
 *
 * The completion state is not a celebration screen. It is the product's first
 * output: the same `HealthScore` component the dashboard will use, showing the
 * same score, so the number a user sees now is the number they will see later.
 */

/** Ticks once a second while the job runs. Zero whenever it is not running. */
function useElapsedSeconds(startedAt: string | undefined, active: boolean) {
  const [seconds, setSeconds] = React.useState(0);

  React.useEffect(() => {
    if (!startedAt || !active) return;

    const start = new Date(startedAt).getTime();
    const tick = () =>
      setSeconds(Math.max(0, Math.round((Date.now() - start) / 1000)));

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [startedAt, active]);

  return seconds;
}

export function AnalysisStep({
  repository,
  branch,
  repositoryIds,
  jobId,
  onRetry,
  onFinish,
}: {
  repository: AvailableRepository | null;
  branch: string | null;
  repositoryIds: string[];
  jobId: string;
  /** Re-enqueue after a failed job. */
  onRetry: () => void;
  /** Leave onboarding for the dashboard. */
  onFinish: () => void;
}) {
  const { data: job, isError, error, refetch } = useAnalysisJob(
    jobId,
    repositoryIds,
  );

  const running = !job || job.status === "running" || job.status === "queued";
  const elapsed = useElapsedSeconds(job?.startedAt, running);

  /**
   * Called rather than stored, so each branch returns its own element instance.
   * Reusing one element object across tree positions is a subtle way to make
   * React treat distinct subtrees as the same child.
   */
  const heading = () => (
    <div className="flex flex-col gap-3">
      <AuthHeading
        step="Step 4 of 4"
        title={running ? "Analysing your repository" : "Baseline established"}
        description={
          running
            ? "Reading the full commit history and scoring it. This runs on RepoGuard's backend — you can close this tab and the scan will finish."
            : "This is the baseline every future score is measured against. Monitoring is now active on this branch."
        }
      />

      {repository ? (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" size="sm" mono>
            {repository.fullName}
          </Badge>
          {branch ? (
            <Badge variant="outline" size="sm" mono>
              {branch}
            </Badge>
          ) : null}
          {running && elapsed > 0 ? (
            <span className="flex items-center gap-1.5 font-mono text-[11px] text-faint">
              <Timer className="size-3" aria-hidden="true" />
              {elapsed}s elapsed
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  /* ---- Failed ---- */
  if (isError || job?.status === "failed") {
    return (
      <div className="flex flex-col gap-6">
        {heading()}
        <div className="rounded-lg border border-border bg-card">
          <ErrorState
            title="The analysis didn't finish"
            error={error}
            onRetry={() => (isError ? refetch() : onRetry())}
            compact
          />
        </div>
      </div>
    );
  }

  /* ---- Complete ---- */
  if (job?.status === "complete" && job.result) {
    return <AnalysisComplete job={job} heading={heading()} onFinish={onFinish} />;
  }

  /* ---- Running ---- */
  return (
    <div className="flex flex-col gap-6">
      {heading()}

      <AnalysisProgress
        title={repository ? repository.fullName : "Repository analysis"}
        stages={job?.stages ?? []}
        progress={job?.progress}
      />

      <p className="text-xs leading-relaxed text-faint">
        RepoGuard is reading commit metadata and diffs. Analysis happens in
        memory — only the derived metrics and scores are stored.
      </p>
    </div>
  );
}

/**
 * The scored state.
 *
 * Rendered as its own component so the reveal animation and the score's
 * one-time mount behaviour are scoped to it: `HealthScore` animates when it
 * enters view, and remounting it on every poll tick would restart the count-up
 * every 400ms.
 */
function AnalysisComplete({
  job,
  heading,
  onFinish,
}: {
  job: AnalysisJob;
  heading: React.ReactNode;
  onFinish: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const result = job.result;

  // The parent only renders this branch when a result exists; the guard keeps
  // the narrowing honest rather than asserting it.
  if (!result) return null;

  const { health } = result;

  return (
    <motion.div
      className="flex flex-col gap-6"
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      {heading}

      <Card className="p-5">
        <div className="flex items-center gap-2">
          <CheckCircle2
            className="size-4 text-success"
            strokeWidth={2.5}
            aria-hidden="true"
          />
          <span className="text-[13px] font-medium text-foreground">
            Reliability baseline computed
          </span>
        </div>

        <HealthScore
          score={health.score}
          breakdown={health.breakdown}
          className="mt-6"
          caption="Weighted from code quality, testing, stability, security posture, and deployment reliability."
        />
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="Commits read"
          value={formatNumber(result.commitCount)}
          icon={GitCommitHorizontal}
        />
        <MetricCard
          label="Files analysed"
          value={formatNumber(result.fileCount)}
          icon={FileCode2}
        />
        <MetricCard
          label="Insights"
          value={result.insightCount}
          icon={Lightbulb}
          detail="Open in the dashboard"
        />
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-6">
        <Button variant="primary" size="md" onClick={onFinish}>
          Open the dashboard
          <ArrowRight />
        </Button>
        <p className="text-xs leading-relaxed text-faint">
          {job.repositoryIds.length > 1
            ? `${job.repositoryIds.length} repositories connected. The remaining scans continue in the background.`
            : "Monitoring is active. RepoGuard scores every new commit against this baseline."}
        </p>
      </div>
    </motion.div>
  );
}
