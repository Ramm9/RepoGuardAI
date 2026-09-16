import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * PageHeader — the consistent head of every workspace page.
 *
 * Enforces the rule that each screen states its title, its context, and its
 * primary action in the same place. `context` is where an explanation goes —
 * what this page shows and over what window.
 */
export function PageHeader({
  title,
  context,
  actions,
  /** Small monospace label above the title, e.g. a repository name. */
  eyebrow,
  className,
  children,
}: {
  title: React.ReactNode;
  context?: React.ReactNode;
  actions?: React.ReactNode;
  eyebrow?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {eyebrow ? (
            <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-faint">
              {eyebrow}
            </div>
          ) : null}
          <h1 className="text-xl font-semibold leading-tight tracking-tight text-foreground">
            {title}
          </h1>
          {context ? (
            <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
              {context}
            </p>
          ) : null}
        </div>

        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>

      {children}
    </div>
  );
}

/**
 * PageBody — the standard inner container.
 *
 * One place decides the maximum content width and the horizontal rhythm, so no
 * individual page invents its own. Wider than a prose container by design: this
 * product shows tables and charts, not articles.
 */
export function PageBody({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-[1680px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/** Breadcrumbs for nested routes. Renders a real nav landmark. */
export function Breadcrumbs({
  items,
  className,
}: {
  items: { label: string; href?: string }[];
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1.5 text-xs">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {item.href && !isLast ? (
                <a
                  href={item.href}
                  className="text-faint transition-colors duration-150 hover:text-foreground"
                >
                  {item.label}
                </a>
              ) : (
                <span
                  className={isLast ? "text-muted-foreground" : "text-faint"}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
              {!isLast ? (
                <span aria-hidden="true" className="text-faint/50">
                  /
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
