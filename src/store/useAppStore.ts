import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { defaultAnnotationModel } from "@/data/models";
import { initialPipelineJobs, jobIdSeed } from "@/data/pipelineJobs";
import { defaultPrecinct } from "@/data/precincts";
import { answerForClip, answerForResults, summarizeClip } from "@/lib/assistant";
import { searchClips } from "@/lib/api/endpoints";
import { getAllClips, getClipById } from "@/lib/clips";
import { emptyFilters, filterClips } from "@/lib/filters";
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
  askInResults: (question: string) => void;
  askAboutClip: (clipId: string, question: string) => void;
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
                { role: "agent", text: summary },
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

      askInResults: (question) => {
        const trimmed = question.trim();
        if (!trimmed) return;
        const matches = filterClips(getAllClips(), get().filters);
        const answer = answerForResults(matches, trimmed);
        set((s) => ({
          chats: pushMessages(s.chats, "results", [
            { role: "user", text: trimmed },
            { role: "agent", text: answer.text, relatedId: answer.relatedId },
          ]),
        }));
      },

      askAboutClip: (clipId, question) => {
        const trimmed = question.trim();
        if (!trimmed) return;
        const clip: Clip | undefined = getClipById(clipId);
        if (!clip) return;
        const answer = answerForClip(getAllClips(), clip, trimmed);
        set((s) => ({
          chats: pushMessages(s.chats, clipId, [
            { role: "user", text: trimmed },
            { role: "agent", text: answer.text, relatedId: answer.relatedId },
          ]),
        }));
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
          seeded.push({ role: "agent", text: summarizeClip(clip, trimmed) });

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
