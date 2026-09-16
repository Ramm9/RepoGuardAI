import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { RiskMap } from "@/components/risk/risk-map";
import { EXAMPLE_MODULES } from "@/lib/content/landing";
import { Badge } from "@/components/ui/badge";

/**
 * AuthAside — the evidence panel beside the auth forms.
 *
 * This is the one place in the auth flow with room to argue for the product, and
 * it does so with the real thing rather than a testimonial: an actual repository
 * risk map, rendered by the same component the dashboard uses. A prospect who
 * signs up has already seen the primary output.
 *
 * It is hidden below lg entirely (see AuthLayout) — on a phone this is distance
 * between the user and the form, not persuasion.
 */

export function SignInAside() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <Badge variant="accent" size="sm" mono className="mb-4">
          EXAMPLE · acme/payments-api
        </Badge>
        <h2 className="text-lg font-semibold leading-snug tracking-tight text-foreground">
          Every module, scored before it ships.
        </h2>
        <p className="mt-2.5 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
          RepoGuard reads commit history, churn, complexity, and test coverage,
          then scores the probability that each change introduces a defect.
        </p>
      </div>

      <RiskMap modules={EXAMPLE_MODULES} className="bg-card/60" />

      <ul className="flex flex-col gap-3 border-t border-border pt-6">
        {[
          "Risk scores with the factors behind them",
          "Pull request review, before merge",
          "No write access to your repositories",
        ].map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-[13px]">
            <Check
              className="mt-0.5 size-3.5 shrink-0 text-accent"
              strokeWidth={2.5}
              aria-hidden="true"
            />
            <span className="text-muted-foreground">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * SignUpAside — the onboarding-shaped version.
 *
 * Signup is the start of a sequence, so the panel shows the sequence: the four
 * stages the user is about to move through, in the same numbered form the
 * onboarding flow itself uses. Setting the expectation here is what keeps step
 * one from feeling like an ambush.
 */
export function SignUpAside() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <Badge variant="accent" size="sm" mono className="mb-4">
          SETUP · 4 STEPS · ~3 MINUTES
        </Badge>
        <h2 className="text-lg font-semibold leading-snug tracking-tight text-foreground">
          From install to first risk score.
        </h2>
        <p className="mt-2.5 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
          Connect GitHub, choose a repository, and RepoGuard builds its baseline
          from your full commit history.
        </p>
      </div>

      <ol className="flex flex-col">
        {SETUP_STEPS.map((item, index) => (
          <li
            key={item.title}
            className="relative flex gap-3.5 border-b border-border py-4 first:pt-0 last:border-0 last:pb-0"
          >
            <span
              aria-hidden="true"
              className="mt-px flex size-6 shrink-0 items-center justify-center rounded-md border border-border bg-elevated font-mono text-[11px] text-faint"
            >
              {index + 1}
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-foreground">
                {item.title}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {item.detail}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <p className="font-mono text-[11px] leading-relaxed text-faint">
        Diffs are analysed in memory. Only derived metrics and scores are
        persisted.
      </p>
    </div>
  );
}

const SETUP_STEPS = [
  {
    title: "Connect GitHub",
    detail: "Read-only installation. No write access is ever requested.",
  },
  {
    title: "Choose repositories",
    detail: "Select one or more repositories to bring under monitoring.",
  },
  {
    title: "Pick a branch",
    detail: "The branch whose history defines the reliability baseline.",
  },
  {
    title: "First analysis",
    detail: "Full-history scan, then the model produces an initial score.",
  },
] as const;

/**
 * LegalNote — the terms/privacy line, kept next to the button it qualifies.
 *
 * Takes the link element per route so the signup form can point at the checkbox
 * it belongs to via aria-describedby.
 */
export function LegalNote({
  id,
  className,
}: {
  id?: string;
  className?: string;
}) {
  return (
    <p
      id={id}
      className={cn("text-xs leading-relaxed text-faint", className)}
    >
      By continuing you agree to the{" "}
      <Link
        href="/terms"
        className="text-muted-foreground underline underline-offset-2 transition-colors duration-150 hover:text-foreground"
      >
        Terms
      </Link>{" "}
      and{" "}
      <Link
        href="/privacy"
        className="text-muted-foreground underline underline-offset-2 transition-colors duration-150 hover:text-foreground"
      >
        Privacy Policy
      </Link>
      .
    </p>
  );
}

/**
 * InlineSwitchLink — "Already have an account? Sign in."
 *
 * A small shared piece because both credentials screens need it in the same
 * position with the same spacing.
 */
export function InlineSwitchLink({
  prompt,
  label,
  href,
}: {
  prompt: string;
  label: string;
  href: string;
}) {
  return (
    <p className="text-[13px] text-muted-foreground">
      {prompt}{" "}
      <Link
        href={href}
        className="inline-flex items-center gap-1 font-medium text-accent underline-offset-4 hover:underline"
      >
        {label}
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </Link>
    </p>
  );
}
