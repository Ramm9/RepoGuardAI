"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import { keys } from "@/lib/api/query-keys";
import {
  getAnalysisJob,
  listAvailableRepositories,
  listBranches,
  startInitialAnalysis,
} from "@/services/onboarding";
import type { StartAnalysisInput } from "@/lib/analysis/pipeline";

/**
 * Onboarding data hooks.
 *
 * Components call these; they never call the service layer directly and never
 * call fetch. That keeps caching, retry, and loading semantics in one place —
 * and means the mock/live switch is invisible above this line.
 */

export function useAvailableRepositories(search: string) {
  return useQuery({
    queryKey: keys.github.repositories(search),
    queryFn: () => listAvailableRepositories(search),
    // The GitHub repository list barely moves during a three-minute setup;
    // refetching it on every window focus would just restart the spinner.
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useBranches(repositoryId: string | null) {
  return useQuery({
    queryKey: keys.github.branches(repositoryId ?? "none"),
    queryFn: () => listBranches(repositoryId as string),
    enabled: Boolean(repositoryId),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

/** Enqueue the initial scan. Resolves as soon as the job exists. */
export function useStartAnalysis() {
  return useMutation({
    mutationFn: (input: StartAnalysisInput) => startInitialAnalysis(input),
    // A failed enqueue is a real failure, not a flaky-network one: retrying it
    // silently would start a second scan the user did not ask for.
    retry: false,
  });
}

/**
 * Poll a running job until it finishes.
 *
 * The interval lives here rather than in the component for the same reason the
 * cache keys do — and it is deliberately expressed as a function so it can
 * return `false` and *stop*. A poll that keeps firing after completion is the
 * classic way a progress screen quietly becomes a request generator.
 */
export function useAnalysisJob(
  jobId: string | null,
  repositoryIds: string[] = [],
) {
  return useQuery({
    queryKey: keys.analysis.job(jobId ?? "none"),
    queryFn: () => getAnalysisJob(jobId as string, repositoryIds),
    enabled: Boolean(jobId),
    // Progress is the entire point of the request; a cached answer is a lie.
    staleTime: 0,
    gcTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 2,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "complete" || status === "failed" ? false : 400;
    },
  });
}

