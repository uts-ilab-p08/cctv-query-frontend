import { describe, expect, it } from "vitest";

import { boxAt } from "./tracks";

const boxes = [
  { t: 10, x: 0, y: 0, w: 100, h: 50, confidence: 0.8 },
  { t: 12, x: 200, y: 100, w: 120, h: 70, confidence: 0.9 },
];

describe("boxAt", () => {
  it("interpolates between the surrounding keyframes", () => {
    expect(boxAt(boxes, 11)).toEqual({ t: 11, x: 100, y: 50, w: 110, h: 60, confidence: 0.8 });
  });

  it("returns the keyframe itself on an exact hit", () => {
    expect(boxAt(boxes, 12)).toEqual(boxes[1]);
  });

  it("hides the box outside the tracked range", () => {
    expect(boxAt(boxes, 9.9)).toBeNull();
    expect(boxAt(boxes, 12.1)).toBeNull();
    expect(boxAt([], 11)).toBeNull();
  });
});
