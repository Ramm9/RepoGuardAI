import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Card — a surface primitive, not a template.
 *
 * The spec explicitly warns against turning every element into an identical
 * rounded floating panel, so this is deliberately plain: a bordered surface with
 * no shadow by default. Elevation is opted into via `elevated`, and the product
 * should prefer sections, tables, and dividers over card grids wherever the
 * content structure allows.
 */
function Card({
  className,
  elevated = false,
  interactive = false,
  ...props
}: React.ComponentProps<"div"> & {
  /** Lifts the surface one step and adds a border highlight. */
  elevated?: boolean;
  /** Adds hover affordance for cards that are entirely clickable. */
  interactive?: boolean;
}) {
  return (
    <div
      data-slot="card"
      className={cn(
        "rounded-lg border border-border bg-card",
        elevated && "bg-elevated shadow-[0_1px_2px_rgba(0,0,0,0.4)]",
        interactive &&
          "transition-colors duration-150 hover:border-border-strong hover:bg-elevated",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({
  className,
  /** Renders the header on a slightly recessed surface with a bottom divider. */
  bordered = false,
  ...props
}: React.ComponentProps<"div"> & { bordered?: boolean }) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "flex items-start justify-between gap-4 px-5 py-4",
        bordered && "border-b border-border",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="card-title"
      className={cn(
        "text-[13px] leading-none font-semibold tracking-tight text-foreground",
        className,
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-[13px] leading-relaxed text-muted-foreground", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-5 py-4", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center gap-3 border-t border-border px-5 py-3",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Section — the primary grouping unit across the product.
 *
 * Distinguished from Card on purpose: a Section is a page-level band with a
 * title row and optional actions, separated by space rather than by an enclosing
 * box. Used for dashboard regions, analytics panels, and settings groups.
 */
function Section({
  title,
  description,
  actions,
  className,
  contentClassName,
  children,
  ...props
}: React.ComponentProps<"section"> & {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  contentClassName?: string;
}) {
  return (
    <section className={cn("flex flex-col", className)} {...props}>
      {(title || actions) && (
        <header className="mb-3 flex items-end justify-between gap-4">
          <div className="min-w-0">
            {title ? (
              <h2 className="text-[15px] leading-tight font-semibold tracking-tight text-foreground">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          ) : null}
        </header>
      )}
      <div className={cn("min-w-0", contentClassName)}>{children}</div>
    </section>
  );
}

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Section,
};
