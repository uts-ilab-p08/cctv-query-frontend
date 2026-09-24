import { describe, expect, it } from "vitest";

import { getAllClips } from "@/lib/clips";
import { emptyFilters, filterClips, getActiveFilterChips, hasActiveFilters } from "@/lib/filters";

const clips = getAllClips();

describe("filterClips", () => {
  it("returns every clip in chronological order when no filter is set", () => {
    const result = filterClips(clips, emptyFilters);

    expect(result).toHaveLength(clips.length);
    expect(result.map((clip) => clip.order)).toEqual(
      [...result].sort((a, b) => a.order - b.order).map((clip) => clip.order),
    );
  });

  it("keeps only the selected cameras", () => {
    const result = filterClips(clips, { ...emptyFilters, cameras: ["G301"] });

    expect(result.length).toBeGreaterThan(0);
    expect(result.every((clip) => clip.camera === "G301")).toBe(true);
  });

  it("matches a clip when it carries any of the selected tags", () => {
    const result = filterClips(clips, { ...emptyFilters, tags: ["Vehicle", "Loitering"] });

    expect(result.length).toBeGreaterThan(0);
    expect(
      result.every((clip) => clip.tags.includes("Vehicle") || clip.tags.includes("Loitering")),
    ).toBe(true);
  });

  it("drops clips below the confidence threshold", () => {
    const result = filterClips(clips, { ...emptyFilters, confidence: 90 });

    expect(result.every((clip) => clip.confidence >= 90)).toBe(true);
    expect(result.length).toBeLessThan(clips.length);
  });

  it("intersects camera and tag constraints", () => {
    const result = filterClips(clips, { ...emptyFilters, cameras: ["G328"], tags: ["Vehicle"] });

    expect(result.every((clip) => clip.camera === "G328" && clip.tags.includes("Vehicle"))).toBe(
      true,
    );
  });

  it("returns nothing when the threshold excludes every clip", () => {
    expect(filterClips(clips, { ...emptyFilters, confidence: 101 })).toEqual([]);
  });
});

describe("getActiveFilterChips", () => {
  it("is empty for untouched filters", () => {
    expect(getActiveFilterChips(emptyFilters)).toEqual([]);
    expect(hasActiveFilters(emptyFilters)).toBe(false);
  });

  it("lists cameras before tags with stable keys", () => {
    const chips = getActiveFilterChips({
      ...emptyFilters,
      cameras: ["G301"],
      tags: ["Person"],
    });

    expect(chips.map((chip) => chip.key)).toEqual(["camera:G301", "tag:Person"]);
    expect(hasActiveFilters({ ...emptyFilters, tags: ["Person"] })).toBe(true);
  });

  it("ignores a confidence-only filter", () => {
    expect(hasActiveFilters({ ...emptyFilters, confidence: 80 })).toBe(false);
  });
});

describe("scene filter", () => {
  it("keeps only clips from the chosen scenes", () => {
    const all = getAllClips();
    const admin = filterClips(all, { ...emptyFilters, scenes: ["admin"] });
    expect(admin.length).toBeGreaterThan(0);
    expect(admin.every((clip) => clip.scene === "admin")).toBe(true);
  });

  it("shows a removable chip per scene", () => {
    expect(getActiveFilterChips({ ...emptyFilters, scenes: ["admin"] })).toContainEqual({
      key: "scene:admin",
      label: "admin",
      kind: "scene",
    });
  });
});
