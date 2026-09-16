"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { DESIGN_SECTIONS } from "@/components/design/manifest";

/**
 * The sheet's navigation rail.
 *
 * Active-section tracking uses IntersectionObserver against a band near the top
 * of the viewport rather than a scroll listener, so it costs nothing on the main
 * thread while scrolling. The rail is hidden below xl — on narrow screens the
 * sheet reads as one continuous document, which is the right behaviour for a
 * reference rather than a cramped sidebar.
 */
export function SectionRail() {
  const [active, setActive] = React.useState(DESIGN_SECTIONS[0].id);

  React.useEffect(() => {
    const sections = DESIGN_SECTIONS.map((section) =>
      document.getElementById(section.id),
    ).filter((element): element is HTMLElement => element !== null);

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Among everything currently intersecting the band, take the one
        // closest to the top — that is what the reader is actually looking at.
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
          );

        if (visible.length > 0) setActive(visible[0].target.id);
      },
      // A band from just under the header down to 60% of the viewport.
      { rootMargin: "-72px 0px -40% 0px", threshold: 0 },
    );

    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <nav aria-label="Design system sections" className="sticky top-20">
      <p className="px-3 font-mono text-[11px] uppercase tracking-[0.12em] text-faint">
        Contents
      </p>
      <ul className="mt-3 flex flex-col">
        {DESIGN_SECTIONS.map((section) => {
          const isActive = section.id === active;
          return (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "flex items-baseline gap-3 rounded-md px-3 py-1.5",
                  "text-[13px] transition-colors duration-150",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                  isActive
                    ? "bg-elevated text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "font-mono text-[11px] tabular-nums",
                    isActive ? "text-accent" : "text-faint",
                  )}
                >
                  {section.index}
                </span>
                <span className="min-w-0 truncate">{section.title}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
