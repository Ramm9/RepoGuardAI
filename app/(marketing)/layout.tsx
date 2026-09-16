import * as React from "react";

import { MarketingFooter, MarketingNavbar } from "@/components/layout/navbar";

/**
 * Public site layout.
 *
 * The navbar is fixed so it can sit transparent over the hero, which means the
 * content column owns the top offset rather than the header.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <MarketingNavbar />
      <main id="main" className="flex-1 pt-16">
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
}
