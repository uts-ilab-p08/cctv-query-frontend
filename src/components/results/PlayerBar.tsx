"use client";

import { Info, Maximize2, Minimize2, Pause, Play, Volume2, VolumeX } from "lucide-react";
import type { MouseEvent } from "react";

import { fmtElapsed } from "@/lib/time";

export interface PlayerTick {
  id: string;
  left: number;
  active: boolean;
}

interface PlayerBarProps {
  /** Playhead, in seconds into the video. */
  currentTime: number;
  /** The loaded video's length in seconds; 0 until its metadata arrives. */
  duration: number;
  /** No footage for this moment: play and the scrubber are disabled. */
  noFootage?: boolean;
  playing: boolean;
  muted: boolean;
  metaOpen: boolean;
  ticks: PlayerTick[];
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onToggleMeta: () => void;
  onSeek: (sec: number) => void;
  /** True while the chat is collapsed so the video takes the workspace. */
  videoExpanded?: boolean;
  onToggleExpand?: () => void;
}

const iconBtn =
  "flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-white/[0.08] text-white";

/** Playback control strip: play/pause, clock, scrubber with per-clip ticks, mute, info, fullscreen. */
export function PlayerBar({
  currentTime,
  duration,
  noFootage = false,
  playing,
  muted,
  metaOpen,
  ticks,
  onTogglePlay,
  onToggleMute,
  onToggleMeta,
  onSeek,
  videoExpanded = false,
  onToggleExpand,
}: PlayerBarProps) {
  const pct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  const seek = (event: MouseEvent<HTMLDivElement>) => {
    if (noFootage || duration <= 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    onSeek(Math.round(ratio * duration));
  };

  return (
    <div className="bg-video-bar flex shrink-0 flex-nowrap items-center gap-2.5 border-t border-white/10 px-3 py-[9px]">
      <button
        type="button"
        onClick={onTogglePlay}
        disabled={noFootage}
        aria-label={playing ? "Pause" : "Play"}
        title={noFootage ? "No footage for this moment" : undefined}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.14] bg-white/[0.08] text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        {playing ? (
          <Pause size={14} strokeWidth={2} fill="currentColor" aria-hidden />
        ) : (
          <Play size={14} strokeWidth={2} fill="currentColor" aria-hidden />
        )}
      </button>

      <span className="shrink-0 font-mono text-[12px] text-white">{fmtElapsed(currentTime)}</span>

      <div
        onClick={seek}
        aria-disabled={noFootage}
        className="relative flex h-6 min-w-0 flex-1 cursor-pointer items-center aria-disabled:cursor-default"
      >
        <div className="absolute right-0 left-0 h-[5px] rounded-[3px] bg-white/[0.16]" />
        <div
          className="absolute left-0 h-[5px] rounded-[3px]"
          style={{ width: `${pct}%`, background: "var(--accent)" }}
        />
        {ticks.map((tick) => (
          <div
            key={tick.id}
            className="absolute top-[3px] h-[19px] w-[2px] rounded-[1px]"
            style={{ left: `${tick.left}%`, background: tick.active ? "#ffffff" : "var(--accent)" }}
          />
        ))}
        <div
          className="absolute -ml-[5px] h-[11px] w-[11px] rounded-full bg-white"
          style={{ left: `${pct}%`, boxShadow: "0 0 0 3px var(--accent-line)" }}
        />
      </div>

      <button
        type="button"
        onClick={onToggleMute}
        aria-label={muted ? "Unmute" : "Mute"}
        className={iconBtn}
      >
        {muted ? (
          <VolumeX size={14} strokeWidth={2} aria-hidden />
        ) : (
          <Volume2 size={14} strokeWidth={2} aria-hidden />
        )}
      </button>

      <button
        type="button"
        onClick={onToggleMeta}
        title={metaOpen ? "Hide chunk metadata" : "Show chunk metadata"}
        aria-label={metaOpen ? "Hide chunk metadata" : "Show chunk metadata"}
        className="flex h-7 w-[30px] shrink-0 items-center justify-center rounded-lg border"
        style={{
          background: metaOpen ? "var(--accent-soft)" : "rgba(255,255,255,0.08)",
          borderColor: metaOpen ? "var(--accent-line)" : "transparent",
          color: metaOpen ? "var(--accent-strong)" : "#ffffff",
        }}
      >
        <Info size={13} strokeWidth={2} aria-hidden />
      </button>

      {/* In-app "fullscreen": collapses the chat column so the video takes the workspace.
          A toggle with a fixed name + aria-pressed, so assistive tech hears the state. */}
      <button
        type="button"
        onClick={onToggleExpand}
        aria-label="Expand video"
        aria-pressed={videoExpanded}
        title={videoExpanded ? "Show the chat" : "Expand the video (hides the chat)"}
        className={iconBtn}
      >
        {videoExpanded ? (
          <Minimize2 size={14} strokeWidth={2} aria-hidden />
        ) : (
          <Maximize2 size={14} strokeWidth={2} aria-hidden />
        )}
      </button>
    </div>
  );
}
