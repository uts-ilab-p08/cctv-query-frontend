import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { defaultAnnotationModel } from "@/data/models";
import { initialPipelineJobs, jobIdSeed } from "@/data/pipelineJobs";
import { defaultPrecinct } from "@/data/precincts";
import { clipSuggestedQuestions, resultsSuggestedQuestions } from "@/data/suggestedQuestions";
import { summarizeClip } from "@/lib/assistant";
import { askAssistant, searchClips } from "@/lib/api/endpoints";
import { clipToAssistantMoment } from "@/lib/api/normalize";
import { getAllClips, getClipById } from "@/lib/clips";
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
  precinct: string;

  chats: Record<string, ChatMessage[]>;
  chatOpen: boolean;

  filtersOpen: boolean;
  settingsOpen: boolean;
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
  setPrecinct: (precinct: string) => void;

  setCameras: (cameras: string[]) => void;
  addTag: (tag: ClipTag) => void;
  toggleTag: (tag: ClipTag) => void;
  toggleCamera: (camera: string) => void;
  setConfidence: (value: number) => void;
  setDateFrom: (value: string) => void;
  setDateTo: (value: string) => void;
  clearFilters: () => void;

  setChatOpen: (open: boolean) => void;
  openFilters: () => void;
  closeFilters: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  openCameras: () => void;
  closeCameras: () => void;

  /** Seed the results thread with the query and the assistant's summary. */
  runSearch: (text: string) => Promise<void>;
  /** Clips returned by the last `runSearch` call — what Results renders. */
  results: Clip[];
  searchPending: boolean;
  searchError: string | null;
  /** Ask in the Results thread — about all moments on screen, or about `focusId` when a
   *  moment is selected. The selection narrows the question; it doesn't start a new chat. */
  askInResults: (question: string, focusId?: string | null) => Promise<void>;
  /** Ask the assistant about one moment (that clip's thread). */
  askAboutClip: (clipId: string, question: string) => Promise<void>;
  /** Shared by both scopes; `focusId` null means the whole result set. */
  ask: (key: string, question: string, focusId: string | null) => Promise<void>;
  /** Open a clip thread with the user's query and the model's read of the clip. */
  seedClipChat: (clipId: string, query: string) => void;
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
      precinct: defaultPrecinct,

      chats: {},
      chatOpen: false, // the assistant is hidden until "Ask more"

      results: [],
      searchPending: false,
      searchError: null,

      filtersOpen: false,
      settingsOpen: false,
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
      setPrecinct: (precinct) => set({ precinct }),

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
      openSettings: () => set({ settingsOpen: true }),
      closeSettings: () => set({ settingsOpen: false }),
      openCameras: () => set({ camerasOpen: true }),
      closeCameras: () => set({ camerasOpen: false }),

      runSearch: async (text) => {
        const trimmed = text.trim();
        if (!trimmed) {
          set({ query: text });
          return;
        }
        set({ query: trimmed, searchPending: true, searchError: null });
        try {
          const { clips, summary } = await searchClips(trimmed);
          set((s) => ({
            results: clips,
            searchPending: false,
            chats: {
              ...s.chats,
              results: [
                { role: "user", text: trimmed },
                { role: "agent", text: summary, suggestions: resultsSuggestedQuestions },
              ],
            },
          }));
        } catch (error) {
          set({
            searchPending: false,
            searchError: error instanceof Error ? error.message : "Search failed.",
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

        // The context is what's on screen: the Results strip. Without a live search
        // (the mock-backed detail page) it falls back to the demo clip set.
        const pool = state.results.length ? state.results : getAllClips();
        const moments = topMatches(pool);
        if (focusId && !moments.some((clip) => clip.id === focusId)) {
          const focus = pool.find((clip) => clip.id === focusId) ?? getClipById(focusId);
          if (!focus) return;
          moments.push(focus);
        }

        const history = thread
          .filter((message) => !message.status)
          .map((message) => ({
            role: message.role === "user" ? ("user" as const) : ("assistant" as const),
            text: message.text,
          }));

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

      seedClipChat: (clipId, query) =>
        set((s) => {
          const id = chatKey(clipId);
          if (s.chats[id]?.length) return s;
          const clip = getClipById(clipId);
          if (!clip) return s;

          const seeded: ChatMessage[] = [];
          const trimmed = query.trim();
          if (trimmed) seeded.push({ role: "user", text: trimmed });
          seeded.push({
            role: "agent",
            text: summarizeClip(clip, trimmed),
            suggestions: clipSuggestedQuestions,
          });

          return { chats: { ...s.chats, [id]: seeded } };
        }),

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
      partialize: (s) => ({ searchMode: s.searchMode, precinct: s.precinct }),
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
