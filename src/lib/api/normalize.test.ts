import { afterEach, describe, expect, it, vi } from "vitest";

import {
  apiClipToClip,
  apiVocabularyToVocabulary,
  clipToAssistantMoment,
  ragResultItemToClip,
} from "./normalize";
import type { ApiClip } from "./types";

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

  it("numbers each moment as the answer cites it: the backend's index, else its position", () => {
    expect(ragResultItemToClip({ ...item, citation_index: 4 }, 1).ref).toBe(4);
    expect(ragResultItemToClip(item, 1).ref).toBe(2);
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

  it("keeps the video's local start, so the player can show camera time", () => {
    expect(
      ragResultItemToClip({ ...item, capture_start_local: "2018-03-05T13:15:00" }, 0)
        .captureStartLocal,
    ).toBe("2018-03-05T13:15:00");
    expect(ragResultItemToClip({ ...item, capture_start_local: null }, 0).captureStartLocal).toBe(
      undefined,
    );
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
      });
    });

    it("trusts the backend's tags, keeping only known ones", () => {
      const clip = ragResultItemToClip(enriched, 0);
      expect(clip.tags).toEqual(["Person"]);
      expect(clip.objects).toBe("Person");
    });

    it("shows the offset into the video, since /search has no wall-clock time", () => {
      const clip = ragResultItemToClip(enriched, 0);
      expect(clip.ts).toBe("2:49");
      expect(clip.date).toBe("");
    });
  });
});

describe("apiClipToClip", () => {
  const apiClip: ApiClip = {
    id: "evt-1",
    camera: "G328",
    code: "G328",
    ts: "0:12",
    date: "",
    order: 1,
    confidence: 0.9,
    tags: ["Vehicle"],
    objects: "vehicle",
    action: "A car parks",
    thumbnailUrl: null,
    videoUrl: "https://cdn.test/v.mp4",
  };

  it("keeps the moment's bounds when /clips/{id} sends them", () => {
    const clip = apiClipToClip({ ...apiClip, startSeconds: 12, endSeconds: 20 });
    expect(clip.startSeconds).toBe(12);
    expect(clip.endSeconds).toBe(20);
  });

  it("keeps the video's local start from /clips/{id}", () => {
    expect(
      apiClipToClip({ ...apiClip, captureStartLocal: "2018-03-05T13:15:00" }).captureStartLocal,
    ).toBe("2018-03-05T13:15:00");
    expect(apiClipToClip({ ...apiClip, captureStartLocal: null }).captureStartLocal).toBe(
      undefined,
    );
  });

  it("leaves the bounds empty until the backend sends them", () => {
    const clip = apiClipToClip(apiClip);
    expect(clip.startSeconds).toBeUndefined();
    expect(clip.endSeconds).toBeUndefined();
  });

  describe("thumbnail", () => {
    afterEach(() => vi.unstubAllEnvs());

    it("points at the public thumbnail endpoint while /clips/{id} sends none", () => {
      vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.test/");
      const clip = apiClipToClip({ ...apiClip, id: "evt 1/a" });
      expect(clip.thumbnailUrl).toBe("https://api.test/api/v1/clips/evt%201%2Fa/thumbnail.jpg");
    });

    it("uses the backend's thumbnail once it sends one", () => {
      vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.test");
      const clip = apiClipToClip({ ...apiClip, thumbnailUrl: "https://cdn.test/t.jpg" });
      expect(clip.thumbnailUrl).toBe("https://cdn.test/t.jpg");
    });

    it("has no thumbnail when the API base URL isn't configured", () => {
      vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "");
      expect(apiClipToClip(apiClip).thumbnailUrl).toBeUndefined();
    });
  });
});

describe("clipToAssistantMoment", () => {
  it("passes the event id through, so the backend can read the event's real detections", () => {
    const clip = ragResultItemToClip({ ...item, event_id: "evt-9" }, 0);
    expect(clipToAssistantMoment(clip).event_id).toBe("evt-9");
    expect(clipToAssistantMoment(ragResultItemToClip(item, 0)).event_id).toBeNull();
  });

  it("uses the event id of a clip opened from /clips/{id}, whose id is that event", () => {
    const clip = apiClipToClip({
      id: "evt-7",
      camera: "G328",
      code: "G328",
      ts: "0:12",
      date: "",
      order: 1,
      confidence: 90,
      tags: [],
      objects: "",
      action: "A car parks",
      thumbnailUrl: null,
      videoUrl: null,
    });
    expect(clip.eventId).toBe("evt-7");
    expect(clipToAssistantMoment(clip).event_id).toBe("evt-7");
  });

  it("never invents a start from the old demo window when the clip has none", () => {
    const clip = ragResultItemToClip(item, 0);
    // A clip from GET /clips/{id}: wall-clock `ts`, no offset into its video.
    const withoutStart = { ...clip, ts: "14:00:00", startSeconds: undefined };
    expect(clipToAssistantMoment(withoutStart).start_seconds).toBe(0);
  });
});

describe("apiVocabularyToVocabulary", () => {
  it("keeps the four fields as sent", () => {
    const vocabulary = {
      scenes: ["bus", "school"],
      synonyms: { campus: "school" },
      cameras: ["G328"],
      dates: ["2018-03-05"],
    };
    expect(apiVocabularyToVocabulary(vocabulary)).toEqual(vocabulary);
  });

  it("reads a missing field as empty", () => {
    expect(apiVocabularyToVocabulary({ scenes: ["bus"] })).toEqual({
      scenes: ["bus"],
      synonyms: {},
      cameras: [],
      dates: [],
    });
  });
});
