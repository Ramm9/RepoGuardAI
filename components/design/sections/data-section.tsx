"use client";

import * as React from "react";
import {
  Activity,
  AlertTriangle,
  GitCommitHorizontal,
  ShieldAlert,
} from "lucide-react";

import { MetricCard } from "@/components/metrics/metric-card";
import { MetricGrid, ScoreBar, StatRow } from "@/components/metrics/score-bar";
import { RiskBadge } from "@/components/risk/risk-badge";
import { Segmented, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrendIndicator } from "@/components/metrics/trend-indicator";
import { designSection } from "@/components/design/manifest";
import { SPEC_COMMITS, SPEC_TRENDS } from "@/components/design/fixtures";
import {
  SpecLabel,
  SpecNote,
  SpecRow,
  SpecSection,
} from "@/components/design/spec-section";

/**
 * Data display.
 *
 * The density target: a commit table should show ten rows without scrolling on a
 * laptop. That is why rows are 40px rather than the 56px a default table ships
 * with, and why every numeric column is monospace and tabular.
 */
const RANGE_OPTIONS = [
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
] as const;

const COVERAGE_ROWS = [
  { module: "src/payments/", coverage: 12, risk: 88 },
  { module: "src/ledger/", coverage: 46, risk: 64 },
  { module: "src/auth/", coverage: 71, risk: 41 },
  { module: "src/notifications/", coverage: 93, risk: 14 },
];

export function DataSection() {
  const [range, setRange] = React.useState<(typeof RANGE_OPTIONS)[number]["value"]>("30d");

  return (
    <SpecSection meta={designSection("data")}>
      <SpecRow
        label="Metric cards"
        stack
        hint="Compact by mandate — label, value, delta. No decorative padding, no oversized icons."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Repositories"
            value="14"
            icon={Activity}
            detail="all monitored"
            trend={SPEC_TRENDS.flat}
          />
          <MetricCard
            label="Mean risk"
            value="47"
            suffix="/100"
            icon={ShieldAlert}
            trend={SPEC_TRENDS.riskUp}
            detail="2 critical"
          />
          <MetricCard
            label="Coverage"
            value="74"
            suffix="%"
            icon={GitCommitHorizontal}
            trend={SPEC_TRENDS.coverageUp}
          />
          <MetricCard
            label="Open alerts"
            value="9"
            icon={AlertTriangle}
            trend={SPEC_TRENDS.incidentsDown}
            detail="3 unacknowledged"
            valueClassName="text-risk-high"
          />
        </div>
        <SpecNote className="mt-4">
          <code>valueClassName</code> tints the figure only when the metric IS a
          risk score — never as emphasis.
        </SpecNote>
      </SpecRow>

      <SpecRow
        label="Loading"
        hint="The skeleton mirrors the card's own geometry, so nothing shifts when data arrives."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="" value="" loading />
          <MetricCard label="" value="" loading />
          <MetricCard label="" value="" loading />
          <MetricCard label="" value="" loading />
        </div>
      </SpecRow>

      <SpecRow
        label="Metric strip"
        stack
        hint="For detail-page headers. Bare figures with dividers — not four more cards."
      >
        <div className="rounded-lg border border-border bg-card p-5">
          <MetricGrid
            columns={5}
            items={[
              { label: "Health", value: "82" },
              { label: "Commits", value: "1,284" },
              { label: "Contributors", value: "17" },
              { label: "Open PRs", value: "6" },
              { label: "Incidents", value: "2" },
            ]}
          />
        </div>
      </SpecRow>

      <SpecRow
        label="Score bars"
        hint="The bar reinforces; the number carries the meaning. A zero-width bar still reads correctly."
      >
        <div className="flex max-w-lg flex-col gap-5">
          <ScoreBar value={74} label="Test coverage" />
          <ScoreBar value={88} label="Change stability" />
          <ScoreBar value={64} label="Module risk" riskAware />
          <ScoreBar value={91} label="Payments risk" riskAware />
          <ScoreBar value={41} label="Review latency" size="sm" suffix="h" max={72} />
        </div>
        <SpecNote className="mt-4">
          riskAware tints by the risk scale · max sets the denominator for
          non-percentage units.
        </SpecNote>
      </SpecRow>

      <SpecRow
        label="Stat rows"
        hint="Comparable facts belong on hairline rows, not in a grid of identical boxes."
      >
        <div className="max-w-lg rounded-lg border border-border bg-card px-5 py-3">
          <StatRow label="Default branch" value="main" mono />
          <StatRow label="Last analyzed" value="3m ago" mono />
          <StatRow label="Model version" value="v2.4.1" mono />
          <StatRow
            label="Webhook"
            value="Active"
            hint="Delivering to the Django backend, verified 3m ago."
          />
          <StatRow label="Analysis window" value="90 days" mono />
        </div>
      </SpecRow>

      <SpecRow
        label="Trend"
        hint="Direction is not sentiment. Rising risk is a regression; rising coverage is an improvement."
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-6">
            {[
              { key: "riskUp", caption: "Risk up — regression" },
              { key: "coverageUp", caption: "Coverage up — improvement" },
              { key: "incidentsDown", caption: "Incidents down — improvement" },
              { key: "coverageDown", caption: "Coverage down — regression" },
              { key: "flat", caption: "No material change" },
            ].map((entry) => (
              <div key={entry.key} className="flex flex-col gap-1.5">
                <TrendIndicator trend={SPEC_TRENDS[entry.key]} />
                <span className="text-[11px] text-faint">{entry.caption}</span>
              </div>
            ))}
          </div>
          <SpecNote>
            The accessible label spells out both — &ldquo;increased by 12.4
            percent, which is a regression&rdquo;.
          </SpecNote>
        </div>
      </SpecRow>

      <SpecRow
        label="Table"
        stack
        hint="40px rows, monospace numerics, right-aligned figures. Risk arrives through RiskBadge, never a bare tint."
      >
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Commit</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Author</TableHead>
                <TableHead align="right">Files</TableHead>
                <TableHead align="right">Delta</TableHead>
                <TableHead align="right">Risk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SPEC_COMMITS.map((commit) => (
                <TableRow key={commit.sha} interactive>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {commit.sha.slice(0, 7)}
                  </TableCell>
                  <TableCell className="max-w-[22rem] truncate text-foreground">
                    {commit.message}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {commit.author}
                  </TableCell>
                  <TableCell align="right" className="font-mono tabular-nums">
                    {commit.files}
                  </TableCell>
                  <TableCell
                    align="right"
                    className="font-mono text-xs tabular-nums text-muted-foreground"
                  >
                    {commit.delta}
                  </TableCell>
                  <TableCell align="right">
                    <RiskBadge score={commit.risk} size="sm" showScore />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableCaption>
              Four most recent commits on main, highest predicted risk first.
            </TableCaption>
          </Table>
        </div>
      </SpecRow>

      <SpecRow
        label="Table with bars"
        stack
        hint="Where a column is comparative, the bar goes in the cell rather than in a separate chart."
      >
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Module</TableHead>
                <TableHead className="w-[40%]">Coverage</TableHead>
                <TableHead align="right">Risk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {COVERAGE_ROWS.map((row) => (
                <TableRow key={row.module} interactive>
                  <TableCell className="font-mono text-xs text-foreground">
                    {row.module}
                  </TableCell>
                  <TableCell>
                    <ScoreBar value={row.coverage} size="sm" />
                  </TableCell>
                  <TableCell align="right">
                    <RiskBadge score={row.risk} size="sm" showScore />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SpecRow>

      <SpecRow
        label="Tabs"
        stack
        hint="Underline tabs for switching views. They sit flush with the content and read as document navigation."
      >
        <Tabs defaultValue="commits">
          <TabsList>
            <TabsTrigger value="commits">
              <GitCommitHorizontal aria-hidden="true" />
              Commits
            </TabsTrigger>
            <TabsTrigger value="hotspots">
              <ShieldAlert aria-hidden="true" />
              Hotspots
            </TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="settings" disabled>
              Settings
            </TabsTrigger>
          </TabsList>
          <TabsContent value="commits">
            <p className="text-[13px] text-muted-foreground">
              1,284 analyzed commits across the last 90 days.
            </p>
          </TabsContent>
          <TabsContent value="hotspots">
            <p className="text-[13px] text-muted-foreground">
              Nine modules above the high-risk threshold.
            </p>
          </TabsContent>
          <TabsContent value="activity">
            <p className="text-[13px] text-muted-foreground">
              Webhook deliveries and analysis runs.
            </p>
          </TabsContent>
        </Tabs>
      </SpecRow>

      <SpecRow
        label="Segmented"
        hint="A value picker, not a view switch — which is why it looks different from Tabs."
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Segmented
              options={RANGE_OPTIONS}
              value={range}
              onChange={setRange}
              aria-label="Analysis time range"
            />
            <span className="font-mono text-[11px] text-faint">
              size=&quot;sm&quot; · selected {range}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Segmented
              options={RANGE_OPTIONS}
              value={range}
              onChange={setRange}
              size="md"
              aria-label="Analysis time range, medium"
            />
            <span className="font-mono text-[11px] text-faint">
              size=&quot;md&quot;
            </span>
          </div>
          <div>
            <SpecLabel className="mb-2">Accessibility</SpecLabel>
            <SpecNote>
              role=radiogroup with an explicit aria-label — the prop is required
              by the type, so an unlabelled group cannot be shipped.
            </SpecNote>
          </div>
        </div>
      </SpecRow>
    </SpecSection>
  );
}
