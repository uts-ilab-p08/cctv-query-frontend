import { emptyFilters } from "@/lib/filters";
import { useAppStore } from "@/lib/store";

const pristine = useAppStore.getState();

/** Reset the shared store so screen tests do not leak state into each other. */
export function resetStore(): void {
  useAppStore.setState({
    queryText: "",
    searchMode: "nlq",
    filters: emptyFilters,
    resultsViewMode: "grid",
    selectedPrecinct: pristine.selectedPrecinct,
    chats: {},
    openModal: null,
    pipelineJobs: pristine.pipelineJobs,
    nextJobId: pristine.nextJobId,
    uploadCamera: pristine.uploadCamera,
    uploadScope: "full",
    uploadModel: pristine.uploadModel,
    uploadTarget: "Local",
    remoteEndpoint: "",
  });
}
