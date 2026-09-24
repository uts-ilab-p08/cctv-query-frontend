"use client";

import { useEffect, useRef } from "react";

/** A scrubber seek; `id` makes a repeated seek to the same second still fire. */
export interface SeekRequest {
  sec: number;
  id: number;
}

interface MatchVideoProps {
  src: string;
  /** Second of the matching moment inside `src`. */
  cueAt: number;
  /** Changes whenever a (re)selection should jump back to `cueAt`. */
  cueKey: string;
  seekRequest: SeekRequest | null;
  playing: boolean;
  muted: boolean;
  onTimeUpdate: (sec: number) => void;
  onDuration: (sec: number) => void;
  onStop: () => void;
}

/**
 * The real footage behind a match. The `<video>` element is the clock: it
 * reports time/duration up, and the parent drives it only through props
 * (cue, seek, play, mute). Two moments from the same video keep the same
 * `src`, so switching between them seeks instead of reloading the file.
 */
export function MatchVideo({
  src,
  cueAt,
  cueKey,
  seekRequest,
  playing,
  muted,
  onTimeUpdate,
  onDuration,
  onStop,
}: MatchVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  /** `src` whose metadata has loaded — only then can `currentTime` be set. */
  const loadedSrc = useRef<string | null>(null);
  /** Cue waiting for metadata after a `src` change. */
  const pendingCue = useRef<number | null>(null);

  const seek = (sec: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = sec;
    onTimeUpdate(sec);
  };

  useEffect(() => {
    if (loadedSrc.current === src) {
      pendingCue.current = null;
      seek(cueAt);
    } else {
      pendingCue.current = cueAt;
    }
    // `seek` is recreated every render; the cue must only fire on a new selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, cueAt, cueKey]);

  useEffect(() => {
    if (seekRequest && loadedSrc.current === src) seek(seekRequest.sec);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seekRequest]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (playing) {
      // Rejects when the browser blocks playback or the source fails to load.
      Promise.resolve(video.play()).catch(onStop);
    } else if (!video.paused) {
      video.pause();
    }
  }, [playing, src, onStop]);

  return (
    <video
      ref={videoRef}
      src={src}
      aria-label="Match footage"
      muted={muted}
      playsInline
      preload="metadata"
      className="absolute inset-0 h-full w-full bg-black object-contain"
      onLoadedMetadata={(event) => {
        loadedSrc.current = src;
        onDuration(
          Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0,
        );
        if (pendingCue.current != null) {
          seek(pendingCue.current);
          pendingCue.current = null;
        }
      }}
      onTimeUpdate={(event) => onTimeUpdate(event.currentTarget.currentTime)}
      onEnded={onStop}
    />
  );
}
