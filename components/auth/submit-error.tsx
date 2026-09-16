import { AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * SubmitError — the form-level failure banner.
 *
 * Distinct from the per-field `FieldError` in components/ui/label.tsx: this is
 * for whole-request failures — bad credentials, a 500, an unreachable API —
 * where there is no single field to attach the message to. It is role="alert"
 * so a failed sign-in is announced rather than silently colouring the button.
 */
export function SubmitError({
  message,
  className,
}: {
  message: string | null;
  className?: string;
}) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2.5 rounded-md border border-risk-critical/35 bg-risk-critical/10 px-3 py-2.5",
        className,
      )}
    >
      <AlertCircle
        className="mt-px size-4 shrink-0 text-risk-critical"
        aria-hidden="true"
      />
      <p className="text-[13px] leading-relaxed text-foreground">{message}</p>
    </div>
  );
}
