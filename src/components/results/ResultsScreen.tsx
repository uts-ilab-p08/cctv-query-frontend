"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { MatchStrip } from "@/components/results/MatchStrip";
import { QueryPanel } from "@/components/results/QueryPanel";
import { VideoStage } from "@/components/results/VideoStage";
import { clipPos, WIN_LEN } from "@/lib/time";
import { useAppStore } from "@/store/useAppStore";
import type { Clip } from "@/types";

/**
 * Results workspace: query/assistant column + video player + matching-moments strip.
 * Player state (selection, camera, playhead, playing/muted/meta) is local to this
 * component — it is presentation-only and does not belong in the shared app store.
 */
export function ResultsScreen() {
  const query = useAppStore((state) => state.query);
  const clips = useAppStore((state) => state.results);
  const searchPending = useAppStore((state) => state.searchPending);
  const searchError = useAppStore((state) => state.searchError);

  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [activeCamera, setActiveCamera] = useState(clips[0]?.camera ?? "");
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [metaOpen, setMetaOpen] = useState(false);

  /* Top 10 by confidence, presented in chronological order (SPEC §2). */
  const matches = useMemo(
    () =>
      [...clips]
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 10)
        .sort((a, b) => a.order - b.order),
    [clips],
  );

  const selected = clips.find((clip) => clip.id === selectedClipId);

  const nearestOnFeed = useMemo(() => {
    const onCamera = clips.filter((clip) => clip.camera === activeCamera);
    return (
      [...onCamera].sort(
        (a, b) => Math.abs(clipPos(a) - currentTime) - Math.abs(clipPos(b) - currentTime),
      )[0] ?? clips[0]
    );
  }, [clips, activeCamera, currentTime]);

  const activeClip: Clip | undefined = selected ?? nearestOnFeed;

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setCurrentTime((t) => (t >= WIN_LEN ? 0 : t + 1));
    }, 250);
    return () => window.clearInterval(id);
  }, [playing]);

  const selectMatch = useCallback((clip: Clip) => {
    setSelectedClipId(clip.id);
    setActiveCamera(clip.camera);
    setCurrentTime(clipPos(clip));
  }, []);

  const jumpToClip = useCallback(
    (id: string) => {
      const clip = clips.find((candidate) => candidate.id === id);
      if (clip) selectMatch(clip);
    },
    [clips, selectMatch],
  );

  const ticks = useMemo(
    () =>
      clips
        .filter((clip) => clip.camera === activeCamera)
        .map((clip) => ({
          id: clip.id,
          left: (clipPos(clip) / WIN_LEN) * 100,
          active: clip.id === selectedClipId,
        })),
    [clips, activeCamera, selectedClipId],
  );

  if (searchPending) {
    return (
      <div className="text-ink-2 flex h-[calc(100vh-64px)] items-center justify-center text-[13px]">
        Searching indexed footage…
      </div>
    );
  }

  if (searchError) {
    return (
      <div className="text-ink-2 flex h-[calc(100vh-64px)] items-center justify-center text-[13px]">
        {searchError}
      </div>
    );
  }

  if (!activeClip) {
    return (
      <div className="text-ink-2 flex h-[calc(100vh-64px)] items-center justify-center text-[13px]">
        No matching clips found.
      </div>
    );
  }

  return (
    <div className="font-barlow flex h-[calc(100vh-64px)] min-h-0 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1">
        <QueryPanel
          query={query || "All indexed events"}
          selectedClipId={selectedClipId}
          contextLabel={selected ? `${selected.camera} · ${selected.ts}` : "Top 5 matches"}
          onClearSelection={() => setSelectedClipId(null)}
          onJumpToClip={jumpToClip}
        />

        <div className="bg-video-frame flex min-h-0 min-w-[280px] flex-1 basis-[440px] flex-col overflow-hidden">
          <VideoStage
            clip={activeClip}
            activeCamera={activeCamera}
            currentTime={currentTime}
            playing={playing}
            muted={muted}
            metaOpen={metaOpen}
            ticks={ticks}
            onTogglePlay={() => setPlaying((p) => !p)}
            onToggleMute={() => setMuted((m) => !m)}
            onToggleMeta={() => setMetaOpen((m) => !m)}
            onSeek={setCurrentTime}
          />
        </div>
      </div>

      <MatchStrip
        matches={matches}
        selectedClipId={selectedClipId}
        hasSelection={!!selected}
        onSelect={selectMatch}
        onClearSelection={() => setSelectedClipId(null)}
      />
    </div>
  );
}
