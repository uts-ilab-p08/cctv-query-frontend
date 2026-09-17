"use client";

import { confidenceVar } from "@/components/results/confidence";
import { getThumbUrl } from "@/lib/clips";
import type { Clip } from "@/types";

interface MatchStripProps {
  matches: Clip[];
  selectedClipId: number | null;
  hasSelection: boolean;
  onSelect: (clip: Clip) => void;
  onClearSelection: () => void;
}

/** Bottom carousel of matching moments: top-N by confidence, chronologically ordered. */
export function MatchStrip({
  matches,
  selectedClipId,
  hasSelection,
  onSelect,
  onClearSelection,
}: MatchStripProps) {
  return (
    <div className="border-hairline flex shrink-0 items-stretch gap-3 border-t px-[18px] pt-2 pb-2.5">
      <div className="flex w-[92px] shrink-0 flex-col justify-center gap-1">
        <div className="text-ink-3 font-mono text-[10px] leading-[1.25] tracking-[1px]">
          MATCHING
          <br />
          MOMENTS
          <br />
          TOP {matches.length}
        </div>
        {hasSelection ? (
          <button
            type="button"
            onClick={onClearSelection}
            className="text-accent text-left text-[10px]"
          >
            clear
          </button>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 items-start gap-2.5 overflow-x-auto overflow-y-hidden pb-1.5">
        {matches.map((match) => {
          const active = match.id === selectedClipId;
          return (
            <button
              key={match.id}
              type="button"
              onClick={() => onSelect(match)}
              className="bg-panel w-[140px] shrink-0 overflow-hidden rounded-[10px] border text-left"
              style={{
                borderColor: active ? "var(--accent)" : "var(--border)",
                boxShadow: active ? "var(--shadow-accent)" : "var(--shadow-sm)",
              }}
            >
              <div className="relative h-14 shrink-0">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${getThumbUrl(match)})`,
                    filter: "grayscale(0.55) contrast(1.05) brightness(0.82)",
                  }}
                />
                <span className="absolute top-1.5 left-1.5 rounded bg-[rgba(12,15,19,0.80)] px-1.5 py-[2px] font-mono text-[10px] text-white">
                  {match.camera}
                </span>
                <span
                  className="absolute right-1.5 bottom-1.5 rounded bg-[rgba(12,15,19,0.80)] px-1.5 py-[2px] font-mono text-[10px]"
                  style={{ color: confidenceVar(match.confidence) }}
                >
                  {match.confidence}%
                </span>
              </div>
              <div className="px-2 py-[5px]">
                <div className="text-ink truncate text-[12px] font-semibold">{match.action}</div>
                <div className="text-ink-3 font-mono text-[10px] leading-[1.3]">{match.ts}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
