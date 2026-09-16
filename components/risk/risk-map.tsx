"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";

import { cn, RISK_LABEL, riskColor, riskLevelFromScore } from "@/lib/utils";
import { RISK_ICON } from "@/components/risk/risk-badge";
import type { RiskModule } from "@/types";

/**
 * RiskMap — signature visual 3.
 *
 * A dependency graph of a repository's modules, sized and coloured by aggregate
 * risk. The point it makes is structural rather than decorative: risk is not
 * evenly distributed across a codebase, and a module's exposure is partly
 * inherited from what it depends on. Reading the graph should immediately
 * answer "where is this repository fragile, and what does that put at risk?"
 *
 * Layout is authored, not computed. Each module carries normalised x/y hints
 * from the service layer, so the same repository always produces the same
 * picture — a force-directed simulation would reshuffle on every mount and make
 * the map impossible to learn. It also means no layout work happens at runtime
 * and the SVG renders identically on the server and the client.
 *
 * Risk is never encoded in colour alone: every node states its score as text,
 * carries the level icon, and names the level in its accessible label. The
 * legend is part of the component rather than an optional caption for the same
 * reason.
 */

/** The drawing surface. Fixed units; the SVG scales to its container. */
const VIEWBOX = { width: 720, height: 420 } as const;
/** Keeps nodes clear of the edges so labels are never clipped. */
const PADDING = { x: 72, y: 56 } as const;

/** Node radius by file count, bounded so one large module cannot dominate. */
const RADIUS = { min: 18, max: 34 } as const;

function project(layout: RiskModule["layout"]) {
  return {
    x: PADDING.x + layout.x * (VIEWBOX.width - PADDING.x * 2),
    y: PADDING.y + layout.y * (VIEWBOX.height - PADDING.y * 2),
  };
}

function radiusFor(fileCount: number, maxFiles: number) {
  if (maxFiles <= 0) return RADIUS.min;
  const ratio = Math.sqrt(fileCount) / Math.sqrt(maxFiles);
  return RADIUS.min + ratio * (RADIUS.max - RADIUS.min);
}

export interface RiskMapProps {
  modules: RiskModule[];
  className?: string;
  /** Currently highlighted module id, for syncing with an adjacent list. */
  selectedId?: string | null;
  onSelect?: (module: RiskModule) => void;
}

export function RiskMap({
  modules,
  className,
  selectedId = null,
  onSelect,
}: RiskMapProps) {
  const reduceMotion = useReducedMotion();
  const [hovered, setHovered] = React.useState<string | null>(null);

  // The node the graph is currently explaining — hover wins over selection so
  // pointing at a node always answers for that node.
  const focused = hovered ?? selectedId;

  const { positioned, edges, maxFiles } = React.useMemo(() => {
    const byId = new Map(modules.map((module) => [module.id, module]));
    const maxFileCount = modules.reduce(
      (max, module) => Math.max(max, module.fileCount),
      0,
    );

    const nodes = modules.map((module) => ({
      module,
      ...project(module.layout),
    }));
    const nodeById = new Map(nodes.map((node) => [node.module.id, node]));

    // One edge per declared dependency that resolves to a module we can draw.
    const drawnEdges = modules.flatMap((module) =>
      module.dependsOn
        .filter((id) => byId.has(id))
        .map((id) => {
          const from = nodeById.get(module.id)!;
          const to = nodeById.get(id)!;
          return { id: `${module.id}->${id}`, from, to, source: module.id, target: id };
        }),
    );

    return { positioned: nodes, edges: drawnEdges, maxFiles: maxFileCount };
  }, [modules]);

  /** An edge is lit when either of its endpoints is the focused module. */
  const isEdgeActive = (source: string, target: string) =>
    focused !== null && (source === focused || target === focused);

  /** A node dims when something else is focused. */
  const isDimmed = (id: string) => focused !== null && id !== focused;

  const focusedModule = focused
    ? (modules.find((module) => module.id === focused) ?? null)
    : null;

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="relative overflow-hidden rounded-lg border border-border bg-card">
        <svg
          viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
          className="w-full"
          role="img"
          aria-label={`Repository risk map. ${modules.length} modules, sized by file count and coloured by risk level.`}
        >
          {/* Background grid: orientation, at an opacity that reads as texture. */}
          <defs>
            <pattern
              id="risk-map-grid"
              width="24"
              height="24"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 24 0 L 0 0 0 24"
                fill="none"
                stroke="var(--color-border)"
                strokeWidth="1"
                opacity="0.45"
              />
            </pattern>
          </defs>
          <rect
            width={VIEWBOX.width}
            height={VIEWBOX.height}
            fill="url(#risk-map-grid)"
          />

          {/* Edges first so nodes always sit above them. */}
          <g>
            {edges.map((edge) => {
              const active = isEdgeActive(edge.source, edge.target);
              return (
                <line
                  key={edge.id}
                  x1={edge.from.x}
                  y1={edge.from.y}
                  x2={edge.to.x}
                  y2={edge.to.y}
                  stroke={
                    active ? "var(--color-accent)" : "var(--color-border-strong)"
                  }
                  strokeWidth={active ? 1.5 : 1}
                  opacity={focused === null ? 0.7 : active ? 0.9 : 0.25}
                  className="transition-all duration-200"
                />
              );
            })}
          </g>

          {/* Nodes. */}
          <g>
            {positioned.map(({ module, x, y }, index) => {
              const radius = radiusFor(module.fileCount, maxFiles);
              const colour = riskColor(module.risk);
              const dimmed = isDimmed(module.id);
              const isFocused = focused === module.id;

              return (
                <motion.g
                  key={module.id}
                  initial={reduceMotion ? false : { opacity: 0, scale: 0.9 }}
                  animate={{ opacity: dimmed ? 0.35 : 1, scale: 1 }}
                  transition={{
                    duration: 0.3,
                    delay: reduceMotion ? 0 : index * 0.04,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  style={{ transformOrigin: `${x}px ${y}px` }}
                  className={cn(onSelect && "cursor-pointer")}
                  onMouseEnter={() => setHovered(module.id)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(module.id)}
                  onBlur={() => setHovered(null)}
                  onClick={onSelect ? () => onSelect(module) : undefined}
                  tabIndex={onSelect ? 0 : undefined}
                  role={onSelect ? "button" : undefined}
                  onKeyDown={
                    onSelect
                      ? (event: React.KeyboardEvent) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onSelect(module);
                          }
                        }
                      : undefined
                  }
                  aria-label={`${module.name}: ${RISK_LABEL[module.riskLevel]} risk, score ${module.risk} of 100, ${module.fileCount} files`}
                >
                  {/* Focus halo, drawn only for the active node. */}
                  {isFocused ? (
                    <circle
                      cx={x}
                      cy={y}
                      r={radius + 7}
                      fill="none"
                      stroke={colour}
                      strokeWidth="1"
                      opacity="0.4"
                    />
                  ) : null}

                  <circle
                    cx={x}
                    cy={y}
                    r={radius}
                    fill={colour}
                    fillOpacity={isFocused ? 0.22 : 0.14}
                    stroke={colour}
                    strokeWidth={isFocused ? 2 : 1.5}
                    className="transition-all duration-200"
                  />

                  {/* The score, stated as text so colour is never load-bearing. */}
                  <text
                    x={x}
                    y={y + 4}
                    textAnchor="middle"
                    className="pointer-events-none font-mono text-[12px] tabular-nums"
                    fill="var(--color-foreground)"
                    fontWeight={600}
                  >
                    {module.risk}
                  </text>

                  <text
                    x={x}
                    y={y + radius + 16}
                    textAnchor="middle"
                    className="pointer-events-none font-mono text-[10px]"
                    fill={
                      isFocused
                        ? "var(--color-foreground)"
                        : "var(--color-muted-foreground)"
                    }
                  >
                    {module.name}
                  </text>
                </motion.g>
              );
            })}
          </g>
        </svg>

        {/* Detail readout. Reserves its own row so the map never reflows as
            the pointer moves between nodes. */}
        <div
          aria-live="polite"
          className="flex min-h-[52px] items-center gap-3 border-t border-border px-4 py-3"
        >
          {focusedModule ? (
            <ModuleReadout module={focusedModule} modules={modules} />
          ) : (
            <p className="text-xs text-faint">
              Node size reflects file count; colour and icon reflect aggregate
              risk. Hover a module to trace its dependencies.
            </p>
          )}
        </div>
      </div>

      <RiskMapLegend />
    </div>
  );
}

/** The focused module's figures, including what depends on it. */
function ModuleReadout({
  module,
  modules,
}: {
  module: RiskModule;
  modules: RiskModule[];
}) {
  const Icon = RISK_ICON[module.riskLevel];
  const dependents = modules.filter((candidate) =>
    candidate.dependsOn.includes(module.id),
  );

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-1">
      <span className="flex items-center gap-2">
        <Icon
          aria-hidden="true"
          className="size-3.5 shrink-0"
          style={{ color: riskColor(module.risk) }}
        />
        <span className="font-mono text-xs font-medium text-foreground">
          {module.name}
        </span>
      </span>

      <span className="font-mono text-xs tabular-nums text-muted-foreground">
        {RISK_LABEL[module.riskLevel]} · {module.risk}/100
      </span>

      <span className="font-mono text-xs tabular-nums text-faint">
        {module.fileCount} files
      </span>

      <span className="font-mono text-xs tabular-nums text-faint">
        {module.dependsOn.length} dependencies
      </span>

      {dependents.length > 0 ? (
        <span className="font-mono text-xs tabular-nums text-faint">
          {dependents.length} dependent
          {dependents.length === 1 ? "" : "s"}
        </span>
      ) : null}
    </div>
  );
}

/**
 * The legend is not optional chrome.
 *
 * It is what makes the colour encoding readable without relying on the reader
 * already knowing the scale, and it pairs each colour with its icon and name.
 */
function RiskMapLegend({ className }: { className?: string }) {
  const levels = [12, 52, 72, 92];

  return (
    <div
      className={cn(
        "mt-3 flex flex-wrap items-center gap-x-5 gap-y-2",
        className,
      )}
    >
      {levels.map((score) => {
        const level = riskLevelFromScore(score);
        const Icon = RISK_ICON[level];
        return (
          <span key={level} className="flex items-center gap-1.5">
            <Icon
              aria-hidden="true"
              className="size-3"
              style={{ color: riskColor(score) }}
            />
            <span className="text-[11px] text-muted-foreground">
              {RISK_LABEL[level]}
            </span>
          </span>
        );
      })}

      <span className="ml-auto font-mono text-[10px] text-faint">
        size = file count
      </span>
    </div>
  );
}
