"use client";

import * as React from "react";
import { AlertCircle, Search } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldHint, Label } from "@/components/ui/label";
import { Input, Textarea } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { designSection } from "@/components/design/manifest";
import {
  SpecLabel,
  SpecNote,
  SpecRow,
  SpecSection,
} from "@/components/design/spec-section";

/**
 * Form controls.
 *
 * This section is interactive on purpose. Focus rings, checked transitions, and
 * the invalid state are the things that actually get judged, and none of them
 * can be assessed from a static render.
 */
const THRESHOLD_OPTIONS = [
  { value: "critical", label: "Critical only (80+)" },
  { value: "high", label: "High and above (60+)" },
  { value: "medium", label: "Medium and above (40+)" },
  { value: "all", label: "Every analyzed commit" },
];

const NOTIFICATIONS = [
  {
    id: "notify-critical",
    label: "Critical risk commits",
    hint: "Immediate, via the channels configured on your account.",
    defaultChecked: true,
  },
  {
    id: "notify-digest",
    label: "Daily reliability digest",
    hint: "One summary per repository at 09:00 in your timezone.",
    defaultChecked: true,
  },
  {
    id: "notify-hotspot",
    label: "New hotspot detected",
    hint: "When a module crosses into the top decile of predicted risk.",
    defaultChecked: false,
  },
];

const BRANCH_SCOPE = [
  { id: "scope-default", label: "Default branch", locked: true },
  { id: "scope-release", label: "Release branches" },
  { id: "scope-feature", label: "Feature branches" },
  { id: "scope-fork", label: "Fork pull requests" },
];

export function FormsSection() {
  // Two of the three branch-scope boxes start checked, which is what produces
  // the indeterminate parent — the state a settings page actually has to render.
  const [scopes, setScopes] = React.useState<Record<string, boolean>>({
    "scope-default": true,
    "scope-release": true,
    "scope-feature": false,
    "scope-fork": false,
  });

  const selectable = BRANCH_SCOPE.filter((entry) => !entry.locked);
  const selectedCount = selectable.filter((entry) => scopes[entry.id]).length;
  const parentState: boolean | "indeterminate" =
    selectedCount === 0
      ? false
      : selectedCount === selectable.length
        ? true
        : "indeterminate";

  function toggleAll(next: boolean | "indeterminate") {
    const value = next === true;
    setScopes((current) => {
      const updated = { ...current };
      for (const entry of selectable) updated[entry.id] = value;
      return updated;
    });
  }

  return (
    <SpecSection meta={designSection("forms")}>
      <SpecRow
        label="Text input"
        hint="36px tall, surface-filled rather than transparent, so a field reads as a field before it is focused."
      >
        <div className="grid max-w-xl gap-5">
          <Field>
            <Label htmlFor="spec-repo">Repository</Label>
            <Input
              id="spec-repo"
              placeholder="owner/repository"
              defaultValue="acme/payments-service"
              className="font-mono"
            />
            <FieldHint>
              The full name as it appears on GitHub. Monospace, because it is a
              string the developer will copy.
            </FieldHint>
          </Field>

          <Field>
            <Label htmlFor="spec-search">With a leading icon</Label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-faint"
                aria-hidden="true"
              />
              <Input
                id="spec-search"
                placeholder="Search commits, files, contributors"
                className="pl-9"
              />
            </div>
          </Field>

          <Field>
            <Label htmlFor="spec-webhook">Invalid</Label>
            <Input
              id="spec-webhook"
              defaultValue="not-a-url"
              aria-invalid
              aria-describedby="spec-webhook-error"
              className="font-mono"
            />
            <FieldError id="spec-webhook-error">
              <AlertCircle aria-hidden="true" className="size-3.5" />
              Enter an absolute HTTPS URL.
            </FieldError>
          </Field>

          <Field>
            <Label htmlFor="spec-disabled">Disabled</Label>
            <Input
              id="spec-disabled"
              defaultValue="acme/legacy-billing"
              disabled
              className="font-mono"
            />
            <FieldHint>Archived repositories cannot be reconfigured.</FieldHint>
          </Field>
        </div>
        <SpecNote className="mt-4">
          Invalid state is driven by <code>aria-invalid</code> — the same
          attribute the screen reader uses, so the visual and the announced
          state can never disagree.
        </SpecNote>
      </SpecRow>

      <SpecRow
        label="Textarea"
        hint="Resizes vertically only. Horizontal resize breaks every layout it lives in."
      >
        <div className="max-w-xl">
          <Field>
            <Label htmlFor="spec-notes">Suppression reason</Label>
            <Textarea
              id="spec-notes"
              rows={3}
              placeholder="Why this alert should not fire again for this module."
            />
            <FieldHint>
              Recorded on the audit trail with your handle and a timestamp.
            </FieldHint>
          </Field>
        </div>
      </SpecRow>

      <SpecRow
        label="Select"
        hint="Radix-backed, so keyboard behaviour and typeahead come for free. Two heights match the input sizes."
      >
        <div className="grid max-w-xl gap-5">
          <Field>
            <Label htmlFor="spec-threshold">Alert threshold</Label>
            <Select defaultValue="high">
              <SelectTrigger id="spec-threshold">
                <SelectValue placeholder="Select a threshold" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Notify me about</SelectLabel>
                  {THRESHOLD_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel>Off</SelectLabel>
                  <SelectItem value="none">Nothing</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldHint>
              Applies to this repository only. Account defaults live in Settings.
            </FieldHint>
          </Field>

          <div className="flex flex-wrap items-end gap-4">
            <Field className="w-44">
              <Label htmlFor="spec-range">Range · sm</Label>
              <Select defaultValue="30d">
                <SelectTrigger id="spec-range" size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field className="w-44">
              <Label htmlFor="spec-branch">Branch · sm</Label>
              <Select defaultValue="main">
                <SelectTrigger id="spec-branch" size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="main">main</SelectItem>
                  <SelectItem value="develop">develop</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </div>
      </SpecRow>

      <SpecRow
        label="Switch"
        hint="For settings that take effect immediately. If the change needs a Save button, use a checkbox instead."
      >
        <ul className="flex max-w-xl flex-col divide-y divide-border">
          {NOTIFICATIONS.map((entry) => (
            <li
              key={entry.id}
              className="flex items-start justify-between gap-6 py-3.5 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <Label htmlFor={entry.id}>{entry.label}</Label>
                <FieldHint className="mt-1.5">{entry.hint}</FieldHint>
              </div>
              <Switch
                id={entry.id}
                defaultChecked={entry.defaultChecked}
                className="mt-0.5"
              />
            </li>
          ))}
          <li className="flex items-start justify-between gap-6 py-3.5 last:pb-0">
            <div className="min-w-0">
              <Label htmlFor="spec-switch-disabled">
                Slack delivery
              </Label>
              <FieldHint className="mt-1.5">
                Requires a workspace connection. Disabled until one exists.
              </FieldHint>
            </div>
            <Switch id="spec-switch-disabled" disabled className="mt-0.5" />
          </li>
        </ul>
      </SpecRow>

      <SpecRow
        label="Checkbox"
        hint="Including the indeterminate parent, which is the state a partially-selected group must be able to show."
      >
        <div className="max-w-xl">
          <div className="flex items-center gap-2.5 border-b border-border pb-3">
            <Checkbox
              id="scope-all"
              checked={parentState}
              onCheckedChange={toggleAll}
            />
            <Label htmlFor="scope-all">
              Analyze all branch types
              <span className="font-mono text-[11px] font-normal text-faint">
                {selectedCount}/{selectable.length}
              </span>
            </Label>
          </div>

          <ul className="mt-3 flex flex-col gap-3 pl-6">
            {BRANCH_SCOPE.map((entry) => (
              <li key={entry.id} className="flex items-center gap-2.5">
                <Checkbox
                  id={entry.id}
                  checked={entry.locked ? true : scopes[entry.id]}
                  disabled={entry.locked}
                  onCheckedChange={(next) =>
                    setScopes((current) => ({
                      ...current,
                      [entry.id]: next === true,
                    }))
                  }
                />
                <Label htmlFor={entry.id}>
                  {entry.label}
                  {entry.locked ? (
                    <span className="font-mono text-[11px] font-normal text-faint">
                      always on
                    </span>
                  ) : null}
                </Label>
              </li>
            ))}
          </ul>
        </div>
        <SpecNote className="mt-4">
          The parent derives its state from the children — it is never stored
          separately, which is how the two drift apart.
        </SpecNote>
      </SpecRow>

      <SpecRow
        label="Field anatomy"
        hint="Label, control, and message in a fixed 8px stack. Every field on every screen uses this."
      >
        <div className="max-w-xl rounded-lg border border-border bg-card p-5">
          <div className="flex flex-col gap-4">
            {[
              { part: "Label", cls: "13 / medium / foreground" },
              { part: "Control", cls: "h-9 · rounded-md · bg-surface" },
              { part: "FieldHint", cls: "12 / relaxed / faint" },
              { part: "FieldError", cls: "12 / risk-critical / role=alert" },
            ].map((entry) => (
              <div
                key={entry.part}
                className="flex items-baseline justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0"
              >
                <SpecLabel>{entry.part}</SpecLabel>
                <span className="font-mono text-[11px] text-faint">
                  {entry.cls}
                </span>
              </div>
            ))}
          </div>
        </div>
      </SpecRow>
    </SpecSection>
  );
}
