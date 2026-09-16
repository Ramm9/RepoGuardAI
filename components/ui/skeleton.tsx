import { cn } from "@/lib/utils";

/**
 * Skeleton — the loading primitive.
 *
 * Deliberately not a spinner. Every list, table, and chart in the product has a
 * shaped placeholder that matches the size of what is arriving, so the layout
 * never reflows when data lands.
 */
function Skeleton({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("skeleton-fill rounded-sm", className)}
      {...props}
    />
  );
}

/** A run of text lines with a shortened final line. */
function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn("h-3", index === lines - 1 ? "w-2/5" : "w-full")}
        />
      ))}
    </div>
  );
}

export { Skeleton, SkeletonText };
