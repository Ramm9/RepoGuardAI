import { Check, Eye, KeyRound, Server, Trash2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";

/**
 * OnboardingAside — the evidence panel beside the setup flow.
 *
 * Deliberately *not* a preview of the four steps: the flow's own step indicator
 * is on screen for the entire sequence, and a second stepper in the margin
 * would be two widgets answering the same question. What is not answered
 * anywhere else — and is the standing objection at this exact moment — is what
 * happens to the source code once access is granted. So the panel answers that,
 * in the same can/cannot form the install screen uses.
 */
export function OnboardingAside() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <Badge variant="accent" size="sm" mono className="mb-4">
          TRUST BOUNDARY
        </Badge>
        <h2 className="text-lg font-semibold leading-snug tracking-tight text-foreground">
          What RepoGuard does with your code.
        </h2>
        <p className="mt-2.5 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
          Repositories are read through a GitHub App installation. There is no
          personal access token, and no credential for your account ever reaches
          the browser.
        </p>
      </div>

      <ul className="flex flex-col gap-px overflow-hidden rounded-lg border border-border bg-border">
        {CAPABILITIES.map((item) => (
          <li key={item.text} className="flex items-start gap-3 bg-card p-3.5">
            <span
              aria-hidden="true"
              className="mt-px flex size-4 shrink-0 items-center justify-center rounded-full border border-border bg-elevated"
            >
              {item.allowed ? (
                <Check
                  className="size-2.5 text-accent"
                  strokeWidth={3}
                  aria-hidden="true"
                />
              ) : (
                <X
                  className="size-2.5 text-faint"
                  strokeWidth={3}
                  aria-hidden="true"
                />
              )}
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] leading-snug text-foreground">
                {item.text}
              </span>
              <span className="sr-only">
                {item.allowed ? "Permitted." : "Not permitted."}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <dl className="flex flex-col gap-4 border-t border-border pt-6">
        {DETAILS.map((detail) => (
          <div key={detail.title} className="flex gap-3">
            <detail.icon
              className="mt-px size-3.5 shrink-0 text-accent"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <dt className="text-[13px] font-medium text-foreground">
                {detail.title}
              </dt>
              <dd className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {detail.detail}
              </dd>
            </div>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * Rights and non-rights, stated flatly.
 *
 * Each row carries a check or a cross as well as its wording, so the list reads
 * the same without colour — the same rule the risk scale follows. The `sr-only`
 * suffix exists because a screen reader gets no information from an icon.
 */
const CAPABILITIES = [
  { allowed: true, text: "Read commit history and file contents" },
  { allowed: true, text: "Compute metrics from diffs, in memory" },
  { allowed: true, text: "Post review comments on pull requests" },
  { allowed: false, text: "Push commits or modify any branch" },
  { allowed: false, text: "Change repository settings or access" },
  { allowed: false, text: "Retain your source after analysis" },
] as const;

const DETAILS = [
  {
    icon: Server,
    title: "The installation token stays on the server",
    detail:
      "Every GitHub call is made by the Django backend. The browser holds a session cookie and nothing else.",
  },
  {
    icon: Trash2,
    title: "Diffs are discarded, metrics are kept",
    detail:
      "Analysis runs in memory. Only derived figures — complexity, churn, coverage, scores — are persisted.",
  },
  {
    icon: KeyRound,
    title: "Revocable from GitHub at any time",
    detail:
      "Uninstalling the App stops all access immediately, without needing to contact us.",
  },
  {
    icon: Eye,
    title: "Full audit trail",
    detail:
      "Every analysis run, and every repository it touched, is listed in Settings → Activity.",
  },
] as const;
