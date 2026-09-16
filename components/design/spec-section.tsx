import * as React from "react";

import { cn } from "@/lib/utils";
import type { DesignSectionMeta } from "@/components/design/manifest";

/**
 * SpecSection — one numbered band of the design sheet.
 *
 * The register here is a type-foundry specimen sheet rather than a component
 * gallery: a monospace index, a hairline rule, and specimens laid out against a
 * label column. It is the same visual language the product uses for dense
 * technical data, applied to the design system itself.
 */
export function SpecSection({
  meta,
  children,
  className,
}: {
  meta: DesignSectionMeta;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={meta.id}
      // Offset for the sticky header when jumped to from the rail.
      className={cn("scroll-mt-20 border-t border-border pt-8", className)}
      aria-labelledby={`${meta.id}-heading`}
    >
      <header className="flex gap-4 sm:gap-6">
        <span
          aria-hidden="true"
          className="shrink-0 pt-1 font-mono text-[11px] tabular-nums text-faint"
        >
          {meta.index}
        </span>
        <div className="min-w-0">
          <h2
            id={`${meta.id}-heading`}
            className="text-[15px] font-semibold leading-tight tracking-tight text-foreground"
          >
            {meta.title}
          </h2>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
            {meta.description}
          </p>
        </div>
      </header>

      <div className="mt-8 flex flex-col gap-8">{children}</div>
    </section>
  );
}

/**
 * SpecRow — a labelled specimen row.
 *
 * The label column is fixed so specimens align vertically down the whole sheet,
 * which is what makes a spec sheet readable as a reference rather than as a
 * sequence of unrelated demos.
 */
export function SpecRow({
  label,
  hint,
  children,
  className,
  /** Drop the label column and stack, for specimens that need full width. */
  stack = false,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
  stack?: boolean;
}) {
  return (
    <div
      className={cn(
        "border-b border-border pb-8 last:border-0 last:pb-0",
        !stack && "md:grid md:grid-cols-[180px_1fr] md:gap-8",
        className,
      )}
    >
      <div className={cn("min-w-0", stack ? "mb-4" : "mb-4 md:mb-0")}>
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </p>
        {hint ? (
          <p className="mt-1.5 max-w-[16rem] text-xs leading-relaxed text-faint">
            {hint}
          </p>
        ) : null}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/**
 * SpecPanel — the bordered surface specimens sit on.
 *
 * Specimens need a surface one step up from the page so borders and low-contrast
 * text can be judged the way they will appear in the product.
 */
export function SpecPanel({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-5",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/** Uppercase micro-label, for grouping specimens inside a row. */
export function SpecLabel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <p
      className={cn(
        "text-[11px] font-medium uppercase tracking-wider text-faint",
        className,
      )}
    >
      {children}
    </p>
  );
}

/** A monospace annotation: token names, class names, measured values. */
export function SpecNote({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <p className={cn("font-mono text-[11px] leading-relaxed text-faint", className)}>
      {children}
    </p>
  );
}

/** Even grid for specimen sets that read as a matrix. */
export function SpecGrid({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-wrap items-center gap-3", className)}
      {...props}
    >
      {children}
    </div>
  );
}
