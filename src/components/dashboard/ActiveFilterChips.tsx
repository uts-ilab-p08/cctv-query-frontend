"use client";

import { X } from "lucide-react";

import { cn } from "@/lib/cn";
import { getActiveFilterChips } from "@/lib/filters";
import { useAppStore } from "@/store/useAppStore";
import type { ClipTag } from "@/types";

interface ActiveFilterChipsProps {
  /** `centered` is the dashboard treatment; `inline` sits in the results toolbar. */
  layout?: "centered" | "inline";
  className?: string;
}

export function ActiveFilterChips({ layout = "centered", className }: ActiveFilterChipsProps) {
  const filters = useAppStore((state) => state.filters);
  const toggleCamera = useAppStore((state) => state.toggleCamera);
  const toggleTag = useAppStore((state) => state.toggleTag);

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
            chip.kind === "camera" ? toggleCamera(chip.label) : toggleTag(chip.label as ClipTag)
          }
          className="glass-card-flat text-ink-2 hover:text-ink flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-[5px] font-mono text-xs transition-colors duration-150"
        >
          {chip.label}
          <X size={12} aria-hidden className="text-ink-3" />
        </button>
      ))}
    </div>
  );
}
