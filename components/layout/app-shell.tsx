"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { useSidebarCollapsed } from "@/store/ui-store";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import {
  Sidebar,
  SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_COLLAPSED,
} from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";

/**
 * AppShell — the authenticated workspace frame.
 *
 * The sidebar is `position: fixed` rather than a flex child, because that lets
 * the main column scroll independently while the rail stays put, and it avoids
 * the layout thrash that animated width changes cause in a flex row. The main
 * column therefore carries a matching left offset.
 *
 * That offset is driven by a CSS variable rather than by two conditional
 * padding classes, so there is exactly one number describing the rail's width
 * and the rail and the content can never disagree about it.
 */
export function AppShell({
  children,
  repositories = [],
  alertCount = 0,
}: {
  children: React.ReactNode;
  repositories?: { id: string; name: string }[];
  alertCount?: number;
}) {
  // Read from the store, not from a prop: the collapse toggle lives in the
  // sidebar, so a static prop would leave the content column behind.
  const collapsed = useSidebarCollapsed();

  useKeyboardShortcuts();

  return (
    <div
      className="min-h-dvh bg-canvas"
      style={
        {
          "--sidebar-offset": `${
            collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH
          }px`,
        } as React.CSSProperties
      }
    >
      <Sidebar alertCount={alertCount} />

      <div
        className={cn(
          "flex min-h-dvh flex-col",
          "transition-[padding-left] duration-200 ease-out",
          "md:pl-[var(--sidebar-offset)]",
        )}
      >
        <TopBar repositories={repositories} alertCount={alertCount} />

        <main id="main" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
