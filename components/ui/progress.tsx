"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

/**
 * Linear progress. `tone` accepts a raw CSS colour so the same primitive can
 * express health (accent), risk (level colour), or a neutral task.
 */
function Progress({
  className,
  value = 0,
  tone,
  indicatorClassName,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & {
  /** CSS colour for the filled portion. Defaults to the accent. */
  tone?: string;
  indicatorClassName?: string;
}) {
  // `?? 0` and not just the parameter default: Radix types `value` as
  // `number | null | undefined`, and a default only catches `undefined` — an
  // explicit `null` (which indeterminate callers do pass) would slip through to
  // NaN once it reaches the transform below.
  const clamped = Math.min(100, Math.max(0, value ?? 0));

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={clamped}
      className={cn(
        "relative h-1.5 w-full overflow-hidden rounded-full bg-elevated",
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          "h-full w-full flex-1 rounded-full bg-accent",
          "transition-transform duration-500 ease-out",
          indicatorClassName,
        )}
        style={{
          transform: `translateX(-${100 - clamped}%)`,
          ...(tone ? { backgroundColor: tone } : {}),
        }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
