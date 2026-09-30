import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { pushMock } from "@/test/setup-router";
import { resetStore } from "@/test/utils";

import { QueryAssistant } from "@/components/assistant/QueryAssistant";
import { ClipDetailScreen } from "@/components/detail/ClipDetailScreen";
import { QueryComposer } from "@/components/dashboard/QueryComposer";
import { RecentQueries } from "@/components/dashboard/RecentQueries";
import { PipelineScreen } from "@/components/pipeline/PipelineScreen";
import { ResultsScreen } from "@/components/results/ResultsScreen";
import { SavedQueriesScreen } from "@/components/saved/SavedQueriesScreen";
import { LandingPage } from "@/components/landing/LandingPage";
import { LoginScreen } from "@/components/login/LoginScreen";
import { CamerasModal } from "@/components/modals/CamerasModal";
import { FiltersModal } from "@/components/results/FiltersModal";
import { SettingsScreen } from "@/components/settings/SettingsScreen";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { Toaster } from "@/components/ui/Toaster";
import { useToasts } from "@/lib/toast";
import { recentQueries } from "@/data/recentQueries";
import { savedQueries } from "@/data/savedQueries";
import {
  askAssistant,
  deleteSavedQuery,
  getRecentQueries,
  getSavedQueries,
  getTracks,
  suggestQuestions,
  saveQuery,
  searchClips,
} from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/client";
import { MOMENT_QUESTIONS, RESULTS_QUESTIONS } from "@/lib/api/mocks/assistant";
import { getAllClips } from "@/lib/clips";
import { EXAMPLE_QUESTIONS } from "@/lib/exampleQuestions";
import { resultsHref } from "@/lib/routes";
import { useAppStore } from "@/store/useAppStore";
import type { TracksQuery } from "@/lib/api/endpoints";
import type {
  AssistantAskRequest,
  AssistantAskResponse,
  AssistantSuggestionsRequest,
} from "@/lib/api/types";
import type { Clip, RecentQuery, SavedQuery } from "@/types";

/** The questions the simulated assistant can suggest (it picks those that fit). */
const resultsSuggestedQuestions: string[] = Object.values(RESULTS_QUESTIONS);
const clipSuggestedQuestions: string[] = Object.values(MOMENT_QUESTIONS);

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
    const { getAllClips: getMockClips } = await import("@/lib/clips");
    const { emptyFilters } = await import("@/lib/filters");
    const clips = filterClips(getMockClips(), emptyFilters);
    return { clips, summary: `Found ${clips.length} indexed events matching "${query}".` };
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
  // Context-aware opening questions from the simulation, instantly.
  suggestQuestions: vi.fn(async (request: AssistantSuggestionsRequest) => {
    const { suggestQuestionsFor } = await import("@/lib/api/mocks/assistant");
    return suggestQuestionsFor(request);
  }),
  // Object tracks from the simulation, instantly.
  getTracks: vi.fn(async (query: TracksQuery) => {
    const { simulateTracks } = await import("@/lib/api/mocks/tracks");
    return simulateTracks({ ...query, caption: "" });
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

/** Waits until the Results thread has no answer pending. */
const waitForAnswer = () =>
  vi.waitFor(() =>
    expect(
      (useAppStore.getState().chats.results ?? []).some((message) => message.status === "pending"),
    ).toBe(false),
  );

/** jsdom has no matchMedia, which the app reads as "reduced motion": opt a test into motion. */
function allowMotion() {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: query.includes("no-preference"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

beforeEach(() => {
  resetStore();
  useToasts.setState({ toasts: [] });
  pushMock.mockClear();
  vi.mocked(saveQuery).mockClear();
  vi.mocked(askAssistant).mockClear();
  vi.mocked(deleteSavedQuery).mockClear();
  vi.mocked(suggestQuestions).mockClear();
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
  it("shows the search mode as a settings button that opens Settings", () => {
    render(<QueryComposer />);

    const button = screen.getByRole("link", {
      name: "Natural language mode. Change the search mode in Settings",
    });
    expect(button).toHaveAttribute("href", "/settings");
    expect(button).toHaveTextContent("Natural language mode");
    expect(button).toHaveClass("rounded-full", "border");
    expect(button.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("names the classic mode on the same button", () => {
    useAppStore.setState({ searchMode: "classic" });
    render(<QueryComposer />);

    expect(
      screen.getByRole("link", {
        name: "Classic filters mode. Change the search mode in Settings",
      }),
    ).toHaveTextContent("Classic filters mode");
    expect(screen.getByText(/narrow it with Filters/)).toBeInTheDocument();
  });

  it("renders the composer and its recent queries", async () => {
    render(
      <>
        <QueryComposer />
        <RecentQueries />
      </>,
    );

    expect(screen.getByRole("heading", { name: "Ask your footage" })).toBeInTheDocument();
    expect(screen.getByText(/Describe the moment in plain words/)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Search the camera network/ })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "RECENT QUERIES" })).toBeInTheDocument();
  });

  it("holds the recent queries' place with a skeleton while they load", async () => {
    let resolve: (queries: RecentQuery[]) => void = () => {};
    vi.mocked(getRecentQueries).mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      }),
    );
    render(<RecentQueries />);

    expect(screen.getByRole("heading", { name: "RECENT QUERIES" })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Loading recent queries" })).toBeInTheDocument();

    resolve(recentQueries);

    expect(await screen.findAllByRole("listitem")).not.toHaveLength(0);
    expect(
      screen.queryByRole("status", { name: "Loading recent queries" }),
    ).not.toBeInTheDocument();
  });

  it("spins the recent query that was picked while Results loads, and blocks the others", async () => {
    const user = userEvent.setup();
    pushMock.mockClear();
    render(<RecentQueries />);
    const items = await screen.findAllByRole("button");

    await user.click(items[0]);

    expect(items[0]).toHaveAttribute("aria-busy", "true");
    expect(items[0].querySelector(".animate-spin")).not.toBeNull();
    items.forEach((item) => expect(item).toBeDisabled());

    await user.click(items[1]);
    expect(pushMock).toHaveBeenCalledTimes(1);
  });

  it("drops the section once loading finds no recent queries", async () => {
    vi.mocked(getRecentQueries).mockResolvedValueOnce([]);
    render(<RecentQueries />);

    await vi.waitFor(() =>
      expect(screen.queryByRole("heading", { name: "RECENT QUERIES" })).not.toBeInTheDocument(),
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows at most three recent queries, timed relative to now", async () => {
    const at = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60_000).toISOString();
    vi.mocked(getRecentQueries).mockResolvedValueOnce([
      { id: "a", text: "red car at the gate", ts: at(1), cameras: 2 },
      { id: "b", text: "loitering near the dock", ts: at(10), cameras: 1 },
      { id: "c", text: "people waiting in a room", ts: at(120), cameras: 3 },
      { id: "d", text: "a fourth query", ts: at(300), cameras: 1 },
    ]);
    render(<RecentQueries />);

    const items = await screen.findAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(within(items[0]).getByText("1 min ago")).toBeInTheDocument();
    expect(within(items[1]).getByText("10 min ago")).toBeInTheDocument();
    expect(within(items[2]).getByText("2 hours ago")).toBeInTheDocument();
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

  it("spins the search button while the results page loads, and ignores repeat submits", async () => {
    const user = userEvent.setup();
    pushMock.mockClear();
    render(<QueryComposer />);
    const field = screen.getByRole("textbox", { name: /Search the camera network/ });

    await user.type(field, "red car");
    await user.click(screen.getByRole("button", { name: "Search" }));

    const button = screen.getByRole("button", { name: "Search" });
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toBeDisabled();
    expect(button.querySelector(".animate-spin")).not.toBeNull();

    await user.type(field, "{Enter}");
    expect(pushMock).toHaveBeenCalledTimes(1);
  });

  it("does not search on an empty query", async () => {
    const user = userEvent.setup();
    render(<QueryComposer />);

    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(pushMock).not.toHaveBeenCalled();
  });
});

describe("Results — while the search runs", () => {
  type Search = Awaited<ReturnType<typeof searchClips>>;
  let finishSearch: (result: Search) => void = () => {};

  beforeEach(() => {
    vi.mocked(searchClips).mockReturnValueOnce(
      new Promise((done) => {
        finishSearch = done;
      }),
    );
  });

  const searchResult = (): Search => ({
    clips: getAllClips(),
    summary: "Found the red car at two gates.",
  });

  it("lays out the workspace at once, with the query in the thread and placeholders elsewhere", async () => {
    render(<ResultsScreen urlQuery="red car" />);

    expect(await screen.findByText("YOUR QUERY")).toBeInTheDocument();
    // No full-screen loader: the only "Searching indexed footage…" is the chat's line.
    const searching = screen.getAllByText("Searching indexed footage…");
    expect(searching).toHaveLength(1);
    expect(searching[0].closest('[role="status"]')).toHaveAccessibleName(/^Assistant is thinking/);
    expect(screen.getAllByText("red car").length).toBeGreaterThan(0);
    // /search has no progress stream (yet): one fixed, true line instead of made-up steps.
    expect(
      screen.getByRole("status", { name: "Assistant is thinking: Searching indexed footage…" }),
    ).toHaveTextContent("Searching indexed footage…");
    expect(screen.getByRole("status", { name: "Loading footage" })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Loading matching moments" })).toBeInTheDocument();
  });

  it("spins in the middle of the player's placeholder, like a loading video", async () => {
    render(<ResultsScreen urlQuery="red car" />);

    const stage = await screen.findByRole("status", { name: "Loading footage" });
    const spinner = stage.querySelector(".animate-spin");
    expect(spinner).not.toBeNull();
    // Not inside the pulsing layer: the spinner stays fully opaque.
    expect(spinner!.closest(".animate-pulse")).toBeNull();
  });

  it("fills the thread, the player and the strip once the search answers", async () => {
    render(<ResultsScreen urlQuery="red car" />);
    await screen.findByText("YOUR QUERY");

    await act(async () => finishSearch(searchResult()));

    expect(await screen.findByText("Found the red car at two gates.")).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Loading footage" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("status", { name: "Loading matching moments" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /MATCHING MOMENTS/ })).toBeInTheDocument();
  });

  it("does not fetch opening questions for the previous results while searching", async () => {
    render(<ResultsScreen urlQuery="red car" />);
    await screen.findByText("YOUR QUERY");

    expect(suggestQuestions).not.toHaveBeenCalled();

    await act(async () => finishSearch(searchResult()));
    await vi.waitFor(() => expect(suggestQuestions).toHaveBeenCalledTimes(1));
  });

  it("holds the suggested questions' place until they arrive", async () => {
    let finishSuggestions: (response: { suggested_questions: string[] }) => void = () => {};
    vi.mocked(suggestQuestions).mockReturnValueOnce(
      new Promise((done) => {
        finishSuggestions = done;
      }),
    );
    render(<ResultsScreen urlQuery="red car" />);
    await screen.findByText("YOUR QUERY");
    await act(async () => finishSearch(searchResult()));

    const loading = await screen.findByRole("status", { name: "Loading suggested questions" });
    // Its placeholder sits where the questions will appear: down by the input.
    expect(loading).toHaveClass("mt-auto");
    // Rows shaped like the questions, each with a line of pulsing "text", not empty boxes.
    const rows = loading.querySelectorAll("[data-skeleton-row]");
    expect(rows.length).toBe(3);
    rows.forEach((row) => expect(row.querySelector(".animate-pulse")).not.toBeNull());

    await act(async () => finishSuggestions({ suggested_questions: ["Which gate was first?"] }));

    expect(
      await screen.findByRole("button", { name: "Which gate was first?" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("status", { name: "Loading suggested questions" }),
    ).not.toBeInTheDocument();
  });

  it("drops an answer that arrives after a newer search started", async () => {
    render(<ResultsScreen urlQuery="red car" />);
    await screen.findByText("YOUR QUERY");
    vi.mocked(searchClips).mockResolvedValueOnce({
      clips: getAllClips(),
      summary: "Answer for the newer search.",
    });

    await act(() => useAppStore.getState().runSearch("blue van"));
    await act(async () => finishSearch(searchResult()));

    expect(screen.getByText("Answer for the newer search.")).toBeInTheDocument();
    expect(screen.queryByText("Found the red car at two gates.")).not.toBeInTheDocument();
  });
});

describe("Results — no matches", () => {
  beforeEach(async () => {
    vi.mocked(searchClips).mockResolvedValueOnce({
      clips: [],
      summary: "No matching footage was found for this question.",
    });
    await act(() => useAppStore.getState().runSearch("a helicopter landing on the roof"));
  });

  it("says nothing matched, repeating the search, and explains how to rephrase it", () => {
    render(<ResultsScreen />);

    const empty = screen.getByRole("region", { name: "No matching moments" });
    expect(empty).toHaveTextContent("“a helicopter landing on the roof”");
    const tips = within(empty).getByRole("list", { name: "Search tips" });
    expect(within(tips).getAllByRole("listitem")).toHaveLength(3);
    expect(tips).toHaveTextContent(/action/i);
    expect(tips).toHaveTextContent(/object/i);
    expect(tips).toHaveTextContent(/place/i);
  });

  it("lets the investigator search again right there, starting from the last search", async () => {
    const user = userEvent.setup();
    pushMock.mockClear();
    render(<ResultsScreen />);

    const empty = screen.getByRole("region", { name: "No matching moments" });
    const field = within(empty).getByRole("textbox", { name: /Search the camera network/ });
    expect(field).toHaveValue("a helicopter landing on the roof");

    await user.clear(field);
    await user.type(field, "a person gets out of a car");
    await user.click(within(empty).getByRole("button", { name: "Search" }));

    expect(pushMock).toHaveBeenCalledWith(resultsHref("a person gets out of a car"));
    expect(searchClips).toHaveBeenLastCalledWith("a person gets out of a car");
  });

  it("offers ready-made searches that are known to find footage", () => {
    render(<ResultsScreen />);

    const empty = screen.getByRole("region", { name: "No matching moments" });
    const links = within(
      within(empty).getByRole("list", { name: "Example searches" }),
    ).getAllByRole("link");
    expect(links.length).toBeGreaterThanOrEqual(3);
    links.forEach((link) =>
      expect(link).toHaveAttribute("href", resultsHref(link.textContent ?? "")),
    );
  });
});

describe("Results — sources cited by the answer", () => {
  // The RAG numbers its sources [1], [2]… in the order /search returns them.
  const clips = () => getAllClips().map((clip, index) => ({ ...clip, ref: index + 1 }));
  const label = (clip: Clip) => `${clip.eventName ?? clip.action} · ${clip.camera} · ${clip.ts}`;

  beforeEach(async () => {
    vi.mocked(searchClips).mockResolvedValueOnce({
      clips: clips(),
      summary: "The car passes the gate [1] and then parks [3].",
    });
    await act(() => useAppStore.getState().runSearch("red car"));
  });

  it("turns each [n] in the answer into a chip for that source", () => {
    render(<ResultsScreen />);
    const [first, , third] = clips();

    expect(screen.getByRole("button", { name: `Source 1: ${label(first)}` })).toHaveTextContent(
      "1",
    );
    expect(screen.getByRole("button", { name: `Source 3: ${label(third)}` })).toBeInTheDocument();
    expect(screen.queryByText(/\[1\]/)).not.toBeInTheDocument();
  });

  it("opens the cited moment from its chip", async () => {
    const user = userEvent.setup();
    render(<ResultsScreen />);
    const third = clips()[2];

    await user.click(screen.getByRole("button", { name: `Source 3: ${label(third)}` }));

    expect(screen.getByText(`${third.camera} · ${third.ts}`)).toBeInTheDocument();
  });

  it("lists the cited sources under the answer, numbered like the text", () => {
    render(<ResultsScreen />);
    const [first, , third] = clips();

    const sources = screen.getByRole("group", { name: "Sources" });
    const items = within(sources).getAllByRole("button");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveAccessibleName(`Jump to source 1: ${label(first)}`);
    expect(items[1]).toHaveAccessibleName(`Jump to source 3: ${label(third)}`);
  });

  it("lays the sources out as one row of pills that scrolls sideways", () => {
    render(<ResultsScreen />);

    const row = within(screen.getByRole("group", { name: "Sources" })).getByRole("list");
    expect(row).toHaveClass("flex-nowrap", "overflow-x-auto");
    within(row)
      .getAllByRole("button")
      .forEach((pill) => {
        expect(pill.closest("li")).toHaveClass("shrink-0");
        expect(pill).toHaveClass("rounded-full", "whitespace-nowrap");
      });
  });

  it("keeps the source pills muted, in the palette's neutral tones rather than its accent", () => {
    render(<ResultsScreen />);

    const pills = within(screen.getByRole("group", { name: "Sources" })).getAllByRole("button");
    pills.forEach((pill) => {
      expect(pill).toHaveClass("border-hairline", "text-ink-3");
      expect(pill.className).not.toMatch(/(^|\s)(text|bg|border)-accent/);
      pill
        .querySelectorAll("span")
        .forEach((part) => expect(part.className).not.toMatch(/(^|\s)(text|bg)-accent/));
    });
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

  it("highlights a matching moment's border on hover, and marks the picked one with the accent", async () => {
    const user = userEvent.setup();
    await act(() => useAppStore.getState().runSearch("red car"));
    render(<ResultsScreen />);

    const strip = screen
      .getByRole("heading", { name: /MATCHING MOMENTS/ })
      .closest("div")!.parentElement!;
    const cards = within(strip)
      .getAllByRole("button")
      .filter((button) => button.textContent?.includes("%"));
    cards.forEach((card) => {
      // Styles are classes, not inline, so the hover can override them.
      expect(card.style.borderColor).toBe("");
      expect(card).toHaveClass("group", "hover:border-accent", "hover:bg-accent-soft");
      // Everything stays inside the card: a lift or a bigger shadow gets clipped by the strip.
      expect(card.className).not.toMatch(/hover:(-?translate|shadow)/);
    });

    await user.click(cards[0]);

    const picked = within(strip)
      .getAllByRole("button")
      .filter((button) => button.textContent?.includes("%"))[0];
    expect(picked).toHaveClass("border-accent", "shadow-action");
  });

  it("brings a matching moment's thumbnail back to full colour on hover", async () => {
    await act(() => useAppStore.getState().runSearch("red car"));
    const [first, ...rest] = useAppStore.getState().results;
    useAppStore.setState({
      results: [{ ...first, thumbnailUrl: "https://cdn.test/t.jpg" }, ...rest],
    });
    render(<ResultsScreen />);

    const card = screen.getByText(first.ts, { selector: "div" }).closest("button")!;
    const thumbnail = card.querySelector("img")!;
    expect(thumbnail).toHaveClass("thumb-filter", "group-hover:[filter:none]");
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
    expect(panel).toHaveClass("glass-overlay");
    expect(panel.className).not.toMatch(/rgba\(|bg-\[/);
    expect(within(panel).getByText("CHUNK METADATA")).toHaveClass("text-ink");
  });

  it("shows each moment's scene with its camera, and in the chunk metadata", async () => {
    const user = userEvent.setup();
    await act(() => useAppStore.getState().runSearch("red car"));
    render(<ResultsScreen />);

    const topMatch = [...getAllClips()].sort((a, b) => b.confidence - a.confidence)[0];
    expect(topMatch.scene).toBe("admin");
    const card = screen.getByText(topMatch.ts).closest("button")!;
    expect(within(card).getByText(`· ${topMatch.scene}`)).toBeInTheDocument();

    await user.click(card);
    await user.click(screen.getByRole("button", { name: "Show chunk metadata" }));

    const panel = screen.getByRole("region", { name: "Chunk metadata" });
    expect(within(panel).getByText("SCENE")).toBeInTheDocument();
    expect(within(panel).getByText("admin")).toBeInTheDocument();
  });

  it("shows a moment without footage as a still frame, without faking playback", async () => {
    const user = userEvent.setup();
    await act(() => useAppStore.getState().runSearch("red car"));
    render(<ResultsScreen />);

    expect(screen.getByText("No footage for this moment")).toBeInTheDocument();
    const play = screen.getByRole("button", { name: "Play" });
    expect(play).toBeDisabled();
    await user.click(play);
    expect(screen.queryByRole("button", { name: "Pause" })).not.toBeInTheDocument();
    // No invented wall clock (the old demo window started at 13:55:00).
    expect(screen.queryByText("13:55:00")).not.toBeInTheDocument();
    expect(screen.getAllByText("0:00").length).toBeGreaterThan(0);
  });

  it("never loads a stand-in image from an outside site", async () => {
    await act(() => useAppStore.getState().runSearch("red car"));
    const { container } = render(<ResultsScreen />);

    expect(container.innerHTML).not.toContain("picsum.photos");
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

  it("spins the bookmark while saving, then confirms with a toast linking to Saved Queries", async () => {
    const user = userEvent.setup();
    let finishSave: (saved: SavedQuery) => void = () => {};
    vi.mocked(saveQuery).mockReturnValueOnce(
      new Promise((done) => {
        finishSave = done;
      }),
    );
    await act(() => useAppStore.getState().runSearch("red car"));
    render(
      <>
        <ResultsScreen />
        <Toaster />
      </>,
    );

    await user.click(screen.getByRole("button", { name: "Save query" }));

    const saving = screen.getByRole("button", { name: "Saving query…" });
    expect(saving).toBeDisabled();
    expect(saving.querySelector(".animate-spin")).not.toBeNull();

    await act(async () => finishSave({ id: "s1", text: "red car", savedOn: "Sep 30", hits: 0 }));

    const toast = within(screen.getByRole("region", { name: "Notifications" })).getByRole(
      "listitem",
    );
    expect(toast).toHaveTextContent("Query saved");
    expect(toast).toHaveTextContent("red car");
    expect(within(toast).getByRole("link", { name: "View saved queries" })).toHaveAttribute(
      "href",
      "/saved",
    );
  });

  it("says so in a toast when saving fails", async () => {
    const user = userEvent.setup();
    vi.mocked(saveQuery).mockRejectedValueOnce(new Error("boom"));
    await act(() => useAppStore.getState().runSearch("red car"));
    render(
      <>
        <ResultsScreen />
        <Toaster />
      </>,
    );

    await user.click(screen.getByRole("button", { name: "Save query" }));

    const toast = await within(screen.getByRole("region", { name: "Notifications" })).findByRole(
      "listitem",
    );
    expect(toast).toHaveAttribute("data-tone", "error");
    expect(toast).toHaveTextContent("Couldn't save this query");
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

  it("asks the RAG for opening questions that fit this search, and offers them", async () => {
    render(<ResultsScreen />);

    const buttons = await screen.findAllByRole("button", {
      name: (name) => resultsSuggestedQuestions.includes(name),
    });
    const request = vi.mocked(suggestQuestions).mock.calls[0][0];
    expect(request).toMatchObject({ query: "red car", scope: "results", focus_moment_id: null });
    expect(request.history.map((turn) => turn.text)).toContain("red car");
    const { suggested_questions } = await vi.mocked(suggestQuestions).mock.results[0].value;
    expect(buttons.map((button) => button.textContent)).toEqual(suggested_questions);
  });

  it("runs a glow around the border of one suggested question at a time", async () => {
    allowMotion();
    render(<ResultsScreen />);

    const buttons = await screen.findAllByRole("button", {
      name: (name) => resultsSuggestedQuestions.includes(name),
    });
    // Exactly one: which one depends on timing (it moves every lap; the order is covered
    // by useSequentialGlow's own tests). The glow starts in an effect after the buttons
    // render, so wait for it rather than checking the very first frame.
    await vi.waitFor(() =>
      expect(buttons.filter((button) => button.classList.contains("suggestion-glow"))).toHaveLength(
        1,
      ),
    );
  });

  it("puts the answer on the chat's own background and the question in a bubble pointing at the thread", async () => {
    render(<ResultsScreen />);
    await screen.findAllByRole("button", {
      name: (name) => resultsSuggestedQuestions.includes(name),
    });

    const answer = document.querySelector('[data-bubble="agent"]')!;
    expect(answer).not.toHaveClass("border");
    expect(answer.className).not.toMatch(/(^|\s)bg-/);

    const question = document.querySelector('[data-bubble="user"]')!;
    expect(question).toHaveClass("border", "rounded-br-none");
  });

  it("lights up a suggested question on hover and shows an arrow to send it", async () => {
    render(<ResultsScreen />);

    const group = await screen.findByRole("group", { name: "Suggested questions" });
    within(group)
      .getAllByRole("button")
      .forEach((button) => {
        expect(button).toHaveClass("group");
        expect(button.className).toMatch(/(^|\s)hover:bg-/);
        // The arrow is decorative, hidden until the question is hovered or focused.
        const arrow = button.querySelector("svg")!;
        expect(arrow).toHaveAttribute("aria-hidden", "true");
        expect(arrow).toHaveClass(
          "opacity-0",
          "group-hover:opacity-100",
          "group-focus-visible:opacity-100",
        );
      });
  });

  it("keeps the suggested questions down by the input while the thread is short", async () => {
    render(<ResultsScreen />);

    const group = await screen.findByRole("group", { name: "Suggested questions" });
    // An auto top margin in the scrolling column: it takes up the free space while the
    // thread is short, and collapses to 0 once it overflows, so the block scrolls with it.
    const block = group.parentElement!;
    expect(block).toHaveClass("mt-auto");
    expect(block.parentElement).toHaveClass("flex-col", "overflow-y-auto");
  });

  it("groups the suggested questions into one block, with no space between them", async () => {
    render(<ResultsScreen />);

    const group = await screen.findByRole("group", { name: "Suggested questions" });
    expect(group.className).not.toMatch(/(^|\s)gap-/);
    const buttons = within(group).getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(1);
    buttons.slice(1).forEach((button) => expect(button).toHaveClass("-mt-px"));
  });

  it("renders the assistant's markdown in the thread instead of showing the markup", async () => {
    const user = userEvent.setup();
    vi.mocked(askAssistant).mockResolvedValueOnce({
      // A camera name no mock clip uses, so it can only come from this answer.
      answer: "**Camera Z9** has the most matches:\n\n- 3 at the gate\n- 1 in the lot",
      citations: [],
      suggested_questions: [],
    });
    render(<ResultsScreen />);

    await user.click(
      (
        await screen.findAllByRole("button", {
          name: (name) => resultsSuggestedQuestions.includes(name),
        })
      )[0],
    );

    expect((await screen.findByText("Camera Z9")).tagName).toBe("STRONG");
    expect(screen.getByText("3 at the gate").tagName).toBe("LI");
    expect(screen.queryByText(/\*\*Camera Z9\*\*/)).not.toBeInTheDocument();
  });

  it("keeps the questions on screen, disabled, while the assistant answers, then shows the follow-ups", async () => {
    const user = userEvent.setup();
    let reply: (value: AssistantAskResponse) => void = () => {};
    vi.mocked(askAssistant).mockImplementationOnce(
      () => new Promise((resolve) => (reply = resolve)),
    );
    render(<ResultsScreen />);
    const group = () => screen.getByRole("group", { name: "Suggested questions" });

    await user.click(
      await screen.findByRole("button", { name: "Show only the highest-confidence event" }),
    );

    // Still drawn while the answer is prepared: no skeleton, no empty boxes.
    expect(screen.queryByRole("status", { name: "Loading suggested questions" })).toBeNull();
    const waiting = within(group()).getAllByRole("button");
    expect(waiting.length).toBeGreaterThan(0);
    waiting.forEach((button) => expect(button).toBeDisabled());
    expect(group()).toHaveAttribute("aria-busy", "true");

    await act(async () =>
      reply({ answer: "Done.", citations: [], suggested_questions: ["What happened next?"] }),
    );

    const next = within(group()).getAllByRole("button");
    expect(next.map((button) => button.textContent)).toEqual(["What happened next?"]);
    expect(next[0]).toBeEnabled();
  });

  it("keeps the previous questions while a picked moment's questions load", async () => {
    const user = userEvent.setup();
    render(<ResultsScreen />);
    const before = (
      await within(await screen.findByRole("group", { name: "Suggested questions" })).findAllByRole(
        "button",
      )
    ).map((button) => button.textContent);
    let finish: (response: { suggested_questions: string[] }) => void = () => {};
    vi.mocked(suggestQuestions).mockReturnValueOnce(
      new Promise((done) => {
        finish = done;
      }),
    );

    await user.click(screen.getByText(topMatch().ts).closest("button")!);

    const shown = within(screen.getByRole("group", { name: "Suggested questions" })).getAllByRole(
      "button",
    );
    expect(shown.map((button) => button.textContent)).toEqual(before);
    expect(screen.queryByRole("status", { name: "Loading suggested questions" })).toBeNull();

    await act(async () => finish({ suggested_questions: ["Who else was near this location?"] }));

    expect(
      within(screen.getByRole("group", { name: "Suggested questions" }))
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["Who else was near this location?"]);
  });

  it("sends the search, the question and the moments on screen as context", async () => {
    const user = userEvent.setup();
    render(<ResultsScreen />);

    await user.click(
      await screen.findByRole("button", { name: "Show only the highest-confidence event" }),
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

  it("shows what the assistant is doing while it prepares the answer", async () => {
    const user = userEvent.setup();
    vi.mocked(askAssistant).mockImplementationOnce((_request, options) => {
      options?.onStatus?.("Reading 5 moments…");
      options?.onStatus?.("Generating answer…");
      return new Promise(() => {});
    });
    render(<ResultsScreen />);

    await user.click(
      await screen.findByRole("button", { name: "Show only the highest-confidence event" }),
    );

    const thinking = await screen.findByRole("status", { name: /Assistant is thinking/ });
    expect(thinking).toHaveTextContent("Generating answer…");
    expect(thinking).not.toHaveTextContent("Reading 5 moments…");
  });

  it("sends each moment's event id, so suggestions can use its real detections", async () => {
    const user = userEvent.setup();
    render(<ResultsScreen />);

    await user.click(
      await screen.findByRole("button", { name: "Show only the highest-confidence event" }),
    );

    const request = vi.mocked(askAssistant).mock.calls[0][0];
    request.moments.forEach((moment) => expect(moment).toHaveProperty("event_id"));
  });

  it("shows the question, a thinking state, then the answer with its cited moment", async () => {
    const user = userEvent.setup();
    let reply: (value: AssistantAskResponse) => void = () => {};
    vi.mocked(askAssistant).mockImplementationOnce(
      () => new Promise((resolve) => (reply = resolve)),
    );
    render(<ResultsScreen />);

    await user.click(
      await screen.findByRole("button", { name: "Show only the highest-confidence event" }),
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

    const [first] = await screen.findAllByRole("button", {
      name: (name) => clipSuggestedQuestions.includes(name),
    });
    expect(vi.mocked(suggestQuestions).mock.lastCall?.[0]).toMatchObject({
      scope: "moment",
      focus_moment_id: topMatch().id,
    });
    await user.click(first);
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
    await user.click(await screen.findByRole("button", { name: clipSuggestedQuestions[0] }));

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
    await user.click(await screen.findByRole("button", { name: clipSuggestedQuestions[0] }));
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
    await user.click(await screen.findByRole("button", { name: clipSuggestedQuestions[0] }));
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

    await user.click(
      await screen.findByRole("button", { name: "Show only the highest-confidence event" }),
    );

    expect(await screen.findByText(/couldn't answer/)).toBeInTheDocument();
  });

  it("retries the same question, in the same context, without repeating it", async () => {
    const user = userEvent.setup();
    const question = "Show only the highest-confidence event";
    vi.mocked(askAssistant).mockRejectedValueOnce(new Error("503"));
    render(<ResultsScreen />);

    await user.click(await screen.findByRole("button", { name: question }));
    await user.click(await screen.findByRole("button", { name: "Retry" }));

    expect(askAssistant).toHaveBeenCalledTimes(2);
    const [first, second] = vi.mocked(askAssistant).mock.calls.map(([request]) => request);
    expect(second).toEqual(first);
    await waitForAnswer();
    expect(screen.queryByText(/couldn't answer/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
    const thread = useAppStore.getState().chats.results;
    expect(
      thread.filter((message) => message.role === "user" && message.text === question),
    ).toHaveLength(1);
  });

  it("offers a retry only on the latest answer", async () => {
    const user = userEvent.setup();
    vi.mocked(askAssistant).mockRejectedValueOnce(new Error("503"));
    render(<ResultsScreen />);

    await user.click(
      await screen.findByRole("button", { name: "Show only the highest-confidence event" }),
    );
    await screen.findByRole("button", { name: "Retry" });
    await user.type(
      screen.getByPlaceholderText("Ask a follow-up question…"),
      "Which camera?{Enter}",
    );
    await waitForAnswer();

    expect(screen.getByText(/couldn't answer/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
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

  it("labels the player with the camera of the video it opened on", () => {
    // clipC comes first in the response, but the player opens on clipA.
    useAppStore.setState({
      results: [{ ...clipC, camera: "G330" }, { ...clipA, camera: "G328" }, clipB],
    });
    render(<ResultsScreen />);

    const chip = screen.getByRole("group", { name: "Camera on the player" });
    expect(within(chip).getByText("G328")).toBeInTheDocument();
    expect(within(chip).queryByText("G330")).not.toBeInTheDocument();
  });

  it("labels the player with the camera even when the page opened before the search answered", async () => {
    let finish: (result: Awaited<ReturnType<typeof searchClips>>) => void = () => {};
    vi.mocked(searchClips).mockReturnValueOnce(
      new Promise((done) => {
        finish = done;
      }),
    );
    render(<ResultsScreen urlQuery="blue van" />);
    await screen.findByText("YOUR QUERY");

    await act(async () =>
      finish({ clips: [{ ...clipA, camera: "G328" }, clipB, clipC], summary: "Found it." }),
    );

    const chip = await screen.findByRole("group", { name: "Camera on the player" });
    expect(within(chip).getByText("G328")).toBeInTheDocument();
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

  it("highlights the tracked object over the footage with its label and confidence", async () => {
    render(<ResultsScreen />);
    await loadMetadata(footage());

    expect(getTracks).toHaveBeenLastCalledWith(
      expect.objectContaining({ video_id: "a", start_seconds: 12 }),
    );
    const overlay = await screen.findByRole("img", { name: /^Detected objects/ });
    await vi.waitFor(() => expect(overlay.querySelector("rect")).not.toBeNull());
    expect(overlay).toHaveAccessibleName(/^Detected objects: \w+$/);
    expect(within(overlay).getByText(/^\w+ \d+%$/)).toBeInTheDocument();
    expect(within(overlay).queryByText(/simulated/i)).toBeNull();
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

    expect(screen.getByText("No footage for this clip")).toBeInTheDocument();
    // No fake play button or invented progress for a clip without footage.
    expect(screen.queryByRole("button", { name: /Play clip/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.getByText("SCENE")).toBeInTheDocument();
    expect(screen.queryByText("PERSPECTIVE")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "RELATED CLIPS" })).toBeInTheDocument();
  });

  it("plays the clip's real footage, with its thumbnail as the poster", () => {
    render(
      <ClipDetailScreen
        clip={{
          ...clip,
          videoUrl: "https://cdn.test/c.mp4",
          thumbnailUrl: "https://cdn.test/c.jpg",
        }}
      />,
    );

    const video = screen.getByLabelText("Clip footage") as HTMLVideoElement;
    expect(video.getAttribute("src")).toBe("https://cdn.test/c.mp4");
    expect(video.getAttribute("poster")).toBe("https://cdn.test/c.jpg");
    expect(video).toHaveAttribute("controls");
    expect(screen.queryByText("No footage for this clip")).not.toBeInTheDocument();
  });

  it("cues the footage to the moment when the clip knows where it starts", () => {
    render(
      <ClipDetailScreen clip={{ ...clip, videoUrl: "https://cdn.test/c.mp4", startSeconds: 42 }} />,
    );

    const video = screen.getByLabelText("Clip footage") as HTMLVideoElement;
    act(() => {
      video.dispatchEvent(new Event("loadedmetadata"));
    });
    expect(video.currentTime).toBe(42);
  });

  it("opens the thread by asking the backend the original search about this clip", async () => {
    useAppStore.setState({ query: "red car" });
    render(<ClipDetailScreen clip={clip} />);

    expect(vi.mocked(askAssistant).mock.calls[0][0]).toMatchObject({
      query: "red car",
      question: "red car",
      scope: "moment",
      focus_moment_id: clip.id,
    });
    const thread = () => useAppStore.getState().chats[String(clip.id)] ?? [];
    expect(thread()[0]).toMatchObject({ role: "user", text: "red car" });
    // First the "thinking" placeholder, then the backend's answer in its place.
    await vi.waitFor(() => expect(thread()[1]?.status).toBeUndefined());
    expect(thread()[1]).toMatchObject({ role: "agent" });
  });

  it("asks nothing up front when the clip was opened without a search", () => {
    render(<ClipDetailScreen clip={clip} />);

    expect(askAssistant).not.toHaveBeenCalled();
    expect(useAppStore.getState().chats[String(clip.id)] ?? []).toEqual([]);
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

  it("holds the list's place with a skeleton while the saved queries load", async () => {
    let resolve: (queries: SavedQuery[]) => void = () => {};
    vi.mocked(getSavedQueries).mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      }),
    );
    render(<SavedQueriesScreen />);

    expect(screen.getByRole("status", { name: "Loading saved queries" })).toBeInTheDocument();
    expect(screen.queryByText(/No saved queries yet/)).not.toBeInTheDocument();

    resolve(savedQueries);

    expect(await screen.findAllByRole("button", { name: "Run again" })).toHaveLength(
      savedQueries.length,
    );
    expect(screen.queryByRole("status", { name: "Loading saved queries" })).not.toBeInTheDocument();
  });

  it("spins the Run again button while the results page loads, and blocks other runs", async () => {
    const user = userEvent.setup();
    pushMock.mockClear();
    render(<SavedQueriesScreen />);
    const runButtons = await screen.findAllByRole("button", { name: "Run again" });

    await user.click(runButtons[0]);

    expect(runButtons[0]).toHaveAttribute("aria-busy", "true");
    expect(runButtons[0]).toBeDisabled();
    expect(runButtons[0].querySelector(".animate-spin")).not.toBeNull();
    runButtons.slice(1).forEach((button) => expect(button).toBeDisabled());

    await user.click(runButtons[1]);
    expect(pushMock).toHaveBeenCalledTimes(1);
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

  it("keeps the row and says why when the delete fails", async () => {
    const user = userEvent.setup();
    vi.mocked(deleteSavedQuery).mockRejectedValueOnce(new ApiError(500, "Database unavailable"));
    render(<SavedQueriesScreen />);
    const row = await firstRow();

    await user.click(within(row).getByRole("button", { name: /^Delete "/ }));
    await user.click(within(row).getByRole("button", { name: "Confirm delete" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn't delete this query: Database unavailable",
    );
    expect(screen.getByText(savedQueries[0].text)).toBeInTheDocument();
  });

  it("invites a first search when nothing has been saved, and shows where saving happens", async () => {
    vi.mocked(getSavedQueries).mockResolvedValueOnce([]);
    render(<SavedQueriesScreen />);

    const empty = await screen.findByRole("region", { name: "No saved queries yet" });
    // Sits on the page itself: no card border or fill around it.
    expect(empty.className).not.toMatch(/glass-card|(^|\s)border(\s|$)|(^|\s)bg-/);
    expect(within(empty).getByText(/bookmark/i)).toBeInTheDocument();
    expect(within(empty).getByRole("link", { name: "Start a search" })).toHaveAttribute(
      "href",
      "/dashboard",
    );

    const examples = within(empty).getByRole("list", { name: "Example searches" });
    const links = within(examples).getAllByRole("link");
    expect(links).toHaveLength(3);
    links.forEach((link) =>
      expect(link).toHaveAttribute("href", resultsHref(link.textContent ?? "")),
    );
    expect(links[0]).toHaveTextContent(EXAMPLE_QUESTIONS[0]);
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

describe("Assistant context", () => {
  it("sends no stand-in moments to the backend when there are no results", async () => {
    await act(() => useAppStore.getState().askInResults("anything at all"));

    expect(vi.mocked(askAssistant).mock.calls[0][0].moments).toEqual([]);
  });
});

describe("Query Assistant", () => {
  // The assistant answers about search results — with none, it has nothing to go on.
  beforeEach(async () => {
    await act(() => useAppStore.getState().runSearch("red car"));
  });

  it("answers a suggested question in the results thread", async () => {
    const user = userEvent.setup();
    useAppStore.setState({ chatOpen: true });
    render(<QueryAssistant chatKey="results" />);

    await user.click(
      await screen.findByRole("button", { name: "Which camera has the most matches?" }),
    );

    expect(await screen.findByText(/has the most matches with/)).toBeInTheDocument();
  });

  it("runs the same border glow over its suggested questions, one at a time", async () => {
    allowMotion();
    useAppStore.setState({ chatOpen: true });
    render(<QueryAssistant chatKey="results" />);

    const buttons = await screen.findAllByRole("button", {
      name: (name) => resultsSuggestedQuestions.includes(name),
    });
    // Exactly one: which one depends on timing (it moves every lap; the order is covered
    // by useSequentialGlow's own tests). The glow starts in an effect after the buttons
    // render, so wait for it rather than checking the very first frame.
    await vi.waitFor(() =>
      expect(buttons.filter((button) => button.classList.contains("suggestion-glow"))).toHaveLength(
        1,
      ),
    );
  });

  it("puts the answer on the chat's own background and the question in a bubble pointing at the thread", async () => {
    useAppStore.setState({ chatOpen: true });
    render(<QueryAssistant chatKey="results" />);
    await screen.findAllByRole("button", {
      name: (name) => resultsSuggestedQuestions.includes(name),
    });

    const answer = document.querySelector('[data-bubble="agent"]')!;
    expect(answer).not.toHaveClass("border");
    expect(answer.className).not.toMatch(/(^|\s)bg-/);

    const question = document.querySelector('[data-bubble="user"]')!;
    expect(question).toHaveClass("border", "rounded-br-none");
  });

  it("lights up a suggested question on hover and shows an arrow to send it", async () => {
    useAppStore.setState({ chatOpen: true });
    render(<QueryAssistant chatKey="results" />);

    const group = await screen.findByRole("group", { name: "Suggested questions" });
    within(group)
      .getAllByRole("button")
      .forEach((button) => {
        expect(button).toHaveClass("group");
        expect(button.className).toMatch(/(^|\s)hover:bg-/);
        // The arrow is decorative, hidden until the question is hovered or focused.
        const arrow = button.querySelector("svg")!;
        expect(arrow).toHaveAttribute("aria-hidden", "true");
        expect(arrow).toHaveClass(
          "opacity-0",
          "group-hover:opacity-100",
          "group-focus-visible:opacity-100",
        );
      });
  });

  it("keeps the suggested questions down by the input while the thread is short", async () => {
    useAppStore.setState({ chatOpen: true });
    render(<QueryAssistant chatKey="results" />);

    const group = await screen.findByRole("group", { name: "Suggested questions" });
    // An auto top margin in the scrolling column: it takes up the free space while the
    // thread is short, and collapses to 0 once it overflows, so the block scrolls with it.
    const block = group.parentElement!;
    expect(block).toHaveClass("mt-auto");
    expect(block.parentElement).toHaveClass("flex-col", "overflow-y-auto");
  });

  it("groups the suggested questions into one block, with no space between them", async () => {
    useAppStore.setState({ chatOpen: true });
    render(<QueryAssistant chatKey="results" />);

    const group = await screen.findByRole("group", { name: "Suggested questions" });
    expect(group.className).not.toMatch(/(^|\s)gap-/);
    const buttons = within(group).getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(1);
    buttons.slice(1).forEach((button) => expect(button).toHaveClass("-mt-px"));
  });

  it("keeps its questions on screen, disabled, while it answers", async () => {
    const user = userEvent.setup();
    vi.mocked(askAssistant).mockImplementationOnce(() => new Promise(() => {}));
    useAppStore.setState({ chatOpen: true });
    render(<QueryAssistant chatKey="results" />);

    await user.click(
      await screen.findByRole("button", { name: "Which camera has the most matches?" }),
    );

    const group = screen.getByRole("group", { name: "Suggested questions" });
    expect(group).toHaveAttribute("aria-busy", "true");
    const waiting = within(group).getAllByRole("button");
    expect(waiting.length).toBeGreaterThan(0);
    waiting.forEach((button) => expect(button).toBeDisabled());
    // The question just asked isn't repeated below its own bubble.
    expect(
      within(group).queryByRole("button", { name: "Which camera has the most matches?" }),
    ).toBeNull();
  });

  it("retries a failed answer in Clip Detail's thread too", async () => {
    const user = userEvent.setup();
    vi.mocked(askAssistant).mockRejectedValueOnce(new Error("503"));
    useAppStore.setState({ chatOpen: true });
    render(<QueryAssistant chatKey="results" />);

    await user.click(
      await screen.findByRole("button", { name: "Which camera has the most matches?" }),
    );
    await user.click(await screen.findByRole("button", { name: "Retry" }));

    expect(askAssistant).toHaveBeenCalledTimes(2);
    expect(await screen.findByText(/has the most matches with/)).toBeInTheDocument();
    expect(screen.queryByText(/couldn't answer/)).not.toBeInTheDocument();
  });

  it("renders markdown in Clip Detail's thread too", async () => {
    const user = userEvent.setup();
    vi.mocked(askAssistant).mockResolvedValueOnce({
      answer: "Seen on **two** cameras.",
      citations: [],
      suggested_questions: [],
    });
    useAppStore.setState({ chatOpen: true });
    render(<QueryAssistant chatKey="results" />);

    await user.click(
      await screen.findByRole("button", { name: "Which camera has the most matches?" }),
    );

    expect((await screen.findByText("two")).tagName).toBe("STRONG");
  });

  it("offers follow-up questions under the latest answer", async () => {
    const user = userEvent.setup();
    useAppStore.setState({ chatOpen: true });
    render(<QueryAssistant chatKey="results" />);

    await user.click(
      await screen.findByRole("button", { name: "Which camera has the most matches?" }),
    );
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
    render(<QueryAssistant chatKey="results" />);

    await user.click(
      await screen.findByRole("button", { name: "Show only the highest-confidence event" }),
    );
    await user.click(screen.getByRole("button", { name: "+ New" }));

    expect(await screen.findByText("Suggested questions")).toBeInTheDocument();
  });

  it("collapses from the header chevron", async () => {
    const user = userEvent.setup();
    useAppStore.setState({ chatOpen: true });
    render(<QueryAssistant chatKey="results" />);

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

  it("lists the default palette first and marks it as the default", () => {
    useAppStore.setState({ theme: "dark" });
    render(
      <ThemeProvider>
        <SettingsScreen />
      </ThemeProvider>,
    );

    const radios = within(screen.getByRole("radiogroup", { name: "Palette" })).getAllByRole(
      "radio",
    );
    expect(radios[0]).toHaveAccessibleName(/^Slate console/);
    expect(within(radios[0]).getByText("Default")).toBeInTheDocument();
    // Only the default says so.
    radios.slice(1).forEach((radio) => expect(radio).not.toHaveTextContent(/default/i));
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

  it("groups the camera directory by scene", async () => {
    useAppStore.setState({ camerasOpen: true });
    render(<CamerasModal />);

    const admin = await screen.findByRole("group", { name: "admin" });
    expect(within(admin).getByText("G328")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "school" })).toBeInTheDocument();
  });

  it("filters by scene from the filters dialog", async () => {
    const user = userEvent.setup();
    useAppStore.setState({ filtersOpen: true });
    render(<FiltersModal />);

    const scenes = screen.getByRole("group", { name: "Scenes" });
    await user.click(within(scenes).getByRole("button", { name: "admin" }));

    expect(useAppStore.getState().filters.scenes).toEqual(["admin"]);
  });

  it("switches the search mode from settings", async () => {
    const user = userEvent.setup();
    render(<SettingsScreen />);

    await user.click(screen.getByRole("radio", { name: /Classic filters/ }));

    expect(useAppStore.getState().searchMode).toBe("classic");
  });
});
