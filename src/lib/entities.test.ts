import { describe, expect, it } from "vitest";

import { findEntities, replaceRange, toSegments, type EntityKind } from "@/lib/entities";

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

  it("detects cameras by their code, as the RAG reads them", () => {
    expect(detect("Search cameras G45, G56 for anyone")).toEqual([
      ["G45", "camera"],
      ["G56", "camera"],
      ["anyone", "subject"],
    ]);
    expect(detect("on camera g328")).toEqual([["g328", "camera"]]);
  });

  it("no longer reads place names as cameras", () => {
    expect(detect("the loading dock")).toEqual([]);
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
    const hits = findEntities("anyone who entered on camera G328 yesterday");
    expect(hits.map((hit) => hit.start)).toEqual(
      [...hits.map((hit) => hit.start)].sort((a, b) => a - b),
    );
  });

  it("never returns overlapping ranges", () => {
    const hits = findEntities("a person entered on camera G328 after 14:00 with high confidence");
    for (let i = 1; i < hits.length; i += 1) {
      expect(hits[i].start).toBeGreaterThanOrEqual(hits[i - 1].end);
    }
  });

  it("prefers the longer match when two entities start at the same index", () => {
    // "high confidence" (confidence) contains no competing start, but "last night"
    // (time) and "last 24 hours" (time) both begin at "last" — the longer wins.
    expect(detect("last 24 hours")).toEqual([["last 24 hours", "time"]]);
  });

  // SPEC §10 states this phrase underlines five terms. The shipped patterns
  // produce six: "after 14:00" and "yesterday" are independent time alternatives,
  // so they resolve as two adjacent `time` hits rather than one span.
  it("detects the acceptance-criteria phrase as six non-overlapping terms", () => {
    const query = "anyone who entered on camera G328 after 14:00 yesterday with high confidence";
    const kinds = findEntities(query).map((hit) => hit.def.id);
    expect(kinds).toEqual(["subject", "event", "camera", "time", "time", "confidence"]);
  });

  // The old pattern's trailing `\s?(am|pm)?` swallowed the space after a bare clock
  // time; a replacement chosen for it then fused two words.
  it("ends a clock time at the time itself, not the space after it", () => {
    const query = "after 14:00 yesterday";
    const [first] = findEntities(query);
    expect(query.slice(first.start, first.end)).toBe("after 14:00");
  });

  it("detects clock times written in natural language", () => {
    expect(detect("At 7:00 pm which events occurred in the hospital cameras")).toContainEqual([
      "At 7:00 pm",
      "time",
    ]);
    expect(detect("anything at 7pm")).toContainEqual(["at 7pm", "time"]);
    expect(detect("cars around 19:00")).toContainEqual(["around 19:00", "time"]);
    expect(detect("between 7 and 9 pm")).toEqual([["between 7 and 9 pm", "time"]]);
  });

  it("detects a time and a camera side by side", () => {
    const kinds = findEntities("who left on camera G328 at 7:00 pm").map((hit) => hit.def.id);
    expect(kinds).toEqual(["event", "camera", "time"]);
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
