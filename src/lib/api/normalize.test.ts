import { describe, expect, it } from "vitest";

import { ragResultItemToClip } from "./normalize";

const item = {
  video_id: "vid-1",
  video_url: "https://cdn.test/vid-1.mp4",
  start_seconds: 12,
  end_seconds: 20,
  caption: "A red car enters the lot",
  score: 0.91,
};

describe("ragResultItemToClip", () => {
  it("keeps the source video and the moment's bounds for the player", () => {
    const clip = ragResultItemToClip(item, 0);
    expect(clip).toMatchObject({
      videoId: "vid-1",
      videoUrl: "https://cdn.test/vid-1.mp4",
      startSeconds: 12,
      endSeconds: 20,
    });
  });

  it("gives two moments from the same video distinct ids", () => {
    const first = ragResultItemToClip(item, 0);
    const second = ragResultItemToClip({ ...item, start_seconds: 40, end_seconds: 48 }, 1);
    expect(first.id).not.toBe(second.id);
  });

  it("shows the moment's offset into its video, as returned by the endpoint", () => {
    expect(ragResultItemToClip({ ...item, start_seconds: 12 }, 0).ts).toBe("0:12");
    expect(ragResultItemToClip({ ...item, start_seconds: 125.6 }, 0).ts).toBe("2:05");
    expect(ragResultItemToClip({ ...item, start_seconds: 3725 }, 0).ts).toBe("1:02:05");
  });
});
