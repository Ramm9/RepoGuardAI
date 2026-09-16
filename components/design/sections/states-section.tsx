"use client";

import { GitPullRequest, Inbox, Package, ShieldCheck } from "lucide-react";

import { AnalysisProgress } from "@/components/states/analysis-progress";
import { ApiError } from "@/lib/api/errors";
import { EmptyState } from "@/components/states/empty-state";
import { ErrorState } from "@/components/states/error-state";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { designSection } from "@/components/design/manifest";
import { SPEC_ANALYSIS_STAGES } from "@/components/design/fixtures";
import {
  SpecLabel,
  SpecNote,
  SpecRow,
  SpecSection,
} from "@/components/design/spec-section";

/**
 * Loading, empty, and error states.
 *
 * These are treated as designed screens rather than fallbacks. Most of the time
 * a user spends with a prediction product is spent waiting for a prediction, or
 * looking at a surface that has nothing in it yet — so these get the same
 * attention as the populated views.
 *
 * The ApiError instances below are constructed locally rather than thrown,
 * which is what lets the error variants be rendered side by side.
 */
const SERVER_ERROR = new ApiError({
  status: 503,
  code: "analysis_unavailable",
  message:
    "The analysis service is temporarily unavailable. Monitoring continues; queued commits will be scored when it returns.",
});

const REAUTH_ERROR = new ApiError({
  status: 401,
  code: "github_token_expired",
  message: "The GitHub installation token for this account has expired.",
  requiresReauth: true,
});

const VALIDATION_ERROR = new ApiError({
  status: 400,
  code: "invalid_configuration",
  message: "This repository configuration couldn't be saved.",
  fieldErrors: {
    webhook_url: ["Enter an absolute HTTPS URL."],
    risk_threshold: ["Must be between 0 and 100."],
  },
});

export function StatesSection() {
  return (
    <SpecSection meta={designSection("states")}>
      <SpecRow
        label="Skeletons"
        stack
        hint="Shaped to match what is arriving, so nothing reflows when the data lands. Never a centred spinner."
      >
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-4">
            <SpecLabel>Metric</SpecLabel>
            <div className="mt-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-3 h-7 w-16" />
              <Skeleton className="mt-3 h-4 w-14" />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <SpecLabel>Text</SpecLabel>
            <SkeletonText lines={4} className="mt-4" />
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <SpecLabel>Table rows</SpecLabel>
            <div className="mt-4 flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3">
                  <Skeleton className="h-3 w-14 shrink-0" />
                  <Skeleton className="h-3 flex-1" />
                  <Skeleton className="h-4 w-12 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <SpecNote className="mt-4">
          skeleton-fill · a slow shimmer, suppressed entirely under
          prefers-reduced-motion.
        </SpecNote>
      </SpecRow>

      <SpecRow
        label="Analysis progress"
        stack
        hint="Signature visual 5. An expensive ML job never renders a bare spinner — the real pipeline stages are named."
      >
        <div className="max-w-xl">
          <AnalysisProgress stages={SPEC_ANALYSIS_STAGES} />
        </div>
        <SpecNote className="mt-4">
          role=status · aria-live=polite — progress is announced without
          stealing focus from whatever the user is doing.
        </SpecNote>
      </SpecRow>

      <SpecRow
        label="Empty"
        stack
        hint="Each states what the surface is for and the one action that fills it. Never just 'No data'."
      >
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-card">
            <EmptyState
              icon={Package}
              title="No repositories connected yet."
              description="Connect a GitHub repository and RepoGuard will begin scoring commits as they land."
              action={{ label: "Connect repository", href: "/app/repositories" }}
              secondaryAction={{ label: "How scoring works", href: "/design" }}
            />
          </div>

          <div className="rounded-lg border border-border bg-card">
            <EmptyState
              icon={ShieldCheck}
              title="No high-risk commits in this window."
              description="Every commit in the last 30 days scored below the high threshold. Widen the range to see more."
            />
          </div>

          <div className="rounded-lg border border-border bg-card">
            <EmptyState
              compact
              icon={Inbox}
              title="No open alerts."
              description="You're caught up."
            />
          </div>

          <div className="rounded-lg border border-border bg-card">
            <EmptyState
              compact
              icon={GitPullRequest}
              title="No open pull requests."
              description="Analysis runs automatically when one is opened."
            />
          </div>
        </div>
        <SpecNote className="mt-4">
          The second variant has no action on purpose — an empty state that
          reports good news should not manufacture a call to action.
        </SpecNote>
      </SpecRow>

      <SpecRow
        label="Error"
        stack
        hint="A raw API error never reaches the screen. Each variant is a sentence a developer can act on."
      >
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-card">
            <ErrorState
              error={SERVER_ERROR}
              onRetry={() => undefined}
            />
          </div>

          <div className="rounded-lg border border-border bg-card">
            <ErrorState
              error={REAUTH_ERROR}
              onReconnect={() => undefined}
            />
          </div>

          <div className="rounded-lg border border-border bg-card">
            <ErrorState
              error={VALIDATION_ERROR}
              onRetry={() => undefined}
              title="Configuration couldn't be saved."
            />
          </div>

          <div className="rounded-lg border border-border bg-card">
            <ErrorState compact onRetry={() => undefined} />
          </div>
        </div>
        <SpecNote className="mt-4">
          An expired GitHub credential is a first-class condition — it gets its
          own copy and calls for reconnecting, not retrying. DRF field errors are
          listed against their field names.
        </SpecNote>
      </SpecRow>

      <SpecRow
        label="Which state, when"
        stack
        hint="The decision the calling component makes before it renders anything."
      >
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-faint">
                  Condition
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-faint">
                  Render
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                { when: "Query pending, no cached data", render: "Skeleton shaped like the result" },
                { when: "Analysis job running", render: "AnalysisProgress with named stages" },
                { when: "Query succeeded, zero rows", render: "EmptyState with one action" },
                { when: "Query failed, transient", render: "ErrorState with onRetry" },
                { when: "Query failed, 401 requiresReauth", render: "ErrorState with onReconnect" },
                { when: "Query failed, 400 with fieldErrors", render: "ErrorState, errors listed per field" },
              ].map((row) => (
                <tr key={row.when} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-muted-foreground">{row.when}</td>
                  <td className="px-4 py-3 font-mono text-xs text-foreground">
                    {row.render}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SpecRow>
    </SpecSection>
  );
}
