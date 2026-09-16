"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

/**
 * Tooltips carry real information in this product — factor magnitudes, exact
 * timestamps, score deltas — so they are bounded to a readable width and set
 * with proper line-height rather than the usual single cramped line.
 */
function TooltipContent({
  className,
  sideOffset = 6,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "z-50 max-w-72 rounded-md border border-border-strong bg-overlay",
          "px-2.5 py-1.5 text-xs leading-relaxed text-foreground",
          "shadow-[0_8px_24px_-4px_rgba(0,0,0,0.7)]",
          "animate-[fade-in_150ms_ease-out]",
          "data-[state=closed]:animate-none",
          className,
        )}
        {...props}
      >
        {children}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
