"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full",
        "border border-border-strong transition-colors duration-150",
        "bg-elevated",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:border-accent/50 data-[state=checked]:bg-accent/25",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block size-3.5 rounded-full bg-faint",
          "transition-[transform,background-color] duration-150 ease-out",
          "translate-x-[3px] data-[state=checked]:translate-x-[19px]",
          "data-[state=checked]:bg-accent",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
