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
        variant === "panel" && "rounded-pill border-hairline bg-panel gap-0.5 border p-0.5",
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
              variant === "panel" && "rounded-pill px-4 py-1.5",
              variant === "buttons" && "rounded-chip h-10 flex-1 border",
              active
                ? cn("bg-action shadow-action", variant === "buttons" && "border-transparent")
                : cn(
                    "text-ink-2 hover:text-ink",
                    variant === "panel" && "bg-transparent",
                    variant === "buttons" && "border-hairline-strong bg-panel",
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
