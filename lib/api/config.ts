/**
 * Response caching directives.
 *
 * GitHub-derived data must never be served from a stale HTTP cache — a commit
 * that arrived ten seconds ago still has to show up. Analysis results, by
 * contrast, are immutable once the model has scored them, so they cache hard.
 */
export const REQUESTS = {
  /** Live GitHub-derived resources: always revalidate. */
  live: { cache: "no-store" as RequestCache },
  /** Completed analyses keyed by commit or PR: immutable. */
  immutable: { cache: "force-cache" as RequestCache },
  /** Aggregate rollups: short-lived, revalidated in the background. */
  aggregate: { next: { revalidate: 30 } },
} as const;

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export const USE_MOCK_DATA =
  process.env.NEXT_PUBLIC_USE_MOCK_DATA !== "false";

export const MOCK_LATENCY = Number(
  process.env.NEXT_PUBLIC_MOCK_LATENCY ?? "450",
);

/** Local storage keys, kept together so they cannot collide (see store/). */
export const STORAGE_KEYS = {
  /** The persisted UI preference blob written by store/ui-store.ts. */
  ui: "repoguard.ui",
  /** Onboarding progress, so a partial setup can be resumed. */
  onboarding: "repoguard.onboarding",
} as const;
