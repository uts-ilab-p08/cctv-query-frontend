import { describe, expect, it } from "vitest";

import { resultsHref } from "./routes";

describe("resultsHref", () => {
  it("carries the query in ?q= so a refresh can re-run it", () => {
    expect(resultsHref("red car")).toBe("/results?q=red+car");
  });

  it("encodes characters that would break the URL", () => {
    expect(resultsHref("cars & vans #2")).toBe("/results?q=cars+%26+vans+%232");
  });

  it("drops an empty query", () => {
    expect(resultsHref("   ")).toBe("/results");
  });
});
