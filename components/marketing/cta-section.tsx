import Link from "next/link";
import { ArrowRight, Github } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/container";
import { TechnicalGrid } from "@/components/layout/technical-grid";

/**
 * Closing call to action.
 *
 * One action, stated plainly. The grid returns here to bookend the hero, which
 * closes the page on the same visual note it opened with.
 */
export function CtaSection() {
  return (
    <section className="relative overflow-hidden border-t border-border">
      <TechnicalGrid />

      <Container className="relative">
        <div className="flex flex-col items-center py-24 text-center sm:py-32">
          <h2 className="max-w-2xl text-2xl font-semibold leading-[1.15] tracking-tight text-foreground sm:text-3xl lg:text-[2.5rem]">
            Find out which commits are about to cost you a weekend.
          </h2>

          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            Connect a repository and RepoGuard scores its history on the first
            pass, so the dashboard has something to show before the next commit
            lands.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Button variant="primary" size="lg" asChild>
              <Link href="/signup">
                <Github aria-hidden="true" />
                Connect GitHub
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/app">
                View the dashboard
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>

          <p className="mt-6 font-mono text-[11px] text-faint">
            Read-only access · No CI configuration · No source code retained
          </p>
        </div>
      </Container>
    </section>
  );
}
