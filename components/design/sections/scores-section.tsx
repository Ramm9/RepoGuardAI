
import { designSection } from "@/components/design/manifest";
import { HealthScore, ProgressRing } from "@/components/metrics/progress-ring";
import { RiskBreakdown, RiskFactorList } from "@/components/risk/risk-breakdown";
import { RiskScore } from "@/components/risk/risk-badge";
import {
  SPEC_FACTORS,
  SPEC_HEALTH_BREAKDOWN,
} from "@/components/design/fixtures";
import {
  SpecLabel,
  SpecNote,
  SpecRow,
  SpecSection,
} from "@/components/design/spec-section";

/**
 * The two signature figures.
 *
 * Both are given the most room on this sheet because both are load-bearing:
 * the health ring is what a team lead opens the product to see, and the
 * breakdown is the argument that makes the prediction trustworthy rather than
 * merely assertive.
 */
export function ScoresSection() {
  return (
    <SpecSection meta={designSection("scores")}>
      <SpecRow
        label="Repository health"
        stack
        hint="Signature visual 1 — the circular composite score, with its five weighted components."
      >
        <div className="rounded-lg border border-border bg-card p-6">
          <HealthScore
            score={82}
            breakdown={SPEC_HEALTH_BREAKDOWN}
            caption="Weighted across coverage, stability, review latency, defect recurrence, and dependency freshness. Recomputed on every push to the default branch."
          />
        </div>
        <SpecNote className="mt-4">
          The arc draws once on scroll into view and degrades to a static ring
          under <code>prefers-reduced-motion</code>. The number is the real
          content; the arc is a redundant cue, so the ring is marked
          decorative and the value is announced as text.
        </SpecNote>
      </SpecRow>

      <SpecRow
        label="Commit risk"
        stack
        hint="Signature visual 2 — the headline score and the factor breakdown that explains it."
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
          <div className="rounded-lg border border-border bg-card p-6">
            <SpecLabel>Predicted risk</SpecLabel>
            <div className="mt-5">
              <RiskScore score={78} size="xl" />
            </div>
            <dl className="mt-8 flex flex-col gap-3 border-t border-border pt-5">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-xs text-faint">Model confidence</dt>
                <dd className="font-mono text-xs tabular-nums text-foreground">
                  0.91
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-xs text-faint">Model version</dt>
                <dd className="font-mono text-xs text-foreground">v2.4.1</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-xs text-faint">Analyzed</dt>
                <dd className="font-mono text-xs text-foreground">3m ago</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="text-[13px] font-semibold tracking-tight text-foreground">
                Why this commit is risky
              </h3>
              <span className="font-mono text-[11px] text-faint">
                contribution to total
              </span>
            </div>
            <div className="mt-5">
              <RiskBreakdown
                factors={SPEC_FACTORS}
                showDescriptions
              />
            </div>
          </div>
        </div>
        <SpecNote className="mt-4">
          Factors are sorted by weight, never by the order the API returns them.
          Each bar carries its percentage inline, so the chart needs no axis.
          Hovering a factor reveals the underlying signal magnitude.
        </SpecNote>
      </SpecRow>

      <SpecRow
        label="Breakdown, capped"
        hint="The compact variant used in summary panels: top three factors, remainder collapsed and totalled."
      >
        <div className="rounded-lg border border-border bg-card p-5">
          <RiskBreakdown factors={SPEC_FACTORS} limit={3} />
        </div>
      </SpecRow>

      <SpecRow
        label="Factor list"
        hint="The checklist form, used in the analysis page's right panel where descriptions are always visible."
      >
        <div className="rounded-lg border border-border bg-card p-5">
          <RiskFactorList factors={SPEC_FACTORS.slice(0, 4)} />
        </div>
      </SpecRow>

      <SpecRow
        label="Ring, standalone"
        hint="The same gauge, unbound from health — used for coverage and review-throughput targets."
      >
        <div className="flex flex-wrap items-center gap-8">
          <ProgressRing value={82} size={120} label="Coverage 82 out of 100">
            <span className="font-mono text-2xl font-semibold tabular-nums text-foreground">
              82
            </span>
          </ProgressRing>

          <ProgressRing value={41} size={120} riskAware label="Risk 41 out of 100">
            <span className="font-mono text-2xl font-semibold tabular-nums text-foreground">
              41
            </span>
          </ProgressRing>

          <ProgressRing value={93} size={120} riskAware label="Risk 93 out of 100">
            <span className="font-mono text-2xl font-semibold tabular-nums text-foreground">
              93
            </span>
          </ProgressRing>

          <ProgressRing value={12} size={72} thickness={5} label="Dependency drift 12 out of 100">
            <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
              12
            </span>
          </ProgressRing>
        </div>
        <SpecNote className="mt-4">
          <code>riskAware</code> tints the arc by the risk scale. Sizes shown:
          120 (panel), 176 (dashboard hero), 72 (inline).
        </SpecNote>
      </SpecRow>
    </SpecSection>
  );
}
