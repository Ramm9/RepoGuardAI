import Link from "next/link";
import type { Metadata } from "next";

import { RepoGuardLogo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/container";

export const metadata: Metadata = { title: "Page not found" };

/**
 * not-found — a 404 that keeps the user oriented.
 *
 * Rather than a dead end, it restates the product's information architecture
 * and offers the two routes that actually recover the visit.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="flex h-16 items-center px-6">
        <RepoGuardLogo size={22} />
      </header>

      <main className="flex flex-1 items-center">
        <Container>
          <div className="mx-auto max-w-lg py-20">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">
              404 · Not found
            </p>

            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              That route doesn&apos;t resolve.
            </h1>

            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              The page you requested isn&apos;t part of RepoGuard, or the
              resource it pointed at has been removed from the repository.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-2">
              <Button variant="primary" size="md" asChild>
                <Link href="/app">Go to dashboard</Link>
              </Button>
              <Button variant="outline" size="md" asChild>
                <Link href="/">Back to home</Link>
              </Button>
            </div>
          </div>
        </Container>
      </main>
    </div>
  );
}
