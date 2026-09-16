import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Badge — compact status and metadata chips.
 *
 * `mono` renders in JetBrains Mono, which is the correct treatment for
 * branch names, commit SHAs, file paths, and language labels.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-sm border font-medium whitespace-nowrap [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        neutral: "border-border bg-elevated text-muted-foreground",
        outline: "border-border bg-transparent text-muted-foreground",
        accent: "border-accent/30 bg-accent/10 text-accent",
        success: "border-success/30 bg-success/10 text-success",
        warning: "border-warning/30 bg-warning/10 text-warning",
        danger: "border-danger/30 bg-danger/10 text-danger",
        low: "border-risk-low/30 bg-risk-low/10 text-risk-low",
        medium: "border-risk-medium/30 bg-risk-medium/10 text-risk-medium",
        high: "border-risk-high/30 bg-risk-high/10 text-risk-high",
        critical:
          "border-risk-critical/30 bg-risk-critical/10 text-risk-critical",
      },
      size: {
        sm: "h-5 px-1.5 text-[11px] [&_svg]:size-3",
        md: "h-6 px-2 text-xs [&_svg]:size-3.5",
      },
      mono: {
        true: "font-mono tracking-tight",
        false: "",
      },
    },
    defaultVariants: {
      variant: "neutral",
      size: "md",
      mono: false,
    },
  },
);

export interface BadgeProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof badgeVariants> {
  asChild?: boolean;
}

function Badge({
  className,
  variant,
  size,
  mono,
  asChild = false,
  ...props
}: BadgeProps) {
  const Comp = asChild ? Slot : "span";
  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant, size, mono }), className)}
      {...props}
    />
  );
}

/** Small tinted status pill with a leading dot. Used for live states. */
function StatusDot({
  className,
  tone = "neutral",
  pulse = false,
}: {
  className?: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "accent";
  /** Adds a slow pulse to signal a live, ongoing condition. */
  pulse?: boolean;
}) {
  const tones = {
    neutral: "bg-faint",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
    accent: "bg-accent",
  } as const;

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-1.5 shrink-0 rounded-full",
        tones[tone],
        pulse && "animate-[pulse-dot_2s_ease-in-out_infinite]",
        className,
      )}
    />
  );
}

export { Badge, StatusDot, badgeVariants };
