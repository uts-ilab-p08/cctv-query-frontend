import { cn } from "@/lib/cn";

interface ProgressBarProps {
  /** Completion percentage, 0-100. */
  value: number;
  label: string;
  className?: string;
}

export function ProgressBar({ value, label, className }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("bg-track h-1.5 overflow-hidden rounded-[3px]", className)}
    >
      <div
        className="surface-brand h-1.5 rounded-[3px] transition-[width] duration-500 ease-out"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
