import { describe, expect, it } from "vitest";

import {
  confidenceLabel,
  confidenceLevel,
  confidenceOnMediaVar,
  confidenceVar,
} from "@/components/results/confidence";

describe("confidenceLevel", () => {
  // Scores are similarities (score × 100): real matches often sit in the 50s and 60s,
  // so only a really low one is "low".
  it("splits the 1–100 scale at 70 and 40", () => {
    expect(confidenceLevel(100)).toBe("high");
    expect(confidenceLevel(70)).toBe("high");
    expect(confidenceLevel(69)).toBe("mid");
    expect(confidenceLevel(55)).toBe("mid");
    expect(confidenceLevel(40)).toBe("mid");
    expect(confidenceLevel(39)).toBe("low");
    expect(confidenceLevel(1)).toBe("low");
  });
});

describe("confidenceLabel", () => {
  it("names the level in words, so it never rests on colour alone", () => {
    expect(confidenceLabel(82)).toBe("High confidence");
    expect(confidenceLabel(55)).toBe("Medium confidence");
    expect(confidenceLabel(12)).toBe("Low confidence");
  });
});

describe("confidence colour tokens", () => {
  it("uses the theme's status colours on themed surfaces", () => {
    expect(confidenceVar(82)).toBe("var(--ok)");
    expect(confidenceVar(55)).toBe("var(--warn)");
    expect(confidenceVar(12)).toBe("var(--bad)");
  });

  it("uses the over-footage status colours on the dark score chip", () => {
    expect(confidenceOnMediaVar(82)).toBe("var(--ok-on-media)");
    expect(confidenceOnMediaVar(55)).toBe("var(--warn-on-media)");
    expect(confidenceOnMediaVar(12)).toBe("var(--bad-on-media)");
  });
});
