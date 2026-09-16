"use client";

import * as React from "react";
import {
  Check,
  Github,
  Lock,
  Search,
  ShieldCheck,
  GitBranch,
  Star,
} from "lucide-react";

import { cn, formatNumber, relativeTime } from "@/lib/utils";
import { useAvailableRepositories, useBranches } from "@/hooks/use-onboarding";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/states/empty-state";
import { ErrorState } from "@/components/states/error-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthHeading } from "@/components/auth/auth-layout";
import {
  GitHubAuthButton,
  RequestedScopes,
} from "@/components/auth/github-auth-button";
import type { AvailableRepository } from "@/types";

/* -------------------------------------------------------------------------- */
/*  Step 1 — Connect GitHub                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The install step.
 *
 * States the trust boundary before asking for the permission, rather than after.
 * The scopes shown are the real ones the GitHub App requests, and the absence of
 * any write scope is called out explicitly — it is the single most common
 * question a developer has at this screen.
 */
export function ConnectGitHubStep({ onConnected }: { onConnected: () => void }) {
  return (
    <div className="flex flex-col gap-6">
      <AuthHeading
        step="Step 1 of 4"
        title="Connect your GitHub account"
        description="RepoGuard installs as a GitHub App with read-only access. Analysis runs on our backend; your source is never stored."
      />

      <ul className="flex flex-col gap-px overflow-hidden rounded-lg border border-border bg-border">
        {GUARANTEES.map((item) => (
          <li key={item.title} className="flex gap-3 bg-card p-4">
            <item.icon
              className="mt-px size-4 shrink-0 text-accent"
              aria-hidden="true"
            />
            <div>
              <p className="text-[13px] font-medium text-foreground">
                {item.title}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {item.detail}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-3">
        <GitHubAuthButton label="Install the GitHub App" next="/onboarding" />
        <div className="flex flex-col gap-2">
          <p className="text-[11px] uppercase tracking-wider text-faint">
            Requested scopes
          </p>
          <RequestedScopes />
        </div>
      </div>

      {/* Mock builds return from GitHubAuthButton without leaving the app, so
          the flow needs a way forward that does not depend on a real redirect. */}
      <button
        type="button"
        onClick={onConnected}
        className="self-start text-xs text-faint underline-offset-4 transition-colors duration-150 hover:text-muted-foreground hover:underline"
      >
        Already installed? Continue
      </button>
    </div>
  );
}

const GUARANTEES = [
  {
    icon: Lock,
    title: "Read-only, always",
    detail:
      "contents:read, metadata:read, pull_requests:read. No write scope is requested.",
  },
  {
    icon: ShieldCheck,
    title: "Your code is not retained",
    detail:
      "Diffs are analysed in memory. Only derived metrics and scores are persisted.",
  },
  {
    icon: Github,
    title: "Revocable at any time",
    detail:
      "Uninstall the App from GitHub settings and analysis stops immediately.",
  },
] as const;

/* -------------------------------------------------------------------------- */
/*  Step 2 — Select repositories                                               */
/* -------------------------------------------------------------------------- */

/**
 * Repository selection.
 *
 * Multi-select, because a team that monitors one repository is not yet using the
 * product — but the first scan is charged per repository, so the count stays
 * visible in the footer and nothing is selected by default.
 */
export function SelectRepositoriesStep({
  selected,
  onToggle,
  search,
  onSearchChange,
}: {
  selected: string[];
  onToggle: (repository: AvailableRepository) => void;
  search: string;
  onSearchChange: (value: string) => void;
}) {
  const { data, isPending, isError, error, refetch } =
    useAvailableRepositories(search);

  return (
    <div className="flex flex-col gap-6">
      <AuthHeading
        step="Step 2 of 4"
        title="Choose repositories to monitor"
        description="Select the repositories RepoGuard should analyse. You can add or remove them later in Settings."
      />

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-faint"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Filter repositories"
          aria-label="Filter repositories"
          className="pl-9"
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        {isPending ? (
          <RepositoryListSkeleton />
        ) : isError ? (
          <ErrorState
            title="Couldn't load your repositories"
            error={error}
            onRetry={() => refetch()}
            compact
          />
        ) : data.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No repositories match that filter"
            description="Clear the filter, or check that the GitHub App has access to the organisation you expected."
            compact
          />
        ) : (
          <ul className="max-h-[320px] overflow-y-auto">
            {data.map((repository) => (
              <RepositoryRow
                key={repository.id}
                repository={repository}
                selected={selected.includes(repository.id)}
                onToggle={() => onToggle(repository)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function RepositoryRow({
  repository,
  selected,
  onToggle,
}: {
  repository: AvailableRepository;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <li className="border-b border-border last:border-0">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={selected}
        className={cn(
          "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors duration-150",
          "hover:bg-elevated",
          "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
          selected && "bg-accent/[0.06]",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-xs border transition-colors duration-150",
            selected
              ? "border-accent bg-accent text-accent-ink"
              : "border-border-strong bg-surface",
          )}
        >
          {selected ? <Check className="size-3" strokeWidth={3} /> : null}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[13px] text-foreground">
              {repository.fullName}
            </span>
            {repository.visibility === "private" ? (
              <Badge variant="outline" size="sm">
                <Lock aria-hidden="true" />
                Private
              </Badge>
            ) : null}
          </span>

          {repository.description ? (
            <span className="mt-1 block truncate text-xs text-muted-foreground">
              {repository.description}
            </span>
          ) : null}

          <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-faint">
            <span>{repository.language}</span>
            <span className="flex items-center gap-1">
              <Star className="size-3" aria-hidden="true" />
              {formatNumber(repository.stars)}
            </span>
            <span className="flex items-center gap-1">
              <GitBranch className="size-3" aria-hidden="true" />
              {repository.defaultBranch}
            </span>
            <span>updated {relativeTime(repository.lastCommitAt)} ago</span>
          </span>
        </span>
      </button>
    </li>
  );
}

function RepositoryListSkeleton() {
  return (
    <ul aria-busy="true">
      {[0, 1, 2, 3].map((index) => (
        <li
          key={index}
          className="flex items-start gap-3 border-b border-border px-4 py-3 last:border-0"
        >
          <Skeleton className="mt-0.5 size-4 rounded-xs" />
          <div className="flex-1">
            <Skeleton className="h-3.5 w-48" />
            <Skeleton className="mt-2 h-3 w-full max-w-[280px]" />
            <Skeleton className="mt-2 h-3 w-36" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* -------------------------------------------------------------------------- */
/*  Step 3 — Select a branch                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Baseline branch selection.
 *
 * The default branch is preselected because it is right almost every time, but
 * the choice is shown rather than assumed: a team that ships from `release/*`
 * would otherwise get a baseline built from a branch nobody deploys.
 */
export function SelectBranchStep({
  repository,
  branch,
  onBranchChange,
}: {
  repository: AvailableRepository | null;
  branch: string | null;
  onBranchChange: (branch: string) => void;
}) {
  const { data, isPending, isError, error, refetch } = useBranches(
    repository?.id ?? null,
  );

  // Preselect the default branch once the list arrives, without clobbering a
  // choice the user has already made.
  React.useEffect(() => {
    if (!branch && repository) onBranchChange(repository.defaultBranch);
  }, [branch, repository, onBranchChange]);

  return (
    <div className="flex flex-col gap-6">
      <AuthHeading
        step="Step 3 of 4"
        title="Pick the baseline branch"
        description="RepoGuard reads this branch's full history to build the reliability baseline every future score is measured against."
      />

      {repository ? (
        <p className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
          <Github className="size-3.5 text-faint" aria-hidden="true" />
          {repository.fullName}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-border">
        {isPending ? (
          <div aria-busy="true" className="flex flex-col gap-px bg-border">
            {[0, 1, 2].map((index) => (
              <div key={index} className="bg-card px-4 py-3">
                <Skeleton className="h-3.5 w-32" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            title="Couldn't load branches"
            error={error}
            onRetry={() => refetch()}
            compact
          />
        ) : (
          <ul>
            {data.map((name) => {
              const isDefault = name === repository?.defaultBranch;
              const selected = branch === name;

              return (
                <li key={name} className="border-b border-border last:border-0">
                  <button
                    type="button"
                    onClick={() => onBranchChange(name)}
                    aria-pressed={selected}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150",
                      "hover:bg-elevated",
                      "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
                      selected && "bg-accent/[0.06]",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-150",
                        selected
                          ? "border-accent"
                          : "border-border-strong bg-surface",
                      )}
                    >
                      {selected ? (
                        <span className="size-2 rounded-full bg-accent" />
                      ) : null}
                    </span>

                    <GitBranch
                      className="size-3.5 shrink-0 text-faint"
                      aria-hidden="true"
                    />
                    <span className="font-mono text-[13px] text-foreground">
                      {name}
                    </span>

                    {isDefault ? (
                      <Badge variant="neutral" size="sm" className="ml-auto">
                        Default
                      </Badge>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Step footer                                                                */
/* -------------------------------------------------------------------------- */

/**
 * The shared advance/back control.
 *
 * One component so the button sizes, order, and disabled semantics are identical
 * on every step — and so the "why can't I continue?" hint always appears in the
 * same place rather than being reinvented per step.
 */
export function StepFooter({
  onBack,
  onNext,
  nextLabel = "Continue",
  nextDisabled = false,
  hint,
  loading = false,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  hint?: string;
  loading?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-border pt-6">
      <div className="flex items-center justify-between gap-4">
        {onBack ? (
          <Button type="button" variant="ghost" size="md" onClick={onBack}>
            Back
          </Button>
        ) : (
          <span />
        )}

        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={onNext}
          disabled={nextDisabled}
          loading={loading}
        >
          {nextLabel}
        </Button>
      </div>

      {hint ? (
        <p className="text-right text-xs text-faint" aria-live="polite">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
