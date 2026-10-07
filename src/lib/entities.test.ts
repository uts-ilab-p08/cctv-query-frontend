import { describe, expect, it } from "vitest";

import {
  entityDefs,
  findEntities,
  replaceRange,
  toSegments,
  type EntityDef,
  type EntityKind,
} from "@/lib/entities";
import type { Vocabulary } from "@/types";

/** The detected slices, as `[text, kind]`, in document order. */
function detect(text: string, defs?: readonly EntityDef[]): Array<[string, EntityKind]> {
  return findEntities(text, defs).map((hit) => [text.slice(hit.start, hit.end), hit.def.id]);
}

describe("findEntities — entity kinds", () => {
  it("detects subjects", () => {
    expect(detect("anyone near the van")).toEqual([
      ["anyone", "subject"],
      ["van", "subject"],
    ]);
  });

  it("reads a colour apart from the subject or clothing it describes", () => {
    expect(detect("a red sedan pulled up")).toEqual([
      ["red", "colour"],
      ["sedan", "subject"],
    ]);
    expect(detect("a person in a white hoodie")).toEqual([
      ["person", "subject"],
      ["white", "colour"],
      ["hoodie", "clothing"],
    ]);
  });

  it("detects more subjects: bikes, motorcycles, carried and vehicle parts", () => {
    expect(detect("bicycle motorcycle backpack trunk door")).toEqual([
      ["bicycle", "subject"],
      ["motorcycle", "subject"],
      ["backpack", "subject"],
      ["trunk", "subject"],
      ["door", "subject"],
    ]);
  });

  it("reads 'dark' as a colour, but not in 'after dark'", () => {
    expect(detect("a man in dark clothes")).toContainEqual(["dark", "colour"]);
    expect(detect("anything after dark")).toEqual([]);
  });

  it("detects events", () => {
    expect(detect("someone entered then exited")).toEqual([
      ["someone", "subject"],
      ["entered", "event"],
      ["exited", "event"],
    ]);
  });

  it("detects the Object Left events and vehicle or interaction verbs", () => {
    expect(detect("a bag left behind, abandoned or unattended")).toEqual([
      ["bag", "subject"],
      ["left behind", "event"],
      ["abandoned", "event"],
      ["unattended", "event"],
    ]);
    expect(detect("stopped stationary reversed carrying unloading")).toEqual([
      ["stopped", "event"],
      ["stationary", "event"],
      ["reversed", "event"],
      ["carrying", "event"],
      ["unloading", "event"],
    ]);
    expect(detect("someone picked up a package")).toContainEqual(["picked up", "event"]);
  });

  it("detects plural subjects, regular and irregular", () => {
    expect(detect("vehicles cars bags vans bicycles")).toEqual([
      ["vehicles", "subject"],
      ["cars", "subject"],
      ["bags", "subject"],
      ["vans", "subject"],
      ["bicycles", "subject"],
    ]);
    expect(detect("two men and three women")).toEqual([
      ["men", "subject"],
      ["women", "subject"],
    ]);
  });

  it("detects every form of the phrasal events", () => {
    for (const phrase of ["pick up", "picks up", "picking up", "picked up"]) {
      expect(detect(`someone ${phrase} a box`)).toContainEqual([phrase, "event"]);
    }
    for (const phrase of ["put down", "puts down", "putting down"]) {
      expect(detect(`someone ${phrase} a box`)).toContainEqual([phrase, "event"]);
    }
    for (const phrase of ["drop off", "drops off", "dropping off", "dropped off"]) {
      expect(detect(`someone ${phrase} a box`)).toContainEqual([phrase, "event"]);
    }
  });

  it("reads 'leave' as an event when something or somewhere follows it", () => {
    expect(detect("did anyone leave a bag")).toContainEqual(["leave", "event"]);
    expect(detect("he leaves the building")).toContainEqual(["leaves", "event"]);
    expect(detect("someone left a package")).toContainEqual(["left", "event"]);
    expect(detect("leave it to me")).toEqual([]);
  });

  it("reads 'left' as an event only when something was left", () => {
    expect(detect("who left the building")).toContainEqual(["left", "event"]);
    expect(detect("the car turned left")).toEqual([
      ["car", "subject"],
      ["turned", "event"],
    ]);
    expect(detect("on the left side")).toEqual([]);
  });

  it("does not read a loading dock as an event", () => {
    expect(detect("anyone loading a van at the loading dock")).toEqual([
      ["anyone", "subject"],
      ["loading", "event"],
      ["van", "subject"],
    ]);
  });

  it("detects dates in the forms the RAG filters on", () => {
    expect(detect("on 2018-03-05")).toEqual([["2018-03-05", "date"]]);
    expect(detect("on March 5")).toEqual([["March 5", "date"]]);
    expect(detect("on Mar 5th, 2018")).toEqual([["Mar 5th, 2018", "date"]]);
    expect(detect("on 7 March 2018")).toEqual([["7 March 2018", "date"]]);
    expect(detect("on the 7th of March")).toEqual([["the 7th of March", "date"]]);
    expect(detect("on the 7th")).toEqual([["the 7th", "date"]]);
  });

  it("keeps a date and a clock time apart", () => {
    expect(detect("March 5 after 14:00")).toEqual([
      ["March 5", "date"],
      ["after 14:00", "time"],
    ]);
    expect(detect("it may rain")).toEqual([]);
  });

  it("detects the indexed locations and the synonyms the RAG maps to them", () => {
    expect(detect("at the hospital")).toEqual([["hospital", "scene"]]);
    expect(detect("near the bus station")).toEqual([["bus station", "scene"]]);
    expect(detect("on campus, at the clinic, the medical centre")).toEqual([
      ["campus", "scene"],
      ["clinic", "scene"],
      ["medical centre", "scene"],
    ]);
    expect(detect("outside admin")).toEqual([["admin", "scene"]]);
  });

  it("flags words that exclude something", () => {
    expect(detect("people not at the school")).toEqual([
      ["people", "subject"],
      ["not", "negation"],
      ["school", "scene"],
    ]);
    expect(detect("anyone without a bag, other than G328")).toEqual([
      ["anyone", "subject"],
      ["without", "negation"],
      ["bag", "subject"],
      ["other than", "negation"],
      ["G328", "camera"],
    ]);
    expect(detect("no one entered")).toEqual([["entered", "event"]]);
  });

  it("detects relative and absolute time ranges", () => {
    expect(detect("yesterday")).toEqual([["yesterday", "time"]]);
    expect(detect("after 14:00")).toEqual([["after 14:00", "time"]]);
    expect(detect("last 24 hours")).toEqual([["last 24 hours", "time"]]);
  });

  it("detects cameras by their code, as the RAG reads them", () => {
    expect(detect("Search cameras G345, G356 for anyone")).toEqual([
      ["G345", "camera"],
      ["G356", "camera"],
      ["anyone", "subject"],
    ]);
    expect(detect("on camera g328")).toEqual([["g328", "camera"]]);
  });

  it("reads a camera code as exactly three digits, as the RAG does", () => {
    expect(detect("cameras G45 and G3410")).toEqual([]);
  });

  it("no longer reads place names as cameras", () => {
    expect(detect("the loading dock")).toEqual([]);
  });

  // Nothing narrows a search by confidence (the RAG reads no threshold from the text),
  // so underlining one would promise a filter that never happens.
  it("does not underline confidence", () => {
    expect(detect("with high confidence")).toEqual([]);
    expect(detect("above 80% confidence")).toEqual([]);
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
    const hits = findEntities("a person entered on camera G328 after 14:00 at the school");
    for (let i = 1; i < hits.length; i += 1) {
      expect(hits[i].start).toBeGreaterThanOrEqual(hits[i - 1].end);
    }
  });

  it("prefers the longer match when two entities start at the same index", () => {
    // "last night" (time) and "last 24 hours" (time) both begin at "last" — the longer wins.
    expect(detect("last 24 hours")).toEqual([["last 24 hours", "time"]]);
  });

  // SPEC §10 states this phrase underlines five terms. "after 14:00" and "yesterday" are
  // independent time alternatives (two adjacent `time` hits), and "high confidence" is
  // not underlined, since nothing filters on it.
  it("detects the acceptance-criteria phrase as five non-overlapping terms", () => {
    const query = "anyone who entered on camera G328 after 14:00 yesterday with high confidence";
    const kinds = findEntities(query).map((hit) => hit.def.id);
    expect(kinds).toEqual(["subject", "event", "camera", "time", "time"]);
  });

  // A bare clock time ends at its last digit: choosing a replacement for it keeps the
  // space before the next word instead of fusing the two.
  it("ends a bare clock time before the space that follows it", () => {
    const query = "after 14:00 yesterday";
    const [first] = findEntities(query);
    expect(query.slice(first.start, first.end)).toBe("after 14:00");
  });

  it("detects clock times and ranges in their common forms", () => {
    expect(detect("At 7:00 pm which events occurred")).toEqual([["At 7:00 pm", "time"]]);
    expect(detect("who left at 7pm")).toContainEqual(["at 7pm", "time"]);
    expect(detect("before 19:00")).toEqual([["before 19:00", "time"]]);
    expect(detect("between 7 and 9 pm")).toEqual([["between 7 and 9 pm", "time"]]);
    expect(detect("from 18:00 to 20:00")).toEqual([["from 18:00 to 20:00", "time"]]);
    expect(detect("2 people")).toEqual([["people", "subject"]]);
  });
});

describe("entityDefs — the index's vocabulary", () => {
  const vocabulary: Vocabulary = {
    scenes: ["bus", "gym", "school"],
    synonyms: { "bus stop": "bus", campus: "school" },
    cameras: ["G328", "G341"],
    dates: ["2018-03-05", "2018-03-07"],
  };
  const defs = entityDefs(vocabulary);
  const def = (id: EntityKind) => defs.find((d) => d.id === id)!;

  it("underlines the indexed scenes and their synonyms, not the built-in list", () => {
    expect(detect("at the gym or on campus", defs)).toEqual([
      ["gym", "scene"],
      ["campus", "scene"],
    ]);
    expect(detect("at the hospital", defs)).toEqual([]);
  });

  it("prefers the longer location phrase", () => {
    expect(detect("near the bus stop", defs)).toEqual([["bus stop", "scene"]]);
  });

  it("reads location words literally, not as regex", () => {
    const dotted = entityDefs({ ...vocabulary, scenes: ["st. mary"], synonyms: {} });
    expect(detect("at st. mary", dotted)).toEqual([["st. mary", "scene"]]);
    expect(detect("at stx mary", dotted)).toEqual([]);
  });

  it("underlines no location when the index has none", () => {
    const empty = entityDefs({ scenes: [], synonyms: {}, cameras: [], dates: [] });
    expect(detect("at the school", empty)).toEqual([]);
  });

  it("offers the indexed scenes, dates and cameras", () => {
    expect(def("scene").options).toEqual(["bus", "gym", "school"]);
    expect(def("date").options).toEqual(["2018-03-05", "2018-03-07"]);
    expect(def("camera").options).toEqual(["G328", "G341"]);
  });

  it("keeps the built-in definitions without a vocabulary", () => {
    expect(entityDefs(null)).toBe(entityDefs());
    expect(detect("at the hospital", entityDefs(null))).toEqual([["hospital", "scene"]]);
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
