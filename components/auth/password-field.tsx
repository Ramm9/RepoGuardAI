"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { assessPassword, type PasswordStrength } from "@/lib/validation/auth";

/**
 * PasswordField — the password input with a reveal toggle.
 *
 * Wraps the shared Input primitive rather than restating its border, focus, and
 * invalid-state classes; the only additions are the trailing control and the
 * padding that makes room for it.
 *
 * Props are passed straight through to the underlying input — including `ref` —
 * so the field can be spread with react-hook-form's `register("password")`. The
 * earlier value/onChange:string signature could not be, because RHF's handler
 * reads `event.target.value` from a real event, not a bare string.
 *
 * The toggle is a real button with an accessible name and a pressed state, so it
 * is reachable by keyboard and announced by screen readers.
 */
export function PasswordField({
  className,
  invalid,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "type"> & {
  invalid?: boolean;
}) {
  const [revealed, setRevealed] = React.useState(false);

  return (
    <div className="relative">
      <Input
        type={revealed ? "text" : "password"}
        aria-invalid={invalid || props["aria-invalid"] || undefined}
        className={cn("pr-10", className)}
        {...props}
      />

      <button
        type="button"
        onClick={() => setRevealed((current) => !current)}
        aria-label={revealed ? "Hide password" : "Show password"}
        aria-pressed={revealed}
        className={cn(
          "absolute right-1 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-sm",
          "text-faint transition-colors duration-150",
          "hover:bg-elevated hover:text-foreground",
          "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
        )}
      >
        {revealed ? (
          <EyeOff className="size-3.5" aria-hidden="true" />
        ) : (
          <Eye className="size-3.5" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

/**
 * PasswordStrengthMeter — four segments plus a text label.
 *
 * The label is not decoration. Strength is communicated as a word with the
 * segments as reinforcement, so the meaning survives greyscale and colour
 * blindness — the same principle the risk scale follows everywhere else.
 */
export function PasswordStrengthMeter({ value }: { value: string }) {
  const { score, label, strength } = assessPassword(value);

  return (
    <div className="flex items-center gap-2.5">
      <div className="flex flex-1 gap-1" aria-hidden="true">
        {[0, 1, 2, 3].map((index) => (
          <span
            key={index}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-200",
              index < score ? STRENGTH_BAR[strength] : "bg-border",
            )}
          />
        ))}
      </div>
      <span
        className={cn(
          "w-12 shrink-0 text-right font-mono text-[11px]",
          value ? STRENGTH_TEXT[strength] : "text-faint",
        )}
        // Announce the word on change without re-reading the password field.
        aria-live="polite"
      >
        {label}
      </span>
    </div>
  );
}

const STRENGTH_BAR: Record<PasswordStrength, string> = {
  empty: "bg-border",
  weak: "bg-risk-critical",
  fair: "bg-risk-medium",
  strong: "bg-risk-low",
};

const STRENGTH_TEXT: Record<PasswordStrength, string> = {
  empty: "text-faint",
  weak: "text-risk-critical",
  fair: "text-risk-medium",
  strong: "text-risk-low",
};
