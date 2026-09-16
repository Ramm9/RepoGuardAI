import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Button — the product's primary interactive primitive.
 *
 * Sized for dense developer UI: heights step 28 / 32 / 36 / 40px, which land on
 * the 8px rhythm when combined with the standard 16px vertical gaps.
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "font-medium select-none",
    "transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out",
    "disabled:pointer-events-none disabled:opacity-45",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    "active:translate-y-[0.5px]",
  ].join(" "),
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-accent-ink hover:bg-accent/90 shadow-[0_0_0_1px_rgba(34,211,238,0.35),0_1px_2px_rgba(0,0,0,0.4)]",
        secondary:
          "bg-elevated text-foreground border border-border hover:bg-overlay hover:border-border-strong",
        outline:
          "border border-border bg-transparent text-foreground hover:bg-elevated hover:border-border-strong",
        ghost:
          "bg-transparent text-muted-foreground hover:bg-elevated hover:text-foreground",
        danger:
          "bg-risk-critical/12 text-risk-critical border border-risk-critical/35 hover:bg-risk-critical/20",
        link: "bg-transparent text-accent underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        xs: "h-7 rounded-sm px-2 text-xs [&_svg]:size-3.5",
        sm: "h-8 rounded-md px-3 text-[13px] [&_svg]:size-3.5",
        md: "h-9 rounded-md px-3.5 text-[13px] [&_svg]:size-4",
        lg: "h-10 rounded-md px-5 text-sm [&_svg]:size-4",
        icon: "size-8 rounded-md [&_svg]:size-4",
        "icon-sm": "size-7 rounded-sm [&_svg]:size-3.5",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Renders a leading spinner and blocks interaction. */
  loading?: boolean;
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  // `asChild` forwards to a single child, so the spinner cannot be injected —
  // the consumer is responsible for its own loading affordance there.
  if (asChild) {
    return (
      <Comp
        data-slot="button"
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {children}
      </Comp>
    );
  }

  return (
    <button
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

export { Button, buttonVariants };
