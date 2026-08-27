import { describe, expect, it } from "vitest";

import { cameraNames } from "@/data/cameras";
import { detectKeywords } from "@/lib/keywords";

describe("detectKeywords", () => {
  it("returns nothing for an empty or blank query", () => {
    expect(detectKeywords("")).toEqual([]);
    expect(detectKeywords("   ")).toEqual([]);
  });

  it("detects several cues in one natural-language query", () => {
    const detected = detectKeywords("Show anyone who entered after the red car arrived");

    expect(detected.map((keyword) => keyword.id)).toEqual(
      expect.arrayContaining(["person", "vehicle", "entry", "time"]),
    );
  });

  it("is case insensitive", () => {
    expect(detectKeywords("VEHICLE")).toHaveLength(1);
    expect(detectKeywords("vehicle")).toHaveLength(1);
  });

  it("matches whole words only", () => {
    expect(detectKeywords("personality test")).toEqual([]);
  });

  it("fills camera cues from the camera directory", () => {
    const [detected] = detectKeywords("loitering near the loading dock");

    expect(detected.id).toBe("camera");
    expect(detected.options).toEqual([...cameraNames]);
    expect(detected.dropdownTitle).toBe("Camera");
  });

  it("uses the preset options for tag cues", () => {
    const [detected] = detectKeywords("someone in the hallway");

    expect(detected.kind).toBe("tag");
    expect(detected.options).toEqual(["Person", "Loitering"]);
    expect(detected.dropdownTitle).toBe("Event type");
  });

  it("returns no cues for a query with no recognised terms", () => {
    expect(detectKeywords("zzz qqq")).toEqual([]);
  });
});
