import { GitBranch, GitCommitHorizontal, Tag } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge, StatusDot } from "@/components/ui/badge";
import { designSection } from "@/components/design/manifest";
import {
  SpecGrid,
  SpecLabel,
  SpecNote,
  SpecRow,
  SpecSection,
} from "@/components/design/spec-section";

/**
 * Badges, status dots, and identity.
 *
 * The risk variants (low / medium / high / critical) exist on Badge but are not
 * demonstrated here as risk — risk always goes through RiskBadge so the icon can
 * never be omitted. They appear on this sheet only as the tints they are.
 */
const SEMANTIC = [
  { variant: "neutral" as const, label: "Queued", usage: "Default metadata" },
  { variant: "outline" as const, label: "Draft", usage: "Lower emphasis still" },
  { variant: "accent" as const, label: "Analyzing", usage: "In-progress, ours" },
  { variant: "success" as const, label: "Passing", usage: "Checks green" },
  { variant: "warning" as const, label: "Degraded", usage: "Needs attention" },
  { variant: "danger" as const, label: "Failed", usage: "Action required" },
];

const MONITORING = [
  { tone: "success" as const, label: "Monitoring", pulse: true },
  { tone: "accent" as const, label: "Analyzing", pulse: true },
  { tone: "warning" as const, label: "Rate limited", pulse: false },
  { tone: "danger" as const, label: "Disconnected", pulse: false },
  { tone: "neutral" as const, label: "Paused", pulse: false },
];

const PEOPLE = [
  { handle: "rmorales", initials: "RM" },
  { handle: "jpark", initials: "JP" },
  { handle: "aruiz", initials: "AR" },
  { handle: "dependabot", initials: "DB" },
];

export function BadgesSection() {
  return (
    <SpecSection meta={designSection("badges")}>
      <SpecRow
        label="Semantic"
        hint="Six tints. Each carries a word — a bare coloured chip communicates nothing on its own."
      >
        <ul className="flex flex-col gap-3">
          {SEMANTIC.map((entry) => (
            <li key={entry.variant} className="flex flex-wrap items-center gap-4">
              <span className="w-20 shrink-0 font-mono text-[11px] text-faint">
                {entry.variant}
              </span>
              <span className="w-28 shrink-0">
                <Badge variant={entry.variant}>{entry.label}</Badge>
              </span>
              <span className="w-20 shrink-0">
                <Badge variant={entry.variant} size="sm">
                  {entry.label}
                </Badge>
              </span>
              <span className="text-xs text-muted-foreground">{entry.usage}</span>
            </li>
          ))}
        </ul>
      </SpecRow>

      <SpecRow
        label="Technical"
        hint="Branch names, SHAs, tags, and versions take the mono treatment — they are strings the developer will retype."
      >
        <SpecGrid>
          <Badge variant="outline" mono>
            <GitBranch aria-hidden="true" />
            main
          </Badge>
          <Badge variant="outline" mono>
            <GitBranch aria-hidden="true" />
            fix/settlement-offset
          </Badge>
          <Badge variant="neutral" mono>
            <GitCommitHorizontal aria-hidden="true" />
            4f2a91c
          </Badge>
          <Badge variant="neutral" mono>
            <Tag aria-hidden="true" />
            v2.4.1
          </Badge>
          <Badge variant="neutral" mono size="sm">
            TypeScript
          </Badge>
          <Badge variant="neutral" mono size="sm">
            Python
          </Badge>
        </SpecGrid>
        <SpecNote className="mt-4">
          mono · tracking-tight. The same treatment the code viewer uses.
        </SpecNote>
      </SpecRow>

      <SpecRow
        label="Live status"
        hint="A dot plus a word. The pulse is reserved for genuinely ongoing conditions, never for decoration."
      >
        <ul className="flex flex-col gap-3">
          {MONITORING.map((entry) => (
            <li key={entry.label} className="flex items-center gap-2.5">
              <StatusDot tone={entry.tone} pulse={entry.pulse} />
              <span className="text-[13px] text-foreground">{entry.label}</span>
              {entry.pulse ? (
                <span className="font-mono text-[11px] text-faint">pulse</span>
              ) : null}
            </li>
          ))}
        </ul>
        <SpecNote className="mt-4">
          The dot is aria-hidden; the adjacent word is the accessible content.
        </SpecNote>
      </SpecRow>

      <SpecRow
        label="Identity"
        hint="Monogram fallbacks are seeded by username, so the same contributor keeps the same tone across every screen."
      >
        <div className="flex flex-col gap-5">
          {(["xs", "sm", "md", "lg"] as const).map((size) => (
            <div key={size} className="flex items-center gap-4">
              <span className="w-10 shrink-0 font-mono text-[11px] text-faint">
                {size}
              </span>
              <div className="flex items-center gap-2">
                {PEOPLE.map((person) => (
                  <Avatar key={person.handle} size={size}>
                    <AvatarFallback seed={person.handle}>
                      {person.initials}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
            </div>
          ))}

          <div>
            <SpecLabel className="mb-3">Stacked — contributor list</SpecLabel>
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {PEOPLE.map((person) => (
                  <Avatar
                    key={person.handle}
                    size="sm"
                    className="ring-2 ring-card"
                  >
                    <AvatarFallback seed={person.handle}>
                      {person.initials}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <span className="text-xs text-muted-foreground">
                +3 contributors this week
              </span>
            </div>
          </div>
        </div>
      </SpecRow>
    </SpecSection>
  );
}
