import { describe, expect, it } from "vitest";

import { citedRefs, linkCitations } from "./citations";

describe("citedRefs", () => {
  it("lists each cited source once, in the order the answer first cites it", () => {
    expect(citedRefs("A car [3] then a person [1], and again [3].")).toEqual([3, 1]);
  });

  it("reads grouped citations", () => {
    expect(citedRefs("Seen twice [1, 2] and later [4][5].")).toEqual([1, 2, 4, 5]);
  });

  it("ignores markdown links and code", () => {
    expect(citedRefs("See [2](https://example.com) and `arr[1]`.")).toEqual([]);
  });

  it("finds nothing in an answer without citations", () => {
    expect(citedRefs("No matching footage was found.")).toEqual([]);
  });
});

describe("linkCitations", () => {
  it("turns each citation into a link the chat can render as a source chip", () => {
    expect(linkCitations("A car [3] and [1, 2].")).toBe(
      "A car [3](#cite-3) and [1](#cite-1)[2](#cite-2).",
    );
  });

  it("leaves existing links and code alone", () => {
    const text = "See [2](https://example.com) and `arr[1]`.";
    expect(linkCitations(text)).toBe(text);
  });
});
