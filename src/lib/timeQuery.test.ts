import { describe, expect, it } from "vitest";

import { withCamera } from "@/lib/cameraQuery";
import { describeTime, timeInQuery, withoutTime, withTime } from "@/lib/timeQuery";

describe("timeInQuery", () => {
  it("reads 12-hour times with and without minutes or a space", () => {
    expect(timeInQuery("anyone at 7pm")).toEqual({ mode: "at", from: "19:00" });
    expect(timeInQuery("At 7:00 pm which events occurred")).toEqual({ mode: "at", from: "19:00" });
    expect(timeInQuery("cars at 12 am")).toEqual({ mode: "at", from: "00:00" });
    expect(timeInQuery("cars at 12:30pm")).toEqual({ mode: "at", from: "12:30" });
  });

  it("reads 24-hour times", () => {
    expect(timeInQuery("who left at 19:00")).toEqual({ mode: "at", from: "19:00" });
    expect(timeInQuery("who left 7:05")).toEqual({ mode: "at", from: "07:05" });
  });

  it("reads the word before the time as the mode", () => {
    expect(timeInQuery("after 14:00 yesterday")).toEqual({ mode: "after", from: "14:00" });
    expect(timeInQuery("before 9am")).toEqual({ mode: "before", from: "09:00" });
    expect(timeInQuery("around 6:30 pm")).toEqual({ mode: "at", from: "18:30" });
  });

  it("reads ranges, taking a bare start's meridiem from its end", () => {
    expect(timeInQuery("between 7 and 9 pm")).toEqual({
      mode: "between",
      from: "19:00",
      to: "21:00",
    });
    expect(timeInQuery("from 18:00 to 20:30")).toEqual({
      mode: "between",
      from: "18:00",
      to: "20:30",
    });
    expect(timeInQuery("between 11 and 1 pm")).toEqual({
      mode: "between",
      from: "11:00",
      to: "13:00",
    });
  });

  it("finds no time in plain numbers, camera codes or relative periods", () => {
    expect(timeInQuery("the 3 people on camera G328")).toBeNull();
    expect(timeInQuery("last 24 hours")).toBeNull();
    expect(timeInQuery("yesterday after hours")).toBeNull();
  });
});

describe("describeTime", () => {
  it("writes times the way people ask", () => {
    expect(describeTime({ mode: "at", from: "19:00" })).toBe("at 7:00 pm");
    expect(describeTime({ mode: "before", from: "00:15" })).toBe("before 12:15 am");
    expect(describeTime({ mode: "between", from: "19:00", to: "21:00" })).toBe(
      "between 7:00 pm and 9:00 pm",
    );
  });
});

describe("withTime", () => {
  it("appends a time clause before the closing punctuation", () => {
    expect(withTime("who left the building?", { mode: "at", from: "19:00" })).toBe(
      "who left the building at 7:00 pm?",
    );
  });

  it("writes the clause alone into an empty query", () => {
    expect(withTime("", { mode: "after", from: "08:00" })).toBe("after 8:00 am");
  });

  it("replaces the time the query names instead of adding a second one", () => {
    expect(withTime("At 7:00 pm which events occurred", { mode: "at", from: "21:30" })).toBe(
      "At 9:30 pm which events occurred",
    );
    expect(withTime("cars between 7 and 9 pm", { mode: "before", from: "06:00" })).toBe(
      "cars before 6:00 am",
    );
  });

  it("works alongside the camera clause", () => {
    const query = withTime(withCamera("who left", "G328"), { mode: "at", from: "19:00" });
    expect(query).toBe("who left on camera G328 at 7:00 pm");
    expect(withCamera(query, "G420")).toBe("who left on cameras G328, G420 at 7:00 pm");
  });
});

describe("withoutTime", () => {
  it("removes the time with its word and tidies the spaces", () => {
    expect(withoutTime("who left at 7:00 pm on camera G328?")).toBe("who left on camera G328?");
    expect(withoutTime("cars between 7 and 9 pm")).toBe("cars");
  });

  it("leaves a query that names no time as it is", () => {
    expect(withoutTime("who left yesterday")).toBe("who left yesterday");
  });
});
