"use client";

import * as React from "react";
import { motion, useInView, useReducedMotion } from "motion/react";

import { cn, riskColor, riskLevelFromScore } from "@/lib/utils";

/**
 * ProgressRing — the product's health gauge.
 *
 * A restrained SVG gauge rather than a chart library shape: a single track, a
 * single value arc with a round cap, and an optional secondary "expected"
 * arc. The arc draws itself once when scrolled into view, and the whole thing
 * degrades to a static ring when the user prefers reduced motion.
 */
export interface ProgressRingProps {
  /** 0–100. */
  value: number;
  size?: number;
  /** Stroke width in px. Scales with `size` unless set explicitly. */
  thickness?: number;
  /** Ring colour. Defaults to the accent; pass `riskColor(score)` for risk. */
  color?: string;
  /** Tint the arc by the risk scale instead of the accent. */
  riskAware?: boolean;
  /** Content rendered in the centre of the ring. */
  children?: React.ReactNode;
  className?: string;
  /** Animate the arc on mount / scroll-into-view. */
  animated?: boolean;
  /** Accessible description; the ring is otherwise decorative. */
  label?: string;
}

export function ProgressRing({
  value,
  size = 160,
  thickness,
  color,
  riskAware = false,
  children,
  className,
  animated = true,
  label,
}: ProgressRingProps) {
  const ref = React.useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduceMotion = useReducedMotion();

  const stroke = thickness ?? Math.max(4, Math.round(size * 0.055));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const clamped = Math.min(100, Math.max(0, value));
  const targetOffset = circumference * (1 - clamped / 100);

  const strokeColor = color ?? (riskAware ? riskColor(clamped) : "var(--color-accent)");
  const shouldAnimate = animated && !reduceMotion;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      // The visible number is the real content; the arc is a redundant cue.
      role="img"
      aria-label={label ?? `${clamped} out of 100`}
    >
      <svg
        ref={ref}
        width={size}
        height={size}
        // Rotate so the arc begins at 12 o'clock.
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={shouldAnimate ? { strokeDashoffset: circumference } : false}
          animate={
            shouldAnimate
              ? { strokeDashoffset: inView ? targetOffset : circumference }
              : { strokeDashoffset: targetOffset }
          }
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}

/**
 * AnimatedNumber — counts up to a value once in view.
 *
 * Used for the large health score and KPI figures. Tabular figures are
 * mandatory here: without them the number visibly jitters as digits change.
 */
export function AnimatedNumber({
  value,
  duration = 1,
  decimals = 0,
  className,
  suffix,
  prefix,
}: {
  value: number;
  duration?: number;
  decimals?: number;
  className?: string;
  suffix?: string;
  prefix?: string;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20px" });
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = React.useState(reduceMotion ? value : 0);

  React.useEffect(() => {
    if (reduceMotion) {
      setDisplay(value);
      return;
    }
    if (!inView) return;

    let frame = 0;
    const start = performance.now();
    const from = 0;
    const delta = value - from;

    const tick = (now: number) => {
      const elapsed = (now - start) / 1000;
      const progress = Math.min(1, elapsed / duration);
      // Ease-out cubic: fast start, settled finish.
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + delta * eased);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, value, duration, reduceMotion]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {prefix}
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/**
 * HealthScore — signature visual #1.
 *
 * The large circular reliability score, with the composite ring plus a compact
 * legend of the five weighted components beside it.
 */
export function HealthScore({
  score,
  breakdown,
  size = 176,
  className,
  caption,
}: {
  score: number;
  breakdown?: { label: string; score: number }[];
  size?: number;
  className?: string;
  caption?: string;
}) {
  const level = riskLevelFromScore(100 - score);

  return (
    <div className={cn("flex flex-wrap items-center gap-8", className)}>
      <ProgressRing
        value={score}
        size={size}
        color="var(--color-accent)"
        label={`Repository health ${score} out of 100`}
      >
        <div className="flex flex-col items-center">
          <AnimatedNumber
            value={score}
            duration={1.2}
            className="font-mono text-4xl font-semibold leading-none tracking-tighter text-foreground"
          />
          <span className="mt-1 font-mono text-xs text-faint">/ 100</span>
        </div>
      </ProgressRing>

      {breakdown?.length ? (
        <div className="min-w-[13rem] flex-1">
          <dl className="flex flex-col gap-3">
            {breakdown.map((component) => (
              <div key={component.label} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-[13px] text-muted-foreground">
                    {component.label}
                  </dt>
                  <dd className="font-mono text-[13px] font-medium tabular-nums text-foreground">
                    {component.score}
                  </dd>
                </div>
                <div
                  className="h-1 w-full overflow-hidden rounded-full bg-elevated"
                  role="presentation"
                >
                  <motion.div
                    className="h-full rounded-full bg-accent/70"
                    initial={{ width: 0 }}
                    whileInView={{ width: `${component.score}%` }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              </div>
            ))}
          </dl>
          {caption ? (
            <p className="mt-4 text-xs leading-relaxed text-faint">{caption}</p>
          ) : null}
        </div>
      ) : null}

      <span className="sr-only">
        Composite health score {score} of 100, classified{" "}
        {level === "low" ? "healthy" : level === "medium" ? "fair" : "at risk"}.
      </span>
    </div>
  );
}
