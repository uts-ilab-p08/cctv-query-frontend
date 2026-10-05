import { describe, expect, it } from "vitest";

import { cameraDateTime } from "@/lib/cameraTime";

describe("cameraDateTime", () => {
  it("adds the playhead to the video's local start", () => {
    expect(cameraDateTime("2018-03-05T13:15:00", 162)).toEqual({
      date: "2018-03-05",
      time: "13:17:42",
    });
  });

  it("drops the fraction of a second, as a clock does", () => {
    expect(cameraDateTime("2018-03-05T13:15:00", 2.97)?.time).toBe("13:15:02");
  });

  it("rolls the date over midnight", () => {
    expect(cameraDateTime("2018-03-05T23:59:30", 45)).toEqual({
      date: "2018-03-06",
      time: "00:00:15",
    });
  });

  it("never jumps on a daylight-saving change: the camera's clock is not the viewer's", () => {
    // 02:00 on 2018-03-11 does not exist in US time zones; the camera still reads it.
    expect(cameraDateTime("2018-03-11T01:59:00", 120)?.time).toBe("02:01:00");
  });

  it("gives nothing for a missing or unreadable start, rather than 00:00:00", () => {
    expect(cameraDateTime(undefined, 10)).toBeNull();
    expect(cameraDateTime("not a date", 10)).toBeNull();
  });
});
