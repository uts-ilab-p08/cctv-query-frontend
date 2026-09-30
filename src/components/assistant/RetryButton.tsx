import { RotateCcw } from "lucide-react";

import { cn } from "@/lib/cn";

interface RetryButtonProps {
  onRetry: () => void;
  className?: string;
}

/** Under a failed answer: asks the same question again (see the store's `retryLast`). */
export function RetryButton({ onRetry, className }: RetryButtonProps) {
  return (
    <button
      type="button"
      onClick={onRetry}
      className={cn(
        "border-hairline text-ink-2 hover:border-accent-line hover:text-ink inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] transition-colors duration-150",
        className,
      )}
    >
      <RotateCcw size={12} strokeWidth={2.2} aria-hidden />
      Retry
    </button>
  );
}
