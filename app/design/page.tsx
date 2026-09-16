import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { BadgesSection } from "@/components/design/sections/badges-section";
import { Button } from "@/components/ui/button";
import { ButtonsSection } from "@/components/design/sections/buttons-section";
import { ColourSection } from "@/components/design/sections/colour-section";
import { DataSection } from "@/components/design/sections/data-section";
import { FormsSection } from "@/components/design/sections/forms-section";
import { LayoutSection } from "@/components/design/sections/layout-section";
import { OverlaysSection } from "@/components/design/sections/overlays-section";
import { RepoGuardLogo } from "@/components/layout/logo";
import { RiskSection } from "@/components/design/sections/risk-section";
import { ScoresSection } from "@/components/design/sections/scores-section";
import { SectionRail } from "@/components/design/section-rail";
import { StatesSection } from "@/components/design/sections/states-section";
import { TypographySection } from "@/components/design/sections/typography-section";
import { UtilitiesSection } from "@/components/design/sections/utilities-section";
import { DESIGN_SECTIONS } from "@/components/design/manifest";

export const metadata: Metadata = {
  title: "Design system · RepoGuard",
  description:
    "The tokens, primitives, and rules every RepoGuard surface is built from.",
  robots: { index: false, follow: false },
};

/**
 * The design system sheet.
 *
 * This is a working reference, not a showcase: it is where a component's states
 * are checked side by side before it is composed into a product screen. It is
 * deliberately a server component that renders client sections — only the
 * sections needing interactivity (forms, data, overlays, states, utilities, and
 * the rail) carry "use client".
 *
 * Section identity comes from the manifest, so this file only decides order and
 * page chrome. Adding a section means adding a manifest entry and a module —
 * never editing a monolith.
 */
export default function DesignSystemPage() {
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="sticky top-0 z-40 border-b border-border bg-canvas/85 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <RepoGuardLogo size={20} />
            <span
              aria-hidden="true"
              className="hidden h-4 w-px bg-border sm:block"
            />
            <span className="hidden truncate font-mono text-[11px] uppercase tracking-[0.12em] text-faint sm:block">
              Design system
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden font-mono text-[11px] text-faint md:block">
              {DESIGN_SECTIONS.length} sections
            </span>
            <Button variant="outline" size="sm" asChild>
              <Link href="/app">
                <ArrowLeft aria-hidden="true" />
                Back to app
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6 sm:py-14">
        <div className="max-w-3xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-accent">
            Reference
          </p>
          <h1 className="mt-4 text-[2.125rem] font-semibold leading-[1.08] tracking-[-0.02em] text-foreground">
            The system every RepoGuard surface is built from.
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground">
            Tokens, primitives, and the rules that govern them. Each specimen
            below is the real component rendered with real props — not a picture
            of one — so a regression shows up here before it reaches a product
            screen.
          </p>
          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4 border-t border-border pt-6">
            {[
              { term: "Base", detail: "8px spacing · 4-level risk scale" },
              { term: "Type", detail: "Geist · JetBrains Mono" },
              { term: "Theme", detail: "Dark only, no light variant" },
            ].map((entry) => (
              <div key={entry.term}>
                <dt className="text-[11px] font-medium uppercase tracking-wider text-faint">
                  {entry.term}
                </dt>
                <dd className="mt-1.5 font-mono text-xs text-muted-foreground">
                  {entry.detail}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-14 grid gap-10 xl:grid-cols-[200px_minmax(0,1fr)] xl:gap-12">
          {/* Hidden below xl: on narrow screens the sheet reads as one
              continuous document rather than a cramped two-column layout. */}
          <div className="hidden xl:block">
            <SectionRail />
          </div>

          <div className="flex min-w-0 flex-col gap-14">
            <ColourSection />
            <TypographySection />
            <LayoutSection />
            <RiskSection />
            <ScoresSection />
            <ButtonsSection />
            <BadgesSection />
            <FormsSection />
            <DataSection />
            <OverlaysSection />
            <StatesSection />
            <UtilitiesSection />
          </div>
        </div>

        <footer className="mt-20 border-t border-border pt-8">
          <p className="font-mono text-[11px] leading-relaxed text-faint">
            Phase 1 · design system and primitives. Components are hand-written
            against Radix primitives; tokens are declared in app/globals.css.
          </p>
        </footer>
      </main>
    </div>
  );
}
