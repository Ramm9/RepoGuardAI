"use client";

import * as React from "react";

import { CodeDiff } from "@/components/code/code-diff";
import { RiskBadge } from "@/components/risk/risk-badge";
import { RiskBreakdown } from "@/components/risk/risk-breakdown";
import { RiskMap } from "@/components/risk/risk-map";
import { SectionHeading } from "@/components/layout/container";
import { shortSha } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  EXAMPLE_COMMIT,
  EXAMPLE_DIFF,
  EXAMPLE_DIFF_PATH,
  EXAMPLE_FACTORS,
  EXAMPLE_MODULES,
} from "@/lib/content/landing";

/**
 * The explanation section — signature visuals 3 and 4.
 *
 * The argument the whole page rests on: a score is worthless unless you can
 * interrogate it. Two tabs, two altitudes of the same question. "Why this
 * score?" shows the model's reasoning decomposed into weighted factors and
 * traced down to individual lines. "Where is the risk?" pulls back to the
 * module graph.
 *
 * These are the real product components rendered with example data — not
 * screenshots. What a visitor evaluates here is exactly what they get.
 */
export function ExplanationSection() {
  return (
    <div>
      <SectionHeading
        eyebrow="Explainability"
        title="A score you can argue with."
        description="Every prediction decomposes into weighted factors, and every factor traces back to the lines that produced it."
      />

      <Tabs defaultValue="why" className="mt-12">
        <TabsList aria-label="Explanation views">
          <TabsTrigger value="why">Why this score?</TabsTrigger>
          <TabsTrigger value="where">Where is the risk?</TabsTrigger>
        </TabsList>

        {/* ---- Commit-level explanation ---- */}
        <TabsContent value="why" className="mt-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6">
            <CodeDiff
              path={EXAMPLE_DIFF_PATH}
              language="python"
              lines={EXAMPLE_DIFF}
              additions={EXAMPLE_COMMIT.additions}
              deletions={EXAMPLE_COMMIT.deletions}
              maxHeight={420}
            />

            <aside className="flex flex-col gap-4">
              <div className="rounded-lg border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-faint">
                      Commit risk
                    </p>
                    <p className="mt-2 truncate font-mono text-xs text-muted-foreground">
                      {shortSha(EXAMPLE_COMMIT.sha)} · {EXAMPLE_COMMIT.branch}
                    </p>
                  </div>
                  <RiskBadge
                    score={EXAMPLE_COMMIT.score}
                    size="lg"
                    showScore
                    className="shrink-0"
                  />
                </div>

                <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">
                  {EXAMPLE_COMMIT.message}
                </p>

                <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4">
                  <div>
                    <dt className="text-[11px] text-faint">Confidence</dt>
                    <dd className="mt-1 font-mono text-xs tabular-nums text-foreground">
                      {EXAMPLE_COMMIT.confidence.toFixed(2)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-faint">Model</dt>
                    <dd className="mt-1 font-mono text-xs text-foreground">
                      {EXAMPLE_COMMIT.modelVersion}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-faint">Files</dt>
                    <dd className="mt-1 font-mono text-xs tabular-nums text-foreground">
                      {EXAMPLE_COMMIT.filesChanged}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-faint">Author</dt>
                    <dd className="mt-1 truncate font-mono text-xs text-foreground">
                      {EXAMPLE_COMMIT.author}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-lg border border-border bg-card p-5">
                <p className="text-[11px] font-medium uppercase tracking-wider text-faint">
                  Contributing factors
                </p>
                <RiskBreakdown
                  factors={EXAMPLE_FACTORS}
                  limit={4}
                  className="mt-4"
                />
              </div>
            </aside>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-faint">
            Markers in the diff gutter mark the lines the model reacted to.
            Hover one for the reason it was flagged.
          </p>
        </TabsContent>

        {/* ---- Repository-level explanation ---- */}
        <TabsContent value="where" className="mt-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6">
            <RiskMap modules={EXAMPLE_MODULES} />

            <aside className="rounded-lg border border-border bg-card p-5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-faint">
                Reading the map
              </p>
              <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
                Risk concentrates. In most repositories a small number of
                modules carry most of the defect probability — usually the ones
                everything else depends on.
              </p>

              <dl className="mt-5 flex flex-col gap-4 border-t border-border pt-4">
                <div>
                  <dt className="font-mono text-xs text-foreground">
                    Node size
                  </dt>
                  <dd className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                    Number of files in the module.
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-xs text-foreground">
                    Node colour and icon
                  </dt>
                  <dd className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                    Aggregate risk across the module&apos;s files, on the same
                    four-level scale used everywhere else in the product.
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-xs text-foreground">Edges</dt>
                  <dd className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                    Declared dependencies. A high-risk module with many
                    dependents is the one to fix first.
                  </dd>
                </div>
              </dl>
            </aside>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
