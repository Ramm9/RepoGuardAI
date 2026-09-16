import {
  ArrowRight,
  Check,
  GitPullRequest,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { designSection } from "@/components/design/manifest";
import {
  SpecGrid,
  SpecLabel,
  SpecNote,
  SpecRow,
  SpecSection,
} from "@/components/design/spec-section";

/**
 * Button specimens.
 *
 * The variant order here is the intent hierarchy, not alphabetical: exactly one
 * primary per screen, secondary for the supporting action, outline and ghost for
 * everything else. A screen with three primaries has no primary.
 */
const VARIANTS = [
  {
    variant: "primary" as const,
    label: "Analyze repository",
    intent: "One per screen. The action the screen exists for.",
  },
  {
    variant: "secondary" as const,
    label: "Configure",
    intent: "The supporting action beside a primary.",
  },
  {
    variant: "outline" as const,
    label: "View diff",
    intent: "Toolbar actions, filters, table row actions.",
  },
  {
    variant: "ghost" as const,
    label: "Dismiss",
    intent: "Dense areas where a border would add noise.",
  },
  {
    variant: "danger" as const,
    label: "Remove repository",
    intent: "Destructive only. Never for merely irreversible.",
  },
  {
    variant: "link" as const,
    label: "Read the model card",
    intent: "Inline navigation inside prose.",
  },
];

const SIZES = [
  { size: "xs" as const, label: "xs", note: "h-7 · table rows" },
  { size: "sm" as const, label: "sm", note: "h-8 · toolbars" },
  { size: "md" as const, label: "md", note: "h-9 · default" },
  { size: "lg" as const, label: "lg", note: "h-10 · marketing CTA" },
];

export function ButtonsSection() {
  return (
    <SpecSection meta={designSection("buttons")}>
      <SpecRow
        label="Variants"
        stack
        hint="Six variants, ordered by intent. The rightmost column states when each is correct."
      >
        <ul className="flex flex-col">
          {VARIANTS.map((entry) => (
            <li
              key={entry.variant}
              className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-border py-4 first:pt-0 last:border-0 last:pb-0"
            >
              <span className="w-24 shrink-0 font-mono text-[11px] text-faint">
                {entry.variant}
              </span>
              <span className="w-56 shrink-0">
                <Button variant={entry.variant}>{entry.label}</Button>
              </span>
              <span className="min-w-0 text-xs leading-relaxed text-muted-foreground">
                {entry.intent}
              </span>
            </li>
          ))}
        </ul>
      </SpecRow>

      <SpecRow
        label="Sizes"
        hint="Four text sizes plus two icon sizes. Heights step 28 / 32 / 36 / 40 so they stay on the 8px rhythm."
      >
        <div className="flex flex-col gap-5">
          {SIZES.map((entry) => (
            <div key={entry.size} className="flex flex-wrap items-center gap-4">
              <span className="w-10 shrink-0 font-mono text-[11px] text-faint">
                {entry.label}
              </span>
              <Button variant="primary" size={entry.size}>
                Analyze
              </Button>
              <Button variant="secondary" size={entry.size}>
                <RefreshCw aria-hidden="true" />
                Re-run
              </Button>
              <Button variant="outline" size={entry.size}>
                Details
                <ArrowRight aria-hidden="true" />
              </Button>
              <span className="font-mono text-[11px] text-faint">
                {entry.note}
              </span>
            </div>
          ))}
        </div>
      </SpecRow>

      <SpecRow
        label="Icon only"
        hint="Always paired with an accessible name — an icon button with no label is unusable to a screen reader."
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="w-16 shrink-0 font-mono text-[11px] text-faint">
              icon
            </span>
            <Button variant="secondary" size="icon" aria-label="Search repositories">
              <Search aria-hidden="true" />
            </Button>
            <Button variant="outline" size="icon" aria-label="Repository settings">
              <Settings2 aria-hidden="true" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Re-run analysis">
              <RefreshCw aria-hidden="true" />
            </Button>
            <Button variant="danger" size="icon" aria-label="Delete repository">
              <Trash2 aria-hidden="true" />
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-16 shrink-0 font-mono text-[11px] text-faint">
              icon-sm
            </span>
            <Button variant="ghost" size="icon-sm" aria-label="Open pull request">
              <GitPullRequest aria-hidden="true" />
            </Button>
            <Button variant="outline" size="icon-sm" aria-label="Add repository">
              <Plus aria-hidden="true" />
            </Button>
            <Button variant="secondary" size="icon-sm" aria-label="Run analysis">
              <Play aria-hidden="true" />
            </Button>
          </div>
        </div>
        <SpecNote className="mt-4">
          aria-label on the button · aria-hidden on the glyph.
        </SpecNote>
      </SpecRow>

      <SpecRow
        label="States"
        hint="Loading blocks interaction and sets aria-busy. Disabled drops to 45% and removes pointer events."
      >
        <div className="flex flex-col gap-5">
          <div>
            <SpecLabel className="mb-3">Loading</SpecLabel>
            <SpecGrid>
              <Button variant="primary" loading>
                Analyzing
              </Button>
              <Button variant="secondary" loading>
                Syncing
              </Button>
              <Button variant="outline" loading size="sm">
                Loading
              </Button>
            </SpecGrid>
          </div>
          <div>
            <SpecLabel className="mb-3">Disabled</SpecLabel>
            <SpecGrid>
              <Button variant="primary" disabled>
                Analyze repository
              </Button>
              <Button variant="secondary" disabled>
                Configure
              </Button>
              <Button variant="outline" disabled>
                View diff
              </Button>
              <Button variant="danger" disabled>
                Remove
              </Button>
            </SpecGrid>
          </div>
        </div>
      </SpecRow>

      <SpecRow
        label="In context"
        hint="How the hierarchy reads when the variants sit together, which is the only test that matters."
      >
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold tracking-tight text-foreground">
                payments-service
              </p>
              <p className="mt-1 font-mono text-[11px] text-faint">
                main · last analyzed 3m ago
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" size="sm">
                Dismiss
              </Button>
              <Button variant="outline" size="sm">
                <Settings2 aria-hidden="true" />
                Configure
              </Button>
              <Button variant="primary" size="sm">
                <Check aria-hidden="true" />
                Approve merge
              </Button>
            </div>
          </div>
        </div>
      </SpecRow>
    </SpecSection>
  );
}
