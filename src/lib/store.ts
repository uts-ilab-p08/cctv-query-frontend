import { create } from "zustand";

import { defaultAnnotationModel } from "@/data/models";
import { initialPipelineJobs, jobIdSeed } from "@/data/pipelineJobs";
import { defaultPrecinct } from "@/data/precincts";
import { answerForClip, answerForResults, summarizeClip, summarizeResults } from "@/lib/assistant";
import { getAllClips, getClipById } from "@/lib/clips";
import { emptyFilters, filterClips } from "@/lib/filters";
import type {
  ChatKey,
  ChatMessage,
  Clip,
  ClipTag,
  ExecutionTarget,
  Filters,
  PipelineJob,
  ResultsViewMode,
  SearchMode,
  UploadScope,
} from "@/types";

/** Maximum jobs the pipeline runs concurrently. */
export const MAX_CONCURRENT_JOBS = 2;

type ModalName = "filters" | "settings" | "cameras";

interface AppState {
  queryText: string;
  searchMode: SearchMode;
  filters: Filters;
  resultsViewMode: ResultsViewMode;
  selectedPrecinct: string;

  chats: Record<string, ChatMessage[]>;

  openModal: ModalName | null;

  pipelineJobs: PipelineJob[];
  nextJobId: number;
  uploadCamera: string;
  uploadScope: UploadScope;
  uploadModel: string;
  uploadTarget: ExecutionTarget;
  remoteEndpoint: string;

  setQueryText: (text: string) => void;
  setSearchMode: (mode: SearchMode) => void;
  setResultsViewMode: (mode: ResultsViewMode) => void;
  setSelectedPrecinct: (precinct: string) => void;

  toggleCameraFilter: (camera: string) => void;
  toggleTagFilter: (tag: ClipTag) => void;
  setConfidenceFilter: (confidence: number) => void;
  setDateFrom: (value: string) => void;
  setDateTo: (value: string) => void;
  clearFilters: () => void;

  setOpenModal: (modal: ModalName | null) => void;

  /** Seed the results thread with the query and the assistant's summary. */
  runSearch: (text: string) => void;
  askInResults: (question: string) => void;
  askAboutClip: (clipId: number, question: string) => void;
  /** Open a clip thread with the user's query and the model's read of the clip. */
  seedClipChat: (clipId: number, queryText: string) => void;
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

export const useAppStore = create<AppState>((set, get) => ({
  queryText: "",
  searchMode: "nlq",
  filters: emptyFilters,
  resultsViewMode: "grid",
  selectedPrecinct: defaultPrecinct,

  chats: {},

  openModal: null,

  pipelineJobs: initialPipelineJobs,
  nextJobId: jobIdSeed,
  uploadCamera: "G299",
  uploadScope: "full",
  uploadModel: defaultAnnotationModel,
  uploadTarget: "Local",
  remoteEndpoint: "",

  setQueryText: (text) => set({ queryText: text }),
  setSearchMode: (mode) => set({ searchMode: mode }),
  setResultsViewMode: (mode) => set({ resultsViewMode: mode }),
  setSelectedPrecinct: (precinct) => set({ selectedPrecinct: precinct }),

  toggleCameraFilter: (camera) =>
    set((state) => ({
      filters: {
        ...state.filters,
        cameras: state.filters.cameras.includes(camera)
          ? state.filters.cameras.filter((item) => item !== camera)
          : [...state.filters.cameras, camera],
      },
    })),

  toggleTagFilter: (tag) =>
    set((state) => ({
      filters: {
        ...state.filters,
        tags: state.filters.tags.includes(tag)
          ? state.filters.tags.filter((item) => item !== tag)
          : [...state.filters.tags, tag],
      },
    })),

  setConfidenceFilter: (confidence) =>
    set((state) => ({ filters: { ...state.filters, confidence } })),
  setDateFrom: (value) => set((state) => ({ filters: { ...state.filters, dateFrom: value } })),
  setDateTo: (value) => set((state) => ({ filters: { ...state.filters, dateTo: value } })),
  clearFilters: () => set({ filters: emptyFilters }),

  setOpenModal: (modal) => set({ openModal: modal }),

  runSearch: (text) => {
    const trimmed = text.trim();
    if (!trimmed) {
      set({ queryText: text });
      return;
    }
    const matches = filterClips(getAllClips(), get().filters);
    set((state) => ({
      queryText: trimmed,
      chats: {
        ...state.chats,
        results: [
          { role: "user", text: trimmed },
          { role: "agent", text: summarizeResults(matches, trimmed) },
        ],
      },
    }));
  },

  askInResults: (question) => {
    const trimmed = question.trim();
    if (!trimmed) return;
    const matches = filterClips(getAllClips(), get().filters);
    const answer = answerForResults(matches, trimmed);
    set((state) => ({
      chats: pushMessages(state.chats, "results", [
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
    set((state) => ({
      chats: pushMessages(state.chats, clipId, [
        { role: "user", text: trimmed },
        { role: "agent", text: answer.text, relatedId: answer.relatedId },
      ]),
    }));
  },

  seedClipChat: (clipId, queryText) =>
    set((state) => {
      const id = chatKey(clipId);
      if (state.chats[id]?.length) return state;
      const clip = getClipById(clipId);
      if (!clip) return state;

      const seeded: ChatMessage[] = [];
      const trimmed = queryText.trim();
      if (trimmed) seeded.push({ role: "user", text: trimmed });
      seeded.push({ role: "agent", text: summarizeClip(clip, trimmed) });

      return { chats: { ...state.chats, [id]: seeded } };
    }),

  resetChat: (key) => set((state) => ({ chats: { ...state.chats, [chatKey(key)]: [] } })),

  setUploadCamera: (camera) => set({ uploadCamera: camera }),
  setUploadScope: (scope) => set({ uploadScope: scope }),
  setUploadModel: (model) => set({ uploadModel: model }),
  setUploadTarget: (target) => set({ uploadTarget: target }),
  setRemoteEndpoint: (endpoint) => set({ remoteEndpoint: endpoint }),

  submitAnnotationJob: () =>
    set((state) => {
      const id = state.nextJobId + 1;
      const job: PipelineJob = {
        id,
        filename: `${state.uploadCamera}_2026-08-19_${state.uploadScope === "full" ? "raw" : "clip"}.mp4`,
        camera: state.uploadCamera,
        duration: state.uploadScope === "full" ? "—" : "00:00",
        model: state.uploadModel,
        target: state.uploadTarget,
        status: "pending",
        progress: 0,
      };
      return { pipelineJobs: [...state.pipelineJobs, job], nextJobId: id };
    }),

  advancePipeline: () =>
    set((state) => {
      let jobs = state.pipelineJobs.map((job) => {
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
}));
