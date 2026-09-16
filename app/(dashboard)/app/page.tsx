import type { Metadata } from "next";
import Link from "next/link";
import { GitCommitHorizontal, Radar, ShieldAlert } from "lucide-react";

import { PageBody, PageHeader } from "@/components/layout/page-header";
import { Section } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/states/empty-state";
import {
  AnalysisProgress,
  INITIAL_ANALYSIS_STAGES,
} from "@/components/states/analysis-progress";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * Dashboard placeholder.
 *
 * Phase 3 builds the real dashboard against the service layer. This exists so
 * the shell is navigable and reviewable now — the sidebar, top bar, collapse
 * behaviour, and keyboard shortcuts can all be exercised before any data
 * fixtures exist.
 */
export default function DashboardPage() {
  return (
    <PageBody>
      <PageHeader
        eyebrow="Workspace"
        title="Reliability overview"
        context="Aggregate risk across every monitored repository. This surface is assembled in Phase 3 once the service layer is wired."
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/design">View design system</Link>
            </Button>
            <Button variant="primary" size="sm">
              <Radar />
              Run analysis
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Section
          title="Repository risk"
          description="Predicted defect probability per repository, ranked by severity."
        >
          <div className="rounded-lg border border-border bg-card">
            <EmptyState
              icon={GitCommitHorizontal}
              title="No analysis data yet"
              description="Repository fixtures and the service abstraction arrive in the next phase. The shell, navigation, and design system are ready to review now."
              action={{ label: "View design system", href: "/design" }}
              secondaryAction={{ label: "Back to home", href: "/" }}
            />
          </div>
        </Section>

        <div className="flex flex-col gap-6">
          <Section title="Pipeline status">
            <AnalysisProgress
              stages={INITIAL_ANALYSIS_STAGES}
              title="acme/payments-api"
            />
          </Section>

          <Section title="Next phase">
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <ShieldAlert
                  className="mt-0.5 size-4 shrink-0 text-accent"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-foreground">
                    Phase 2 — marketing and authentication
                  </p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                    Landing page, sign in, sign up, and the GitHub connection
                    onboarding flow, followed by the live dashboard in Phase 3.
                  </p>
                </div>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </PageBody>
  );
}
