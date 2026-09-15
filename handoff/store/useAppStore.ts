import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Theme = "dark" | "light";
export type View = "dashboard" | "results" | "detail" | "saved" | "reports" | "pipeline";
export type SearchMode = "nlq" | "classic";
export type ResultsMode = "grid" | "timeline";

export interface Filters {
  cameras: string[];
  tags: string[];
  confidence: number;
  dateFrom: string;
  dateTo: string;
}

export interface ChatMessage {
  role: "user" | "agent";
  text: string;
  relatedId?: number;
}

interface AppState {
  theme: Theme;
  view: View;
  searchMode: SearchMode;
  query: string;
  filters: Filters;
  resultsMode: ResultsMode;
  selectedClipId: number | null;
  chats: Record<string, ChatMessage[]>;
  chatOpen: boolean;
  filtersOpen: boolean;
  settingsOpen: boolean;
  camerasOpen: boolean;
  precinct: string;

  setTheme: (theme: Theme) => void;
  setView: (view: View) => void;
  setSearchMode: (mode: SearchMode) => void;
  setQuery: (query: string) => void;
  setCameras: (cameras: string[]) => void;
  addTag: (tag: string) => void;
  toggleTag: (tag: string) => void;
  toggleCamera: (camera: string) => void;
  setConfidence: (value: number) => void;
  setResultsMode: (mode: ResultsMode) => void;
  openClip: (id: number) => void;
  setChatOpen: (open: boolean) => void;
  openFilters: () => void;
  closeFilters: () => void;
  pushChat: (key: string, message: ChatMessage) => void;
  resetChat: (key: string) => void;
}

const EMPTY_FILTERS: Filters = { cameras: [], tags: [], confidence: 0, dateFrom: "", dateTo: "" };

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: "dark",
      view: "dashboard",
      searchMode: "nlq",
      query: "",
      filters: EMPTY_FILTERS,
      resultsMode: "grid",
      selectedClipId: null,
      chats: {},
      chatOpen: false, // the assistant is hidden until "Ask more"
      filtersOpen: false,
      settingsOpen: false,
      camerasOpen: false,
      precinct: "Precinct 04",

      setTheme: (theme) => {
        document.documentElement.setAttribute("data-theme", theme);
        set({ theme });
      },
      setView: (view) => set({ view }),
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
              ? s.filters.tags.filter((t) => t !== tag)
              : [...s.filters.tags, tag],
          },
        })),
      toggleCamera: (camera) =>
        set((s) => ({
          filters: {
            ...s.filters,
            cameras: s.filters.cameras.includes(camera)
              ? s.filters.cameras.filter((c) => c !== camera)
              : [...s.filters.cameras, camera],
          },
        })),
      setConfidence: (confidence) => set((s) => ({ filters: { ...s.filters, confidence } })),
      setResultsMode: (resultsMode) => set({ resultsMode }),
      openClip: (selectedClipId) => set({ selectedClipId, view: "detail", chatOpen: false }),
      setChatOpen: (chatOpen) => set({ chatOpen }),
      openFilters: () => set({ filtersOpen: true }),
      closeFilters: () => set({ filtersOpen: false }),
      pushChat: (key, message) =>
        set((s) => ({ chats: { ...s.chats, [key]: [...(s.chats[key] ?? []), message] } })),
      resetChat: (key) => set((s) => ({ chats: { ...s.chats, [key]: [] } })),
    }),
    {
      name: "cctv-ai:state",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ theme: s.theme, searchMode: s.searchMode, precinct: s.precinct }),
    },
  ),
);
