import { cn } from "@/lib/cn";

interface QueryListSkeletonProps {
  /** Announced to screen readers, e.g. "Loading saved queries". */
  label: string;
  rows?: number;
  /** Rows with a second line of metadata and room for actions, like Saved Queries. */
  detailed?: boolean;
  className?: string;
}

/**
 * Placeholder rows shaped like the query lists (Recent and Saved Queries) while
 * they load. The backend can take a while to answer, especially on a cold start,
 * so this holds the list's place instead of leaving it blank.
 */
export function QueryListSkeleton({
  label,
  rows = 3,
  detailed = false,
  className,
}: QueryListSkeletonProps) {
  return (
    <div role="status" aria-label={label} className={cn("flex flex-col", className)}>
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          aria-hidden
          className={cn(
            "rounded-card glass-card-flat flex animate-pulse items-center justify-between",
            detailed ? "px-[18px] py-4" : "px-4 py-3.5",
          )}
        >
          <div className="flex flex-col gap-2">
            <span className="bg-ink-3/20 block h-3.5 w-56 max-w-[50vw] rounded-full" />
            {detailed ? <span className="bg-ink-3/15 block h-3 w-40 rounded-full" /> : null}
          </div>
          <span
            className={cn(
              "bg-ink-3/15 block shrink-0 rounded-full",
              detailed ? "h-9 w-24" : "h-3 w-14",
            )}
          />
        </div>
      ))}
    </div>
  );
}
