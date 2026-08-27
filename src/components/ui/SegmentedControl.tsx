"use client";

import { cn } from "@/lib/cn";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  label: string;
  /** `panel` sits inside a bordered tray; `buttons` are standalone 40px controls. */
  variant?: "panel" | "buttons";
  className?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  variant = "panel",
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "flex",
        variant === "panel" && "border-border-input rounded-md border bg-white p-[3px]",
        variant === "buttons" && "gap-2",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "cursor-pointer font-sans text-[13px] transition-colors duration-150",
              variant === "panel" && "rounded-xs px-4 py-1.5",
              variant === "buttons" && "h-10 flex-1 rounded-lg border",
              active
                ? cn("bg-navy text-white", variant === "buttons" && "border-navy")
                : cn(
                    "text-ink-muted hover:text-ink",
                    variant === "panel" && "bg-transparent",
                    variant === "buttons" && "border-border-input bg-white",
                  ),
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
