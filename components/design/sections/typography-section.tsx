
import { designSection } from "@/components/design/manifest";
import {
  SpecNote,
  SpecRow,
  SpecSection,
} from "@/components/design/spec-section";

/**
 * Type specimens.
 *
 * Sizes are quoted in px because that is how they are written in the codebase —
 * this product uses explicit bracket sizes at the small end (`text-[13px]`,
 * `text-[11px]`) where Tailwind's default scale is too coarse for dense UI.
 */
const SANS_SCALE = [
  {
    className: "text-[2.125rem] font-semibold leading-[1.08] tracking-[-0.02em]",
    note: "34 / 1.08 · -0.02em",
    role: "Hero claim",
    sample: "Predict which changes will break production.",
  },
  {
    className: "text-2xl font-semibold leading-tight tracking-tight",
    note: "24 / 1.25",
    role: "Marketing section",
    sample: "Risk that explains itself",
  },
  {
    className: "text-xl font-semibold leading-tight tracking-tight",
    note: "20 / 1.25",
    role: "Page title",
    sample: "Reliability overview",
  },
  {
    className: "text-[15px] font-semibold leading-tight tracking-tight",
    note: "15 / 1.25",
    role: "Section title",
    sample: "Repository risk",
  },
  {
    className: "text-[13px] font-semibold tracking-tight",
    note: "13 semibold",
    role: "Card title",
    sample: "Commit risk analysis",
  },
  {
    className: "text-[13px] leading-relaxed text-muted-foreground",
    note: "13 / 1.625",
    role: "Body",
    sample:
      "This module has produced 7 production incidents in the last 90 days.",
  },
  {
    className: "text-xs leading-relaxed text-muted-foreground",
    note: "12 / 1.625",
    role: "Secondary",
    sample: "Touched by 5 contributors across 19 commits.",
  },
  {
    className:
      "text-[11px] font-medium uppercase tracking-wider text-faint",
    note: "11 · uppercase · 0.05em",
    role: "Label",
    sample: "Predicted risk",
  },
];

const MONO_SCALE = [
  { className: "font-mono text-sm", note: "14 mono", role: "Code viewer body", sample: "export function riskLevelFromScore(score: number)" },
  { className: "font-mono text-[13px]", note: "13 mono", role: "Values, table cells", sample: "78%  ·  +4.2%  ·  312 / 48" },
  { className: "font-mono text-xs", note: "12 mono", role: "SHAs, paths, branches", sample: "4f2a91c  src/payments/validate.ts  main" },
  { className: "font-mono text-[11px] text-faint", note: "11 mono", role: "Metadata, shortcuts", sample: "analyzed 3m ago · model v2.4.1 · ⌘K" },
];

export function TypographySection() {
  return (
    <SpecSection meta={designSection("typography")}>
      <SpecRow
        label="Interface — Geist"
        hint="Tight tracking on headings. Relaxed leading on anything longer than a line."
      >
        <ul className="flex flex-col">
          {SANS_SCALE.map((entry) => (
            <li
              key={entry.note}
              className="border-b border-border py-4 first:pt-0 last:border-0 last:pb-0"
            >
              <div className="flex items-baseline justify-between gap-6">
                <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
                  {entry.role}
                </span>
                <span className="shrink-0 font-mono text-[10px] text-faint">
                  {entry.note}
                </span>
              </div>
              <p className={`mt-2 text-foreground ${entry.className}`}>
                {entry.sample}
              </p>
            </li>
          ))}
        </ul>
      </SpecRow>

      <SpecRow
        label="Technical — JetBrains Mono"
        hint="Mandatory for commit hashes, file paths, branch names, CLI commands, and any number compared against another."
      >
        <ul className="flex flex-col">
          {MONO_SCALE.map((entry) => (
            <li
              key={entry.note}
              className="border-b border-border py-4 first:pt-0 last:border-0 last:pb-0"
            >
              <div className="flex items-baseline justify-between gap-6">
                <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
                  {entry.role}
                </span>
                <span className="shrink-0 font-mono text-[10px] text-faint">
                  {entry.note}
                </span>
              </div>
              <p className={`mt-2 text-foreground ${entry.className}`}>
                {entry.sample}
              </p>
            </li>
          ))}
        </ul>
      </SpecRow>

      <SpecRow
        label="Tabular figures"
        hint="Required wherever numbers stack in a column, and on any figure that animates."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-faint">
              Proportional — wrong
            </p>
            <ul className="mt-3 flex flex-col gap-1">
              {[78, 41, 93, 12].map((value) => (
                <li key={value} className="font-mono text-[13px] text-muted-foreground">
                  {value}.0%
                </li>
              ))}
            </ul>
            <SpecNote className="mt-3">Digits shift width; the column edge wavers.</SpecNote>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-faint">
              Tabular — correct
            </p>
            <ul className="mt-3 flex flex-col gap-1">
              {[78, 41, 93, 12].map((value) => (
                <li
                  key={value}
                  className="font-mono text-[13px] tabular-nums text-foreground"
                >
                  {value}.0%
                </li>
              ))}
            </ul>
            <SpecNote className="mt-3">
              <code>tabular-nums</code> · every glyph on the same advance.
            </SpecNote>
          </div>
        </div>
      </SpecRow>
    </SpecSection>
  );
}
