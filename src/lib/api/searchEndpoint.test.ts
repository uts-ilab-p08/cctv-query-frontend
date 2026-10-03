import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as ClientModule from "./client";
import { ApiError, apiFetch, apiStream } from "./client";
import { searchClips } from "./endpoints";

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

const base = {
  video_id: "vid-1",
  video_url: "https://cdn.test/vid-1.mp4",
  end_seconds: 20,
  caption: "Two people walk through a waiting area",
  score: 0.67,
  event_name: "Person walks toward a door",
  camera: "G331",
  scene: "bus",
  thumbnail_url: null,
  tags: ["Person"],
};

const twoMoments = {
  answer: "Two moments.",
  results: [
    { ...base, start_seconds: 12, event_id: "evt-1" },
    { ...base, start_seconds: 15, event_id: "evt-1" },
  ],
};

describe("searchClips over GET /api/v1/search/stream", () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
    vi.mocked(apiStream).mockReset();
  });

  it("reports each step of the search, then returns its moments and summary", async () => {
    vi.mocked(apiStream).mockResolvedValueOnce(
      sseResponse(
        'event: status\ndata: {"phase":"searching","message":"Searching the video archive…"}\n\n',
        'event: status\ndata: {"phase":"thumbnails","message":"Preparing thumb',
        'nails…"}\n\n',
        `event: result\ndata: ${JSON.stringify(twoMoments)}\n\n`,
      ),
    );
    const onStatus = vi.fn();

    const { clips, summary } = await searchClips("waiting", 10, { onStatus });

    expect(apiStream).toHaveBeenCalledWith("/api/v1/search/stream?q=waiting&limit=10");
    expect(onStatus.mock.calls).toEqual([
      ["Searching the video archive…"],
      ["Preparing thumbnails…"],
    ]);
    expect(summary).toBe("Two moments.");
    expect(clips).toHaveLength(2);
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("keeps moment ids unique when two results fall in the same event", async () => {
    vi.mocked(apiStream).mockResolvedValueOnce(
      sseResponse(`event: result\ndata: ${JSON.stringify(twoMoments)}\n\n`),
    );

    const { clips } = await searchClips("waiting");

    expect(clips.map((clip) => clip.id)).toEqual(["evt-1", "evt-1:15"]);
    expect(clips.map((clip) => clip.eventId)).toEqual(["evt-1", "evt-1"]);
  });

  it("fails with the backend's message when the stream ends in an error", async () => {
    vi.mocked(apiStream).mockResolvedValueOnce(
      sseResponse('event: error\ndata: {"message":"Search service unreachable: timeout"}\n\n'),
    );

    await expect(searchClips("waiting")).rejects.toThrow("Search service unreachable: timeout");
  });

  it("fails when the stream ends without a result", async () => {
    vi.mocked(apiStream).mockResolvedValueOnce(
      sseResponse('event: status\ndata: {"phase":"searching","message":"Searching…"}\n\n'),
    );

    await expect(searchClips("waiting")).rejects.toThrow(/ended without an answer/);
  });

  it("falls back to GET /search on a backend without the streaming route", async () => {
    vi.mocked(apiStream).mockRejectedValueOnce(new ApiError(404, "Not Found"));
    vi.mocked(apiFetch).mockResolvedValueOnce(twoMoments);

    const { summary } = await searchClips("waiting");

    expect(summary).toBe("Two moments.");
    expect(apiFetch).toHaveBeenCalledWith("/api/v1/search?q=waiting&limit=10");
  });

  it("does not retry on other errors, such as an expired session", async () => {
    vi.mocked(apiStream).mockRejectedValueOnce(new ApiError(401, "Invalid or expired token"));

    await expect(searchClips("waiting")).rejects.toThrow("Invalid or expired token");
    expect(apiFetch).not.toHaveBeenCalled();
  });
});
