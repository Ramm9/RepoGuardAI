"use client";

import { AlertTriangle, RefreshCw, WifiOff, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api/errors";
import { Button } from "@/components/ui/button";

/**
 * ErrorState — never renders a raw API error.
 *
 * Takes whatever was thrown, normalises it, and presents a sentence a
 * developer can act on plus a recovery affordance. The one exception is a
 * lapsed GitHub credential, which is a distinct, first-class condition with its
 * own copy and its own call to action — reconnecting, not retrying.
 */
export function ErrorState({
  error,
  onRetry,
  onReconnect,
  className,
  compact = false,
  title: titleOverride,
}: {
  error?: unknown;
  onRetry?: () => void;
  /** Present when the failure is a lapsed GitHub connection. */
  onReconnect?: () => void;
  className?: string;
  compact?: boolean;
  title?: string;
}) {
  const apiError = error instanceof ApiError ? error : undefined;
  const offline =
    typeof navigator !== "undefined" && navigator.onLine === false;

  const requiresReauth = apiError?.requiresReauth ?? false;

  const Icon: LucideIcon = offline
    ? WifiOff
    : requiresReauth
      ? RefreshCw
      : AlertTriangle;

  const title =
    titleOverride ??
    (offline
      ? "You're offline."
      : requiresReauth
        ? "GitHub connection expired."
        : "We couldn't load this.");

  const description = offline
    ? "RepoGuard can't reach the network. Reconnect to resume monitoring this repository."
    : requiresReauth
      ? "Reconnect your GitHub account to continue monitoring this repository."
      : (apiError?.message ??
        "Something went wrong while loading this data. Trying again usually resolves it.");

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "px-4 py-10" : "px-6 py-16",
        className,
      )}
    >
      <div
        className={cn(
          "mb-4 flex items-center justify-center rounded-lg border",
          requiresReauth
            ? "border-risk-high/30 bg-risk-high/8"
            : "border-border bg-surface",
          compact ? "size-9" : "size-11",
        )}
      >
        <Icon
          className={cn(
            requiresReauth ? "text-risk-high" : "text-faint",
            compact ? "size-4" : "size-5",
          )}
          aria-hidden="true"
        />
      </div>

      <h3
        className={cn(
          "font-semibold tracking-tight text-foreground",
          compact ? "text-[13px]" : "text-sm",
        )}
      >
        {title}
      </h3>

      <p
        className={cn(
          "mt-1.5 max-w-md text-[13px] leading-relaxed text-muted-foreground",
          compact && "max-w-xs text-xs",
        )}
      >
        {description}
      </p>

      {/* Field-level validation errors from DRF, when present. */}
      {apiError?.fieldErrors ? (
        <ul className="mt-4 max-w-md space-y-1 text-left">
          {Object.entries(apiError.fieldErrors).map(([field, messages]) => (
            <li key={field} className="text-xs leading-relaxed text-risk-critical">
              <span className="font-mono text-faint">{field}</span>{" "}
              {messages.join(" ")}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-5 flex items-center gap-2">
        {requiresReauth && onReconnect ? (
          <Button size="sm" variant="primary" onClick={onReconnect}>
            <RefreshCw />
            Reconnect GitHub
          </Button>
        ) : null}

        {onRetry && !requiresReauth ? (
          <Button size="sm" variant="secondary" onClick={onRetry}>
            <RefreshCw />
            Try again
          </Button>
        ) : null}
      </div>

      {/* Correlate a user report with a server log without exposing internals. */}
      {apiError && apiError.status >= 500 ? (
        <p className="mt-5 font-mono text-[11px] text-faint">
          {apiError.code} · {apiError.status}
        </p>
      ) : null}
    </div>
  );
}
