"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { STORAGE_KEYS } from "@/lib/api/config";
import { messageFromError } from "@/lib/api/errors";
import {
  useAvailableRepositories,
  useStartAnalysis,
} from "@/hooks/use-onboarding";
import { StepIndicator } from "@/components/onboarding/step-indicator";
import {
  ConnectGitHubStep,
  SelectBranchStep,
  SelectRepositoriesStep,
  StepFooter,
} from "@/components/onboarding/steps";
import { AnalysisStep } from "@/components/onboarding/analysis-step";
import { SubmitError } from "@/components/auth/submit-error";
import type { AvailableRepository } from "@/types";

/**
 * OnboardingFlow — the four-step setup sequence and the only thing that owns
 * its state.
 *
 * Each step is a presentational component that receives what it needs and calls
 * back; none of them know what step they are, whether a back button exists, or
 * where the flow goes next. That is what keeps a resumed session and a fresh one
 * on exactly the same code path — the alternative (each step deciding its own
 * navigation) is how a flow acquires a way to reach step 4 without a repository.
 *
 * Progress is persisted so a reload mid-setup resumes rather than restarting.
 * It is read after mount, never during render: the server has no localStorage,
 * so reading it eagerly would render different markup on the client than the
 * server sent and React would report a hydration mismatch.
 */

const STEPS: { id: string; label: string }[] = [
  { id: "connect", label: "Connect" },
  { id: "repositories", label: "Repositories" },
  { id: "branch", label: "Branch" },
  { id: "analysis", label: "Analysis" },
];

const LAST_STEP = STEPS.length - 1;

/** The persisted shape. Versioned so a future change can invalidate it. */
interface SavedProgress {
  version: 1;
  step: number;
  repositoryIds: string[];
  branch: string | null;
  jobId: string | null;
}

const EMPTY_PROGRESS: SavedProgress = {
  version: 1,
  step: 0,
  repositoryIds: [],
  branch: null,
  jobId: null,
};

function readSavedProgress(): SavedProgress | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.onboarding);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<SavedProgress>;
    if (parsed.version !== 1) return null;
    if (typeof parsed.step !== "number") return null;

    return {
      version: 1,
      step: Math.min(Math.max(0, parsed.step), LAST_STEP),
      repositoryIds: Array.isArray(parsed.repositoryIds)
        ? parsed.repositoryIds.filter((id) => typeof id === "string")
        : [],
      branch: typeof parsed.branch === "string" ? parsed.branch : null,
      jobId: typeof parsed.jobId === "string" ? parsed.jobId : null,
    };
  } catch {
    // Corrupt or unavailable storage is not an error worth showing — it just
    // means there is nothing to resume.
    return null;
  }
}

export function OnboardingFlow() {
  const router = useRouter();

  const [progress, setProgress] = React.useState<SavedProgress>(EMPTY_PROGRESS);
  const [hydrated, setHydrated] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [startError, setStartError] = React.useState<string | null>(null);

  const { step, repositoryIds, branch, jobId } = progress;

  // Restore once, after mount, and mark hydration so the first client render
  // matches the server's.
  React.useEffect(() => {
    const saved = readSavedProgress();
    if (saved) setProgress(saved);
    setHydrated(true);
  }, []);

  // Persist on every change, but never before the restore has run — doing so
  // would overwrite a saved session with the empty default.
  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEYS.onboarding,
        JSON.stringify(progress),
      );
    } catch {
      // Private-mode storage failures must not break setup.
    }
  }, [hydrated, progress]);

  // The full list is fetched here as well as in step 2 so the flow can resolve
  // ids back into repositories on resume — step 3 and step 4 need objects, and
  // a narrowed search list would not contain them. Both callers share one cache
  // entry, so this is not a second request.
  const { data: repositories = [] } = useAvailableRepositories("");

  const repositoryById = React.useMemo(() => {
    const map = new Map<string, AvailableRepository>();
    for (const repository of repositories) map.set(repository.id, repository);
    return map;
  }, [repositories]);

  const selected = React.useMemo(
    () =>
      repositoryIds
        .map((id) => repositoryById.get(id))
        .filter((repo): repo is AvailableRepository => Boolean(repo)),
    [repositoryIds, repositoryById],
  );

  const primaryRepository = selected[0] ?? null;

  const startAnalysis = useStartAnalysis();

  const goTo = React.useCallback(
    (next: number) =>
      setProgress((current) => ({
        ...current,
        step: Math.min(Math.max(0, next), LAST_STEP),
      })),
    [],
  );

  const toggleRepository = React.useCallback(
    (repository: AvailableRepository) => {
      setProgress((current) => {
        const already = current.repositoryIds.includes(repository.id);
        const repositoryIds = already
          ? current.repositoryIds.filter((id) => id !== repository.id)
          : [...current.repositoryIds, repository.id];

        // Only the primary repository carries the baseline branch, so the choice
        // is discarded when that one is removed — and kept when any other is.
        const wasPrimary = current.repositoryIds[0] === repository.id;

        return {
          ...current,
          repositoryIds,
          branch: already && wasPrimary ? null : current.branch,
        };
      });
    },
    [],
  );

  const chooseBranch = React.useCallback((value: string) => {
    setProgress((current) => ({ ...current, branch: value }));
  }, []);

  /**
   * Enqueue the scan on arrival at the final step.
   *
   * The effect depends on `enqueue` from `useMutation`, which TanStack Query
   * holds stable across renders, so this fires once per pending job rather than
   * on every poll tick. The `jobId` guard is the backstop: if the identity does
   * change, a job that already exists is never re-enqueued.
   */
  const { mutate: enqueue } = startAnalysis;
  React.useEffect(() => {
    if (!hydrated) return;
    if (step !== LAST_STEP) return;
    if (progress.jobId) return;
    if (repositoryIds.length === 0) return;

    setStartError(null);
    enqueue(
      { repositoryIds, branch: branch ?? "" },
      {
        onSuccess: (job) =>
          setProgress((current) => ({ ...current, jobId: job.id })),
        onError: (error) =>
          setStartError(
            messageFromError(
              error,
              "We couldn't start the analysis. Try again in a moment.",
            ),
          ),
      },
    );
  }, [hydrated, step, progress.jobId, repositoryIds, branch, enqueue]);

  function restartAnalysis() {
    setProgress((current) => ({ ...current, jobId: null }));
  }

  function finish() {
    // The setup is done; a resumed session would drop the user back into step 4
    // otherwise.
    try {
      window.localStorage.removeItem(STORAGE_KEYS.onboarding);
    } catch {
      // Nothing to do — the dashboard redirect below is the part that matters.
    }
    router.push("/app");
  }

  // Render the shell before hydration resolves so the layout does not jump; the
  // indicator is correct for step 0, which is what the server rendered.
  const canContinue = (() => {
    if (step === 0) return true;
    if (step === 1) return repositoryIds.length > 0;
    if (step === 2) return Boolean(branch);
    return false;
  })();

  const continueHint = (() => {
    if (step === 1 && repositoryIds.length === 0)
      return "Select at least one repository to continue.";
    return undefined;
  })();

  return (
    <div className="flex flex-col gap-8">
      <StepIndicator steps={STEPS} currentIndex={step} />

      {startError ? <SubmitError message={startError} /> : null}

      {step === 0 ? (
        <ConnectGitHubStep onConnected={() => goTo(1)} />
      ) : step === 1 ? (
        <SelectRepositoriesStep
          selected={repositoryIds}
          onToggle={toggleRepository}
          search={search}
          onSearchChange={setSearch}
        />
      ) : step === 2 ? (
        <SelectBranchStep
          repository={primaryRepository}
          branch={branch}
          onBranchChange={chooseBranch}
        />
      ) : jobId ? (
        <AnalysisStep
          repository={primaryRepository}
          branch={branch}
          repositoryIds={repositoryIds}
          jobId={jobId}
          onRetry={restartAnalysis}
          onFinish={finish}
        />
      ) : (
        // Reached only between enqueueing and the job id arriving, or after a
        // failed enqueue. The error banner above carries the detail.
        <div className="flex flex-col gap-4">
          <p className="text-[13px] text-muted-foreground">
            {startError
              ? "The scan didn't start."
              : "Starting the analysis…"}
          </p>
        </div>
      )}

      {/* The last step owns its own actions — there is no "continue" past the
          completion screen, only "open the dashboard". */}
      {step < LAST_STEP ? (
        <StepFooter
          onBack={step > 0 ? () => goTo(step - 1) : undefined}
          onNext={() => goTo(step + 1)}
          nextLabel={step === LAST_STEP - 1 ? "Start analysis" : "Continue"}
          nextDisabled={!canContinue}
          hint={continueHint}
        />
      ) : null}
    </div>
  );
}
