import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiFetch } from "./client";
import { searchClips } from "./endpoints";

vi.mock("./client", () => ({ apiFetch: vi.fn() }));

const base = {
  video_id: "vid-1",
  video_url: "https://cdn.test/vid-1.mp4",
  end_seconds: 20,
  caption: "Two people walk through a waiting area",
  score: 0.67,
  event_name: "Person walks toward a door",
  camera: "G331",
  scene: "bus",
  timestamp: null,
  thumbnail_url: null,
  tags: ["Person"],
};

describe("searchClips", () => {
  beforeEach(() => vi.mocked(apiFetch).mockReset());

  it("keeps moment ids unique when two results fall in the same event", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({
      answer: "Two moments.",
      results: [
        { ...base, start_seconds: 12, event_id: "evt-1" },
        { ...base, start_seconds: 15, event_id: "evt-1" },
      ],
    });

    const { clips } = await searchClips("waiting");

    expect(clips.map((clip) => clip.id)).toEqual(["evt-1", "evt-1:15"]);
    expect(clips.map((clip) => clip.eventId)).toEqual(["evt-1", "evt-1"]);
  });
});
