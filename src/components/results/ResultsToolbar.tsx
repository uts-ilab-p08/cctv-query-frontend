"use client";

import { ActiveFilterChips } from "@/components/dashboard/ActiveFilterChips";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useAppStore } from "@/lib/store";
import type { ResultsViewMode } from "@/types";

const viewOptions = [
  { value: "grid" as const, label: "Grid" },
  { value: "timeline" as const, label: "Timeline" },
];

interface ResultsToolbarProps {
  resultCount: number;
}

export function ResultsToolbar({ resultCount }: ResultsToolbarProps) {
  const viewMode = useAppStore((state) => state.resultsViewMode);
  const setResultsViewMode = useAppStore((state) => state.setResultsViewMode);
  const setOpenModal = useAppStore((state) => state.setOpenModal);

  return (
    <div className="mb-[22px] flex flex-wrap items-center justify-between gap-3.5">
      <div className="flex flex-wrap items-center gap-2.5">
        <p className="text-ink-muted text-[13px]">{resultCount} matches</p>
        <ActiveFilterChips layout="inline" />
      </div>

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => setOpenModal("filters")}
          className="border-border-input text-ink-muted hover:text-ink h-9 cursor-pointer rounded-md border bg-white px-4 font-sans text-[13px] transition-colors duration-150"
        >
          Filters
        </button>
        <SegmentedControl<ResultsViewMode>
          label="Results view"
          options={viewOptions}
          value={viewMode}
          onChange={setResultsViewMode}
        />
      </div>
    </div>
  );
}
