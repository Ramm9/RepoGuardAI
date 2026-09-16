"use client";

import * as React from "react";

import { cn, RISK_LABEL, RISK_STYLES } from "@/lib/utils";
import { RISK_ICON } from "@/components/risk/risk-badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { RiskLevel } from "@/types";

/**
 * CodeDiff — signature visual 4.
 *
 * A unified diff rendered the way a developer expects to read one, with the
 * product's contribution layered on top: per-line risk markers explaining which
 * specific lines the model reacted to and why.
 *
 * Deliberately not Monaco. Monaco is the right tool for the full file viewer,
 * where folding, search, and minimap matter — but it is a heavy editor surface
 * that must be client-loaded and does not lay out well inside a marketing page
 * or a narrow analysis panel. A diff is a static, read-only, line-addressable
 * document, so rendering it as semantic markup keeps it cheap, selectable,
 * copy-pasteable, and screen-reader navigable.
 *
 * Syntax highlighting is intentionally minimal — keywords, strings, comments,
 * and nothing else. A marketing-grade rainbow would fight the risk markers,
 * which are the actual signal this component exists to carry.
 */

export type DiffLineKind = "add" | "remove" | "context" | "hunk";

export interface DiffLine {
  kind: DiffLineKind;
  /** Line number in the original file; null for added lines. */
  oldLine: number | null;
  /** Line number in the new file; null for removed lines. */
  newLine: number | null;
  content: string;
  /** Model annotation for this line, if it contributed to the score. */
  risk?: {
    level: RiskLevel;
    /** Plain-language reason, shown on hover and to assistive tech. */
    reason: string;
  };
}

export interface CodeDiffProps {
  /** Path of the file being shown, rendered in the header. */
  path: string;
  language?: string;
  lines: DiffLine[];
  additions?: number;
  deletions?: number;
  className?: string;
  /** Caps the rendered body height and scrolls internally. */
  maxHeight?: number;
}

export function CodeDiff({
  path,
  language,
  lines,
  additions,
  deletions,
  className,
  maxHeight,
}: CodeDiffProps) {
  // Derive the counts when the caller has not supplied them, so the header is
  // never inconsistent with the body it describes.
  const added = additions ?? lines.filter((line) => line.kind === "add").length;
  const removed =
    deletions ?? lines.filter((line) => line.kind === "remove").length;

  const flagged = lines.filter((line) => line.risk).length;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-card",
        className,
      )}
    >
      {/* ---- File header ---- */}
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="truncate font-mono text-xs text-foreground">
            {path}
          </span>
          {language ? (
            <span className="hidden shrink-0 rounded-xs border border-border px-1.5 py-0.5 font-mono text-[10px] text-faint sm:inline">
              {language}
            </span>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-3 font-mono text-[11px] tabular-nums">
          <span className="text-risk-low">+{added}</span>
          <span className="text-risk-critical">−{removed}</span>
          {flagged > 0 ? (
            <span className="text-faint">
              {flagged} flagged line{flagged === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>
      </header>

      {/* ---- Diff body ----
          A table gives real column alignment for the gutters without the
          fragile padding maths a flex row would need at every font size. */}
      <div
        className="overflow-auto"
        style={maxHeight ? { maxHeight } : undefined}
      >
        <table className="w-full border-collapse font-mono text-xs">
          <caption className="sr-only">
            Unified diff for {path}. {added} additions, {removed} deletions,
            {flagged} lines flagged by the risk model.
          </caption>
          <tbody>
            {lines.map((line, index) => (
              <DiffRow key={index} line={line} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DiffRow({ line }: { line: DiffLine }) {
  if (line.kind === "hunk") {
    return (
      <tr className="bg-surface">
        <td
          colSpan={4}
          className="border-y border-border px-4 py-1.5 text-[11px] text-faint"
        >
          {line.content}
        </td>
      </tr>
    );
  }

  const tone = {
    add: {
      row: "bg-risk-low/[0.07]",
      marker: "text-risk-low",
      sign: "+",
    },
    remove: {
      row: "bg-risk-critical/[0.07]",
      marker: "text-risk-critical",
      sign: "−",
    },
    context: { row: "", marker: "text-faint", sign: " " },
  }[line.kind];

  const risk = line.risk;

  return (
    <tr
      className={cn(
        "group/row",
        tone.row,
        // A flagged line is tinted along its full width, with the reason
        // carried by the marker in the gutter rather than by colour alone.
        risk && "bg-risk-high/[0.06]",
      )}
    >
      {/* Old line number */}
      <td className="w-[1%] select-none border-r border-border px-2.5 py-0.5 text-right align-top tabular-nums text-faint">
        {line.oldLine ?? ""}
      </td>

      {/* New line number */}
      <td className="w-[1%] select-none border-r border-border px-2.5 py-0.5 text-right align-top tabular-nums text-faint">
        {line.newLine ?? ""}
      </td>

      {/* Risk marker gutter — fixed width so code never shifts horizontally
          between flagged and unflagged lines. */}
      <td className="w-[1%] select-none px-1.5 py-0.5 align-top">
        {risk ? <RiskMarker level={risk.level} reason={risk.reason} /> : null}
      </td>

      {/* Code */}
      <td className="py-0.5 pr-4 align-top">
        <span className={cn("select-none pr-2", tone.marker)}>{tone.sign}</span>
        <span className="whitespace-pre-wrap break-words text-muted-foreground">
          <Highlighted content={line.content} kind={line.kind} />
        </span>
      </td>
    </tr>
  );
}

/**
 * The per-line risk marker.
 *
 * Icon plus colour plus an explicit text reason available on hover and to
 * assistive technology — the risk rule applies at line granularity too.
 */
function RiskMarker({ level, reason }: { level: RiskLevel; reason: string }) {
  const Icon = RISK_ICON[level];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="flex cursor-help items-center justify-center"
          aria-label={`${RISK_LABEL[level]} risk: ${reason}`}
        >
          <Icon
            aria-hidden="true"
            className={cn("size-3.5", RISK_STYLES[level].text)}
          />
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <span className="flex flex-col gap-1">
          <span className={cn("font-medium", RISK_STYLES[level].text)}>
            {RISK_LABEL[level]} risk
          </span>
          <span>{reason}</span>
        </span>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Minimal syntax highlighting.
 *
 * Three categories only: comments, strings, and keywords. Anything more would
 * compete with the risk markers for attention, and this is a diff viewer whose
 * job is to show what changed — not a full editor.
 */
const KEYWORDS = new Set([
  "async", "await", "break", "case", "catch", "class", "const", "continue",
  "def", "default", "elif", "else", "export", "extends", "finally", "for",
  "from", "function", "if", "import", "in", "interface", "let", "new", "not",
  "or", "and", "raise", "return", "self", "static", "switch", "throw", "try",
  "type", "typeof", "var", "while", "yield", "None", "True", "False", "null",
  "true", "false", "undefined",
]);

function Highlighted({
  content,
  kind,
}: {
  content: string;
  kind: DiffLineKind;
}) {
  // Whole-line comment: colour it once and skip tokenising.
  const trimmed = content.trimStart();
  if (trimmed.startsWith("//") || trimmed.startsWith("#")) {
    return <span className="text-faint italic">{content}</span>;
  }

  // Split into strings / words / everything else, keeping delimiters so the
  // original spacing survives reassembly exactly.
  const tokens = content.split(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b\w+\b)/g);

  return (
    <>
      {tokens.map((token, index) => {
        if (!token) return null;

        if (/^["']/.test(token)) {
          return (
            <span key={index} className="text-risk-low/90">
              {token}
            </span>
          );
        }

        if (KEYWORDS.has(token)) {
          return (
            <span key={index} className="text-accent">
              {token}
            </span>
          );
        }

        // Numeric literals get a gentle lift; they are often the thing that
        // actually changed in a config or threshold edit.
        if (/^\d+(\.\d+)?$/.test(token)) {
          return (
            <span key={index} className="text-info">
              {token}
            </span>
          );
        }

        return (
          <span
            key={index}
            className={kind === "context" ? undefined : "text-foreground/90"}
          >
            {token}
          </span>
        );
      })}
    </>
  );
}
