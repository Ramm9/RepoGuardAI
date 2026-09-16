import * as React from "react";

import { cn } from "@/lib/utils";
import { RepoGuardLogo } from "@/components/layout/logo";
import { TechnicalGrid } from "@/components/layout/technical-grid";

/**
 * AuthLayout — the shared frame for login, signup, and onboarding.
 *
 * A split composition: the form on the left at a comfortable measure, and a
 * supporting panel on the right that carries product evidence rather than
 * decoration. Below lg the panel is dropped entirely rather than stacked — on a
 * phone, a testimonial below the fold is just distance between the user and the
 * one thing they came here to do.
 */
export function AuthLayout({
  children,
  aside,
  /** Widens the form column for multi-step flows like onboarding. */
  wide = false,
}: {
  children: React.ReactNode;
  aside?: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
      {/* ---- Form column ---- */}
      <div className="flex flex-1 flex-col">
        <header className="px-6 py-6 sm:px-10">
          {/* RepoGuardLogo renders its own anchor, so it is not wrapped in a
              second one — nesting <a> inside <a> is invalid HTML. */}
          <RepoGuardLogo size={22} />
        </header>

        <main
          id="main"
          className="flex flex-1 items-center justify-center px-6 pb-16 sm:px-10"
        >
          <div
            className={cn("w-full", wide ? "max-w-[560px]" : "max-w-[400px]")}
          >
            {children}
          </div>
        </main>

        <footer className="px-6 py-6 sm:px-10">
          <p className="font-mono text-[11px] text-faint">
            Read-only GitHub access · No source code retained
          </p>
        </footer>
      </div>

      {/* ---- Evidence panel ---- */}
      {aside ? (
        <aside className="relative hidden overflow-hidden border-l border-border bg-surface lg:flex lg:flex-col lg:justify-center">
          <TechnicalGrid fade={false} className="opacity-40" />
          <div className="relative px-10 py-12">{aside}</div>
        </aside>
      ) : null}
    </div>
  );
}

/**
 * AuthHeading — the title/subtitle pair every auth screen opens with.
 */
export function AuthHeading({
  title,
  description,
  step,
}: {
  title: string;
  description?: React.ReactNode;
  /** Optional "Step 2 of 4" indicator for multi-step flows. */
  step?: string;
}) {
  return (
    <div>
      {step ? (
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-accent">
          {step}
        </p>
      ) : null}
      <h1
        className={cn(
          "text-2xl font-semibold leading-tight tracking-tight text-foreground",
          step && "mt-3",
        )}
      >
        {title}
      </h1>
      {description ? (
        <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}

/**
 * AuthDivider — separates OAuth from credentials.
 */
export function AuthDivider({ label = "or" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
      <span className="font-mono text-[11px] uppercase tracking-wider text-faint">
        {label}
      </span>
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
    </div>
  );
}
