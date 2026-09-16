"use client";

import * as React from "react";

import {
  absoluteTime,
  clamp,
  formatDelta,
  formatNumber,
  relativeTime,
  riskColor,
  riskLevelFromScore,
  shortSha,
} from "@/lib/utils";
import { RISK_LABEL } from "@/lib/utils";
import { designSection } from "@/components/design/manifest";
import {
  SpecNote,
  SpecRow,
  SpecSection,
} from "@/components/design/spec-section";

/**
 * Formatters and helpers.
 *
 * Every one of these exists so a formatting decision is made once. The moment a
 * SHA is truncated in two places with two different lengths, the product starts
 * to look assembled rather than designed.
 */
const SCORE_SAMPLES = [0, 12, 39, 40, 52, 59, 60, 78, 79, 80, 91, 100];

const NUMBER_SAMPLES = [7, 312, 1284, 40219, 1284000];

const DELTA_SAMPLES = [4.2, -6.1, 0, 12.44, -0.05];

const SHA_SAMPLES = [
  "4f2a91c8e3d7b1a05c6f",
  "b81c05fa72e94d3a1c88f",
  "9e30b7d41acf62805b2e1",
];

/** Fixed instants, expressed as offsets from render time. */
const TIME_OFFSETS = [
  { label: "45 seconds ago", ms: 45 * 1000 },
  { label: "3 minutes ago", ms: 3 * 60 * 1000 },
  { label: "5 hours ago", ms: 5 * 60 * 60 * 1000 },
  { label: "12 days ago", ms: 12 * 24 * 60 * 60 * 1000 },
  { label: "4 months ago", ms: 122 * 24 * 60 * 60 * 1000 },
];

export function UtilitiesSection() {
  // relativeTime reads Date.now() and absoluteTime reads the local timezone.
  // Both differ between the server render and the client render, so the values
  // are resolved after mount — a hydration mismatch here would be a real bug in
  // a component this sheet exists to validate.
  const [now, setNow] = React.useState<number | null>(null);
  React.useEffect(() => setNow(Date.now()), []);

  return (
    <SpecSection meta={designSection("utilities")}>
      <SpecRow
        label="Risk scale"
        stack
        hint="riskLevelFromScore is the only place a number becomes a level. The boundary rows are the ones worth reading."
      >
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-faint">
                  Score
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-faint">
                  Level
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-faint">
                  riskColor
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-faint">
                  Boundary
                </th>
              </tr>
            </thead>
            <tbody>
              {SCORE_SAMPLES.map((score) => {
                const level = riskLevelFromScore(score);
                const boundary = [40, 60, 80].includes(score);
                return (
                  <tr
                    key={score}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-4 py-2 font-mono tabular-nums text-foreground">
                      {score}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                      {level}
                    </td>
                    <td className="px-4 py-2">
                      <span className="flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className="size-3 rounded-xs"
                          style={{ backgroundColor: riskColor(score) }}
                        />
                        <span className="font-mono text-[11px] text-faint">
                          {riskColor(score)}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono text-[11px] text-faint">
                      {boundary ? `first ${RISK_LABEL[level].toLowerCase()}` : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <SpecNote className="mt-3">
          riskColor returns raw hex for Recharts fills, which cannot consume
          Tailwind classes. The values mirror RISK_STYLES exactly.
        </SpecNote>
      </SpecRow>

      <SpecRow
        label="Time"
        hint="Compact relative form in tables; absolute form in tooltips and detail headers."
      >
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-faint">
                  Instant
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-faint">
                  relativeTime
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-faint">
                  absoluteTime
                </th>
              </tr>
            </thead>
            <tbody>
              {TIME_OFFSETS.map((entry) => {
                const iso =
                  now === null ? null : new Date(now - entry.ms).toISOString();
                return (
                  <tr
                    key={entry.label}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-4 py-2 text-muted-foreground">
                      {entry.label}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs tabular-nums text-foreground">
                      {iso ? relativeTime(iso) : "—"}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                      {iso ? absoluteTime(iso) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <SpecNote className="mt-3">
          Resolved after mount — both read machine-local state, so rendering them
          during SSR would produce a hydration mismatch.
        </SpecNote>
      </SpecRow>

      <SpecRow
        label="Numbers"
        hint="Grouped integers and signed deltas. Both always rendered in tabular figures."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="font-mono text-[11px] uppercase tracking-wider text-faint">
              formatNumber
            </p>
            <ul className="mt-3 flex flex-col gap-1.5">
              {NUMBER_SAMPLES.map((value) => (
                <li
                  key={value}
                  className="flex items-baseline justify-between gap-4"
                >
                  <span className="font-mono text-[11px] text-faint">
                    {value}
                  </span>
                  <span className="font-mono text-[13px] tabular-nums text-foreground">
                    {formatNumber(value)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <p className="font-mono text-[11px] uppercase tracking-wider text-faint">
              formatDelta
            </p>
            <ul className="mt-3 flex flex-col gap-1.5">
              {DELTA_SAMPLES.map((value) => (
                <li
                  key={value}
                  className="flex items-baseline justify-between gap-4"
                >
                  <span className="font-mono text-[11px] text-faint">
                    {value}
                  </span>
                  <span className="font-mono text-[13px] tabular-nums text-foreground">
                    {formatDelta(value)}
                  </span>
                </li>
              ))}
            </ul>
            <SpecNote className="mt-3">
              Always one decimal place, so a column of deltas aligns on the
              point.
            </SpecNote>
          </div>
        </div>
      </SpecRow>

      <SpecRow
        label="Strings & bounds"
        hint="shortSha is seven characters everywhere. clamp keeps a score inside its scale before it reaches a gauge."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="font-mono text-[11px] uppercase tracking-wider text-faint">
              shortSha
            </p>
            <ul className="mt-3 flex flex-col gap-1.5">
              {SHA_SAMPLES.map((sha) => (
                <li key={sha} className="flex items-baseline justify-between gap-4">
                  <span className="truncate font-mono text-[11px] text-faint">
                    {sha.slice(0, 12)}…
                  </span>
                  <span className="font-mono text-[13px] text-foreground">
                    {shortSha(sha)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <p className="font-mono text-[11px] uppercase tracking-wider text-faint">
              clamp
            </p>
            <ul className="mt-3 flex flex-col gap-1.5">
              {[
                { input: -12, min: 0, max: 100 },
                { input: 47, min: 0, max: 100 },
                { input: 140, min: 0, max: 100 },
              ].map((entry) => (
                <li
                  key={entry.input}
                  className="flex items-baseline justify-between gap-4"
                >
                  <span className="font-mono text-[11px] text-faint">
                    ({entry.input}, {entry.min}, {entry.max})
                  </span>
                  <span className="font-mono text-[13px] tabular-nums text-foreground">
                    {clamp(entry.input, entry.min, entry.max)}
                  </span>
                </li>
              ))}
            </ul>
            <SpecNote className="mt-3">
              A malformed score from the API must not draw an arc past 360°.
            </SpecNote>
          </div>
        </div>
      </SpecRow>

      <SpecRow
        label="cn"
        hint="clsx for conditionals, tailwind-merge so a caller's class always wins over the component's default."
      >
        <div className="rounded-lg border border-border bg-card p-4">
          <pre className="overflow-x-auto font-mono text-[11px] leading-relaxed text-muted-foreground">
{`cn("px-3 py-1", "px-5")            → "py-1 px-5"
cn("text-faint", active && "text-foreground")
cn(base, className)                 // caller wins`}
          </pre>
          <SpecNote className="mt-3">
            This is why every primitive accepts className last — without merge
            semantics an override would produce two competing utilities.
          </SpecNote>
        </div>
      </SpecRow>
    </SpecSection>
  );
}
