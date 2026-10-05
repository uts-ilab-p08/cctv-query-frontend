import { describe, expect, it } from "vitest";

import {
  confidenceLabel,
  confidenceMediaVar,
  confidenceTextClass,
  confidenceVar,
} from "@/components/results/confidence";

describe("confidence scale", () => {
  it("keeps red for the really low scores of a 1–100 range", () => {
    expect(confidenceLabel(100)).toBe("High confidence");
    expect(confidenceLabel(70)).toBe("High confidence");
    expect(confidenceLabel(69)).toBe("Medium confidence");
    expect(confidenceLabel(55)).toBe("Medium confidence");
    expect(confidenceLabel(40)).toBe("Medium confidence");
    expect(confidenceLabel(39)).toBe("Low confidence");
    expect(confidenceLabel(1)).toBe("Low confidence");
  });

  it("maps every helper to the same level", () => {
    expect([confidenceTextClass(82), confidenceVar(82), confidenceMediaVar(82)]).toEqual([
      "text-match",
      "var(--ok)",
      "var(--ok-on-media)",
    ]);
    expect([confidenceTextClass(55), confidenceVar(55), confidenceMediaVar(55)]).toEqual([
      "text-review",
      "var(--warn)",
      "var(--warn-on-media)",
    ]);
    expect([confidenceTextClass(12), confidenceVar(12), confidenceMediaVar(12)]).toEqual([
      "text-flag",
      "var(--bad)",
      "var(--bad-on-media)",
    ]);
  });
});
