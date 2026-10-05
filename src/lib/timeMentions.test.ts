import { describe, expect, it } from "vitest";

import { linkTimes, timeTarget } from "@/lib/timeMentions";
import type { Clip } from "@/types";

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

// One video per camera. Camera time = captureStartLocal + seconds into the video.
const g638a = moment({
  id: "evt-1",
  code: "G638",
  camera: "G638",
  ref: 1,
  videoId: "v638",
  captureStartLocal: "2018-03-05T16:50:00",
  startSeconds: 72, // 16:51:12
  endSeconds: 82,
});
const g638b = moment({
  id: "evt-2",
  code: "G638",
  camera: "G638",
  ref: 2,
  videoId: "v638",
  captureStartLocal: "2018-03-05T16:50:00",
  startSeconds: 104, // 16:51:44
  endSeconds: 114,
});
const g329 = moment({
  id: "evt-3",
  code: "G329",
  camera: "G329",
  ref: 3,
  videoId: "v329",
  captureStartLocal: "2018-03-05T16:50:00",
  startSeconds: 176, // 16:52:56
  endSeconds: 186,
});
const g436 = moment({
  id: "evt-4",
  code: "G436",
  camera: "G436",
  ref: 4,
  videoId: "v436",
  captureStartLocal: "2018-03-07T11:10:00",
  startSeconds: 168, // 11:12:48
  endSeconds: 178,
});
const moments = [g638a, g638b, g329, g436];

/** The `[label](href)` links `linkTimes` wrote, as `[label, target]`. */
function links(markdown: string) {
  return [...markdown.matchAll(/\[([^\]]+)\]\((#time[^)]*)\)/g)].map((m) => [
    m[1],
    timeTarget(m[2]),
  ]);
}

const ANSWER = `Yes. Persons appear on three of the four cameras:

- G638 (school): a person stands near the main entrance at 16:51:12–16:51:22 [1]; another person appears at the same spot at 16:51:44–16:51:54 [2]; a second person joins the first at 16:54:56–16:55:00 [5].
- G329 (admin): a person wearing a backpack walks down a corridor toward the camera at 16:52:56–16:53:06 [3].
- G436 (hospital): multiple pedestrians walk on sidewalks and paths at 11:12:48–11:12:58 [4].

No events were returned for camera G423.`;

describe("linkTimes", () => {
  it("links every time in the RAG's answer to its moment, at that second of the video", () => {
    expect(links(linkTimes(ANSWER, moments))).toEqual([
      ["16:51:12–16:51:22", { clipId: "evt-1", sec: 72 }],
      ["16:51:44–16:51:54", { clipId: "evt-2", sec: 104 }],
      // [5] matches no result: the camera on the line (G638) and the time decide.
      ["16:54:56–16:55:00", { clipId: "evt-2", sec: 296 }],
      ["16:52:56–16:53:06", { clipId: "evt-3", sec: 176 }],
      ["11:12:48–11:12:58", { clipId: "evt-4", sec: 168 }],
    ]);
  });

  it("keeps the rest of the answer, citations included, as written", () => {
    const linked = linkTimes(ANSWER, moments);
    expect(linked).toContain("[1];");
    expect(linked).toContain("[5].");
    expect(linked).toContain("No events were returned for camera G423.");
    expect(linked.replace(/\[([^\]]+)\]\(#time[^)]*\)/g, "$1")).toBe(ANSWER);
  });

  it("trusts the citation next to a time over the camera named on its line", () => {
    const text = "G329 saw it at 16:51:12 [1].";
    expect(links(linkTimes(text, moments))).toEqual([["16:51:12", { clipId: "evt-1", sec: 72 }]]);
  });

  it("links a lone time when exactly one video holds it", () => {
    expect(links(linkTimes("Someone walks by at 11:12:50.", moments))).toEqual([
      ["11:12:50", { clipId: "evt-4", sec: 170 }],
    ]);
  });

  it("reads HH:MM as the start of that minute", () => {
    expect(links(linkTimes("Around 11:13 on G436.", moments))).toEqual([
      ["11:13", { clipId: "evt-4", sec: 180 }],
    ]);
  });

  it("leaves a time unlinked when it could be in more than one video", () => {
    const other = moment({
      ...g638a,
      id: "evt-9",
      code: "G999",
      camera: "G999",
      ref: 9,
      videoId: "v999",
    });
    expect(linkTimes("A person stands there at 16:51:12.", [g638a, other])).toBe(
      "A person stands there at 16:51:12.",
    );
  });

  it("leaves a time unlinked when no moment is near it", () => {
    expect(linkTimes("The lot was empty at 09:00:00.", moments)).toBe(
      "The lot was empty at 09:00:00.",
    );
  });

  it("links nothing without the videos' start times", () => {
    const noClock = moments.map((clip) => ({ ...clip, captureStartLocal: undefined }));
    expect(linkTimes(ANSWER, noClock)).toBe(ANSWER);
  });

  it("follows a video across midnight", () => {
    const late = moment({
      id: "evt-n",
      code: "G100",
      camera: "G100",
      ref: 1,
      videoId: "vn",
      captureStartLocal: "2018-03-05T23:58:00",
      startSeconds: 170,
      endSeconds: 190,
    });
    expect(links(linkTimes("At 00:01:00 [1].", [late]))).toEqual([
      ["00:01:00", { clipId: "evt-n", sec: 180 }],
    ]);
  });

  it("ignores video offsets and times inside code or links", () => {
    const text = "At 0:12 into the clip, `16:51:12`, and [16:51:12](https://x.test).";
    expect(linkTimes(text, moments)).toBe(text);
  });
});

describe("timeTarget", () => {
  it("reads the moment and second back from a time link, ids with colons included", () => {
    const linked = linkTimes("At 16:51:12.", [{ ...g638a, id: "v638:72", ref: undefined }]);
    expect(links(linked)).toEqual([["16:51:12", { clipId: "v638:72", sec: 72 }]]);
  });

  it("is null for any other link", () => {
    expect(timeTarget("#cite-1")).toBeNull();
    expect(timeTarget("https://x.test")).toBeNull();
    expect(timeTarget(undefined)).toBeNull();
  });
});
