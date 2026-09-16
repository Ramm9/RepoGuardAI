"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "relative inline-flex items-center gap-1 border-b border-border",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Underline tabs rather than pill tabs — they sit flush with the content below
 * and read as a document navigation, which suits dense technical screens.
 */
function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex items-center gap-2 whitespace-nowrap",
        "px-3 pb-2.5 pt-1 text-[13px] font-medium",
        "text-muted-foreground transition-colors duration-150",
        "hover:text-foreground",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "disabled:pointer-events-none disabled:opacity-50",
        "data-[state=active]:text-foreground",
        // The active indicator is a 2px rule aligned to the list's bottom border.
        "after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full",
        "after:bg-transparent after:transition-colors after:duration-150",
        "data-[state=active]:after:bg-accent",
        "[&_svg]:size-3.5 [&_svg]:shrink-0",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        "mt-4 focus-visible:outline-none",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Segmented — the compact filter control used for time ranges (7D / 30D / 90D).
 * Visually distinct from Tabs because it is a value picker, not a view switch.
 */
function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  size = "sm",
  "aria-label": ariaLabel,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: "sm" | "md";
  "aria-label": string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md border border-border bg-surface p-0.5",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-sm font-medium tabular-nums transition-colors duration-150",
              "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
              size === "sm" ? "h-6 px-2 text-xs" : "h-7 px-2.5 text-[13px]",
              active
                ? "bg-elevated text-foreground shadow-[inset_0_0_0_1px_var(--color-border-strong)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent, Segmented };
