"use client";

import * as React from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import { STORAGE_KEYS } from "@/lib/api/config";
import type { TimeRange } from "@/types";

/**
 * UI-only client state.
 *
 * The rule this store exists to enforce: server data belongs to TanStack Query,
 * and the Zustand store holds only things the server has no opinion about —
 * which panels are open, what the user last searched for, which time window
 * they prefer. Nothing here is ever a cache of API data.
 */

interface UIState {
  /** Sidebar is collapsed to icons on desktop. */
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  /** Mobile navigation drawer. */
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;

  /** Command palette. */
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;

  /** Global search popover (distinct from the palette). */
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;

  /** Recently executed searches, newest first. */
  recentSearches: string[];
  pushRecentSearch: (term: string) => void;
  clearRecentSearches: () => void;

  /** Default time window for every time-series surface. */
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;

  /** Repository currently scoped in the top bar. */
  activeRepositoryId: string | null;
  setActiveRepositoryId: (id: string | null) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),

      mobileNavOpen: false,
      setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),

      commandPaletteOpen: false,
      setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
      toggleCommandPalette: () =>
        set({ commandPaletteOpen: !get().commandPaletteOpen }),

      searchOpen: false,
      setSearchOpen: (searchOpen) => set({ searchOpen }),

      recentSearches: [],
      pushRecentSearch: (term) => {
        const trimmed = term.trim();
        if (trimmed.length < 2) return;
        const existing = get().recentSearches.filter((item) => item !== trimmed);
        set({ recentSearches: [trimmed, ...existing].slice(0, 6) });
      },
      clearRecentSearches: () => set({ recentSearches: [] }),

      timeRange: "30d",
      setTimeRange: (timeRange) => set({ timeRange }),

      activeRepositoryId: null,
      setActiveRepositoryId: (activeRepositoryId) => set({ activeRepositoryId }),
    }),
    {
      name: STORAGE_KEYS.ui,
      // Persist preferences only. Transient open/closed flags must not restore
      // state on reload — a command palette that reopens itself is a bug.
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        recentSearches: state.recentSearches,
        timeRange: state.timeRange,
        activeRepositoryId: state.activeRepositoryId,
      }),
    },
  ),
);

/**
 * Read `sidebarCollapsed` in a way that is safe to render on the server.
 *
 * `persist` rehydrates from localStorage on the client, so a user whose sidebar
 * is collapsed would produce different markup than the server rendered and
 * React would report a hydration mismatch. This returns the server's value
 * (expanded) for the first client render, then the real preference immediately
 * after mount — so the offset and the rail always agree, and every consumer
 * flips on the same tick rather than each solving it separately.
 */
export function useSidebarCollapsed(): boolean {
  const collapsed = useUIStore((state) => state.sidebarCollapsed);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return mounted ? collapsed : false;
}
