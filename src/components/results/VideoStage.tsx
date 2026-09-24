"use client";

import { Play } from "lucide-react";

import { MatchVideo, type SeekRequest } from "@/components/results/MatchVideo";
import type { TracksResponse } from "@/lib/api/types";
import { MetadataOverlay } from "@/components/results/MetadataOverlay";
import { PlayerBar, type PlayerTick } from "@/components/results/PlayerBar";
import { getThumbUrl } from "@/lib/clips";
import { fmtClock, fmtElapsed } from "@/lib/time";
import type { Clip } from "@/types";

interface VideoStageProps {
  clip: Clip;
  activeCamera: string;
  currentTime: number;
  playing: boolean;
  muted: boolean;
  metaOpen: boolean;
  ticks: PlayerTick[];
  /** Loaded video's length; unused for the still-frame fallback. */
  duration: number;
  cueKey: string;
  seekRequest: SeekRequest | null;
  onTimeUpdate: (sec: number) => void;
  onDuration: (sec: number) => void;
  onStop: () => void;
  /** Object tracks for the moment, drawn over the footage. */
  tracks?: TracksResponse | null;
  onTogglePlay: () => void;
  videoExpanded?: boolean;
  onToggleExpand?: () => void;
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
  duration,
  cueKey,
  seekRequest,
  onTimeUpdate,
  onDuration,
  onStop,
  tracks,
  videoExpanded,
  onToggleExpand,
  onTogglePlay,
  onToggleMute,
  onToggleMeta,
  onSeek,
}: VideoStageProps) {
  // Real footage plays on its own timeline; mock clips live in the 50-minute demo window.
  const formatTime = clip.videoUrl ? fmtElapsed : fmtClock;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
        <div className="relative h-full w-full overflow-hidden">
          {clip.videoUrl ? (
            <MatchVideo
              src={clip.videoUrl}
              cueAt={clip.startSeconds ?? 0}
              cueKey={cueKey}
              seekRequest={seekRequest}
              playing={playing}
              muted={muted}
              onTimeUpdate={onTimeUpdate}
              onDuration={onDuration}
              onStop={onStop}
              tracks={tracks}
            />
          ) : (
            /* Still frame for clips without footage (the mock dataset). */
            <div
              className="absolute inset-0 bg-center bg-no-repeat"
              style={{
                backgroundImage: `url(${getThumbUrl(clip)})`,
                backgroundSize: "contain",
                filter: "grayscale(0.58) contrast(1.06) brightness(0.72)",
              }}
            />
          )}

          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span className="rounded-md border border-white/[0.16] bg-[rgba(12,15,19,0.82)] px-[9px] py-1 font-mono text-[11px] text-white">
              {activeCamera}
            </span>
            {clip.scene ? (
              <span className="rounded-md border border-white/[0.12] bg-[rgba(12,15,19,0.68)] px-[9px] py-1 font-mono text-[11px] text-white/80">
                {clip.scene}
              </span>
            ) : null}
            <span className="rounded-md border border-white/[0.12] bg-[rgba(12,15,19,0.68)] px-[9px] py-1 text-[11px] text-white/80">
              {clip.perspective}
            </span>
          </div>

          <span className="absolute top-3 right-3 rounded-md border border-white/[0.16] bg-[rgba(12,15,19,0.82)] px-[9px] py-1 font-mono text-[11px] text-white">
            {clip.date ? `${clip.date} · ` : null}
            {formatTime(currentTime)}
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
            <MetadataOverlay
              clip={clip}
              currentTime={currentTime}
              formatTime={formatTime}
              onClose={onToggleMeta}
            />
          ) : null}
        </div>
      </div>

      <PlayerBar
        currentTime={currentTime}
        duration={clip.videoUrl ? duration : undefined}
        formatTime={formatTime}
        playing={playing}
        muted={muted}
        metaOpen={metaOpen}
        ticks={ticks}
        onTogglePlay={onTogglePlay}
        onToggleMute={onToggleMute}
        onToggleMeta={onToggleMeta}
        onSeek={onSeek}
        videoExpanded={videoExpanded}
        onToggleExpand={onToggleExpand}
      />
    </div>
  );
}
