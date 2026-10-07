import { describe, expect, it } from "vitest";

import { camerasInQuery, withCamera, withoutCamera } from "@/lib/cameraQuery";

describe("camerasInQuery", () => {
  it("reads every camera code in the query, once, upper-cased, in order", () => {
    expect(camerasInQuery("Search cameras G345, g356 and G328: who left? G345 again")).toEqual([
      "G345",
      "G356",
      "G328",
    ]);
  });

  it("finds none in a query that names no camera", () => {
    expect(camerasInQuery("anyone who entered the parking lot")).toEqual([]);
  });

  it("ignores codes that are not three digits, which the RAG never reads", () => {
    expect(camerasInQuery("cameras G45, G3410 and G341")).toEqual(["G341"]);
  });

  it("does not mistake words or times for camera codes", () => {
    expect(camerasInQuery("GG328 after 14:00 in G7")).toEqual([]);
  });
});

describe("withCamera", () => {
  it("appends a camera clause to a query that names none", () => {
    expect(withCamera("who left the building", "G328")).toBe(
      "who left the building on camera G328",
    );
  });

  it("keeps the closing question mark at the end", () => {
    expect(withCamera("who left the building?", "G328")).toBe(
      "who left the building on camera G328?",
    );
  });

  it("adds to the cameras already named, pluralising the clause", () => {
    expect(withCamera("who left on camera G328?", "G420")).toBe("who left on cameras G328, G420?");
    expect(withCamera("Search cameras G345, G356, who left", "G328")).toBe(
      "Search cameras G345, G356, G328, who left",
    );
  });

  it("leaves the query alone when the camera is already in it", () => {
    expect(withCamera("who left on camera g328", "G328")).toBe("who left on camera g328");
  });

  it("starts an empty query with the clause alone", () => {
    expect(withCamera("", "G328")).toBe("on camera G328");
  });
});

describe("withoutCamera", () => {
  it("drops the whole clause with the last camera", () => {
    expect(withoutCamera("who left the building on camera G328?", "G328")).toBe(
      "who left the building?",
    );
    expect(withoutCamera("Search cameras G345, who left", "G345")).toBe("Search who left");
  });

  it("drops one camera from a list, with its separator, singularising the clause", () => {
    expect(withoutCamera("who left on cameras G328, G420?", "G328")).toBe(
      "who left on camera G420?",
    );
    expect(withoutCamera("who left on cameras G328, G420?", "G420")).toBe(
      "who left on camera G328?",
    );
    expect(withoutCamera("cameras G345, G356 and G328: who left", "G356")).toBe(
      "cameras G345 and G328: who left",
    );
  });

  it("removes a bare code with no clause around it", () => {
    expect(withoutCamera("did G328 see a van", "G328")).toBe("did see a van");
  });

  it("matches the code regardless of case", () => {
    expect(withoutCamera("who left on camera g328", "G328")).toBe("who left");
  });

  it("leaves the query alone when the camera is not in it", () => {
    expect(withoutCamera("who left on camera G328", "G420")).toBe("who left on camera G328");
  });

  it("round-trips with withCamera", () => {
    const query = "who left the building?";
    expect(withoutCamera(withCamera(query, "G328"), "G328")).toBe(query);
    const two = withCamera(withCamera(query, "G328"), "G420");
    expect(withoutCamera(withoutCamera(two, "G420"), "G328")).toBe(query);
  });
});
