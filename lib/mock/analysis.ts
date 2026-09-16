import { clamp } from "@/lib/utils";
import { randomFloat, randomFor, randomInt } from "./seed";
import {
  PIPELINE_DURATION,
  stageStatesAt,
  type AnalysisJob,
} from "@/lib/analysis/pipeline";
import type { HealthComponent, RepositoryHealth, Trend } from "@/types";

/**
 * Mock analysis job runner.
 *
 * Simulates the backend's job endpoint closely enough that the UI cannot tell
 * the difference: progress is *derived from elapsed time*, not advanced by a
 * component timer. That distinction matters. A component that ticks its own
 * stepper looks identical against fixtures and collapses the moment the real
 * API is wired up, because real jobs run on someone else's clock. Here the
 * screen is doing what it will do in production — asking "how far along is this
 * job?" on an interval and rendering the answer.
 *
 * The job id carries its own start time (`job_<base36 ms>_<repo>`), so no
 * registry is needed and a reload mid-scan resumes rather than restarting. The
 * real backend keeps this server-side and the id stays opaque; only this branch
 * ever parses it.
 */

const HEALTH_WEIGHTS: { key: HealthComponent["key"]; label: string; weight: number }[] =
  [
    { key: "codeQuality", label: "Code quality", weight: 0.24 },
    { key: "testing", label: "Test coverage", weight: 0.22 },
    { key: "stability", label: "Stability", weight: 0.2 },
    { key: "security", label: "Security posture", weight: 0.18 },
    { key: "reliability", label: "Deployment reliability", weight: 0.16 },
  ];

/** A flat or gently-moving trend with the given sentiment. */
function trend(sentiment: Trend["sentiment"], delta: number): Trend {
  return {
    direction: delta === 0 ? "flat" : delta > 0 ? "up" : "down",
    delta: Math.abs(delta),
    sentiment,
  };
}

/**
 * The first score a repository receives.
 *
 * Seeded from the repository id so the number is stable across reloads — a
 * user who refreshes mid-scan must not watch their score change. Held in the
 * healthy band deliberately: this is a baseline, and a product that opens by
 * telling a new customer their codebase is failing has not earned the right to
 * be believed on the second screen.
 */
function buildHealth(repositoryId: string): RepositoryHealth {
  const random = randomFor(`health:${repositoryId}`);
  const score = randomInt(random, 71, 88);

  const breakdown: HealthComponent[] = HEALTH_WEIGHTS.map((component) => ({
    key: component.key,
    label: component.label,
    // Component scores cluster within ±7 of the composite, so the breakdown
    // reads as a decomposition of the headline figure rather than as unrelated
    // numbers that happen to sit beside it.
    score: clamp(Math.round(score + randomFloat(random, -7, 7, 0)), 38, 99),
    weight: component.weight,
    trend: trend("neutral", 0),
  }));

  return {
    repositoryId,
    score,
    trend: trend("neutral", 0),
    breakdown,
    computedAt: new Date().toISOString(),
  };
}

/* -------------------------------------------------------------------------- */
/*  Job lifecycle                                                              */
/* -------------------------------------------------------------------------- */

function encodeJobId(repositoryIds: string[], startedAtMs: number): string {
  return `job_${startedAtMs.toString(36)}_${repositoryIds[0] ?? "unknown"}`;
}

interface DecodedJobId {
  startedAtMs: number;
  repositoryId: string;
}

function decodeJobId(jobId: string): DecodedJobId | null {
  const [prefix, stamp, repositoryId] = jobId.split("_");
  if (prefix !== "job" || !stamp || !repositoryId) return null;

  const startedAtMs = Number.parseInt(stamp, 36);
  if (!Number.isFinite(startedAtMs)) return null;

  return { startedAtMs, repositoryId };
}

/** Begin a scripted run. Returns immediately, as the real endpoint does. */
export function createMockJob(
  repositoryIds: string[],
  startedAtMs: number = Date.now(),
): AnalysisJob {
  return readMockJob(encodeJobId(repositoryIds, startedAtMs), repositoryIds);
}

/**
 * Report the job's current state.
 *
 * `repositoryIds` is passed in by the caller because the mock job id only
 * carries the primary repository — the live API would return the full list in
 * the response body, so this parameter disappears when `USE_MOCK_DATA` does.
 */
export function readMockJob(
  jobId: string,
  repositoryIds: string[],
): AnalysisJob {
  const decoded = decodeJobId(jobId);

  // An id we cannot read is not a crash — it is a job that never started, and
  // the UI already knows how to render that.
  if (!decoded) {
    return {
      id: jobId,
      repositoryIds,
      status: "failed",
      progress: 0,
      stages: stageStatesAt(0),
      startedAt: new Date().toISOString(),
    };
  }

  const elapsed = Math.max(0, Date.now() - decoded.startedAtMs);
  const progress = Math.round(
    clamp(elapsed / PIPELINE_DURATION, 0, 1) * 100,
  );
  const complete = progress >= 100;

  const random = randomFor(`job:${decoded.repositoryId}`);
  const health = buildHealth(decoded.repositoryId);

  // Details describe work the run has actually done, so the totals stay tied to
  // the stage the cursor has reached rather than being invented per stage.
  const commitCount = randomInt(random, 740, 4200);
  const fileCount = randomInt(random, 180, 940);
  const moduleCount = randomInt(random, 18, 64);
  const dependencyCount = randomInt(random, 40, 160);

  return {
    id: jobId,
    repositoryIds,
    status: complete ? "complete" : "running",
    progress,
    stages: stageStatesAt(elapsed, {
      connect: "installation verified",
      fetch: `${fileCount} files`,
      history: `${commitCount.toLocaleString("en-US")} commits`,
      metrics: `${moduleCount} modules`,
      profile: `${dependencyCount} dependencies`,
      model: `${moduleCount} modules scored`,
      insights: complete ? `${moduleCount > 40 ? 12 : 8} findings` : "…",
    }),
    startedAt: new Date(decoded.startedAtMs).toISOString(),
    ...(complete
      ? {
          result: {
            repositoryId: decoded.repositoryId,
            health,
            insightCount: moduleCount > 40 ? 12 : 8,
            fileCount,
            commitCount,
          },
        }
      : {}),
  };
}

/**
 * Advance a run to completion without waiting.
 *
 * Used by the design page and by anyone re-running the completion screen while
 * developing it; there is no path to this from the live flow.
 */
export function completeMockJobId(repositoryIds: string[]): string {
  return encodeJobId(repositoryIds, Date.now() - PIPELINE_DURATION - 1_000);
}
