"use client";


import { cn } from "@/lib/utils";

/**
 * TechnicalGrid — the product's background signature.
 *
 * A fine 48px grid with a radial mask so it fades out rather than terminating
 * at a hard edge. Deliberately not a gradient blob: the spec calls for texture
 * that reinforces the engineering identity without competing with content.
 */
export function TechnicalGrid({
  className,
  /** Grid cell size in px. */
  cell = 48,
  /** Adds a soft radial dimming so the grid recedes toward the edges. */
  fade = true,
  /** Renders faint nodes at grid intersections. */
  nodes = false,
}: {
  className?: string;
  cell?: number;
  fade?: boolean;
  nodes?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      style={{
        backgroundImage: [
          `linear-gradient(to right, var(--color-border) 1px, transparent 1px)`,
          `linear-gradient(to bottom, var(--color-border) 1px, transparent 1px)`,
        ].join(", "),
        backgroundSize: `${cell}px ${cell}px`,
        maskImage: fade
          ? "radial-gradient(ellipse 80% 60% at 50% 0%, black 10%, transparent 75%)"
          : undefined,
        opacity: 0.5,
      }}
    >
      {nodes ? (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at center, var(--color-border-strong) 1px, transparent 1.5px)",
            backgroundSize: `${cell * 2}px ${cell * 2}px`,
            backgroundPosition: `${cell}px ${cell}px`,
            opacity: 0.7,
          }}
        />
      ) : null}
    </div>
  );
}

/**
 * NodeField — faint repository-graph nodes and edges.
 *
 * A static SVG layer suggesting commit topology. Coordinates are fixed rather
 * than random so the decoration is identical on server and client render.
 */
export function NodeField({
  className,
  opacity = 0.5,
}: {
  className?: string;
  opacity?: number;
}) {
  return (
    <svg
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 size-full", className)}
      style={{ opacity }}
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 1200 600"
      fill="none"
    >
      {/* Edges first so nodes sit on top. */}
      <g stroke="var(--color-border-strong)" strokeWidth="1">
        <path d="M140 120 L340 200 L540 130" />
        <path d="M340 200 L300 360 L520 430" />
        <path d="M540 130 L760 180 L940 110" />
        <path d="M760 180 L820 350 L1040 400" />
        <path d="M520 430 L700 470 L900 520" />
        <path d="M300 360 L180 470" />
      </g>

      <g fill="var(--color-faint)">
        <circle cx="140" cy="120" r="2.5" />
        <circle cx="340" cy="200" r="3" />
        <circle cx="540" cy="130" r="2.5" />
        <circle cx="760" cy="180" r="3" />
        <circle cx="940" cy="110" r="2.5" />
        <circle cx="300" cy="360" r="2.5" />
        <circle cx="520" cy="430" r="3" />
        <circle cx="820" cy="350" r="2.5" />
        <circle cx="1040" cy="400" r="2.5" />
        <circle cx="700" cy="470" r="2" />
        <circle cx="900" cy="520" r="2.5" />
        <circle cx="180" cy="470" r="2" />
      </g>

      {/* A single accent node: the copy's focal point before results appear. */}
      <circle cx="340" cy="200" r="4" fill="var(--color-accent)" opacity="0.6" />
      <circle
        cx="340"
        cy="200"
        r="10"
        stroke="var(--color-accent)"
        strokeWidth="1"
        opacity="0.3"
      />
    </svg>
  );
}

/**
 * ScanLine — a slow vertical sweep used inside "analysis in progress" panels.
 *
 * Applied only to elements that are genuinely working, so motion in this
 * product always means something is happening.
 */
export function ScanLine({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 h-full overflow-hidden",
        className,
      )}
    >
      <div
        className="h-16 w-full animate-[scan_2.4s_ease-in-out_infinite]"
        style={{
          background:
            "linear-gradient(to bottom, transparent, color-mix(in oklab, var(--color-accent) 12%, transparent), transparent)",
        }}
      />
    </div>
  );
}
