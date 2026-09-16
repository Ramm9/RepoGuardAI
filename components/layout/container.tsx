import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Container — the marketing site's horizontal rhythm.
 *
 * Narrower than the app's PageBody on purpose: marketing copy reads best at a
 * constrained measure, while dashboards want every available pixel.
 */
export function Container({
  className,
  size = "default",
  children,
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "narrow" | "wide" }) {
  const widths = {
    narrow: "max-w-[880px]",
    default: "max-w-[1280px]",
    wide: "max-w-[1440px]",
  } as const;

  return (
    <div
      className={cn("mx-auto w-full px-6", widths[size], className)}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Eyebrow — the small monospace label that opens a marketing section.
 *
 * Gives every section a consistent entry point and reinforces the technical
 * register without resorting to a decorative badge.
 */
export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-faint",
        className,
      )}
    >
      <span aria-hidden="true" className="h-px w-6 bg-border-strong" />
      {children}
    </p>
  );
}

/**
 * SectionHeading — the shared marketing heading pair.
 *
 * Headings scale down on mobile rather than reflowing, and the measure is
 * capped so no line runs past a comfortable reading width.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        align === "center" && "flex flex-col items-center text-center",
        className,
      )}
    >
      {eyebrow ? (
        <Eyebrow className={cn(align === "center" && "justify-center")}>
          {eyebrow}
        </Eyebrow>
      ) : null}
      <h2 className="mt-4 max-w-3xl text-2xl font-semibold leading-[1.15] tracking-tight text-foreground sm:text-3xl lg:text-[2.5rem]">
        {title}
      </h2>
      {description ? (
        <p
          className={cn(
            "mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]",
            align === "center" && "mx-auto",
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}

/**
 * MarketingSection — vertical rhythm for the public site.
 *
 * Every section uses the same vertical scale so the page reads as one document
 * rather than a stack of independently padded blocks.
 */
export function MarketingSection({
  className,
  children,
  /** Tighter top padding, for sections that follow a full-bleed visual. */
  tight = false,
  ...props
}: React.ComponentProps<"section"> & { tight?: boolean }) {
  return (
    <section
      className={cn(tight ? "py-16 sm:py-20" : "py-20 sm:py-28", className)}
      {...props}
    >
      <Container>{children}</Container>
    </section>
  );
}
