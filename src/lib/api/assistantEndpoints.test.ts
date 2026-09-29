import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiFetch } from "./client";
import { askAssistant, suggestQuestions } from "./endpoints";
import type { AssistantAskRequest } from "./types";

vi.mock("./client", () => ({ apiFetch: vi.fn() }));

const request: AssistantAskRequest = {
  query: "red car",
  question: "Show only the highest-confidence event",
  scope: "results",
  focus_moment_id: null,
  moments: [
    {
      moment_id: "vid-1:12",
      video_id: "vid-1",
      start_seconds: 12,
      end_seconds: 20,
      caption: "A red car enters the lot",
      score: 0.91,
      camera: null,
    },
  ],
  history: [{ role: "user", text: "red car" }],
};

describe("askAssistant (live POST /api/v1/assistant/ask)", () => {
  beforeEach(() => vi.mocked(apiFetch).mockReset());

  it("posts the whole context and returns the backend's answer as-is", async () => {
    const answer = {
      answer: "The strongest match is the red car at 0:12.",
      citations: [{ moment_id: "vid-1:12" }],
      suggested_questions: ["What's the most recent match?"],
    };
    vi.mocked(apiFetch).mockResolvedValueOnce(answer);

    await expect(askAssistant(request)).resolves.toEqual(answer);
    expect(apiFetch).toHaveBeenCalledWith("/api/v1/assistant/ask", {
      method: "POST",
      body: JSON.stringify(request),
    });
  });

  it("lets a backend error reach the caller, which shows it in the thread", async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(new Error("503"));
    await expect(askAssistant(request)).rejects.toThrow("503");
  });
});

describe("suggestQuestions (live POST /api/v1/assistant/suggestions)", () => {
  beforeEach(() => vi.mocked(apiFetch).mockReset());

  it("posts the context without a question and returns the suggestions", async () => {
    const context = {
      query: request.query,
      scope: request.scope,
      focus_moment_id: request.focus_moment_id,
      moments: request.moments,
      history: request.history,
    };
    const response = { suggested_questions: ["Which camera has the most matches?"] };
    vi.mocked(apiFetch).mockResolvedValueOnce(response);

    await expect(suggestQuestions(context)).resolves.toEqual(response);
    expect(apiFetch).toHaveBeenCalledWith("/api/v1/assistant/suggestions", {
      method: "POST",
      body: JSON.stringify(context),
    });
  });
});
