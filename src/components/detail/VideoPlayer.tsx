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
    <div className="overflow-hidden rounded-xl border border-white/60 bg-white/70 shadow-[0_8px_22px_rgba(11,28,77,0.07)] backdrop-blur-[16px]">
      <div className="relative flex aspect-video items-center justify-center">
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center [filter:grayscale(0.5)_contrast(1.05)_brightness(0.8)]"
          style={{ backgroundImage: `url(${thumb})` }}
        />

        <span className="absolute top-3.5 left-3.5 z-1 max-w-[45%] truncate rounded-xs bg-[rgba(11,28,77,0.7)] px-[9px] py-1 font-mono text-[11px] text-white">
          {clip.camera}
        </span>
        <span className="absolute top-3.5 right-3.5 z-1 max-w-[45%] truncate rounded-xs bg-[rgba(11,28,77,0.7)] px-[9px] py-1 font-mono text-[11px] text-white">
          {clip.date} · {clip.ts}
        </span>

        <button
          type="button"
          onClick={() => setPlaying((value) => !value)}
          aria-label={playing ? "Pause clip" : "Play clip"}
          className="border-indigo-strong text-indigo-strong z-1 flex h-15 w-15 cursor-pointer items-center justify-center rounded-full border bg-white/85 transition-colors duration-150 hover:bg-white"
        >
          <Play size={22} aria-hidden fill="currentColor" />
        </button>

        <div className="absolute inset-x-0 bottom-0 z-1 flex items-center gap-3 bg-[linear-gradient(transparent,rgba(11,28,77,0.85))] px-4 py-3">
          <span aria-hidden className="text-sm text-white">
            ▶
          </span>
          <div
            role="progressbar"
            aria-label="Playback position"
            aria-valuenow={32}
            aria-valuemin={0}
            aria-valuemax={100}
            className="relative h-1 flex-1 rounded-sm bg-white/30"
          >
            <div className="bg-progress-gradient h-1 w-[32%] rounded-sm" />
          </div>
          <span className="text-border font-mono text-[11px]">00:14 / 00:41</span>
        </div>
      </div>
    </div>
  );
}
