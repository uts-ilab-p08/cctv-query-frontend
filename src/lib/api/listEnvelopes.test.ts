import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiFetch } from "./client";
import { getCameras, getRecentQueries, getRelatedClips } from "./endpoints";
import type { ApiClip } from "./types";

vi.mock("./client", () => ({ apiFetch: vi.fn() }));

const clip: ApiClip = {
  id: "evt-1",
  camera: "G328",
  code: "G328",
  ts: "13:58:02",
  date: "Aug 4",
  order: 0,
  confidence: 96,
  tags: ["Vehicle"],
  objects: "Red sedan",
  action: "Vehicle arrival",
  thumbnailUrl: null,
  videoUrl: null,
};
const recent = { id: "rq-1", text: "red car", ts: "10:02", cameras: 2 };
const camera = { code: "G328", eventCount: 3 };

/**
 * These three responses are untyped `object`s in the live OpenAPI schema, so the
 * envelope is unconfirmed until an authenticated call is inspected. Each accepts
 * the documented `{ key: [...] }` and a bare array, and never throws on anything else.
 */
describe.each([
  ["getRecentQueries", () => getRecentQueries(), "queries", recent, recent],
  [
    "getRelatedClips",
    () => getRelatedClips("evt-1"),
    "clips",
    clip,
    expect.objectContaining({ id: "evt-1" }),
  ],
  ["getCameras", () => getCameras(), "cameras", camera, camera],
])("%s", (_name, call, key, row, expected) => {
  beforeEach(() => vi.mocked(apiFetch).mockReset());

  it(`reads the { ${key} } envelope`, async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ [key]: [row] });
    await expect(call()).resolves.toEqual([expected]);
  });

  it("also accepts a bare array", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce([row]);
    await expect(call()).resolves.toEqual([expected]);
  });

  it("falls back to an empty list for an unknown envelope", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ items: [row] });
    await expect(call()).resolves.toEqual([]);
  });
});

describe("getRecentQueries", () => {
  beforeEach(() => vi.mocked(apiFetch).mockReset());

  it("returns the newest three, since the endpoint has no limit param yet", async () => {
    const at = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60_000).toISOString();
    vi.mocked(apiFetch).mockResolvedValueOnce({
      queries: [
        { id: "old", text: "old", ts: at(90), cameras: 1 },
        { id: "newest", text: "newest", ts: at(1), cameras: 1 },
        { id: "mid", text: "mid", ts: at(30), cameras: 1 },
        { id: "new", text: "new", ts: at(10), cameras: 1 },
      ],
    });

    const queries = await getRecentQueries();

    expect(queries.map((q) => q.id)).toEqual(["newest", "new", "mid"]);
  });
});
