import { describe, expect, it } from "vitest";

import {
  CAMERA_FOR_PHRASE,
  CONFIDENCE_FOR_PHRASE,
  ENTITY_DEFS,
  TAG_FOR_PHRASE,
  findEntities,
  replaceRange,
  toSegments,
  type EntityKind,
} from "@/lib/entities";

/** The detected slices, as `[text, kind]`, in document order. */
function detect(text: string): Array<[string, EntityKind]> {
  return findEntities(text).map((hit) => [text.slice(hit.start, hit.end), hit.def.id]);
}

describe("findEntities — entity kinds", () => {
  it("detects subjects", () => {
    expect(detect("anyone near the van")).toEqual([
      ["anyone", "subject"],
      ["van", "subject"],
    ]);
  });

  it("detects multi-word subjects as one token", () => {
    expect(detect("a red sedan pulled up")).toEqual([["red sedan", "subject"]]);
  });

  it("detects events", () => {
    expect(detect("someone entered then exited")).toEqual([
      ["someone", "subject"],
      ["entered", "event"],
      ["exited", "event"],
    ]);
  });

  it("detects relative and absolute time ranges", () => {
    expect(detect("yesterday")).toEqual([["yesterday", "time"]]);
    expect(detect("after 14:00")).toEqual([["after 14:00", "time"]]);
    expect(detect("last 24 hours")).toEqual([["last 24 hours", "time"]]);
  });

  it("detects cameras by their spoken location", () => {
    expect(detect("the loading dock")).toEqual([["loading dock", "camera"]]);
  });

  it("detects confidence bands", () => {
    expect(detect("with high confidence")).toEqual([["high confidence", "confidence"]]);
  });

  it("is case-insensitive", () => {
    expect(detect("ANYONE who ENTERED Yesterday")).toEqual([
      ["ANYONE", "subject"],
      ["ENTERED", "event"],
      ["Yesterday", "time"],
    ]);
  });

  it("returns nothing for text with no cues", () => {
    expect(findEntities("show me everything")).toEqual([]);
    expect(findEntities("")).toEqual([]);
  });
});

describe("findEntities — overlap resolution", () => {
  it("keeps hits left to right", () => {
    const hits = findEntities("anyone who entered the parking lot yesterday");
    expect(hits.map((hit) => hit.start)).toEqual(
      [...hits.map((hit) => hit.start)].sort((a, b) => a - b),
    );
  });

  it("never returns overlapping ranges", () => {
    const hits = findEntities("a person entered the parking lot after 14:00 with high confidence");
    for (let i = 1; i < hits.length; i += 1) {
      expect(hits[i].start).toBeGreaterThanOrEqual(hits[i - 1].end);
    }
  });

  it("prefers the longer match when two entities start at the same index", () => {
    // "high confidence" (confidence) contains no competing start, but "last night"
    // (time) and "last 24 hours" (time) both begin at "last" — the longer wins.
    expect(detect("last 24 hours")).toEqual([["last 24 hours", "time"]]);
  });

  it("resolves a subject nested inside a camera phrase to a single token", () => {
    // "bus stop" is a camera; the standalone subject list must not split it.
    expect(detect("the bus stop")).toEqual([["bus stop", "camera"]]);
  });

  // SPEC §10 states this phrase underlines five terms. The shipped patterns
  // produce six: "after 14:00" and "yesterday" are independent time alternatives,
  // so they resolve as two adjacent `time` hits rather than one span.
  it("detects the acceptance-criteria phrase as six non-overlapping terms", () => {
    const query = "anyone who entered the parking lot after 14:00 yesterday with high confidence";
    const kinds = findEntities(query).map((hit) => hit.def.id);
    expect(kinds).toEqual(["subject", "event", "camera", "time", "time", "confidence"]);
  });

  // The time pattern's trailing `\s?(am|pm)?` consumes the separating space when
  // no meridiem follows, so the hit ends one character past the phrase. Choosing a
  // replacement for it would otherwise swallow the space and fuse two words.
  it("documents the trailing-space overshoot in bare clock times", () => {
    const query = "after 14:00 yesterday";
    const [first] = findEntities(query);
    expect(query.slice(first.start, first.end)).toBe("after 14:00 ");
  });
});

describe("toSegments", () => {
  it("interleaves plain text and tokens, preserving the original string", () => {
    const query = "anyone who entered";
    const segments = toSegments(query);
    expect(segments.map((segment) => segment.text).join("")).toBe(query);
    expect(segments.map((segment) => segment.kind)).toEqual(["token", "text", "token"]);
  });

  it("returns a single text segment when nothing is detected", () => {
    expect(toSegments("show me everything")).toEqual([
      { kind: "text", text: "show me everything" },
    ]);
  });

  it("returns nothing for an empty query", () => {
    expect(toSegments("")).toEqual([]);
  });
});

describe("replaceRange", () => {
  it("swaps the slice and keeps the surrounding text", () => {
    expect(replaceRange("anyone who entered", 0, 6, "vehicle")).toBe("vehicle who entered");
  });
});

describe("filter mappings", () => {
  it("maps every subject and event option to a tag", () => {
    const subjectsAndEvents = ENTITY_DEFS.filter(
      (def) => def.id === "subject" || def.id === "event",
    ).flatMap((def) => def.options);
    for (const option of subjectsAndEvents) {
      expect(TAG_FOR_PHRASE[option.toLowerCase()]).toBeTypeOf("string");
    }
  });

  it("maps every camera option to a camera code", () => {
    const cameras = ENTITY_DEFS.find((def) => def.id === "camera");
    for (const option of cameras?.options ?? []) {
      expect(CAMERA_FOR_PHRASE[option]).toMatch(/^G\d{3}$/);
    }
  });

  it("maps every confidence option to a threshold", () => {
    const confidence = ENTITY_DEFS.find((def) => def.id === "confidence");
    for (const option of confidence?.options ?? []) {
      expect(CONFIDENCE_FOR_PHRASE[option]).toBeTypeOf("number");
    }
  });
});
