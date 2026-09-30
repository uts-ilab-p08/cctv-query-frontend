import { Loader2 } from "lucide-react";

import { TOP_MATCH_COUNT } from "@/lib/matches";

/** The player's place while the RAG searches: the dark stage, its chips and control bar. */
export function VideoStageSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading footage"
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <div aria-hidden className="relative flex-1">
        <div className="bg-video-bar absolute inset-0 animate-pulse">
          <span className="absolute top-3 left-3 h-[22px] w-16 rounded-md bg-white/10" />
          <span className="absolute top-3 right-3 h-[22px] w-12 rounded-md bg-white/10" />
        </div>
        {/* Outside the pulsing layer, so it stays solid — like a video's buffering spinner. */}
        <span className="absolute inset-0 flex items-center justify-center text-white/60">
          <Loader2 size={40} strokeWidth={1.8} className="animate-spin" />
        </span>
      </div>
      <div
        aria-hidden
        className="border-hairline flex h-[52px] shrink-0 items-center gap-3 border-t px-4"
      >
        <span className="bg-ink-3/20 size-7 rounded-full" />
        <span className="bg-ink-3/15 h-1 flex-1 rounded-full" />
        <span className="bg-ink-3/15 h-3 w-16 rounded-full" />
      </div>
    </div>
  );
}

/** Placeholder cards in the Matching Moments strip, shaped like `MomentCardContent`. */
export function MatchStripSkeleton() {
  return (
    <div className="border-hairline flex shrink-0 items-stretch gap-3 border-t px-[18px] pt-2 pb-2.5">
      <div className="flex w-[184px] shrink-0 flex-col justify-center gap-1.5 pr-1">
        <h2 className="text-ink font-mono text-[11px] leading-[1.3] font-bold tracking-[1px]">
          <span className="block">MATCHING MOMENTS</span>{" "}
          <span className="text-ink-3">SEARCHING…</span>
        </h2>
        <p className="text-ink-3 text-[11px] leading-[1.35]">
          The moments that best match your query will appear here.
        </p>
      </div>

      <div
        role="status"
        aria-label="Loading matching moments"
        className="flex min-w-0 flex-1 items-stretch gap-2.5 overflow-hidden pb-1.5"
      >
        {Array.from({ length: Math.min(TOP_MATCH_COUNT, 5) }, (_, index) => (
          <div
            key={index}
            aria-hidden
            className="glass-card-flat flex max-w-[320px] min-w-[228px] flex-1 animate-pulse items-center gap-2.5 rounded-[10px] p-1.5"
          >
            <span className="bg-video-bar h-[60px] w-[92px] shrink-0 rounded-md" />
            <span className="flex flex-1 flex-col gap-1.5 pr-1">
              <span className="bg-ink-3/20 h-3 w-4/5 rounded-full" />
              <span className="bg-ink-3/15 h-2.5 w-1/2 rounded-full" />
              <span className="bg-ink-3/15 h-2.5 w-1/3 rounded-full" />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
