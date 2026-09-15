"use client";

import { SlidersHorizontal } from "lucide-react";

import { ActiveFilterChips } from "@/components/dashboard/ActiveFilterChips";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useAppStore } from "@/store/useAppStore";
import type { ResultsMode } from "@/types";

const viewOptions = [
  { value: "grid" as const, label: "Grid" },
  { value: "timeline" as const, label: "Timeline" },
];

interface ResultsToolbarProps {
  resultCount: number;
}

export function ResultsToolbar({ resultCount }: ResultsToolbarProps) {
  const viewMode = useAppStore((state) => state.resultsMode);
  const setResultsMode = useAppStore((state) => state.setResultsMode);
  const openFilters = useAppStore((state) => state.openFilters);

  return (
    <div className="mb-[22px] flex flex-wrap items-center justify-between gap-3.5">
      <div className="flex flex-wrap items-center gap-2.5">
        <p className="text-ink-2 text-[13px]">{resultCount} matches</p>
        <ActiveFilterChips layout="inline" />
      </div>

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={openFilters}
          aria-label="Filters"
          className="border-hairline-strong bg-panel text-ink-2 hover:text-ink glass flex size-11 cursor-pointer items-center justify-center rounded-full border transition-colors duration-150"
        >
          <SlidersHorizontal size={19} strokeWidth={2} aria-hidden />
        </button>
        <SegmentedControl<ResultsMode>
          label="Results view"
          options={viewOptions}
          value={viewMode}
          onChange={setResultsMode}
        />
      </div>
    </div>
  );
}
