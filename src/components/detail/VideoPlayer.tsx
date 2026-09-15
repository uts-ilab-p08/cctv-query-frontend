"use client";

import { Play } from "lucide-react";
import { useState } from "react";

import { getThumbUrl } from "@/lib/clips";
import type { Clip } from "@/types";

interface VideoPlayerProps {
  clip: Clip;
}

/** Static preview stand-in — a real deployment renders the archived stream here. */
export function VideoPlayer({ clip }: VideoPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const thumb = getThumbUrl(clip);

  return (
    <div className="rounded-card glass-card overflow-hidden">
      <div className="relative flex aspect-video items-center justify-center">
        <div
          aria-hidden
          className="thumb-filter absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${thumb})` }}
        />

        <span className="bg-panel-solid text-ink absolute top-3.5 left-3.5 z-1 max-w-[45%] truncate rounded-lg px-[9px] py-1 font-mono text-[11px]">
          {clip.camera}
        </span>
        <span className="bg-panel-solid text-ink absolute top-3.5 right-3.5 z-1 max-w-[45%] truncate rounded-lg px-[9px] py-1 font-mono text-[11px]">
          {clip.date} · {clip.ts}
        </span>

        <button
          type="button"
          onClick={() => setPlaying((value) => !value)}
          aria-label={playing ? "Pause clip" : "Play clip"}
          className="surface-action shadow-action z-1 flex size-15 cursor-pointer items-center justify-center rounded-full"
        >
          <Play size={22} aria-hidden fill="currentColor" />
        </button>

        <div
          className="absolute inset-x-0 bottom-0 z-1 flex items-center gap-3 px-4 py-3"
          style={{ background: "linear-gradient(transparent, var(--scrim))" }}
        >
          <div
            role="progressbar"
            aria-label="Playback position"
            aria-valuenow={32}
            aria-valuemin={0}
            aria-valuemax={100}
            className="bg-track relative h-1 flex-1 rounded-sm"
          >
            <div className="surface-brand h-1 w-[32%] rounded-sm" />
          </div>
          <span className="text-ink font-mono text-[11px]">00:14 / 00:41</span>
        </div>
      </div>
    </div>
  );
}
