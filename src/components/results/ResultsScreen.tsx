"use client";

import { useMemo } from "react";

import { QueryAssistant } from "@/components/assistant/QueryAssistant";
import { QueryField } from "@/components/query/QueryField";
import { ClipGrid } from "@/components/results/ClipGrid";
import { ClipTimeline } from "@/components/results/ClipTimeline";
import { QueryOverview } from "@/components/results/QueryOverview";
import { ResultsToolbar } from "@/components/results/ResultsToolbar";
import { resultsSuggestedQuestions } from "@/data/suggestedQuestions";
import { summarizeResults } from "@/lib/assistant";
import { getAllClips } from "@/lib/clips";
import { cn } from "@/lib/cn";
import { filterClips } from "@/lib/filters";
import { useAppStore } from "@/store/useAppStore";

export function ResultsScreen() {
  const query = useAppStore((state) => state.query);
  const filters = useAppStore((state) => state.filters);
  const viewMode = useAppStore((state) => state.resultsMode);
  const chatOpen = useAppStore((state) => state.chatOpen);
  const runSearch = useAppStore((state) => state.runSearch);

  const clips = useMemo(() => filterClips(getAllClips(), filters), [filters]);
  const summary = useMemo(
    () => summarizeResults(clips, query || "all indexed events"),
    [clips, query],
  );

  return (
    <div
      className={cn(
        "pt-7 pb-15 pl-8 transition-[padding] duration-200",
        // SPEC §6 — the floating panel is fixed, so the content reserves space
        // for it only while it is open.
        chatOpen ? "pr-[412px]" : "pr-8",
      )}
    >
      <section className="min-w-0">
        <div className="mb-[22px]">
          <QueryField variant="compact" onSubmit={() => runSearch(query)} />
        </div>

        <QueryOverview summary={summary} />

        <ResultsToolbar resultCount={clips.length} />

        {clips.length === 0 ? (
          <p className="text-ink-2 text-[13px]">
            No clips match the current filters. Relax the confidence threshold or clear a chip.
          </p>
        ) : viewMode === "grid" ? (
          <ClipGrid clips={clips} />
        ) : (
          <ClipTimeline clips={clips} />
        )}
      </section>

      <QueryAssistant chatKey="results" suggestedQuestions={resultsSuggestedQuestions} />
    </div>
  );
}
