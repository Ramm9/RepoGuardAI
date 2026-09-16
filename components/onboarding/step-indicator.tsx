"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export interface OnboardingStepDef {
  id: string;
  label: string;
}

/**
 * StepIndicator — horizontal progress through the setup sequence.
 *
 * Numbered rather than dotted, and each step keeps its label at every width, so
 * the user can always answer "where am I and what's left?" without counting
 * circles. State is carried by the numeral, the check, and the label weight —
 * never by colour alone.
 *
 * Rendered as an ordered list with aria-current on the active step, which is how
 * a screen reader announces position without the visual rail.
 */
export function StepIndicator({
  steps,
  currentIndex,
  className,
}: {
  steps: OnboardingStepDef[];
  currentIndex: number;
  className?: string;
}) {
  return (
    <nav aria-label="Setup progress" className={className}>
      <ol className="flex items-center">
        {steps.map((step, index) => {
          const complete = index < currentIndex;
          const current = index === currentIndex;

          return (
            <li
              key={step.id}
              className={cn(
                "flex items-center gap-2.5",
                index < steps.length - 1 && "flex-1",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-md border font-mono text-[11px] tabular-nums transition-colors duration-200",
                  complete && "border-accent/40 bg-accent/15 text-accent",
                  current && "border-accent bg-accent text-accent-ink",
                  !complete && !current && "border-border bg-elevated text-faint",
                )}
              >
                {complete ? (
                  <Check className="size-3" strokeWidth={3} />
                ) : (
                  index + 1
                )}
              </span>

              <span
                aria-current={current ? "step" : undefined}
                className={cn(
                  "hidden whitespace-nowrap text-[13px] transition-colors duration-200 sm:inline",
                  current ? "font-medium text-foreground" : "text-faint",
                )}
              >
                {/* Position is announced for every step, not just the visual
                    current one, so the list is navigable out of context. */}
                <span className="sr-only">
                  Step {index + 1} of {steps.length}
                  {complete ? ", complete" : current ? ", current" : ""}:{" "}
                </span>
                {step.label}
              </span>

              {index < steps.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "mx-3 h-px flex-1 transition-colors duration-200",
                    complete ? "bg-accent/35" : "bg-border",
                  )}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
