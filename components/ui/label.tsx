"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";

import { cn } from "@/lib/utils";

function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-[13px] leading-none font-medium text-foreground",
        "select-none",
        "group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

/** Helper text rendered beneath a field. */
function FieldHint({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="field-hint"
      className={cn("text-xs leading-relaxed text-faint", className)}
      {...props}
    />
  );
}

/** Field-level validation message. Pair with `aria-describedby` on the input. */
function FieldError({
  className,
  children,
  ...props
}: React.ComponentProps<"p">) {
  if (!children) return null;
  return (
    <p
      data-slot="field-error"
      role="alert"
      className={cn(
        "flex items-center gap-1.5 text-xs leading-relaxed text-risk-critical",
        className,
      )}
      {...props}
    >
      {children}
    </p>
  );
}

/** Vertical stack that keeps label, control, and messages consistently spaced. */
function Field({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

export { Label, Field, FieldHint, FieldError };
