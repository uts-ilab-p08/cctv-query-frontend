import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as ClientModule from "./client";
import { ApiError, apiFetch, apiStream } from "./client";
import { askAssistant, suggestQuestions } from "./endpoints";
import type { AssistantAskRequest } from "./types";

vi.mock("./client", async (importOriginal) => ({
  ...(await importOriginal<typeof ClientModule>()),
  apiFetch: vi.fn(),
  apiStream: vi.fn(),
}));

/** A streamed response whose body arrives in the given chunks. */
function sseResponse(...chunks: string[]): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    },
  });
  return new Response(body, { headers: { "Content-Type": "text/event-stream" } });
}

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
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
    // A backend without the streaming route: askAssistant falls back to the JSON one.
    vi.mocked(apiStream).mockReset().mockRejectedValue(new ApiError(404, "Not Found"));
  });

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

describe("askAssistant over POST /api/v1/assistant/ask/stream", () => {
  const answer = {
    answer: "The strongest match is the red car at 0:12.",
    citations: [{ moment_id: "vid-1:12" }],
    suggested_questions: ["What's the most recent match?"],
  };

  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
    vi.mocked(apiStream).mockReset();
  });

  it("reports each step while the answer is prepared, then returns it", async () => {
    vi.mocked(apiStream).mockResolvedValueOnce(
      sseResponse(
        'event: status\ndata: {"phase":"reading","message":"Reading 1 moments…"}\n\n',
        'event: status\ndata: {"phase":"thinking","message":"Generating ans',
        'wer…"}\n\n',
        `event: result\ndata: ${JSON.stringify(answer)}\n\n`,
      ),
    );
    const steps: string[] = [];

    await expect(
      askAssistant(request, { onStatus: (message) => steps.push(message) }),
    ).resolves.toEqual(answer);
    expect(steps).toEqual(["Reading 1 moments…", "Generating answer…"]);
    expect(apiStream).toHaveBeenCalledWith("/api/v1/assistant/ask/stream", {
      method: "POST",
      body: JSON.stringify(request),
    });
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("fails with the backend's message when the stream ends in an error", async () => {
    vi.mocked(apiStream).mockResolvedValueOnce(
      sseResponse('event: error\ndata: {"message":"The assistant couldn\u2019t answer that."}\n\n'),
    );

    await expect(askAssistant(request)).rejects.toThrow("The assistant couldn’t answer that.");
  });

  it("fails when the stream ends without a result", async () => {
    vi.mocked(apiStream).mockResolvedValueOnce(
      sseResponse('event: status\ndata: {"phase":"reading","message":"Reading…"}\n\n'),
    );

    await expect(askAssistant(request)).rejects.toThrow(/ended without an answer/);
  });

  it("falls back to the plain endpoint on a backend without the streaming route", async () => {
    vi.mocked(apiStream).mockRejectedValueOnce(new ApiError(404, "Not Found"));
    vi.mocked(apiFetch).mockResolvedValueOnce(answer);

    await expect(askAssistant(request)).resolves.toEqual(answer);
    expect(apiFetch).toHaveBeenCalledWith("/api/v1/assistant/ask", {
      method: "POST",
      body: JSON.stringify(request),
    });
  });

  it("does not retry on other errors, such as an expired session", async () => {
    vi.mocked(apiStream).mockRejectedValueOnce(new ApiError(401, "Invalid or expired token"));

    await expect(askAssistant(request)).rejects.toThrow("Invalid or expired token");
    expect(apiFetch).not.toHaveBeenCalled();
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
