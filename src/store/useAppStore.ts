import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { defaultAnnotationModel } from "@/data/models";
import { initialPipelineJobs, jobIdSeed } from "@/data/pipelineJobs";
import { askAssistant, searchClips, suggestQuestions } from "@/lib/api/endpoints";
import { clipToAssistantMoment } from "@/lib/api/normalize";
import { citedRefs } from "@/lib/citations";
import { emptyFilters } from "@/lib/filters";
import { topMatches } from "@/lib/matches";
import { DEFAULT_THEME, THEME_STORAGE_KEY, type Theme } from "@/lib/theme";
import type {
  ChatKey,
  ChatMessage,
  Clip,
  ClipTag,
  ExecutionTarget,
  Filters,
  PipelineJob,
  SearchMode,
  UploadScope,
} from "@/types";

/** Maximum jobs the pipeline runs concurrently. */
export const MAX_CONCURRENT_JOBS = 2;

interface AppState {
  theme: Theme;
  searchMode: SearchMode;
  query: string;
  filters: Filters;

  chats: Record<string, ChatMessage[]>;
  chatOpen: boolean;

  filtersOpen: boolean;
  camerasOpen: boolean;

  pipelineJobs: PipelineJob[];
  nextJobId: number;
  uploadCamera: string;
  uploadScope: UploadScope;
  uploadModel: string;
  uploadTarget: ExecutionTarget;
  remoteEndpoint: string;

  setTheme: (theme: Theme) => void;
  setSearchMode: (mode: SearchMode) => void;
  setQuery: (query: string) => void;

  setCameras: (cameras: string[]) => void;
  addTag: (tag: ClipTag) => void;
  toggleTag: (tag: ClipTag) => void;
  toggleCamera: (camera: string) => void;
  toggleScene: (scene: string) => void;
  setConfidence: (value: number) => void;
  setDateFrom: (value: string) => void;
  setDateTo: (value: string) => void;
  clearFilters: () => void;

  setChatOpen: (open: boolean) => void;
  openFilters: () => void;
  closeFilters: () => void;
  openCameras: () => void;
  closeCameras: () => void;

  /** Seed the results thread with the query and the assistant's summary. */
  runSearch: (text: string) => Promise<void>;
  /** Query of the latest `runSearch` — unlike `query`, not touched while typing. Lets
   *  Results tell whether `?q=` still needs running (refresh) or already ran. */
  lastSearch: string | null;
  /** Clips returned by the last `runSearch` call — what Results renders. */
  results: Clip[];
  searchPending: boolean;
  searchError: string | null;
  /** Ask in the Results thread — about all moments on screen, or about `focusId` when a
   *  moment is selected. The selection narrows the question; it doesn't start a new chat. */
  askInResults: (question: string, focusId?: string | null) => Promise<void>;
  /** Ask the assistant about one moment (that clip's thread). */
  askAboutClip: (clipId: string, question: string) => Promise<void>;
  /** Opening questions per thread context (see `startersKey`), from
   *  `/assistant/suggestions`. Empty while loading. */
  starters: Record<string, string[]>;
  /** Contexts (see `startersKey`) whose opening questions are still being fetched. */
  startersPending: Record<string, true>;
  /** Fetch the opening questions for a context once; cached by `startersKey`. */
  loadStarters: (key: string, focusId: string | null) => Promise<void>;
  /** Shared by both scopes; `focusId` null means the whole result set. */
  ask: (key: string, question: string, focusId: string | null) => Promise<void>;
  /** Open a clip thread by asking the backend the original search about the clip. */
  seedClipChat: (clipId: string, query: string) => Promise<void>;
  /** Clips loaded from the API outside a search (the /clips/[id] page), by id — so the
   *  assistant can find a clip that is not in `results`. */
  knownClips: Record<string, Clip>;
  rememberClip: (clip: Clip) => void;
  resetChat: (key: ChatKey) => void;

  setUploadCamera: (camera: string) => void;
  setUploadScope: (scope: UploadScope) => void;
  setUploadModel: (model: string) => void;
  setUploadTarget: (target: ExecutionTarget) => void;
  setRemoteEndpoint: (endpoint: string) => void;
  submitAnnotationJob: () => void;
  /** One tick of the queue simulation: advance, complete, then promote. */
  advancePipeline: () => void;
}

const chatKey = (key: ChatKey): string => String(key);

/** Cache key for a context's opening questions: thread, focused moment, search. */
export function startersKey(key: string, focusId: string | null, query: string): string {
  return `${key}|${focusId ?? ""}|${query}`;
}

/**
 * What the assistant endpoints receive: the moments on screen (the Results strip,
 * plus the focused clip if it isn't in it — Clip Detail's clip comes from the API)
 * and the thread so far. Never demo data. `null` when the focused moment is unknown.
 */
function assistantContext(
  state: AppState,
  key: string,
  focusId: string | null,
): { moments: Clip[]; history: { role: "user" | "assistant"; text: string }[] } | null {
  const moments = topMatches(state.results);
  if (focusId && !moments.some((clip) => clip.id === focusId)) {
    const focus = state.results.find((clip) => clip.id === focusId) ?? state.knownClips[focusId];
    if (!focus) return null;
    moments.push(focus);
  }
  const history = (state.chats[key] ?? [])
    .filter((message) => !message.status)
    .map((message) => ({
      role: message.role === "user" ? ("user" as const) : ("assistant" as const),
      text: message.text,
    }));
  return { moments, history };
}

const THINKING: ChatMessage = { role: "agent", text: "", status: "pending" };
const ASSISTANT_FAILED = "The assistant couldn't answer that. Try again.";

/** Swap a thread's pending placeholder for the real answer. If the thread was reset
 *  meanwhile ("+ New"), there is no placeholder and the late answer is dropped. */
function settlePending(
  chats: Record<string, ChatMessage[]>,
  key: string,
  message: ChatMessage,
): Record<string, ChatMessage[]> {
  const thread = chats[key] ?? [];
  const index = thread.findIndex((item) => item.status === "pending");
  if (index === -1) return chats;
  return { ...chats, [key]: thread.map((item, i) => (i === index ? message : item)) };
}

function pushMessages(
  chats: Record<string, ChatMessage[]>,
  key: ChatKey,
  messages: ChatMessage[],
): Record<string, ChatMessage[]> {
  const id = chatKey(key);
  return { ...chats, [id]: [...(chats[id] ?? []), ...messages] };
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: DEFAULT_THEME,
      searchMode: "nlq",
      query: "",
      filters: emptyFilters,

      chats: {},
      chatOpen: false, // the assistant is hidden until "Ask more"

      results: [],
      knownClips: {},
      lastSearch: null,
      searchPending: false,
      searchError: null,

      filtersOpen: false,
      camerasOpen: false,

      pipelineJobs: initialPipelineJobs,
      nextJobId: jobIdSeed,
      uploadCamera: "G299",
      uploadScope: "full",
      uploadModel: defaultAnnotationModel,
      uploadTarget: "Local",
      remoteEndpoint: "",

      setTheme: (theme) => {
        document.documentElement.setAttribute("data-theme", theme);
        set({ theme });
      },
      setSearchMode: (searchMode) => set({ searchMode }),
      setQuery: (query) => set({ query }),

      setCameras: (cameras) => set((s) => ({ filters: { ...s.filters, cameras } })),
      addTag: (tag) =>
        set((s) => ({
          filters: {
            ...s.filters,
            tags: s.filters.tags.includes(tag) ? s.filters.tags : [...s.filters.tags, tag],
          },
        })),
      toggleTag: (tag) =>
        set((s) => ({
          filters: {
            ...s.filters,
            tags: s.filters.tags.includes(tag)
              ? s.filters.tags.filter((item) => item !== tag)
              : [...s.filters.tags, tag],
          },
        })),
      toggleScene: (scene) =>
        set((s) => ({
          filters: {
            ...s.filters,
            scenes: s.filters.scenes.includes(scene)
              ? s.filters.scenes.filter((item) => item !== scene)
              : [...s.filters.scenes, scene],
          },
        })),
      toggleCamera: (camera) =>
        set((s) => ({
          filters: {
            ...s.filters,
            cameras: s.filters.cameras.includes(camera)
              ? s.filters.cameras.filter((item) => item !== camera)
              : [...s.filters.cameras, camera],
          },
        })),
      setConfidence: (confidence) => set((s) => ({ filters: { ...s.filters, confidence } })),
      setDateFrom: (dateFrom) => set((s) => ({ filters: { ...s.filters, dateFrom } })),
      setDateTo: (dateTo) => set((s) => ({ filters: { ...s.filters, dateTo } })),
      clearFilters: () => set({ filters: emptyFilters }),

      setChatOpen: (chatOpen) => set({ chatOpen }),
      openFilters: () => set({ filtersOpen: true }),
      closeFilters: () => set({ filtersOpen: false }),
      openCameras: () => set({ camerasOpen: true }),
      closeCameras: () => set({ camerasOpen: false }),

      runSearch: async (text) => {
        const trimmed = text.trim();
        if (!trimmed) {
          set({ query: text });
          return;
        }
        // The thread opens right away with the query and a thinking bubble, so Results
        // can lay itself out while the RAG searches.
        set((s) => ({
          query: trimmed,
          lastSearch: trimmed,
          searchPending: true,
          searchError: null,
          chats: { ...s.chats, results: [{ role: "user", text: trimmed }, THINKING] },
        }));
        // A newer search started meanwhile: its answer wins, this one is dropped.
        const superseded = () => get().lastSearch !== trimmed;
        try {
          const { clips, summary } = await searchClips(trimmed);
          if (superseded()) return;
          // The summary cites its sources as [n]: list them under it, in citation order.
          const citations = citedRefs(summary)
            .map((ref) => clips.find((clip) => clip.ref === ref)?.id)
            .filter((id): id is string => id !== undefined);
          set((s) => ({
            results: clips,
            searchPending: false,
            chats: settlePending(s.chats, "results", {
              role: "agent",
              text: summary,
              ...(citations.length ? { citations } : {}),
            }),
          }));
        } catch (error) {
          if (superseded()) return;
          set({
            searchPending: false,
            searchError: error instanceof Error ? error.message : "Search failed.",
          });
        }
      },

      starters: {},
      startersPending: {},

      loadStarters: async (key, focusId) => {
        const state = get();
        // Mid-search, `results` still holds the previous search: wait for the new one.
        if (state.searchPending) return;
        const id = startersKey(key, focusId, state.query);
        if (id in state.starters) return;
        const context = assistantContext(state, key, focusId);
        if (!context) return;
        // Mark in flight: nothing to show yet, and no duplicate request.
        set((s) => ({
          starters: { ...s.starters, [id]: [] },
          startersPending: { ...s.startersPending, [id]: true },
        }));
        const settled = (pending: Record<string, true>) => {
          const rest = { ...pending };
          delete rest[id];
          return rest;
        };
        try {
          const { suggested_questions } = await suggestQuestions({
            query: state.query,
            scope: focusId ? "moment" : "results",
            focus_moment_id: focusId,
            moments: context.moments.map(clipToAssistantMoment),
            history: context.history,
          });
          set((s) => ({
            starters: { ...s.starters, [id]: suggested_questions },
            startersPending: settled(s.startersPending),
          }));
        } catch {
          // Forget the failed attempt so the next visit to this context retries.
          set((s) => {
            const starters = { ...s.starters };
            delete starters[id];
            return { starters, startersPending: settled(s.startersPending) };
          });
        }
      },

      askInResults: (question, focusId = null) => get().ask("results", question, focusId),

      askAboutClip: (clipId, question) => get().ask(clipId, question, clipId),

      ask: async (key, question, focusId) => {
        const trimmed = question.trim();
        const state = get();
        const thread = state.chats[key] ?? [];
        // One question at a time per thread, like a real chat.
        if (!trimmed || thread.some((message) => message.status === "pending")) return;

        const context = assistantContext(state, key, focusId);
        if (!context) return;
        const { moments, history } = context;

        const focus = focusId ?? undefined;
        set((s) => ({
          chats: pushMessages(s.chats, key, [{ role: "user", text: trimmed, focus }, THINKING]),
        }));

        try {
          const response = await askAssistant({
            query: state.query,
            question: trimmed,
            scope: focusId ? "moment" : "results",
            focus_moment_id: focusId,
            moments: moments.map(clipToAssistantMoment),
            history,
          });
          // Never trust an id we didn't send.
          const known = new Set(moments.map((clip) => clip.id));
          const citations = response.citations
            .map((citation) => citation.moment_id)
            .filter((id) => known.has(id));
          set((s) => ({
            chats: settlePending(s.chats, key, {
              role: "agent",
              text: response.answer,
              citations,
              relatedId: citations[0],
              suggestions: response.suggested_questions,
              focus,
            }),
          }));
        } catch {
          set((s) => ({
            chats: settlePending(s.chats, key, {
              role: "agent",
              text: ASSISTANT_FAILED,
              status: "error",
            }),
          }));
        }
      },

      seedClipChat: async (clipId, query) => {
        const state = get();
        const id = chatKey(clipId);
        // Seed once, only for a clip we know, and only when there was a search to ask about:
        // the backend answers the original search about this clip (no local summary).
        if (state.chats[id]?.length || !state.knownClips[id] || !query.trim()) return;
        await get().ask(id, query, id);
      },

      rememberClip: (clip) => set((s) => ({ knownClips: { ...s.knownClips, [clip.id]: clip } })),

      resetChat: (key) => set((s) => ({ chats: { ...s.chats, [chatKey(key)]: [] } })),

      setUploadCamera: (uploadCamera) => set({ uploadCamera }),
      setUploadScope: (uploadScope) => set({ uploadScope }),
      setUploadModel: (uploadModel) => set({ uploadModel }),
      setUploadTarget: (uploadTarget) => set({ uploadTarget }),
      setRemoteEndpoint: (remoteEndpoint) => set({ remoteEndpoint }),

      submitAnnotationJob: () =>
        set((s) => {
          const id = s.nextJobId + 1;
          const job: PipelineJob = {
            id,
            filename: `${s.uploadCamera}_2026-08-19_${s.uploadScope === "full" ? "raw" : "clip"}.mp4`,
            camera: s.uploadCamera,
            duration: s.uploadScope === "full" ? "—" : "00:00",
            model: s.uploadModel,
            target: s.uploadTarget,
            status: "pending",
            progress: 0,
          };
          return { pipelineJobs: [...s.pipelineJobs, job], nextJobId: id };
        }),

      advancePipeline: () =>
        set((s) => {
          let jobs = s.pipelineJobs.map((job) => {
            if (job.status !== "processing") return job;
            const next = Math.min(100, job.progress + 6 + Math.round(Math.random() * 10));
            return next >= 100
              ? { ...job, progress: 100, status: "done" as const }
              : { ...job, progress: next };
          });

          const processing = jobs.filter((job) => job.status === "processing").length;
          if (processing < MAX_CONCURRENT_JOBS) {
            const nextPending = jobs.find((job) => job.status === "pending");
            if (nextPending) {
              jobs = jobs.map((job) =>
                job.id === nextPending.id ? { ...job, status: "processing" as const } : job,
              );
            }
          }

          return { pipelineJobs: jobs };
        }),
    }),
    {
      name: "cctv-ai:state",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ searchMode: s.searchMode }),
    },
  ),
);

/**
 * The theme is persisted under its own key so the `beforeInteractive` script can
 * read it without parsing the whole store payload — that script runs before any
 * JS bundle, which is what keeps the first paint flash-free.
 */
export function persistTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Private mode or a storage-disabled browser: the theme still applies for this session.
  }
}
