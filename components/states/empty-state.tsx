import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * EmptyState — the deliberate, designed version of "there's nothing here".
 *
 * Every list in RepoGuard has one, and each explains what the surface is for
 * and what single action fills it. The icon sits in a bordered square rather
 * than a coloured circle, which keeps the register technical.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  /** Use the compact variant inside panels rather than full-page regions. */
  compact = false,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; href?: string; onClick?: () => void; icon?: LucideIcon };
  secondaryAction?: { label: string; href?: string; onClick?: () => void };
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "px-4 py-10" : "px-6 py-16",
        className,
      )}
    >
      {Icon ? (
        <div
          className={cn(
            "mb-4 flex items-center justify-center rounded-lg border border-border bg-surface",
            compact ? "size-9" : "size-11",
          )}
        >
          <Icon
            className={cn("text-faint", compact ? "size-4" : "size-5")}
            aria-hidden="true"
          />
        </div>
      ) : null}

      <h3
        className={cn(
          "font-semibold tracking-tight text-foreground",
          compact ? "text-[13px]" : "text-sm",
        )}
      >
        {title}
      </h3>

      {description ? (
        <p
          className={cn(
            "mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted-foreground",
            compact && "max-w-xs text-xs",
          )}
        >
          {description}
        </p>
      ) : null}

      {(action || secondaryAction) && (
        <div className={cn("flex items-center gap-2", compact ? "mt-4" : "mt-5")}>
          {action ? (
            action.href ? (
              <Button asChild size="sm" variant="primary">
                <Link href={action.href}>
                  {action.icon ? <action.icon /> : null}
                  {action.label}
                </Link>
              </Button>
            ) : (
              <Button size="sm" variant="primary" onClick={action.onClick}>
                {action.icon ? <action.icon /> : null}
                {action.label}
              </Button>
            )
          ) : null}

          {secondaryAction ? (
            secondaryAction.href ? (
              <Button asChild size="sm" variant="ghost">
                <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
              </Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            )
          ) : null}
        </div>
      )}
    </div>
  );
}
