"use client";

import { MessageSquare } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { SeekRequest } from "@/components/results/MatchVideo";
import { MatchStrip } from "@/components/results/MatchStrip";
import { QueryPanel } from "@/components/results/QueryPanel";
import { useMomentTracks } from "@/components/results/useMomentTracks";
import { VideoStage } from "@/components/results/VideoStage";
import { topMatches } from "@/lib/matches";
import { clipPos, WIN_LEN } from "@/lib/time";
import { useAppStore } from "@/store/useAppStore";
import type { Clip } from "@/types";

/**
 * Results workspace: query/assistant column + video player + matching-moments strip.
 * Player state (selection, camera, playhead, playing/muted/meta) is local to this
 * component — it is presentation-only and does not belong in the shared app store.
 */
interface ResultsScreenProps {
  /** `?q=` from the URL — the search this page is showing. */
  urlQuery?: string;
}

export function ResultsScreen({ urlQuery = "" }: ResultsScreenProps) {
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
  /** In-app fullscreen: the chat column collapses and the video fills the workspace. */
  const [videoExpanded, setVideoExpanded] = useState(false);
  const [duration, setDuration] = useState(0);
  const [seekRequest, setSeekRequest] = useState<SeekRequest | null>(null);
  /** Bumped on every match pick so re-picking the same match re-cues it. */
  const [cueCount, setCueCount] = useState(0);

  // The URL owns the search: run `?q=` unless it is already the latest search — so a
  // refresh or back/forward re-runs it, while arriving from Home doesn't search twice.
  useEffect(() => {
    const target = urlQuery.trim();
    if (!target) return;
    const { lastSearch, runSearch } = useAppStore.getState();
    if (lastSearch !== target) void runSearch(target);
  }, [urlQuery]);

  const matches = useMemo(() => topMatches(clips), [clips]);

  const selected = clips.find((clip) => clip.id === selectedClipId);

  const nearestOnFeed = useMemo(() => {
    const onCamera = clips.filter((clip) => clip.camera === activeCamera);
    return (
      [...onCamera].sort(
        (a, b) => Math.abs(clipPos(a) - currentTime) - Math.abs(clipPos(b) - currentTime),
      )[0] ?? clips[0]
    );
  }, [clips, activeCamera, currentTime]);

  // Real footage opens on the first top match without *selecting* it, so the
  // assistant stays on the query thread. Mock clips (no video) keep the
  // demo-window behaviour of showing the event nearest the playhead.
  const firstMatch = matches[0];
  const activeClip: Clip | undefined =
    selected ?? (firstMatch?.videoUrl ? firstMatch : nearestOnFeed);
  const videoMode = !!activeClip?.videoUrl;
  const tracks = useMomentTracks(activeClip);

  // A new search replaces the result set: a selection from the old one would
  // otherwise keep the assistant on a clip thread that no longer exists.
  useEffect(() => {
    setSelectedClipId(null);
    setPlaying(false);
  }, [clips]);

  useEffect(() => {
    // Real video drives its own clock through `onTimeUpdate`.
    if (!playing || videoMode) return;
    const id = window.setInterval(() => {
      setCurrentTime((t) => (t >= WIN_LEN ? 0 : t + 1));
    }, 250);
    return () => window.clearInterval(id);
  }, [playing, videoMode]);

  const selectMatch = useCallback((clip: Clip) => {
    setSelectedClipId(clip.id);
    setActiveCamera(clip.camera);
    setCurrentTime(clip.videoUrl ? (clip.startSeconds ?? 0) : clipPos(clip));
    setCueCount((n) => n + 1);
  }, []);

  const seekTo = useCallback(
    (sec: number) => {
      setCurrentTime(sec);
      if (videoMode) setSeekRequest((prev) => ({ sec, id: (prev?.id ?? 0) + 1 }));
    },
    [videoMode],
  );

  const stopPlayback = useCallback(() => setPlaying(false), []);

  const jumpToClip = useCallback(
    (id: string) => {
      const clip = clips.find((candidate) => candidate.id === id);
      if (clip) selectMatch(clip);
    },
    [clips, selectMatch],
  );

  const ticks = useMemo(() => {
    if (activeClip?.videoUrl) {
      // Mark every matching moment that lives in the loaded video.
      if (duration <= 0) return [];
      return clips
        .filter((clip) => clip.videoUrl === activeClip.videoUrl)
        .map((clip) => ({
          id: clip.id,
          left: Math.min(100, ((clip.startSeconds ?? 0) / duration) * 100),
          active: clip.id === selectedClipId,
        }));
    }
    return clips
      .filter((clip) => clip.camera === activeCamera)
      .map((clip) => ({
        id: clip.id,
        left: (clipPos(clip) / WIN_LEN) * 100,
        active: clip.id === selectedClipId,
      }));
  }, [clips, activeClip, activeCamera, selectedClipId, duration]);

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
      <div className="relative flex min-h-0 flex-1">
        {videoExpanded ? (
          // The chat is only collapsed, never gone: this stays where it was, one click away.
          <button
            type="button"
            onClick={() => setVideoExpanded(false)}
            aria-label="Show chat"
            title="Show the chat"
            className="border-hairline-strong bg-panel-solid shadow-glass-lg text-ink hover:text-accent absolute top-1/2 left-3 z-20 flex -translate-y-1/2 cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2.5 text-[13px] transition-colors duration-150"
          >
            <MessageSquare size={17} strokeWidth={2} aria-hidden />
            Chat
          </button>
        ) : null}
        <QueryPanel
          query={query || "All indexed events"}
          selectedClipId={selectedClipId}
          contextLabel={selected ? `${selected.camera} · ${selected.ts}` : "Top 5 matches"}
          onClearSelection={() => setSelectedClipId(null)}
          onJumpToClip={jumpToClip}
          hidden={videoExpanded}
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
            duration={duration}
            cueKey={`${activeClip.id}#${cueCount}`}
            seekRequest={seekRequest}
            onTimeUpdate={setCurrentTime}
            onDuration={setDuration}
            onStop={stopPlayback}
            tracks={tracks}
            onTogglePlay={() => setPlaying((p) => !p)}
            onToggleMute={() => setMuted((m) => !m)}
            onToggleMeta={() => setMetaOpen((m) => !m)}
            onSeek={seekTo}
            videoExpanded={videoExpanded}
            onToggleExpand={() => setVideoExpanded((expanded) => !expanded)}
          />
        </div>
      </div>

      <MatchStrip
        matches={matches}
        selectedClipId={selectedClipId}
        onSelect={selectMatch}
        onClearSelection={() => setSelectedClipId(null)}
      />
    </div>
  );
}
