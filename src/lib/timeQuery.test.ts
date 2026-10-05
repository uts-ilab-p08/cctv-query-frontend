import { describe, expect, it } from "vitest";

import { formatClock, hourAfter, timeInQuery, withoutTime, withTime } from "@/lib/timeQuery";

describe("timeInQuery", () => {
  it("reads a time with a word before it, as 24-hour values", () => {
    expect(timeInQuery("At 7:00 pm which events occurred in the hospital cameras")).toEqual({
      mode: "at",
      from: "19:00",
      start: 0,
      end: 10,
    });
  });

  it("reads the common clock formats", () => {
    expect(timeInQuery("who left at 7pm")?.from).toBe("19:00");
    expect(timeInQuery("who left at 7:30 PM")?.from).toBe("19:30");
    expect(timeInQuery("who left at 19:00")?.from).toBe("19:00");
    expect(timeInQuery("who left at 12 am")?.from).toBe("00:00");
    expect(timeInQuery("who left at 12pm")?.from).toBe("12:00");
  });

  it("reads a bare clock time as a moment", () => {
    expect(timeInQuery("who left 7:15 am")).toMatchObject({ mode: "at", from: "07:15" });
  });

  it("maps each leading word to the picker's mode", () => {
    expect(timeInQuery("after 14:00")?.mode).toBe("after");
    expect(timeInQuery("since 2pm")?.mode).toBe("after");
    expect(timeInQuery("before 9 am")?.mode).toBe("before");
    expect(timeInQuery("until 9 am")?.mode).toBe("before");
    expect(timeInQuery("around 9 am")?.mode).toBe("at");
  });

  it("reads ranges, the first half taking am/pm from the second", () => {
    expect(timeInQuery("between 7 and 9 pm")).toMatchObject({
      mode: "between",
      from: "19:00",
      to: "21:00",
    });
    expect(timeInQuery("from 18:00 to 20:00")).toMatchObject({
      mode: "between",
      from: "18:00",
      to: "20:00",
    });
    expect(timeInQuery("between 11 and 1 pm")).toMatchObject({ from: "11:00", to: "13:00" });
  });

  it("ignores numbers that are not clock times", () => {
    expect(timeInQuery("2 people on camera G328")).toBeNull();
    expect(timeInQuery("after 2 cars arrived")).toBeNull();
    expect(timeInQuery("in the last 24 hours")).toBeNull();
    expect(timeInQuery("at 25:00")).toBeNull();
  });
});

describe("formatClock", () => {
  it("writes a 24-hour value the way people say it", () => {
    expect(formatClock("19:00")).toBe("7:00 pm");
    expect(formatClock("00:05")).toBe("12:05 am");
    expect(formatClock("12:30")).toBe("12:30 pm");
  });
});

describe("hourAfter", () => {
  it("gives a new range an hour, without running past midnight", () => {
    expect(hourAfter("19:00")).toBe("20:00");
    expect(hourAfter("23:30")).toBe("23:59");
  });
});

describe("withTime", () => {
  it("appends a time clause before the closing punctuation", () => {
    expect(withTime("who left the building?", { mode: "at", from: "19:00" })).toBe(
      "who left the building at 7:00 pm?",
    );
  });

  it("starts an empty query with a capital", () => {
    expect(withTime("", { mode: "after", from: "07:00" })).toBe("After 7:00 am");
  });

  it("replaces the time the text names instead of adding a second one", () => {
    expect(withTime("who left at 7pm on camera G328", { mode: "before", from: "21:00" })).toBe(
      "who left before 9:00 pm on camera G328",
    );
  });

  it("keeps the capital at the start of a sentence", () => {
    expect(
      withTime("At 7:00 pm which events occurred in the hospital cameras", {
        mode: "between",
        from: "19:00",
        to: "21:00",
      }),
    ).toBe("Between 7:00 pm and 9:00 pm which events occurred in the hospital cameras");
  });

  it("works next to the camera clause", () => {
    expect(withTime("who left on camera G328", { mode: "at", from: "19:00" })).toBe(
      "who left on camera G328 at 7:00 pm",
    );
  });
});

describe("withoutTime", () => {
  it("removes the time and tidies the spaces", () => {
    expect(withoutTime("who left at 7:00 pm on camera G328?")).toBe("who left on camera G328?");
  });

  it("moves the capital to the new first word", () => {
    expect(withoutTime("At 7:00 pm, which events occurred")).toBe("Which events occurred");
  });

  it("leaves a query without a time untouched", () => {
    expect(withoutTime("who left yesterday")).toBe("who left yesterday");
  });
});
