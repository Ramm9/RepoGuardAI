
import { RISK_LABEL, RISK_THRESHOLDS } from "@/lib/utils";
import type { RiskLevel } from "@/types";
import { designSection } from "@/components/design/manifest";
import { RiskBadge, RiskDot, RiskScore, RISK_ICON } from "@/components/risk/risk-badge";
import {
  SpecLabel,
  SpecNote,
  SpecRow,
  SpecSection,
} from "@/components/design/spec-section";

const LEVELS: RiskLevel[] = ["low", "medium", "high", "critical"];

/** Representative score per level, sitting inside its threshold band. */
const SAMPLE_SCORE: Record<RiskLevel, number> = {
  low: 18,
  medium: 52,
  high: 78,
  critical: 91,
};

const PRODUCT_SURFACES = [
  { name: "RiskBadge", where: "Commit table, PR list, alert centre", prop: 'score={78}' },
  { name: "RiskScore", where: "Commit analysis headline", prop: 'score={78} size="xl"' },
  { name: "RiskDot", where: "Legend keys, list row leading mark", prop: 'level="high"' },
  { name: "RiskBadge hideIcon", where: "Beside a dot that already carries the icon", prop: 'level="high" hideIcon' },
];

export function RiskSection() {
  return (
    <SpecSection meta={designSection("risk")}>
      <SpecRow
        label="The rule"
        stack
        hint="The constraint the whole product is built around."
      >
        <div className="rounded-lg border border-accent/25 bg-accent/[0.04] p-5">
          <p className="text-[13px] font-medium text-foreground">
            Risk is never communicated by colour alone.
          </p>
          <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-muted-foreground">
            Every risk surface renders an icon, a text label, and a colour
            together. The icon is the primary cue — it survives monochrome
            displays, colour-vision deficiency, and low-quality projectors. The
            colour is reinforcement. If a screen communicates risk with a
            coloured dot and nothing else, that screen is wrong.
          </p>
          <p className="mt-3 font-mono text-[11px] text-faint">
            Implementation: components/risk/risk-badge.tsx is the single
            component through which risk reaches the screen.
          </p>
        </div>
      </SpecRow>

      <SpecRow
        label="Four levels"
        hint="Icon, label, and colour at each level — shown together, always."
      >
        <ul className="flex flex-col gap-4">
          {LEVELS.map((level) => {
            const Icon = RISK_ICON[level];
            return (
              <li
                key={level}
                className="flex flex-wrap items-center gap-4 border-b border-border pb-4 last:border-0 last:pb-0"
              >
                <span className="flex w-40 shrink-0 items-center gap-2.5">
                  {/* The same icon the badge uses — shown here in the raw so the
                      per-level glyph can be compared at a glance. */}
                  <Icon
                    className="size-4"
                    aria-hidden="true"
                    style={{ color: `var(--color-risk-${level})` }}
                  />
                  <span className="text-[13px] font-medium text-foreground">
                    {RISK_LABEL[level]}
                  </span>
                </span>

                <span className="w-44 shrink-0 font-mono text-[11px] text-faint">
                  {level === "low"
                    ? "0–39"
                    : level === "medium"
                      ? `${RISK_THRESHOLDS.medium}–${RISK_THRESHOLDS.high - 1}`
                      : level === "high"
                        ? `${RISK_THRESHOLDS.high}–${RISK_THRESHOLDS.critical - 1}`
                        : `${RISK_THRESHOLDS.critical}–100`}
                </span>

                <div className="flex flex-wrap items-center gap-3">
                  <RiskBadge level={level} size="sm" />
                  <RiskBadge level={level} size="md" />
                  <RiskBadge score={SAMPLE_SCORE[level]} size="lg" showScore />
                </div>
              </li>
            );
          })}
        </ul>
      </SpecRow>

      <SpecRow
        label="Thresholds"
        hint="One constant in lib/utils.ts. The API, the charts, and the badges all read from it."
      >
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="flex h-3 w-full" aria-hidden="true">
            <span className="bg-risk-low" style={{ width: "40%" }} />
            <span className="bg-risk-medium" style={{ width: "20%" }} />
            <span className="bg-risk-high" style={{ width: "20%" }} />
            <span className="bg-risk-critical" style={{ width: "20%" }} />
          </div>
          <div className="grid grid-cols-4 divide-x divide-border border-t border-border">
            {LEVELS.map((level) => (
              <div key={level} className="px-3 py-2.5">
                <p className="font-mono text-[11px] uppercase tracking-wider text-faint">
                  {level}
                </p>
                <p className="mt-1 font-mono text-xs tabular-nums text-foreground">
                  {level === "low"
                    ? "0–39"
                    : level === "medium"
                      ? "40–59"
                      : level === "high"
                        ? "60–79"
                        : "80–100"}
                </p>
              </div>
            ))}
          </div>
        </div>
        <SpecNote className="mt-3">
          Thresholds are inclusive at the lower bound: 60 is HIGH, not MEDIUM.
        </SpecNote>
      </SpecRow>

      <SpecRow label="Headline score" hint="When the score itself is the page's subject.">
        <div className="flex flex-wrap items-start gap-10">
          <div>
            <SpecLabel className="mb-3">md</SpecLabel>
            <RiskScore score={52} size="md" />
          </div>
          <div>
            <SpecLabel className="mb-3">lg</SpecLabel>
            <RiskScore score={78} size="lg" />
          </div>
          <div>
            <SpecLabel className="mb-3">xl</SpecLabel>
            <RiskScore score={91} size="xl" />
          </div>
        </div>
      </SpecRow>

      <SpecRow
        label="Dots"
        hint="Dense legends and list rows, where the text label would be redundant repetition of a column value."
      >
        <div className="flex flex-wrap items-center gap-6">
          {LEVELS.map((level) => (
            <span key={level} className="flex items-center gap-2">
              <RiskDot level={level} />
              <span className="text-[13px] text-muted-foreground">
                {RISK_LABEL[level]}
              </span>
            </span>
          ))}
        </div>
        <SpecNote className="mt-3">
          A dot is only acceptable where the level is already stated in text
          within the same row.
        </SpecNote>
      </SpecRow>

      <SpecRow
        label="Where it appears"
        hint="Four surfaces. All four route through the same component, so a level can never look different between them."
        stack
      >
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-faint">
                  Component
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-faint">
                  Surface
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-faint">
                  Typical props
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-faint">
                  Renders
                </th>
              </tr>
            </thead>
            <tbody>
              {PRODUCT_SURFACES.map((surface) => (
                <tr
                  key={surface.name}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-4 py-3 font-mono text-xs text-foreground">
                    {surface.name}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{surface.where}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-faint">
                    {surface.prop}
                  </td>
                  <td className="px-4 py-3">
                    {surface.name === "RiskDot" ? (
                      <RiskDot level="high" />
                    ) : surface.name === "RiskScore" ? (
                      <RiskScore score={78} size="md" />
                    ) : surface.name === "RiskBadge hideIcon" ? (
                      <RiskBadge level="high" hideIcon />
                    ) : (
                      <RiskBadge score={78} />
                    )}
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
