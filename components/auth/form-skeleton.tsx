import { Skeleton } from "@/components/ui/skeleton";

/**
 * FormSkeleton — the Suspense fallback for the auth forms.
 *
 * Shaped to the real form's dimensions rather than shown as a spinner, so the
 * column does not resize when the client component hydrates. Same rule the rest
 * of the product follows: a placeholder is the size of the thing it replaces.
 */
export function FormSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-full" />
      </div>

      <Skeleton className="h-10 w-full rounded-md" />
      <Skeleton className="h-3 w-3/4" />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
        <Skeleton className="mt-1 h-10 w-full rounded-md" />
      </div>
    </div>
  );
}
