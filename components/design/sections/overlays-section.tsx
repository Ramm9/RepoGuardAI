"use client";

import {
  ArrowUpRight,
  Copy,
  ExternalLink,
  GitBranch,
  MoreHorizontal,
  Pause,
  RefreshCw,
  Settings2,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RiskBadge } from "@/components/risk/risk-badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { designSection } from "@/components/design/manifest";
import {
  SpecLabel,
  SpecNote,
  SpecRow,
  SpecSection,
} from "@/components/design/spec-section";

/**
 * Overlays.
 *
 * All four are Radix-backed, so focus trapping, escape handling, scroll locking,
 * and return-focus behaviour are correct by construction rather than by
 * hand-rolled effort. What this sheet demonstrates is the surface treatment:
 * bg-overlay, a strong border, and a single soft shadow — the only place in the
 * product where a shadow is used at all.
 */
const FILTERS = [
  { id: "filter-critical", label: "Critical only", defaultChecked: false },
  { id: "filter-unreviewed", label: "Unreviewed", defaultChecked: true },
  { id: "filter-mine", label: "Authored by me", defaultChecked: false },
  { id: "filter-default", label: "Default branch only", defaultChecked: true },
];

export function OverlaysSection() {
  return (
    <SpecSection meta={designSection("overlays")}>
      <SpecRow
        label="Dialog"
        stack
        hint="Centred on desktop, a bottom sheet on mobile — an adaptation, not a shrunk box. Resize to see it switch."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary">Open confirmation</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Stop monitoring payments-service?</DialogTitle>
                <DialogDescription>
                  Analysis halts immediately and the webhook is removed from
                  GitHub. Historical risk data is retained and will be available
                  if you re-enable monitoring later.
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-md border border-border bg-surface p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-xs text-foreground">
                    acme/payments-service
                  </span>
                  <RiskBadge score={78} size="sm" showScore />
                </div>
                <p className="mt-2 text-xs leading-relaxed text-faint">
                  Currently the highest-risk repository in your account.
                </p>
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost">Cancel</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button variant="danger">
                    <Pause aria-hidden="true" />
                    Stop monitoring
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Open destructive</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete this repository from RepoGuard?</DialogTitle>
                <DialogDescription>
                  Every analysis, risk history point, and suppression rule for
                  this repository is permanently removed. This cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost">Keep it</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button variant="danger">
                    <Trash2 aria-hidden="true" />
                    Delete permanently
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <SpecNote className="mt-4">
          The destructive action is always the rightmost button and always uses
          the danger variant. Cancel is ghost — it should not compete.
        </SpecNote>
      </SpecRow>

      <SpecRow
        label="Dropdown menu"
        hint="Row actions and account menus. Shortcuts are right-aligned in mono, matching the command palette."
      >
        <div className="flex flex-wrap items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings2 aria-hidden="true" />
                Repository
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>payments-service</DropdownMenuLabel>
              <DropdownMenuItem>
                <RefreshCw aria-hidden="true" />
                Re-run analysis
                <DropdownMenuShortcut>⌘R</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <GitBranch aria-hidden="true" />
                Change default branch
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy aria-hidden="true" />
                Copy repository ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <ExternalLink aria-hidden="true" />
                Open on GitHub
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="danger">
                <Trash2 aria-hidden="true" />
                Remove repository
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Row actions">
                <MoreHorizontal aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                View analysis
                <DropdownMenuShortcut>↵</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem>Copy SHA</DropdownMenuItem>
              <DropdownMenuItem disabled>Compare (unavailable)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <SpecNote className="mt-4">
          The danger item is separated and placed last — it should never sit
          adjacent to a routine action.
        </SpecNote>
      </SpecRow>

      <SpecRow
        label="Popover"
        hint="For controls that need more room than a menu but do not warrant a dialog."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <SlidersHorizontal aria-hidden="true" />
                Filters
                <Badge variant="accent" size="sm">
                  2
                </Badge>
              </Button>
            </PopoverTrigger>
            <PopoverContent>
              <SpecLabel>Filter commits</SpecLabel>
              <ul className="mt-3 flex flex-col gap-2.5">
                {FILTERS.map((filter) => (
                  <li key={filter.id} className="flex items-center gap-2.5">
                    <Checkbox
                      id={filter.id}
                      defaultChecked={filter.defaultChecked}
                    />
                    <Label htmlFor={filter.id}>{filter.label}</Label>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
                <Button variant="ghost" size="xs">
                  Reset
                </Button>
                <Button variant="primary" size="xs">
                  Apply
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm">
                Model details
                <ArrowUpRight aria-hidden="true" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80">
              <p className="text-[13px] font-semibold tracking-tight text-foreground">
                Risk model v2.4.1
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Gradient-boosted classifier trained on 40 months of commit
                history and linked incident reports across this organization.
              </p>
              <dl className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-xs text-faint">Precision</dt>
                  <dd className="font-mono text-xs tabular-nums text-foreground">
                    0.84
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-xs text-faint">Recall</dt>
                  <dd className="font-mono text-xs tabular-nums text-foreground">
                    0.79
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-xs text-faint">Last retrained</dt>
                  <dd className="font-mono text-xs text-foreground">
                    11 days ago
                  </dd>
                </div>
              </dl>
            </PopoverContent>
          </Popover>
        </div>
      </SpecRow>

      <SpecRow
        label="Tooltip"
        hint="Carries real information — exact timestamps, factor magnitudes — so it is bounded and set with proper leading."
      >
        <div className="flex flex-wrap items-center gap-6">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Re-run analysis">
                <RefreshCw aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Re-run analysis</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-default font-mono text-xs text-muted-foreground underline decoration-dotted underline-offset-4">
                3m ago
              </span>
            </TooltipTrigger>
            <TooltipContent>18 March 2026 at 09:21 UTC</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-default text-[13px] text-muted-foreground underline decoration-dotted underline-offset-4">
                Test coverage
              </span>
            </TooltipTrigger>
            <TooltipContent>
              Signal magnitude 88 of 100. Edited logic in src/payments/ has 12%
              coverage, well below the 74% repository baseline.
            </TooltipContent>
          </Tooltip>
        </div>
        <SpecNote className="mt-4">
          Provider is mounted once globally in app/providers.tsx — tooltips never
          need a local provider.
        </SpecNote>
      </SpecRow>

      <SpecRow
        label="Surface treatment"
        hint="The one place a shadow is permitted, because an overlay must detach from the page beneath it."
      >
        <div className="flex flex-col gap-3">
          <div className="w-full max-w-sm rounded-md border border-border-strong bg-overlay p-3 shadow-[0_10px_32px_-6px_rgba(0,0,0,0.75)]">
            <p className="text-[13px] text-foreground">bg-overlay</p>
            <p className="mt-1 font-mono text-[11px] text-faint">
              border-border-strong · shadow
            </p>
          </div>
          <SpecNote>
            Menus and popovers: 32px blur. Dialogs: 64px. Nothing else in the
            product carries a shadow at all.
          </SpecNote>
        </div>
      </SpecRow>
    </SpecSection>
  );
}
