import { emptyFilters } from "@/lib/filters";
import { useAppStore } from "@/store/useAppStore";

const pristine = useAppStore.getState();

/** Reset the shared store so screen tests do not leak state into each other. */
export function resetStore(): void {
  useAppStore.setState({
    query: "",
    searchMode: "nlq",
    filters: emptyFilters,
    precinct: pristine.precinct,
    chats: {},
    chatOpen: false,
    theme: "dark",
    results: [],
    searchPending: false,
    searchError: null,
    filtersOpen: false,
    settingsOpen: false,
    camerasOpen: false,
    pipelineJobs: pristine.pipelineJobs,
    nextJobId: pristine.nextJobId,
    uploadCamera: pristine.uploadCamera,
    uploadScope: "full",
    uploadModel: pristine.uploadModel,
    uploadTarget: "Local",
    remoteEndpoint: "",
  });
}
