"use client";

import * as React from "react";

import { useUIStore } from "@/store/ui-store";

/**
 * Is the user currently typing?
 *
 * Single-letter shortcuts must never fire inside a text field, or typing "b" in
 * a search box would collapse the sidebar. Chorded shortcuts (⌘K) are exempt —
 * those are expected to work from anywhere, including from inside the palette's
 * own input.
 */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

/**
 * Global keyboard shortcuts for the workspace.
 *
 * Mounted once by the AppShell rather than per-component, so there is a single
 * keydown listener on the document and one place that defines what each key
 * does. Both ⌘ and Ctrl are accepted so the same build works on macOS and
 * Windows without a platform branch.
 */
export function useKeyboardShortcuts() {
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const toggleCommandPalette = useUIStore((state) => state.toggleCommandPalette);
  const setCommandPaletteOpen = useUIStore(
    (state) => state.setCommandPaletteOpen,
  );

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const chord = event.metaKey || event.ctrlKey;

      // ⌘K — command palette. Works everywhere, including inside inputs.
      if (chord && event.key.toLowerCase() === "k") {
        event.preventDefault();
        toggleCommandPalette();
        return;
      }

      // ⌘B — collapse/expand the sidebar.
      if (chord && event.key.toLowerCase() === "b") {
        event.preventDefault();
        toggleSidebar();
        return;
      }

      // "/" — jump straight to search, the way GitHub does it.
      if (event.key === "/" && !chord && !isEditableTarget(event.target)) {
        event.preventDefault();
        setCommandPaletteOpen(true);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [toggleSidebar, toggleCommandPalette, setCommandPaletteOpen]);
}
