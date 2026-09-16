import Link from "next/link";
import { ArrowRight, Github } from "lucide-react";

import { ArchitectureSection } from "@/components/marketing/architecture-section";
import { Badge, StatusDot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CapabilitiesSection } from "@/components/marketing/capabilities-section";
import { Container, MarketingSection } from "@/components/layout/container";
import { CtaSection } from "@/components/marketing/cta-section";
import { Eyebrow } from "@/components/layout/container";
import { ExplanationSection } from "@/components/marketing/explanation-section";
import { HealthScore } from "@/components/metrics/progress-ring";
import { NodeField, TechnicalGrid } from "@/components/layout/technical-grid";
import { PipelineSection } from "@/components/marketing/pipeline-section";
import { RiskBadge } from "@/components/risk/risk-badge";
import { RiskBreakdown } from "@/components/risk/risk-breakdown";
import { shortSha } from "@/lib/utils";
import {
  EXAMPLE_COMMIT,
  EXAMPLE_FACTORS,
  EXAMPLE_HEALTH_BREAKDOWN,
} from "@/lib/content/landing";

/**
 * Landing page.
 *
 * Composes the marketing sections in argument order: the claim, the mechanism,
 * the proof, the capabilities, the architecture, and the ask. Each section is
 * its own module — this file decides sequence and nothing else.
 *
 * The hero's product panel is built from the real components rather than an
 * image, so what a visitor evaluates is the actual product surface. Its figures
 * are page content, not service data, and live in lib/content/landing.ts.
 */
export default function LandingPage() {
  return (
    <>
      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden">
        <TechnicalGrid nodes />
        <NodeField className="opacity-40" opacity={0.35} />

        <Container className="relative">
          <div className="grid items-center gap-16 py-20 lg:grid-cols-[1fr_minmax(0,520px)] lg:py-28">
            {/* ---- Claim ---- */}
            <div>
              <Eyebrow>Software Reliability Intelligence</Eyebrow>

              <h1 className="mt-6 max-w-xl text-[2.125rem] font-semibold leading-[1.08] tracking-[-0.02em] text-foreground sm:text-5xl lg:text-[3.25rem]">
                Predict which changes will break production.
              </h1>

              <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
                RepoGuard reads your repository&apos;s history, scores every
                commit and pull request with a trained risk model, and explains
                the reasoning behind each score — so review effort lands where
                defects actually originate.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button variant="primary" size="lg" asChild>
                  <Link href="/signup">
                    <Github aria-hidden="true" />
                    Connect GitHub
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link href="/app">
                    View the dashboard
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
              </div>

              <p className="mt-6 flex items-center gap-2 text-xs text-faint">
                <StatusDot tone="success" pulse />
                Read-only GitHub access. Analysis runs server-side; no source
                code is stored.
              </p>
            </div>

            {/* ---- Product proof: the real components, not a mockup ---- */}
            <div className="relative">
              <div className="rounded-xl border border-border bg-card shadow-[0_24px_64px_-24px_rgba(0,0,0,0.9)]">
                <header className="flex items-center justify-between gap-4 border-b border-border px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <StatusDot tone="success" pulse />
                    <span className="font-mono text-xs text-foreground">
                      {EXAMPLE_COMMIT.repository}
                    </span>
                  </div>
                  <Badge variant="neutral" size="sm" mono>
                    {EXAMPLE_COMMIT.branch}
                  </Badge>
                </header>

                <div className="px-5 py-6">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-faint">
                    Repository health
                  </p>
                  <HealthScore
                    score={82}
                    breakdown={EXAMPLE_HEALTH_BREAKDOWN}
                    size={148}
                    className="mt-4"
                  />
                </div>

                <div className="border-t border-border px-5 py-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-faint">
                        Latest commit
                      </p>
                      <p className="mt-1.5 truncate font-mono text-xs text-muted-foreground">
                        {shortSha(EXAMPLE_COMMIT.sha)} · {EXAMPLE_COMMIT.message}
                      </p>
                    </div>
                    <RiskBadge
                      score={EXAMPLE_COMMIT.score}
                      showScore
                      size="lg"
                      className="shrink-0"
                    />
                  </div>

                  <RiskBreakdown
                    factors={EXAMPLE_FACTORS}
                    limit={3}
                    className="mt-5"
                  />
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ---------------- The mechanism ---------------- */}
      <section className="border-y border-border bg-surface">
        <Container>
          <div className="py-20 sm:py-24">
            <PipelineSection />
          </div>
        </Container>
      </section>

      {/* ---------------- Proof: the two signature explanations ---------------- */}
      <MarketingSection>
        <ExplanationSection />
      </MarketingSection>

      {/* ---------------- Capabilities ---------------- */}
      <section className="border-y border-border bg-surface">
        <Container>
          <div className="py-20 sm:py-24">
            <CapabilitiesSection />
          </div>
        </Container>
      </section>

      {/* ---------------- Architecture ---------------- */}
      <MarketingSection>
        <ArchitectureSection />
      </MarketingSection>

      {/* ---------------- Close ---------------- */}
      <CtaSection />
    </>
  );
}
