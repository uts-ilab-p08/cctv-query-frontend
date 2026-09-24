import { describe, expect, it } from "vitest";

import { tsToSec } from "./time";

describe("tsToSec", () => {
  it("reads a wall-clock time", () => {
    expect(tsToSec("13:58:02")).toBe(13 * 3600 + 58 * 60 + 2);
  });

  it("reads a video offset without hours", () => {
    expect(tsToSec("2:05")).toBe(125);
  });
});
