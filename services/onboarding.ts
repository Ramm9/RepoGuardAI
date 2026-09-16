import { api, USE_MOCK_DATA } from "@/lib/api/client";
import { mockDelay } from "@/lib/mock/latency";
import { AVAILABLE_REPOSITORIES, branchesFor } from "@/lib/mock/account";
import { createMockJob, readMockJob } from "@/lib/mock/analysis";
import { toLiveTime } from "@/lib/mock/seed";
import type { AnalysisJob, StartAnalysisInput } from "@/lib/analysis/pipeline";
import type { AvailableRepository } from "@/types";

// The job contract lives in lib/analysis/pipeline.ts so the runner, the stepper,
// and the backend serializer all describe the same object. Re-exported here
// because consumers of this service should not need to know that.
export type { AnalysisJob, StartAnalysisInput };

/**
 * Onboarding service — repository discovery and first-scan setup.
 *
 * The repository list comes from the backend, which calls GitHub with the
 * installation token. The frontend asks "what can I connect?" and gets back
 * plain JSON; it never queries the GitHub API itself.
 */

/**
 * Shift fixture timestamps onto the current clock.
 *
 * Fixtures are authored against a fixed epoch so they stay deterministic, which
 * would otherwise make every repository read "6mo ago". Shifting happens here,
 * at the service boundary, rather than in the fixtures themselves — the data
 * stays reproducible and only what crosses into the UI is made current.
 */
function live(repository: AvailableRepository): AvailableRepository {
  return {
    ...repository,
    lastCommitAt: toLiveTime(repository.lastCommitAt),
    updatedAt: toLiveTime(repository.updatedAt),
  };
}

export async function listAvailableRepositories(
  search?: string,
): Promise<AvailableRepository[]> {
  if (USE_MOCK_DATA) {
    await mockDelay(600);
    const term = search?.trim().toLowerCase();
    const matches = !term
      ? AVAILABLE_REPOSITORIES
      : AVAILABLE_REPOSITORIES.filter(
          (repo) =>
            repo.fullName.toLowerCase().includes(term) ||
            repo.language.toLowerCase().includes(term) ||
            (repo.description?.toLowerCase().includes(term) ?? false),
        );

    return matches.map(live);
  }

  return api.get<AvailableRepository[]>("/github/repositories/", {
    params: { search },
  });
}

export async function listBranches(repositoryId: string): Promise<string[]> {
  if (USE_MOCK_DATA) {
    await mockDelay(350);
    return branchesFor(repositoryId);
  }

  return api.get<string[]>(`/github/repositories/${repositoryId}/branches/`);
}

/**
 * Enqueue the first full-history scan.
 *
 * Returns as soon as the job exists, exactly as the real endpoint will — the
 * scan itself runs server-side and is observed through `getAnalysisJob`. The
 * `branch` applies to the primary repository (the first id): a team picks the
 * branch they actually deploy, and every remaining repository baselines on its
 * own default branch, which is right often enough that asking again would be
 * noise on a setup screen.
 */
export async function startInitialAnalysis(
  input: StartAnalysisInput,
): Promise<AnalysisJob> {
  if (USE_MOCK_DATA) {
    await mockDelay(400);
    return createMockJob(input.repositoryIds);
  }

  return api.post<AnalysisJob>("/analysis/jobs/", {
    repository_ids: input.repositoryIds,
    branch: input.branch,
  });
}

/**
 * Poll a running job.
 *
 * The UI asks this on an interval and renders whatever comes back; it never
 * advances its own progress. When the Django endpoint replaces the mock, the
 * caller does not change — only the transport underneath it does.
 */
export async function getAnalysisJob(
  jobId: string,
  repositoryIds: string[],
): Promise<AnalysisJob> {
  if (USE_MOCK_DATA) {
    // No artificial delay here: this is a poll, and adding latency to a call
    // that already runs on a timer just makes the cursor stutter.
    return readMockJob(jobId, repositoryIds);
  }

  return api.get<AnalysisJob>(`/analysis/jobs/${jobId}/`);
}
