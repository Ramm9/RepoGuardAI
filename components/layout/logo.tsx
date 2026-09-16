
import { cn } from "@/lib/utils";

/**
 * RepoGuard mark.
 *
 * A shield whose lower half resolves into a commit-graph node: reliability
 * (the shield) built from repository history (the node and its edges). Drawn on
 * a 24px grid with a 1.75px stroke so it stays legible at 16px in the sidebar
 * and at 28px on the marketing site.
 */
export function RepoGuardMark({
  className,
  size = 24,
  /** Renders on the accent fill instead of as an outline. */
  filled = false,
}: {
  className?: string;
  size?: number;
  filled?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      {filled ? (
        <rect width="24" height="24" rx="6" fill="var(--color-accent)" />
      ) : null}

      {/* Shield outline. */}
      <path
        d="M12 2.5 4.5 5.2v6.1c0 4.4 3.1 8.6 7.5 9.9 4.4-1.3 7.5-5.5 7.5-9.9V5.2L12 2.5Z"
        stroke={filled ? "var(--color-accent-ink)" : "currentColor"}
        strokeWidth="1.75"
        strokeLinejoin="round"
      />

      {/* Commit node and its two edges — the repository-history half. */}
      <circle
        cx="12"
        cy="10.4"
        r="1.9"
        fill={filled ? "var(--color-accent-ink)" : "currentColor"}
      />
      <path
        d="M12 12.3v3.4m0 0-2.6 2.1m2.6-2.1 2.6 2.1"
        stroke={filled ? "var(--color-accent-ink)" : "currentColor"}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />
    </svg>
  );
}

/**
 * Full lockup: mark plus wordmark.
 *
 * The wordmark is set in the sans face at tight tracking rather than as a logo
 * image, so it inherits text colour and scales cleanly at any size.
 */
export function RepoGuardLogo({
  className,
  size = 24,
  showWordmark = true,
  href = "/",
}: {
  className?: string;
  size?: number;
  showWordmark?: boolean;
  href?: string | null;
}) {
  const content = (
    <>
      <RepoGuardMark size={size} className="text-accent" />
      {showWordmark ? (
        <span className="text-[15px] font-semibold uppercase tracking-[0.08em] text-foreground">
          RepoGuard
        </span>
      ) : null}
    </>
  );

  if (!href) {
    return (
      <span className={cn("inline-flex items-center gap-2.5", className)}>
        {content}
      </span>
    );
  }

  return (
    <a
      href={href}
      className={cn(
        "inline-flex items-center gap-2.5 rounded-sm",
        "transition-opacity duration-150 hover:opacity-90",
        "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent",
        className,
      )}
      aria-label="RepoGuard home"
    >
      {content}
    </a>
  );
}
