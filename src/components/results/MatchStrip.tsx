"use client";

import { X } from "lucide-react";

import { MomentCardContent } from "@/components/results/MomentCard";
import type { Clip } from "@/types";

interface MatchStripProps {
  matches: Clip[];
  selectedClipId: string | null;
  onSelect: (clip: Clip) => void;
  onClearSelection: () => void;
}

/** Bottom carousel of matching moments: top-N by confidence, chronologically ordered. */
export function MatchStrip({
  matches,
  selectedClipId,
  onSelect,
  onClearSelection,
}: MatchStripProps) {
  return (
    <div className="border-hairline flex shrink-0 items-stretch gap-3 border-t px-[18px] pt-2 pb-2.5">
      {/* Plain label, deliberately not a card, so it never reads as one of the moments. */}
      <div className="flex w-[184px] shrink-0 flex-col justify-center gap-1.5 pr-1">
        <h2 className="text-ink font-mono text-[11px] leading-[1.3] font-bold tracking-[1px]">
          <span className="block">MATCHING MOMENTS</span>{" "}
          <span className="text-accent-strong">TOP {matches.length}</span>
        </h2>
        <p className="text-ink-3 text-[11px] leading-[1.35]">
          Pick one to play its footage from the match and focus the assistant on that clip.
        </p>
      </div>

      <div className="flex min-w-0 flex-1 items-stretch gap-2.5 overflow-x-auto overflow-y-hidden pb-1.5">
        {matches.map((match) => {
          const active = match.id === selectedClipId;
          const title = match.eventName ?? match.action;
          return (
            // Deselect is a sibling of the card button, not a child: nested buttons are invalid
            // HTML and the click would also re-select the card.
            <div key={match.id} className="relative flex max-w-[320px] min-w-[228px] flex-1">
              <button
                type="button"
                onClick={() => onSelect(match)}
                title={title}
                className="glass-card-flat flex w-full cursor-pointer items-center gap-2.5 rounded-[10px] p-1.5 text-left"
                style={{
                  borderColor: active ? "var(--accent)" : "var(--border)",
                  boxShadow: active ? "var(--shadow-accent)" : "var(--shadow-sm)",
                }}
              >
                <MomentCardContent clip={match} textClassName={active ? "pr-12" : undefined} />
              </button>
              {active ? (
                <button
                  type="button"
                  onClick={onClearSelection}
                  title="Back to all matches"
                  className="bg-panel-strong/70 text-accent-strong border-accent-line absolute top-1.5 right-1.5 flex cursor-pointer items-center gap-0.5 rounded-full border py-[2px] pr-2 pl-1.5 text-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.35)] backdrop-blur-[8px]"
                >
                  <X size={10} strokeWidth={2.4} aria-hidden />
                  Deselect
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
