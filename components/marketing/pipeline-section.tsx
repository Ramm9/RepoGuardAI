"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";
import { PIPELINE_STAGES } from "@/lib/content/landing";
import { SectionHeading } from "@/components/layout/container";

/**
 * The pipeline explainer.
 *
 * This is the section that has to land, because it is the difference between
 * "another AI tool" and a system with an inspectable mechanism. Each stage
 * names what goes in and what comes out; the artefact chips underneath are real
 * event names and field names rather than marketing nouns.
 *
 * Selecting a stage is a deliberate interaction rather than an auto-advancing
 * carousel: the reader controls the pace, and a stage that is being read never
 * changes underneath them.
 */
export function PipelineSection() {
  const reduceMotion = useReducedMotion();
  const [activeId, setActiveId] = React.useState(PIPELINE_STAGES[0].id);

  const active =
    PIPELINE_STAGES.find((stage) => stage.id === activeId) ?? PIPELINE_STAGES[0];
  const activeIndex = PIPELINE_STAGES.findIndex(
    (stage) => stage.id === active.id,
  );

  return (
    <div>
      <SectionHeading
        eyebrow="The mechanism"
        title="Five stages between a push and a decision."
        description="Nothing here is a black box. Each stage has a defined input, a defined output, and an artefact you can inspect in the product."
      />

      {/* ---- Stage selector ---- */}
      <div className="mt-12">
        <ol
          className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5"
          aria-label="Analysis pipeline stages"
        >
          {PIPELINE_STAGES.map((stage, index) => {
            const isActive = stage.id === active.id;
            const isPast = index < activeIndex;

            return (
              <li key={stage.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(stage.id)}
                  aria-pressed={isActive}
                  className={cn(
                    "group relative flex w-full flex-col items-start gap-3 rounded-lg border p-4 text-left",
                    "transition-colors duration-200",
                    isActive
                      ? "border-accent/40 bg-elevated"
                      : "border-border bg-card hover:border-border-strong hover:bg-elevated",
                  )}
                >
                  <span className="flex w-full items-center justify-between gap-2">
                    <span
                      className={cn(
                        "flex size-8 items-center justify-center rounded-md border transition-colors duration-200",
                        isActive
                          ? "border-accent/40 bg-accent/10"
                          : "border-border bg-surface",
                      )}
                    >
                      <stage.icon
                        aria-hidden="true"
                        className={cn(
                          "size-4 transition-colors duration-200",
                          isActive || isPast
                            ? "text-accent"
                            : "text-muted-foreground",
                        )}
                      />
                    </span>
                    <span className="font-mono text-[10px] tabular-nums text-faint">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </span>

                  <span
                    className={cn(
                      "text-[13px] font-medium leading-tight transition-colors duration-200",
                      isActive ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {stage.label}
                  </span>

                  {/* The active marker is a rule, not a glow. */}
                  {isActive ? (
                    <motion.span
                      layoutId={reduceMotion ? undefined : "pipeline-active"}
                      aria-hidden="true"
                      className="absolute inset-x-4 -bottom-px h-px bg-accent"
                    />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ol>

        {/* ---- Active stage detail ----
            Fixed minimum height so switching stages never shifts the page. */}
        <div className="mt-6 min-h-[188px] rounded-lg border border-border bg-card p-6 sm:p-8">
          <motion.div
            key={active.id}
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:gap-10"
          >
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-foreground">
                {active.headline}
              </h3>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
                {active.detail}
              </p>
            </div>

            <div className="lg:border-l lg:border-border lg:pl-10">
              <p className="text-[11px] font-medium uppercase tracking-wider text-faint">
                {active.id === "activity" ? "Events consumed" : "Artefacts"}
              </p>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {active.artefacts.map((artefact) => (
                  <li
                    key={artefact}
                    className="rounded-xs border border-border bg-surface px-2 py-1 font-mono text-[11px] text-muted-foreground"
                  >
                    {artefact}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
