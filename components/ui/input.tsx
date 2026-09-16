import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-9 w-full min-w-0 rounded-md border border-border bg-surface px-3 py-1",
        "text-[13px] text-foreground",
        "transition-[border-color,box-shadow] duration-150",
        "placeholder:text-faint",
        "hover:border-border-strong",
        "focus-visible:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-risk-critical/60 aria-invalid:ring-2 aria-invalid:ring-risk-critical/20",
        "file:mr-3 file:h-7 file:rounded-sm file:border-0 file:bg-elevated file:px-2 file:text-xs file:font-medium file:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-20 w-full rounded-md border border-border bg-surface px-3 py-2",
        "text-[13px] leading-relaxed text-foreground",
        "transition-[border-color,box-shadow] duration-150",
        "placeholder:text-faint",
        "hover:border-border-strong",
        "focus-visible:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "resize-y",
        className,
      )}
      {...props}
    />
  );
}

export { Input, Textarea };
