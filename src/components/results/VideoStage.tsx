"use client";

import { Play } from "lucide-react";

import { MetadataOverlay } from "@/components/results/MetadataOverlay";
import { PlayerBar, type PlayerTick } from "@/components/results/PlayerBar";
import { getThumbUrl } from "@/lib/clips";
import { fmtClock } from "@/lib/time";
import type { Clip } from "@/types";

interface VideoStageProps {
  clip: Clip;
  activeCamera: string;
  currentTime: number;
  playing: boolean;
  muted: boolean;
  metaOpen: boolean;
  ticks: PlayerTick[];
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onToggleMeta: () => void;
  onSeek: (sec: number) => void;
}

/**
 * The player: still frame (stand-in for a real `<video>` stream) + camera/perspective
 * chips + chunk-metadata overlay + control bar. Overlay chips are fixed black/white
 * on purpose — they must read over any frame (SPEC §2).
 */
export function VideoStage({
  clip,
  activeCamera,
  currentTime,
  playing,
  muted,
  metaOpen,
  ticks,
  onTogglePlay,
  onToggleMute,
  onToggleMeta,
  onSeek,
}: VideoStageProps) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
        <div className="relative h-full w-full overflow-hidden">
          {/* Stand-in for the real chunk stream; swap for a <video> element once the
              backend serves it. */}
          <div
            className="absolute inset-0 bg-center bg-no-repeat"
            style={{
              backgroundImage: `url(${getThumbUrl(clip)})`,
              backgroundSize: "contain",
              filter: "grayscale(0.58) contrast(1.06) brightness(0.72)",
            }}
          />

          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span className="rounded-md border border-white/[0.16] bg-[rgba(12,15,19,0.82)] px-[9px] py-1 font-mono text-[11px] text-white">
              {activeCamera}
            </span>
            <span className="rounded-md border border-white/[0.12] bg-[rgba(12,15,19,0.68)] px-[9px] py-1 text-[11px] text-white/80">
              {clip.perspective}
            </span>
          </div>

          <span className="absolute top-3 right-3 rounded-md border border-white/[0.16] bg-[rgba(12,15,19,0.82)] px-[9px] py-1 font-mono text-[11px] text-white">
            {clip.date} · {fmtClock(currentTime)}
          </span>

          {!playing ? (
            <button
              type="button"
              onClick={onTogglePlay}
              aria-label="Play"
              className="absolute inset-0 flex items-center justify-center"
            >
              <span className="flex h-[66px] w-[66px] items-center justify-center rounded-full bg-white/90 shadow-[0_12px_30px_rgba(0,0,0,0.45)]">
                <Play size={24} strokeWidth={2} fill="#0c0f13" className="text-[#0c0f13]" />
              </span>
            </button>
          ) : null}

          {metaOpen ? (
            <MetadataOverlay clip={clip} currentTime={currentTime} onClose={onToggleMeta} />
          ) : null}
        </div>
      </div>

      <PlayerBar
        currentTime={currentTime}
        playing={playing}
        muted={muted}
        metaOpen={metaOpen}
        ticks={ticks}
        onTogglePlay={onTogglePlay}
        onToggleMute={onToggleMute}
        onToggleMeta={onToggleMeta}
        onSeek={onSeek}
      />
    </div>
  );
}
