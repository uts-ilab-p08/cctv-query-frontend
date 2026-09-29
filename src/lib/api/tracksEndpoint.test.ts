import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiFetch } from "./client";
import { getTracks } from "./endpoints";

vi.mock("./client", () => ({ apiFetch: vi.fn() }));

const response = {
  video_id: "vid 1",
  frame_width: 1920,
  frame_height: 1080,
  objects: [
    {
      object_id: "obj-1",
      label: "vehicle",
      boxes: [{ t: 12, x: 100, y: 200, w: 400, h: 220, confidence: 0.93 }],
    },
  ],
};

describe("getTracks (live GET /api/v1/videos/{video_id}/tracks)", () => {
  beforeEach(() => vi.mocked(apiFetch).mockReset());

  it("asks for the moment's window and returns the backend's tracks as-is", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(response);

    await expect(
      getTracks({ video_id: "vid 1", start_seconds: 12, end_seconds: 18 }),
    ).resolves.toEqual(response);
    expect(apiFetch).toHaveBeenCalledWith(
      "/api/v1/videos/vid%201/tracks?start_seconds=12&end_seconds=18",
    );
  });

  it("narrows to one event's objects when the event id is known", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(response);

    await getTracks({ video_id: "vid-1", start_seconds: 0, end_seconds: 6, event_id: "evt-9" });

    expect(apiFetch).toHaveBeenCalledWith(
      "/api/v1/videos/vid-1/tracks?start_seconds=0&end_seconds=6&event_id=evt-9",
    );
  });
});
