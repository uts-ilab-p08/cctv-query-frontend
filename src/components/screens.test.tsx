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
import { resultsSuggestedQuestions } from "@/data/suggestedQuestions";
import { getAllClips } from "@/lib/clips";
import { useAppStore } from "@/store/useAppStore";

beforeEach(() => {
  resetStore();
  pushMock.mockClear();
});

describe("Dashboard", () => {
  it("renders the composer and its recent queries", () => {
    render(
      <>
        <QueryComposer />
        <RecentQueries />
      </>,
    );

    expect(screen.getByRole("heading", { name: "Query your camera network" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ask anything/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "RECENT QUERIES" })).toBeInTheDocument();
  });

  it("surfaces keyword chips as the investigator types", async () => {
    const user = userEvent.setup();
    render(<QueryComposer />);

    await user.type(screen.getByPlaceholderText(/Ask anything/), "anyone who entered");

    expect(screen.getByRole("button", { name: /Person/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Entry/ })).toBeInTheDocument();
  });

  it("runs a search and navigates to the results route", async () => {
    const user = userEvent.setup();
    render(<QueryComposer />);

    await user.type(screen.getByPlaceholderText(/Ask anything/), "red car");
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
  it("lists every clip when no filter is active", () => {
    render(<ResultsScreen />);

    expect(screen.getByText(`${getAllClips().length} matches`)).toBeInTheDocument();
    expect(screen.getAllByText("View detail →")).toHaveLength(getAllClips().length);
  });

  it("switches to the timeline view", async () => {
    const user = userEvent.setup();
    render(<ResultsScreen />);

    await user.click(screen.getByRole("button", { name: "Timeline" }));

    expect(useAppStore.getState().resultsMode).toBe("timeline");
    expect(screen.queryByText("View detail →")).not.toBeInTheDocument();
  });

  it("narrows the result count when a filter is applied", () => {
    useAppStore.setState((state) => ({ filters: { ...state.filters, cameras: ["G301"] } }));
    render(<ResultsScreen />);

    expect(screen.getByText("3 matches")).toBeInTheDocument();
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

    const assistant = screen.getByRole("complementary", { name: "Query Assistant" });
    expect(within(assistant).getByText("red car")).toBeInTheDocument();
    expect(within(assistant).getByText(/Matched against "red car"/)).toBeInTheDocument();
  });
});

describe("Saved queries", () => {
  it("re-runs a saved query", async () => {
    const user = userEvent.setup();
    render(<SavedQueriesScreen />);

    expect(screen.getByRole("heading", { name: "Saved Queries" })).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Run again" })[0]);

    expect(pushMock).toHaveBeenCalledWith("/results");
    expect(useAppStore.getState().query).toMatch(/red car/);
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
    render(
      <QueryAssistant
        chatKey="results"
        suggestedQuestions={resultsSuggestedQuestions}
        heightClassName="h-96"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Which camera has the most matches?" }));

    expect(screen.getByText(/has the most matches with/)).toBeInTheDocument();
  });

  it("clears the thread with + New", async () => {
    const user = userEvent.setup();
    render(
      <QueryAssistant
        chatKey="results"
        suggestedQuestions={resultsSuggestedQuestions}
        heightClassName="h-96"
      />,
    );

    await user.click(screen.getByRole("button", { name: "What's the most recent match?" }));
    await user.click(screen.getByRole("button", { name: "+ New" }));

    expect(screen.getByText("Suggested questions")).toBeInTheDocument();
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
