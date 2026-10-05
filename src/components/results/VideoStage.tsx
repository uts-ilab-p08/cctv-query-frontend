"use client";

import { Play } from "lucide-react";

import { CctvOverlay } from "@/components/results/CctvOverlay";
import { MatchVideo, type SeekRequest } from "@/components/results/MatchVideo";
import type { TracksResponse } from "@/lib/api/types";
import { MetadataOverlay } from "@/components/results/MetadataOverlay";
import { PlayerBar, type PlayerTick } from "@/components/results/PlayerBar";
import { Thumbnail } from "@/components/ui/Thumbnail";
import type { Clip } from "@/types";

interface VideoStageProps {
  clip: Clip;
  currentTime: number;
  playing: boolean;
  muted: boolean;
  metaOpen: boolean;
  ticks: PlayerTick[];
  /** Loaded video's length; unused when the moment has no footage. */
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
 * The player: the moment's footage (or, without a `video_url`, its still frame) under a
 * CCTV overlay (camera, scene, camera time), the chunk-metadata panel and the control
 * bar. The overlay is fixed white on purpose — it must read over any frame (SPEC §2).
 */
export function VideoStage({
  clip,
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
  const hasFootage = !!clip.videoUrl;
  // Without footage there is no playhead: show where the moment sits in its video.
  const playhead = hasFootage ? currentTime : (clip.startSeconds ?? 0);

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
              poster={clip.thumbnailUrl}
              tracks={tracks}
            />
          ) : (
            <Thumbnail src={clip.thumbnailUrl} imgClassName="thumb-filter object-contain" />
          )}

          <CctvOverlay
            camera={clip.camera}
            scene={clip.scene}
            captureStartLocal={clip.captureStartLocal}
            playhead={playhead}
            note={
              hasFootage ? null : (
                <span className="rounded-md border border-white/[0.16] bg-[rgba(12,15,19,0.82)] px-[9px] py-1 font-mono text-[11px] text-white">
                  No footage for this moment
                </span>
              )
            }
          />

          {hasFootage && !playing ? (
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
            <MetadataOverlay clip={clip} currentTime={playhead} onClose={onToggleMeta} />
          ) : null}
        </div>
      </div>

      <PlayerBar
        currentTime={playhead}
        duration={hasFootage ? duration : 0}
        noFootage={!hasFootage}
        playing={hasFootage && playing}
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
