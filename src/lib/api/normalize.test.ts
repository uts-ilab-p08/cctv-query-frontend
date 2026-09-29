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

  it("uses the event name when the RAG provides one", () => {
    expect(ragResultItemToClip({ ...item, event_name: "Vehicle arrival" }, 0).eventName).toBe(
      "Vehicle arrival",
    );
  });

  it("leaves the event name empty so the caption is shown instead", () => {
    expect(ragResultItemToClip(item, 0).eventName).toBeUndefined();
  });

  it("shows the moment's offset into its video, as returned by the endpoint", () => {
    expect(ragResultItemToClip({ ...item, start_seconds: 12 }, 0).ts).toBe("0:12");
    expect(ragResultItemToClip({ ...item, start_seconds: 125.6 }, 0).ts).toBe("2:05");
    expect(ragResultItemToClip({ ...item, start_seconds: 3725 }, 0).ts).toBe("1:02:05");
  });

  it("keeps the camera's scene when the backend sends it", () => {
    expect(ragResultItemToClip({ ...item, scene: "admin" }, 0).scene).toBe("admin");
    expect(ragResultItemToClip(item, 0).scene).toBeUndefined();
  });

  describe("enriched /search results", () => {
    const enriched = {
      ...item,
      start_seconds: 169.233,
      end_seconds: 177.067,
      event_id: "evt-26e5",
      event_name: "Person walks toward a door",
      description: "A person wearing a dark jacket walks toward a door.",
      camera: "G331",
      scene: "bus",
      timestamp: null,
      thumbnail_url: null,
      tags: ["Person", "Teleport"],
    };

    it("uses the event id and keeps it for tracks and the detail page", () => {
      const clip = ragResultItemToClip(enriched, 0);
      expect(clip.id).toBe("evt-26e5");
      expect(clip.eventId).toBe("evt-26e5");
    });

    it("shows the real camera, scene, event name, description and caption", () => {
      expect(ragResultItemToClip(enriched, 0)).toMatchObject({
        camera: "G331",
        code: "G331",
        scene: "bus",
        eventName: "Person walks toward a door",
        action: "Person walks toward a door",
        description: "A person wearing a dark jacket walks toward a door.",
        caption: item.caption,
        perspective: "",
      });
    });

    it("trusts the backend's tags, keeping only known ones", () => {
      const clip = ragResultItemToClip(enriched, 0);
      expect(clip.tags).toEqual(["Person"]);
      expect(clip.objects).toBe("Person");
    });

    it("shows the camera's own wall-clock time when a timestamp arrives", () => {
      const clip = ragResultItemToClip({ ...enriched, timestamp: "2018-03-05T13:23:04-05:00" }, 0);
      expect(clip.ts).toBe("13:23:04");
      expect(clip.date).toBe("Mar 5");
    });

    it("falls back to the offset into the video without a timestamp", () => {
      const clip = ragResultItemToClip(enriched, 0);
      expect(clip.ts).toBe("2:49");
      expect(clip.date).toBe("");
    });
  });
});
