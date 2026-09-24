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
import { LandingPage } from "@/components/landing/LandingPage";
import { LoginScreen } from "@/components/login/LoginScreen";
import { CamerasModal } from "@/components/modals/CamerasModal";
import { SettingsScreen } from "@/components/settings/SettingsScreen";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { recentQueries } from "@/data/recentQueries";
import { savedQueries } from "@/data/savedQueries";
import { clipSuggestedQuestions, resultsSuggestedQuestions } from "@/data/suggestedQuestions";
import {
  askAssistant,
  deleteSavedQuery,
  getSavedQueries,
  getTracks,
  saveQuery,
  searchClips,
} from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/client";
import { getAllClips } from "@/lib/clips";
import { useAppStore } from "@/store/useAppStore";
import type { TracksQuery } from "@/lib/api/endpoints";
import type { AssistantAskRequest, AssistantAskResponse } from "@/lib/api/types";
import type { Clip } from "@/types";

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
  // Object tracks from the simulation, instantly.
  getTracks: vi.fn(async (query: TracksQuery) => {
    const { simulateTracks } = await import("@/lib/api/mocks/tracks");
    return simulateTracks(query);
  }),
  // The simulated backend, answering instantly so tests don't wait on its latency.
  askAssistant: vi.fn(async (request: AssistantAskRequest) => {
    const { answerQuestion } = await import("@/lib/api/mocks/assistant");
    return answerQuestion(request);
  }),
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
  vi.mocked(askAssistant).mockClear();
  vi.mocked(deleteSavedQuery).mockClear();
  vi.mocked(searchClips).mockClear();
});

describe("Landing", () => {
  it("uses the same brand lockup as the app shell", () => {
    render(<LandingPage />);

    const header = screen.getByRole("banner");
    expect(within(header).getByLabelText("CCTV AI Assistant")).toBeInTheDocument();
  });
});

describe("Login", () => {
  it("uses the same brand lockup as the app shell", () => {
    render(<LoginScreen />);

    expect(screen.getByLabelText("CCTV AI Assistant")).toBeInTheDocument();
  });

  it("links the logo back to the landing page", () => {
    render(<LoginScreen />);

    expect(screen.getByRole("link", { name: "CCTV AI Assistant" })).toHaveAttribute("href", "/");
  });
});

describe("Dashboard", () => {
  it("links the search-mode hint to the settings page", () => {
    render(<QueryComposer />);

    expect(screen.getByRole("link", { name: /change in settings/ })).toHaveAttribute(
      "href",
      "/settings",
    );
  });

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

    expect(pushMock).toHaveBeenCalledWith("/results?q=red+car");
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

  it("labels the matching-moments strip and explains what picking one does", async () => {
    await act(() => useAppStore.getState().runSearch("red car"));
    render(<ResultsScreen />);

    const heading = screen.getByRole("heading", { name: /MATCHING MOMENTS/ });
    expect(heading).toHaveTextContent(/TOP \d+/);
    expect(heading.className).toContain("font-bold");
    expect(screen.getByText(/play its footage/i)).toBeInTheDocument();
  });

  it("clears a selection from inside the selected moment", async () => {
    const user = userEvent.setup();
    await act(() => useAppStore.getState().runSearch("red car"));
    render(<ResultsScreen />);

    expect(screen.queryByRole("button", { name: "Deselect" })).not.toBeInTheDocument();

    const topMatch = [...getAllClips()].sort((a, b) => b.confidence - a.confidence)[0];
    const card = screen.getByText(topMatch.ts).closest("button")!;
    await user.click(card);

    const clear = within(card.parentElement!).getByRole("button", { name: "Deselect" });
    expect(screen.getAllByRole("button", { name: "Deselect" })).toHaveLength(1);

    await user.click(clear);

    expect(screen.getByText("Top 5 matches")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Deselect" })).not.toBeInTheDocument();
  });

  it("expands the video by collapsing the chat, then brings the chat back as it was", async () => {
    const user = userEvent.setup();
    await act(() => useAppStore.getState().runSearch("red car"));
    render(<ResultsScreen />);

    await user.type(screen.getByPlaceholderText("Ask a follow-up question…"), "half-typed");
    const toggle = screen.getByRole("button", { name: "Expand video" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("group", { name: "Your query" })).not.toBeInTheDocument();

    await user.click(toggle);

    expect(screen.getByRole("group", { name: "Your query" })).toBeVisible();
    // Hidden, not unmounted: the draft survives.
    expect(screen.getByPlaceholderText("Ask a follow-up question…")).toHaveValue("half-typed");
  });

  it("offers a floating chat button while collapsed, which restores the chat", async () => {
    const user = userEvent.setup();
    await act(() => useAppStore.getState().runSearch("red car"));
    render(<ResultsScreen />);

    expect(screen.queryByRole("button", { name: "Show chat" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Expand video" }));

    await user.click(screen.getByRole("button", { name: "Show chat" }));

    expect(screen.getByRole("group", { name: "Your query" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Show chat" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expand video" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("draws the chunk metadata on the palette's floating surface, not a fixed colour", async () => {
    const user = userEvent.setup();
    await act(() => useAppStore.getState().runSearch("red car"));
    render(<ResultsScreen />);

    await user.click(screen.getByRole("button", { name: "Show chunk metadata" }));

    const panel = screen.getByRole("region", { name: "Chunk metadata" });
    expect(panel).toHaveClass("glass-panel");
    expect(panel.className).not.toMatch(/rgba\(|bg-\[/);
    expect(within(panel).getByText("CHUNK METADATA")).toHaveClass("text-ink-2");
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

describe("Results — query in the URL", () => {
  it("re-runs the search from ?q= when the page is loaded directly (refresh, shared link)", async () => {
    render(<ResultsScreen urlQuery="red car" />);

    expect(searchClips).toHaveBeenCalledExactlyOnceWith("red car");
    const box = await screen.findByRole("group", { name: "Your query" });
    expect(within(box).getByText("red car")).toBeInTheDocument();
  });

  it("does not search twice when arriving from a search that already ran", async () => {
    await act(() => useAppStore.getState().runSearch("red car"));
    vi.mocked(searchClips).mockClear();

    render(<ResultsScreen urlQuery="red car" />);

    expect(searchClips).not.toHaveBeenCalled();
  });

  it("follows the URL when it changes (back / forward)", async () => {
    const { rerender } = render(<ResultsScreen urlQuery="red car" />);
    await screen.findByRole("group", { name: "Your query" });

    rerender(<ResultsScreen urlQuery="loitering" />);

    expect(searchClips).toHaveBeenLastCalledWith("loitering");
  });
});

describe("Results — assistant", () => {
  beforeEach(async () => {
    await act(() => useAppStore.getState().runSearch("red car"));
  });

  const topMatch = () => [...getAllClips()].sort((a, b) => b.confidence - a.confidence)[0];

  it("offers suggested questions under the search summary", () => {
    render(<ResultsScreen />);

    for (const question of resultsSuggestedQuestions) {
      expect(screen.getByRole("button", { name: question })).toBeInTheDocument();
    }
  });

  it("sends the search, the question and the moments on screen as context", async () => {
    const user = userEvent.setup();
    render(<ResultsScreen />);

    await user.click(
      screen.getByRole("button", { name: "Show only the highest-confidence event" }),
    );

    const request = vi.mocked(askAssistant).mock.calls[0][0];
    expect(request).toMatchObject({
      query: "red car",
      question: "Show only the highest-confidence event",
      scope: "results",
      focus_moment_id: null,
    });
    expect(request.moments.map((m) => m.moment_id)).toContain(topMatch().id);
    expect(request.history.at(-1)).toMatchObject({ role: "assistant" });
  });

  it("shows the question, a thinking state, then the answer with its cited moment", async () => {
    const user = userEvent.setup();
    let reply: (value: AssistantAskResponse) => void = () => {};
    vi.mocked(askAssistant).mockImplementationOnce(
      () => new Promise((resolve) => (reply = resolve)),
    );
    render(<ResultsScreen />);

    await user.click(
      screen.getByRole("button", { name: "Show only the highest-confidence event" }),
    );

    expect(screen.getByText("Show only the highest-confidence event")).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Assistant is thinking" })).toBeInTheDocument();

    await act(async () =>
      reply({
        answer: "This is the strongest match.",
        citations: [{ moment_id: topMatch().id }],
        suggested_questions: ["What's the most recent match?"],
      }),
    );

    expect(screen.getByText("This is the strongest match.")).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Assistant is thinking" })).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "What's the most recent match?" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: new RegExp(`^Jump to ${topMatch().ts}`) }));
    expect(screen.getByText(`${topMatch().camera} · ${topMatch().ts}`)).toBeInTheDocument();
  });

  it("switches to moment questions once a moment is selected", async () => {
    const user = userEvent.setup();
    render(<ResultsScreen />);

    await user.click(screen.getByText(topMatch().ts).closest("button")!);

    for (const question of clipSuggestedQuestions) {
      expect(screen.getByRole("button", { name: question })).toBeInTheDocument();
    }
    await user.click(screen.getByRole("button", { name: clipSuggestedQuestions[0] }));
    expect(vi.mocked(askAssistant).mock.calls[0][0]).toMatchObject({
      scope: "moment",
      focus_moment_id: topMatch().id,
    });
  });

  it("keeps the same conversation when a moment is selected", async () => {
    const user = userEvent.setup();
    render(<ResultsScreen />);
    const summary = useAppStore.getState().chats.results[1].text;

    await user.click(screen.getByText(topMatch().ts).closest("button")!);

    expect(screen.getByText(summary)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save query" })).toBeInTheDocument();
  });

  it("asks about the selected moment inside that same thread, and labels the question", async () => {
    const user = userEvent.setup();
    render(<ResultsScreen />);

    await user.click(screen.getByText(topMatch().ts).closest("button")!);
    await user.click(screen.getByRole("button", { name: clipSuggestedQuestions[0] }));

    const request = vi.mocked(askAssistant).mock.calls[0][0];
    expect(request.history.map((turn) => turn.text)).toContain("red car");
    const thread = useAppStore.getState().chats.results;
    expect(thread.at(-2)).toMatchObject({ role: "user", text: clipSuggestedQuestions[0] });
    // The question bubble carries the selected moment's card: thumbnail, score, title, camera, time.
    const bubble = screen.getByRole("group", { name: "Question about a moment" });
    expect(within(bubble).getByText(clipSuggestedQuestions[0])).toBeInTheDocument();
    expect(within(bubble).getByText(`${topMatch().confidence}%`)).toBeInTheDocument();
    expect(within(bubble).getByText(topMatch().action)).toBeInTheDocument();
    expect(within(bubble).getByText(topMatch().camera)).toBeInTheDocument();
    expect(within(bubble).getByText(topMatch().ts)).toBeInTheDocument();
    expect(useAppStore.getState().chats[topMatch().id]).toBeUndefined();
  });

  it("jumps back to the moment from the card in the question bubble", async () => {
    const user = userEvent.setup();
    render(<ResultsScreen />);

    await user.click(screen.getByText(topMatch().ts).closest("button")!);
    await user.click(screen.getByRole("button", { name: clipSuggestedQuestions[0] }));
    await screen.findAllByRole("button", { name: /^Jump to / });
    await user.click(screen.getByRole("button", { name: "Deselect" }));

    const bubble = screen.getByRole("group", { name: "Question about a moment" });
    await user.click(within(bubble).getByRole("button"));

    expect(screen.getByText(`${topMatch().camera} · ${topMatch().ts}`)).toBeInTheDocument();
  });

  it("brings back the results suggestions once the selection is cleared", async () => {
    const user = userEvent.setup();
    render(<ResultsScreen />);

    await user.click(screen.getByText(topMatch().ts).closest("button")!);
    await user.click(screen.getByRole("button", { name: clipSuggestedQuestions[0] }));
    await screen.findAllByRole("button", { name: /^Jump to / });
    await user.click(screen.getByRole("button", { name: "Deselect" }));

    expect(
      screen.queryByRole("button", { name: clipSuggestedQuestions[1] }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: resultsSuggestedQuestions[0] })).toBeInTheDocument();
  });

  it("says so when the assistant cannot answer", async () => {
    const user = userEvent.setup();
    vi.mocked(askAssistant).mockRejectedValueOnce(new Error("503"));
    render(<ResultsScreen />);

    await user.click(screen.getByRole("button", { name: "What's the most recent match?" }));

    expect(await screen.findByText(/couldn't answer/)).toBeInTheDocument();
  });
});

describe("Results — new query", () => {
  beforeEach(async () => {
    await act(() => useAppStore.getState().runSearch("red car"));
  });

  const queryBox = () => screen.getByRole("group", { name: "Your query" });

  it("shows the running query inside a field with a New Query action", () => {
    render(<ResultsScreen />);

    expect(within(queryBox()).getByText("red car")).toBeInTheDocument();
    expect(within(queryBox()).getByRole("button", { name: "New Query" })).toBeInTheDocument();
  });

  it("opens the search field in a floating dialog, focused and empty", async () => {
    const user = userEvent.setup();
    render(<ResultsScreen />);

    await user.click(screen.getByRole("button", { name: "New Query" }));

    const dialog = screen.getByRole("dialog", { name: "New query" });
    const input = within(dialog).getByRole("textbox", { name: "Search the camera network" });
    expect(input).toHaveValue("");
    expect(input).toHaveFocus();
  });

  it("does not rewrite the current query while the draft is typed or cancelled", async () => {
    const user = userEvent.setup();
    render(<ResultsScreen />);

    await user.click(screen.getByRole("button", { name: "New Query" }));
    await user.keyboard("loitering");
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(useAppStore.getState().query).toBe("red car");
    expect(within(queryBox()).getByText("red car")).toBeInTheDocument();
  });

  it("runs the new search on Enter and closes the dialog", async () => {
    const user = userEvent.setup();
    render(<ResultsScreen />);

    await user.click(screen.getByRole("button", { name: "New Query" }));
    await user.keyboard("loitering at night{Enter}");

    expect(searchClips).toHaveBeenLastCalledWith("loitering at night");
    expect(pushMock).toHaveBeenCalledWith("/results?q=loitering+at+night");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(await within(queryBox()).findByText("loitering at night")).toBeInTheDocument();
  });

  it("drops a clip selection from the previous search", async () => {
    const user = userEvent.setup();
    render(<ResultsScreen />);

    const topMatch = [...getAllClips()].sort((a, b) => b.confidence - a.confidence)[0];
    await user.click(screen.getByText(topMatch.ts).closest("button")!);
    await user.click(screen.getByRole("button", { name: "New Query" }));
    await user.keyboard("loitering{Enter}");

    expect(await screen.findByText("Top 5 matches")).toBeInTheDocument();
  });
});

describe("Results with real footage", () => {
  const moment = (overrides: Partial<Clip>): Clip => ({
    id: "",
    camera: "Unknown",
    code: "Unknown",
    perspective: "Unknown",
    ts: "",
    date: "",
    order: 0,
    confidence: 0,
    tags: [],
    objects: "",
    action: "",
    ...overrides,
  });

  // Chronological strip order: A, B (same video as A), C.
  const clipA = moment({
    id: "a:12",
    action: "Moment A",
    order: 0,
    confidence: 90,
    videoUrl: "https://cdn.test/a.mp4",
    videoId: "a",
    startSeconds: 12,
  });
  const clipB = moment({
    id: "a:40",
    action: "Moment B",
    order: 1,
    confidence: 80,
    videoUrl: "https://cdn.test/a.mp4",
    videoId: "a",
    startSeconds: 40,
  });
  const clipC = moment({
    id: "b:5",
    action: "Moment C",
    order: 2,
    confidence: 70,
    videoUrl: "https://cdn.test/b.mp4",
    videoId: "b",
    startSeconds: 5,
  });

  beforeEach(async () => {
    vi.mocked(searchClips).mockResolvedValueOnce({
      clips: [clipC, clipA, clipB],
      summary: "Three moments found.",
    });
    await act(() => useAppStore.getState().runSearch("red car"));
  });

  const footage = () => screen.getByLabelText("Match footage") as HTMLVideoElement;
  const loadMetadata = (video: HTMLVideoElement) =>
    act(() => {
      video.dispatchEvent(new Event("loadedmetadata"));
    });

  it("opens on the first top match's video, cued to its moment", async () => {
    render(<ResultsScreen />);

    const video = footage();
    expect(video.getAttribute("src")).toBe("https://cdn.test/a.mp4");
    await loadMetadata(video);
    expect(video.currentTime).toBe(12);
  });

  it("lays each moment out as title, camera, then time — with only the score on the thumbnail", () => {
    useAppStore.setState({
      results: [
        { ...clipA, eventName: "Vehicle arrival", camera: "G328", ts: "14:02:10" },
        clipB,
        clipC,
      ],
    });
    render(<ResultsScreen />);

    const named = screen.getByRole("button", { name: /Vehicle arrival/ });
    expect(within(named).queryByText("Moment A")).not.toBeInTheDocument();
    expect(within(named).getAllByText("G328")).toHaveLength(1);
    expect(within(named).getAllByText("14:02:10")).toHaveLength(1);
    expect(within(named).getByText("90%")).toBeInTheDocument();

    // No event name: the description stands in as the title.
    expect(screen.getByRole("button", { name: /Moment B/ })).toBeInTheDocument();
  });

  it("highlights the tracked object over the footage, flagged as simulated", async () => {
    render(<ResultsScreen />);
    await loadMetadata(footage());

    expect(getTracks).toHaveBeenLastCalledWith(
      expect.objectContaining({ video_id: "a", start_seconds: 12 }),
    );
    const overlay = await screen.findByRole("img", { name: /^Detected objects/ });
    await vi.waitFor(() => expect(overlay.querySelector("rect")).not.toBeNull());
    expect(within(overlay).getByText(/SIMULATED/)).toBeInTheDocument();
  });

  it("keeps the assistant on the query thread until a match is picked", () => {
    render(<ResultsScreen />);

    expect(screen.getByText("Top 5 matches")).toBeInTheDocument();
  });

  it("loads the selected match's video and cues its moment", async () => {
    const user = userEvent.setup();
    render(<ResultsScreen />);

    await user.click(screen.getByText("Moment C").closest("button")!);

    const video = footage();
    expect(video.getAttribute("src")).toBe("https://cdn.test/b.mp4");
    await loadMetadata(video);
    expect(video.currentTime).toBe(5);
  });

  it("seeks within the loaded video when the match shares it", async () => {
    const user = userEvent.setup();
    render(<ResultsScreen />);
    await loadMetadata(footage());

    await user.click(screen.getByText("Moment B").closest("button")!);

    expect(footage().getAttribute("src")).toBe("https://cdn.test/a.mp4");
    expect(footage().currentTime).toBe(40);
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

  it("seeds and answers for a clip that only exists in the API, not the demo set", async () => {
    const user = userEvent.setup();
    const apiClip = { ...clip, id: "evt-api-only" };
    useAppStore.setState({ query: "red car", chatOpen: true });
    render(<ClipDetailScreen clip={apiClip} />);

    const thread = useAppStore.getState().chats["evt-api-only"] ?? [];
    expect(thread[0]).toMatchObject({ role: "user", text: "red car" });
    expect(thread[1]?.role).toBe("agent");

    await user.click(await screen.findByRole("button", { name: clipSuggestedQuestions[0] }));

    const request = vi.mocked(askAssistant).mock.calls[0][0];
    expect(request).toMatchObject({ scope: "moment", focus_moment_id: "evt-api-only" });
    expect(request.moments.map((m) => m.moment_id)).toContain("evt-api-only");
    const assistant = screen.getByRole("complementary", { name: "Query Assistant" });
    expect(await within(assistant).findByText(clipSuggestedQuestions[0])).toBeInTheDocument();
    await vi.waitFor(() =>
      expect(useAppStore.getState().chats["evt-api-only"]?.at(-1)?.status).toBeUndefined(),
    );
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

    expect(pushMock).toHaveBeenCalledWith(expect.stringMatching(/^\/results\?q=.*red\+car/));
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

    expect(await screen.findByText(/has the most matches with/)).toBeInTheDocument();
  });

  it("offers follow-up questions under the latest answer", async () => {
    const user = userEvent.setup();
    useAppStore.setState({ chatOpen: true });
    render(<QueryAssistant chatKey="results" suggestedQuestions={resultsSuggestedQuestions} />);

    await user.click(screen.getByRole("button", { name: "Which camera has the most matches?" }));
    await screen.findByText(/has the most matches with/);

    expect(
      screen.queryByRole("button", { name: "Which camera has the most matches?" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "What's the most recent match?" }),
    ).toBeInTheDocument();
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
    expect(screen.queryByText(/precinct/i)).not.toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(useAppStore.getState().camerasOpen).toBe(false);
  });

  it("offers the Soft Linen and Soft Lavender palettes and applies them", async () => {
    const user = userEvent.setup();
    useAppStore.setState({ theme: "dark" });
    render(
      <ThemeProvider>
        <SettingsScreen />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole("radio", { name: /^Soft linen/ }));

    expect(screen.getByRole("radio", { name: /^Soft linen/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(document.documentElement.getAttribute("data-palette")).toBe("linen");
    expect(localStorage.getItem("cctvai.palette")).toBe("linen");

    await user.click(screen.getByRole("radio", { name: /^Soft lavender/ }));
    expect(document.documentElement.getAttribute("data-palette")).toBe("lavender");

    for (const [label, id] of [
      [/^Midnight magic/, "magic"],
      [/^Deep blue sea/, "sea"],
      [/^Midnight blues/, "blues"],
    ] as const) {
      await user.click(screen.getByRole("radio", { name: label }));
      expect(document.documentElement.getAttribute("data-palette")).toBe(id);
    }
  });

  it("is a page with its own sections, not a dialog", () => {
    render(<SettingsScreen />);

    expect(screen.getByRole("heading", { level: 1, name: "Settings" })).toBeInTheDocument();
    for (const section of ["Search mode", "Appearance"]) {
      expect(screen.getByRole("heading", { level: 2, name: section })).toBeInTheDocument();
    }
    // MEVA is a single facility: there is no precinct to pick.
    expect(screen.queryByRole("radiogroup", { name: "Precinct" })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("switches the search mode from settings", async () => {
    const user = userEvent.setup();
    render(<SettingsScreen />);

    await user.click(screen.getByRole("radio", { name: /Classic filters/ }));

    expect(useAppStore.getState().searchMode).toBe("classic");
  });
});
