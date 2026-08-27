"use client";

import { useMemo } from "react";

import { QueryAssistant } from "@/components/assistant/QueryAssistant";
import { ClipGrid } from "@/components/results/ClipGrid";
import { ClipTimeline } from "@/components/results/ClipTimeline";
import { ResultsToolbar } from "@/components/results/ResultsToolbar";
import { resultsSuggestedQuestions } from "@/data/suggestedQuestions";
import { getAllClips } from "@/lib/clips";
import { filterClips } from "@/lib/filters";
import { useAppStore } from "@/lib/store";

export function ResultsScreen() {
  const queryText = useAppStore((state) => state.queryText);
  const filters = useAppStore((state) => state.filters);
  const viewMode = useAppStore((state) => state.resultsViewMode);

  const clips = useMemo(() => filterClips(getAllClips(), filters), [filters]);

  return (
    <div className="grid grid-cols-[1fr_360px] items-start gap-[22px] px-8 pt-7 pb-15">
      <section className="min-w-0">
        <p className="text-ink mb-1.5 text-lg">
          &ldquo;<em>{queryText || "All indexed events"}</em>&rdquo;
        </p>

        <ResultsToolbar resultCount={clips.length} />

        {clips.length === 0 ? (
          <p className="text-ink-muted text-[13px]">
            No clips match the current filters. Relax the confidence threshold or clear a chip.
          </p>
        ) : viewMode === "grid" ? (
          <ClipGrid clips={clips} />
        ) : (
          <ClipTimeline clips={clips} />
        )}
      </section>

      <QueryAssistant
        chatKey="results"
        suggestedQuestions={resultsSuggestedQuestions}
        heightClassName="h-[calc(100vh-132px)]"
      />
    </div>
  );
}
