"use client";

import { X } from "lucide-react";

import { cn } from "@/lib/cn";
import { getActiveFilterChips } from "@/lib/filters";
import { useAppStore } from "@/lib/store";
import type { ClipTag } from "@/types";

interface ActiveFilterChipsProps {
  /** `centered` is the dashboard treatment; `inline` sits in the results toolbar. */
  layout?: "centered" | "inline";
  className?: string;
}

export function ActiveFilterChips({ layout = "centered", className }: ActiveFilterChipsProps) {
  const filters = useAppStore((state) => state.filters);
  const toggleCameraFilter = useAppStore((state) => state.toggleCameraFilter);
  const toggleTagFilter = useAppStore((state) => state.toggleTagFilter);

  const chips = getActiveFilterChips(filters);
  if (chips.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap gap-2",
        layout === "centered" && "mt-[18px] justify-center",
        className,
      )}
    >
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          aria-label={`Remove filter ${chip.label}`}
          onClick={() =>
            chip.kind === "camera"
              ? toggleCameraFilter(chip.label)
              : toggleTagFilter(chip.label as ClipTag)
          }
          className={cn(
            "text-ink-muted hover:text-ink flex cursor-pointer items-center gap-1.5 rounded-[14px] border px-2.5 py-[5px] font-mono text-xs transition-colors duration-150",
            layout === "centered" ? "border-border bg-white/70" : "border-border-input bg-white",
          )}
        >
          {chip.label}
          <X size={12} aria-hidden className="text-ink-subtle" />
        </button>
      ))}
    </div>
  );
}
