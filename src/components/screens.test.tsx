import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { pushMock } from "@/test/setup-router";
import { resetStore } from "@/test/utils";

import { QueryAssistant } from "@/components/assistant/QueryAssistant";
import { ClipDetailScreen } from "@/components/detail/ClipDetailScreen";
import { QueryComposer } from "@/components/dashboard/QueryComposer";
import { RecentQueries } from "@/components/dashboard/RecentQueries";
import { PipelineScreen } from "@/components/pipeline/PipelineScreen";
import { ReportsScreen } from "@/components/reports/ReportsScreen";
import { ResultsScreen } from "@/components/results/ResultsScreen";
import { SavedQueriesScreen } from "@/components/saved/SavedQueriesScreen";
import { CamerasModal } from "@/components/modals/CamerasModal";
import { SettingsModal } from "@/components/modals/SettingsModal";
import { recentQueries } from "@/data/recentQueries";
import { savedQueries } from "@/data/savedQueries";
import { resultsSuggestedQuestions } from "@/data/suggestedQuestions";
import { deleteSavedQuery, getSavedQueries, saveQuery } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/client";
import { getAllClips } from "@/lib/clips";
import { useAppStore } from "@/store/useAppStore";

/**
 * Screen tests exercise the mocked data path only — no network. `searchClips`
 * mirrors the local deterministic assistant so existing assertions (which
 * were written against the mock clip set) keep working; other endpoints
 * return the same static fixtures the mocked screens used before the API
 * integration.
 */
vi.mock("@/lib/api/endpoints", () => ({
  searchClips: vi.fn(async (query: string) => {
    const { filterClips } = await import("@/lib/filters");
    const { summarizeResults } = await import("@/lib/assistant");
    const { getAllClips: getMockClips } = await import("@/lib/clips");
    const { emptyFilters } = await import("@/lib/filters");
    const clips = filterClips(getMockClips(), emptyFilters);
    return { clips, summary: summarizeResults(clips, query) };
  }),
  getClipById: vi.fn(async (id: string) => {
    const { getClipById: getMockClipById } = await import("@/lib/clips");
    return getMockClipById(id);
  }),
  getRelatedClips: vi.fn(async (id: string) => {
    const { getClipById: getMockClipById, getRelatedClips: getMockRelated } =
      await import("@/lib/clips");
    const clip = getMockClipById(id);
    return clip ? getMockRelated(clip) : [];
  }),
  getCameras: vi.fn(async () => {
    const { getCameraDirectory } = await import("@/lib/clips");
    return getCameraDirectory();
  }),
  getRecentQueries: vi.fn(async () => recentQueries),
  getSavedQueries: vi.fn(async () => savedQueries),
  deleteSavedQuery: vi.fn(async () => undefined),
  saveQuery: vi.fn(async (text: string) => ({
    id: "test-saved",
    text,
    savedOn: "just now",
    hits: 0,
  })),
}));

beforeEach(() => {
  resetStore();
  pushMock.mockClear();
  vi.mocked(saveQuery).mockClear();
  vi.mocked(deleteSavedQuery).mockClear();
});

describe("Dashboard", () => {

  it("renders the composer and its recent queries", async () => {
    render(
      <>
        <QueryComposer />
        <RecentQueries />
      </>,
    );

    expect(screen.getByRole("heading", { name: "Query your camera network" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Search the camera network/ })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "RECENT QUERIES" })).toBeInTheDocument();
  });

  it("underlines detected terms inline as the investigator types", async () => {
    const user = userEvent.setup();
    render(<QueryComposer />);

    await user.type(
      screen.getByRole("textbox", { name: /Search the camera network/ }),
      "anyone who entered",
    );

    const tokens = screen
      .getAllByText(/anyone|entered/, { selector: "span" })
      .filter((node) => node.className.includes("border-dashed"));
    expect(tokens).toHaveLength(2);
  });

  it("runs a search and navigates to the results route", async () => {
    const user = userEvent.setup();
    render(<QueryComposer />);

    await user.type(screen.getByRole("textbox", { name: /Search the camera network/ }), "red car");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(pushMock).toHaveBeenCalledWith("/results");
    expect(useAppStore.getState().query).toBe("red car");
  });

  it("does not search on an empty query", async () => {
    const user = userEvent.setup();
    render(<QueryComposer />);

    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(pushMock).not.toHaveBeenCalled();
  });
});

describe("Results", () => {
  it("renders the query panel, video stage and matching-moments strip", async () => {
    await act(() => useAppStore.getState().runSearch("red car"));
    render(<ResultsScreen />);

    expect(screen.getByText("YOUR QUERY")).toBeInTheDocument();
    expect(screen.getByText(/MATCHING/)).toBeInTheDocument();
    expect(screen.getByText("Top 5 matches")).toBeInTheDocument();
  });

  it("selecting a match updates the CONTEXT chip", async () => {
    const user = userEvent.setup();
    await act(() => useAppStore.getState().runSearch("red car"));
    render(<ResultsScreen />);

    const clips = getAllClips();
    const topMatch = [...clips].sort((a, b) => b.confidence - a.confidence)[0];

    const card = screen.getByText(topMatch.ts).closest("button");
    if (!card) throw new Error("match strip card not rendered");
    await user.click(card);

    expect(screen.getByText(`${topMatch.camera} · ${topMatch.ts}`)).toBeInTheDocument();
  });

  it("saves the original query from the bookmark beside its bubble", async () => {
    const user = userEvent.setup();
    await act(() => useAppStore.getState().runSearch("red car"));
    render(<ResultsScreen />);

    await user.click(screen.getByRole("button", { name: "Save query" }));

    expect(saveQuery).toHaveBeenCalledExactlyOnceWith("red car");
    const saved = await screen.findByRole("button", { name: "Query saved" });
    expect(saved).toBeDisabled();
  });

  it("offers the bookmark only on the original query, not on follow-ups", async () => {
    const user = userEvent.setup();
    await act(() => useAppStore.getState().runSearch("red car"));
    render(<ResultsScreen />);

    await user.type(screen.getByPlaceholderText("Ask a follow-up question…"), "how many?{Enter}");

    expect(screen.getAllByRole("button", { name: "Save query" })).toHaveLength(1);
  });

  it("lets the investigator retry when saving fails", async () => {
    const user = userEvent.setup();
    vi.mocked(saveQuery).mockRejectedValueOnce(new Error("boom"));
    await act(() => useAppStore.getState().runSearch("red car"));
    render(<ResultsScreen />);

    await user.click(screen.getByRole("button", { name: "Save query" }));

    const retry = await screen.findByRole("button", { name: "Save failed — retry" });
    await user.click(retry);
    expect(saveQuery).toHaveBeenCalledTimes(2);
    expect(await screen.findByRole("button", { name: "Query saved" })).toBeDisabled();
  });
});

describe("Clip detail", () => {
  const clip = getAllClips()[2];

  it("renders the player, metadata and related clips", () => {
    render(<ClipDetailScreen clip={clip} />);

    expect(screen.getByRole("button", { name: "Play clip" })).toBeInTheDocument();
    expect(screen.getByText("PERSPECTIVE")).toBeInTheDocument();
    expect(screen.getByText(clip.perspective)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "RELATED CLIPS" })).toBeInTheDocument();
  });

  it("seeds the assistant thread with the query and an AI summary", () => {
    useAppStore.setState({ query: "red car" });
    render(<ClipDetailScreen clip={clip} />);

    const thread = useAppStore.getState().chats[String(clip.id)] ?? [];
    expect(thread[0]).toMatchObject({ role: "user", text: "red car" });
    expect(thread[1]?.text).toMatch(/Matched against "red car"/);
  });

  it("keeps the assistant closed until the floating pill is used", async () => {
    const user = userEvent.setup();
    useAppStore.setState({ query: "red car" });
    render(<ClipDetailScreen clip={clip} />);

    expect(
      screen.queryByRole("complementary", { name: "Query Assistant" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Query Assistant/ }));

    const assistant = screen.getByRole("complementary", { name: "Query Assistant" });
    expect(within(assistant).getByText("red car")).toBeInTheDocument();
  });

  it("saves the original query from the assistant thread", async () => {
    const user = userEvent.setup();
    useAppStore.setState({ query: "red car", chatOpen: true });
    render(<ClipDetailScreen clip={clip} />);

    const assistant = screen.getByRole("complementary", { name: "Query Assistant" });
    await user.click(within(assistant).getByRole("button", { name: "Save query" }));

    expect(saveQuery).toHaveBeenCalledExactlyOnceWith("red car");
    expect(await within(assistant).findByRole("button", { name: "Query saved" })).toBeDisabled();
  });
});

describe("Saved queries", () => {
  it("re-runs a saved query", async () => {
    const user = userEvent.setup();
    render(<SavedQueriesScreen />);

    expect(screen.getByRole("heading", { name: "Saved Queries" })).toBeInTheDocument();

    const runAgainButtons = await screen.findAllByRole("button", { name: "Run again" });
    await user.click(runAgainButtons[0]);

    expect(pushMock).toHaveBeenCalledWith("/results");
    expect(useAppStore.getState().query).toMatch(/red car/);
  });

  const firstRow = async () => (await screen.findAllByRole("listitem"))[0];

  it("deletes a saved query after confirming", async () => {
    const user = userEvent.setup();
    render(<SavedQueriesScreen />);
    const row = await firstRow();

    await user.click(within(row).getByRole("button", { name: `Delete "${savedQueries[0].text}"` }));
    expect(deleteSavedQuery).not.toHaveBeenCalled();
    await user.click(within(row).getByRole("button", { name: "Confirm delete" }));

    expect(deleteSavedQuery).toHaveBeenCalledWith(savedQueries[0].id);
    await vi.waitFor(() =>
      expect(screen.queryByText(savedQueries[0].text)).not.toBeInTheDocument(),
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(savedQueries.length - 1);
  });

  it("keeps the query when the confirmation is cancelled", async () => {
    const user = userEvent.setup();
    render(<SavedQueriesScreen />);
    const row = await firstRow();

    await user.click(within(row).getByRole("button", { name: /^Delete "/ }));
    await user.click(within(row).getByRole("button", { name: "Cancel" }));

    expect(deleteSavedQuery).not.toHaveBeenCalled();
    expect(screen.getByText(savedQueries[0].text)).toBeInTheDocument();
  });

  it("treats an already-gone query (404) as deleted", async () => {
    const user = userEvent.setup();
    vi.mocked(deleteSavedQuery).mockRejectedValueOnce(new ApiError(404, "Not found"));
    render(<SavedQueriesScreen />);
    const row = await firstRow();

    await user.click(within(row).getByRole("button", { name: /^Delete "/ }));
    await user.click(within(row).getByRole("button", { name: "Confirm delete" }));

    await vi.waitFor(() =>
      expect(screen.queryByText(savedQueries[0].text)).not.toBeInTheDocument(),
    );
  });

  it("says deleting isn't available while the backend lacks the endpoint", async () => {
    const user = userEvent.setup();
    vi.mocked(deleteSavedQuery).mockRejectedValueOnce(new ApiError(405, "Method Not Allowed"));
    render(<SavedQueriesScreen />);
    const row = await firstRow();

    await user.click(within(row).getByRole("button", { name: /^Delete "/ }));
    await user.click(within(row).getByRole("button", { name: "Confirm delete" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/isn't available yet/);
    expect(screen.getByText(savedQueries[0].text)).toBeInTheDocument();
  });

  it("shows an empty state when nothing has been saved", async () => {
    vi.mocked(getSavedQueries).mockResolvedValueOnce([]);
    render(<SavedQueriesScreen />);

    expect(await screen.findByText(/No saved queries yet/)).toBeInTheDocument();
  });

  it("surfaces a load failure and recovers on retry", async () => {
    const user = userEvent.setup();
    vi.mocked(getSavedQueries).mockRejectedValueOnce(new Error("Invalid or expired token"));
    render(<SavedQueriesScreen />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid or expired token");

    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findAllByRole("button", { name: "Run again" })).toHaveLength(
      savedQueries.length,
    );
  });
});

describe("Reports", () => {
  it("renders the stat cards and the report list", () => {
    render(<ReportsScreen />);

    expect(screen.getByRole("heading", { name: "Reports" })).toBeInTheDocument();
    expect(screen.getByText("ACTIVE CAMERAS")).toBeInTheDocument();
    expect(screen.getByText("8 / 8")).toBeInTheDocument();
    expect(screen.getByText("Weekly Activity Summary")).toBeInTheDocument();
  });
});

describe("Pipeline", () => {
  it("renders the submit form and the seeded queue", () => {
    render(<PipelineScreen />);

    expect(screen.getByRole("heading", { name: "Video Annotation Pipeline" })).toBeInTheDocument();
    expect(screen.getByLabelText("Source camera")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start Annotation" })).toBeInTheDocument();
    expect(screen.getByText("G423_2026-08-17_raw.mp4")).toBeInTheDocument();
  });

  it("reveals the endpoint field only for a remote target", async () => {
    const user = userEvent.setup();
    render(<PipelineScreen />);

    expect(screen.queryByLabelText("Endpoint URL")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remote endpoint" }));

    expect(screen.getByLabelText("Endpoint URL")).toBeInTheDocument();
  });

  it("queues a new job on submit", async () => {
    const user = userEvent.setup();
    render(<PipelineScreen />);

    const before = useAppStore.getState().pipelineJobs.length;
    await user.click(screen.getByRole("button", { name: "Start Annotation" }));

    expect(useAppStore.getState().pipelineJobs).toHaveLength(before + 1);
  });

  it("advances the queue on a tick and never exceeds two processing jobs", () => {
    vi.useFakeTimers();
    render(<PipelineScreen />);

    for (let tick = 0; tick < 40; tick += 1) {
      act(() => {
        vi.advanceTimersByTime(1400);
      });
      const processing = useAppStore
        .getState()
        .pipelineJobs.filter((job) => job.status === "processing").length;
      expect(processing).toBeLessThanOrEqual(2);
    }

    expect(
      useAppStore.getState().pipelineJobs.filter((job) => job.status === "done").length,
    ).toBeGreaterThan(2);

    vi.useRealTimers();
  });
});

describe("Query Assistant", () => {
  it("answers a suggested question in the results thread", async () => {
    const user = userEvent.setup();
    useAppStore.setState({ chatOpen: true });
    render(<QueryAssistant chatKey="results" suggestedQuestions={resultsSuggestedQuestions} />);

    await user.click(screen.getByRole("button", { name: "Which camera has the most matches?" }));

    expect(screen.getByText(/has the most matches with/)).toBeInTheDocument();
  });

  it("clears the thread with + New", async () => {
    const user = userEvent.setup();
    useAppStore.setState({ chatOpen: true });
    render(<QueryAssistant chatKey="results" suggestedQuestions={resultsSuggestedQuestions} />);

    await user.click(screen.getByRole("button", { name: "What's the most recent match?" }));
    await user.click(screen.getByRole("button", { name: "+ New" }));

    expect(screen.getByText("Suggested questions")).toBeInTheDocument();
  });

  it("collapses from the header chevron", async () => {
    const user = userEvent.setup();
    useAppStore.setState({ chatOpen: true });
    render(<QueryAssistant chatKey="results" suggestedQuestions={resultsSuggestedQuestions} />);

    await user.click(screen.getByRole("button", { name: "Collapse assistant" }));

    expect(useAppStore.getState().chatOpen).toBe(false);
    expect(
      screen.queryByRole("complementary", { name: "Query Assistant" }),
    ).not.toBeInTheDocument();
  });
});

describe("Modals", () => {
  it("closes the cameras modal on Escape", async () => {
    const user = userEvent.setup();
    useAppStore.setState({ camerasOpen: true });
    render(<CamerasModal />);

    expect(screen.getByRole("dialog", { name: "Indexed Cameras" })).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(useAppStore.getState().camerasOpen).toBe(false);
  });

  it("switches the search mode from settings", async () => {
    const user = userEvent.setup();
    useAppStore.setState({ settingsOpen: true });
    render(<SettingsModal />);

    await user.click(screen.getByRole("radio", { name: /Classic filters/ }));

    expect(useAppStore.getState().searchMode).toBe("classic");
  });
});
