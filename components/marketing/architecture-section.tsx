import { Lock } from "lucide-react";

import { ARCHITECTURE } from "@/lib/content/landing";
import { SectionHeading } from "@/components/layout/container";

/**
 * Architecture and security.
 *
 * Developer-facing products are bought by people who want to know where their
 * credentials live before they want to know what the UI looks like. This
 * section answers that directly and states the trust boundary in plain terms:
 * the GitHub App token is held by the Django backend, and the frontend never
 * sees it.
 *
 * That is a description of how the system is actually built, not a promise
 * bolted on afterwards — the frontend has no code path that could hold one.
 */
export function ArchitectureSection() {
  return (
    <div>
      <SectionHeading
        eyebrow="Architecture"
        title="Analysis runs server-side. Always."
        description="The frontend renders results. It never holds a GitHub credential, and it never performs a privileged GitHub operation."
      />

      <div className="mt-12 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6">
        {/* ---- Layers ---- */}
        <ol className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
          {ARCHITECTURE.map((layer, index) => (
            <li key={layer.id} className="flex flex-col bg-card p-6">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-[15px] font-semibold tracking-tight text-foreground">
                  {layer.title}
                </h3>
                <span className="font-mono text-[10px] tabular-nums text-faint">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>

              <p className="mt-1.5 font-mono text-[11px] text-accent">
                {layer.stack}
              </p>

              <ul className="mt-4 flex flex-col gap-2">
                {layer.responsibilities.map((responsibility) => (
                  <li
                    key={responsibility}
                    className="flex items-start gap-2.5 text-[13px] leading-relaxed text-muted-foreground"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-[7px] size-1 shrink-0 rounded-full bg-border-strong"
                    />
                    {responsibility}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>

        {/* ---- Trust boundary ---- */}
        <aside
          id="security"
          className="flex flex-col rounded-lg border border-border bg-card p-6"
        >
          <span className="flex size-9 items-center justify-center rounded-md border border-border bg-surface">
            <Lock aria-hidden="true" className="size-4 text-accent" />
          </span>

          <h3 className="mt-5 text-[15px] font-semibold tracking-tight text-foreground">
            The trust boundary
          </h3>

          <p className="mt-2.5 text-[13px] leading-relaxed text-muted-foreground">
            RepoGuard installs as a GitHub App with read-only repository
            scopes. The installation token is held by the backend and used only
            there.
          </p>

          <dl className="mt-6 flex flex-col gap-4 border-t border-border pt-5">
            <div>
              <dt className="font-mono text-[11px] uppercase tracking-wider text-faint">
                Requested scopes
              </dt>
              <dd className="mt-1.5 font-mono text-xs text-foreground">
                contents:read · metadata:read · pull_requests:read
              </dd>
            </div>

            <div>
              <dt className="font-mono text-[11px] uppercase tracking-wider text-faint">
                Source retention
              </dt>
              <dd className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                Diffs are analysed in memory. Only derived metrics and scores
                are persisted.
              </dd>
            </div>

            <div>
              <dt className="font-mono text-[11px] uppercase tracking-wider text-faint">
                Write access
              </dt>
              <dd className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                None, beyond the optional status check RepoGuard posts back to
                a pull request.
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
