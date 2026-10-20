"use client";

import { Loader2, MessageSquare, Video } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { SeekRequest } from "@/components/results/MatchVideo";
import { MatchStrip } from "@/components/results/MatchStrip";
import { NoMatches } from "@/components/results/NoMatches";
import { QueryPanel } from "@/components/results/QueryPanel";
import { MatchStripSkeleton, VideoStageSkeleton } from "@/components/results/ResultsSkeletons";
import { useMomentTracks } from "@/components/results/useMomentTracks";
import { VideoStage } from "@/components/results/VideoStage";
import { cn } from "@/lib/cn";
import { topMatches } from "@/lib/matches";
import { SMALL_SCREEN_QUERY, useMediaQuery } from "@/lib/useMediaQuery";
import { useAppStore } from "@/store/useAppStore";
import type { Clip } from "@/types";

/** Small screens show one panel at a time: the chat, or the video with its matches. */
type ResultsView = "chat" | "video";

const VIEWS: ReadonlyArray<{ value: ResultsView; label: string; icon: typeof Video }> = [
  { value: "chat", label: "Chat", icon: MessageSquare },
  { value: "video", label: "Video", icon: Video },
];

/** What the Video tab signals while the chat is on screen: the search is still finding
 *  moments, or moments the chat talks about are waiting there, unseen. */
type VideoSignal = { state: "loading" } | { state: "ready"; count: number } | null;

/** The segmented switch under the top bar, small screens only. While the chat is on
 *  screen, the Video tab lights up with the number of matching moments, behind a ping,
 *  so people know the footage the answer talks about is one tap away. */
function ResultsViewSwitch({
  view,
  videoSignal,
  onChange,
}: {
  view: ResultsView;
  videoSignal: VideoSignal;
  onChange: (view: ResultsView) => void;
}) {
  return (
    <div className="surface-topbar border-hairline flex shrink-0 justify-center border-b px-4 py-2 md:hidden">
      <div
        role="tablist"
        aria-label="Results view"
        className="glass-card-flat grid w-full max-w-[360px] grid-cols-2 gap-0.5 rounded-full p-0.5"
      >
        {VIEWS.map((option) => {
          const active = view === option.value;
          const signal = option.value === "video" && !active ? videoSignal : null;
          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`results-${option.value}`}
              onClick={() => onChange(option.value)}
              className={cn(
                "flex h-9 cursor-pointer items-center justify-center gap-2 rounded-full text-[14px] font-medium transition-colors duration-150",
                active
                  ? "surface-action shadow-action"
                  : signal?.state === "ready"
                    ? "bg-accent-soft text-accent-strong ring-accent-line ring-1"
                    : "text-ink-2 hover:text-ink",
              )}
            >
              <option.icon size={16} strokeWidth={2} aria-hidden />
              {option.label}
              {signal?.state === "loading" ? (
                <span data-video-signal="loading" className="flex">
                  <Loader2 size={13} strokeWidth={2.4} className="animate-spin" aria-hidden />
                  <span className="sr-only">, finding moments</span>
                </span>
              ) : null}
              {signal?.state === "ready" ? (
                <span data-video-signal="ready" className="relative flex">
                  <span
                    aria-hidden
                    className="bg-accent absolute inset-0 animate-ping rounded-full opacity-60"
                  />
                  <span
                    aria-hidden
                    className="surface-action shadow-action relative flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 font-mono text-[11px] font-semibold"
                  >
                    {signal.count}
                  </span>
                  <span className="sr-only">
                    , {signal.count} {signal.count === 1 ? "moment" : "moments"} to watch
                  </span>
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Results workspace: query/assistant column + video player + matching-moments strip.
 * Player state (selection, playhead, playing/muted/meta) is local to this
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
  /** The last submitted search — unlike `query`, not the draft being edited. */
  const lastSearch = useAppStore((state) => state.lastSearch);
  /** The step the running search reports (`/search/stream`), on its thinking bubble. */
  const searchStep = useAppStore(
    (state) => state.chats.results?.find((message) => message.status === "pending")?.progress,
  );

  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
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
  /** A second to cue other than the moment's start (a time the answer named). Tied to
   *  its clip, so it never applies to another moment on the player. */
  const [cue, setCue] = useState<{ clipId: string; sec: number } | null>(null);
  /** Small screens: which of the two panels is on screen. The chat comes first; the
   *  Video tab signals the footage it talks about (see `videoSignal`). */
  const [view, setView] = useState<ResultsView>("chat");
  /** Finished answers in the results thread that cite moments. */
  const citedAnswers = useAppStore(
    (state) =>
      (state.chats.results ?? []).filter(
        (message) =>
          message.role === "agent" && message.status !== "pending" && !!message.citations?.length,
      ).length,
  );
  /** The results and cited answers on screen the last time the video panel was open. */
  const [videoSeen, setVideoSeen] = useState<{ clips: Clip[] | null; cited: number }>({
    clips: null,
    cited: 0,
  });
  // Adjusted during render, not in an effect: whatever arrives while the video is on screen
  // counts as seen right away, with no frame where its tab lights up. A new search starts
  // a new thread, so the cited count can also drop: follow it down.
  if (
    (view === "video" && (videoSeen.clips !== clips || videoSeen.cited !== citedAnswers)) ||
    citedAnswers < videoSeen.cited
  ) {
    setVideoSeen({ clips: view === "video" ? clips : videoSeen.clips, cited: citedAnswers });
  }

  const smallScreen = useMediaQuery(SMALL_SCREEN_QUERY);

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

  // The player opens on the first top match without *selecting* it, so the
  // assistant stays on the query thread.
  // Mid-search, `clips` is still the previous result set: nothing is on the player yet.
  const activeClip: Clip | undefined = searchPending
    ? undefined
    : (selected ?? matches[0] ?? clips[0]);
  const videoMode = !!activeClip?.videoUrl;
  const tracks = useMomentTracks(activeClip);

  // A new search replaces the result set: a selection from the old one would
  // otherwise keep the assistant on a clip thread that no longer exists.
  useEffect(() => {
    setSelectedClipId(null);
    setPlaying(false);
  }, [clips]);

  const selectMatch = useCallback((clip: Clip) => {
    setSelectedClipId(clip.id);
    setCue(null);
    setCurrentTime(clip.startSeconds ?? 0);
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

  /** A time the answer named: select its moment, cue that second, and play. */
  const playAt = useCallback(
    (id: string, sec: number) => {
      if (!clips.some((candidate) => candidate.id === id)) return;
      setSelectedClipId(id);
      setCue({ clipId: id, sec });
      setCurrentTime(sec);
      setCueCount((n) => n + 1);
      setPlaying(true);
      // A citation tapped in the chat opens its moment: on small screens, slide to it.
      setView("video");
    },
    [clips],
  );

  const jumpToClip = useCallback(
    (id: string) => {
      const clip = clips.find((candidate) => candidate.id === id);
      if (!clip) return;
      selectMatch(clip);
      setView("video");
    },
    [clips, selectMatch],
  );

  const ticks = useMemo(() => {
    // Mark every matching moment that lives in the loaded video.
    if (!activeClip?.videoUrl || duration <= 0) return [];
    return clips
      .filter((clip) => clip.videoUrl === activeClip.videoUrl)
      .map((clip) => ({
        id: clip.id,
        left: Math.min(100, ((clip.startSeconds ?? 0) / duration) * 100),
        active: clip.id === selectedClipId,
      }));
  }, [clips, activeClip, selectedClipId, duration]);

  if (searchError) {
    return (
      <div className="text-ink-2 flex h-[calc(100dvh-64px)] items-center justify-center px-4 text-center text-[13px]">
        {searchError}
      </div>
    );
  }

  if (!searchPending && !activeClip) {
    return (
      <div className="flex h-[calc(100dvh-64px)] items-center overflow-y-auto">
        <NoMatches searched={lastSearch ?? query} />
      </div>
    );
  }

  const videoSignal: VideoSignal = searchPending
    ? { state: "loading" }
    : matches.length > 0 && (videoSeen.clips !== clips || citedAnswers > videoSeen.cited)
      ? { state: "ready", count: matches.length }
      : null;
  /** On small screens the panel off screen must not take focus or clicks. */
  const offScreen = (panel: ResultsView) => smallScreen && view !== panel;
  // The expanded video is a wide-screen layout; small screens switch panels instead.
  const chatCollapsed = videoExpanded && !smallScreen;

  return (
    <div className="font-barlow flex h-[calc(100dvh-64px)] min-h-0 flex-col overflow-hidden">
      <ResultsViewSwitch view={view} videoSignal={videoSignal} onChange={setView} />
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {/* Below `md` this is a track twice the screen's width: the chat on the left, the
            video with its matches on the right, and the switch slides it by half. The row
            dissolves (`contents`) so its children become the track's grid cells. Only CSS
            changes, so the player never remounts when the panels switch. */}
        <div
          data-results-track
          data-view={view}
          className={cn(
            "relative flex h-full min-h-0 flex-col",
            "max-md:grid max-md:w-[200%] max-md:grid-cols-2 max-md:grid-rows-[minmax(0,1fr)_auto] max-md:transition-transform max-md:duration-300 max-md:ease-out",
            view === "video" && "max-md:-translate-x-1/2",
          )}
        >
          <div className="relative flex min-h-0 flex-1 max-md:contents">
            {chatCollapsed ? (
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
            <div
              id="results-chat"
              inert={offScreen("chat")}
              className="contents max-md:col-start-1 max-md:row-span-2 max-md:flex max-md:min-h-0 max-md:flex-col"
            >
              <QueryPanel
                query={query || "All indexed events"}
                selectedClipId={selectedClipId}
                contextLabel={selected ? `${selected.camera} · ${selected.ts}` : "Top 5 matches"}
                onClearSelection={() => setSelectedClipId(null)}
                onJumpToClip={jumpToClip}
                onPlayAt={playAt}
                hidden={chatCollapsed}
              />
            </div>

            <div
              id="results-video"
              inert={offScreen("video")}
              className="bg-video-frame flex min-h-0 min-w-[280px] flex-1 basis-[440px] flex-col overflow-hidden max-md:col-start-2 max-md:row-start-1 max-md:min-w-0 max-md:basis-auto"
            >
              {!activeClip ? (
                <VideoStageSkeleton />
              ) : (
                // Mounts when the results arrive: the player fades in once, not on every pick.
                <div className="reveal-in flex min-h-0 flex-1 flex-col">
                  <VideoStage
                    clip={activeClip}
                    currentTime={currentTime}
                    playing={playing}
                    muted={muted}
                    metaOpen={metaOpen}
                    ticks={ticks}
                    duration={duration}
                    cueKey={`${activeClip.id}#${cueCount}`}
                    cueAt={cue?.clipId === activeClip.id ? cue.sec : undefined}
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
              )}
            </div>
          </div>

          <div
            inert={offScreen("video")}
            className="flex shrink-0 flex-col max-md:col-start-2 max-md:row-start-2"
          >
            {searchPending ? (
              <MatchStripSkeleton step={searchStep} />
            ) : (
              <MatchStrip
                matches={matches}
                selectedClipId={selectedClipId}
                onSelect={selectMatch}
                onClearSelection={() => setSelectedClipId(null)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
