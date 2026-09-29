import { describe, expect, it } from "vitest";

import { fmtElapsed, formatRelativeTime } from "./time";

describe("fmtElapsed", () => {
  it("shows minutes and seconds into the video", () => {
    expect(fmtElapsed(125)).toBe("2:05");
  });

  it("adds hours past the first hour and drops fractions", () => {
    expect(fmtElapsed(3725.9)).toBe("1:02:05");
  });

  it("never goes below zero", () => {
    expect(fmtElapsed(-4)).toBe("0:00");
  });
});

describe("formatRelativeTime", () => {
  const now = Date.parse("2026-09-29T12:00:00Z");
  const ago = (ms: number) => new Date(now - ms).toISOString();
  const MIN = 60_000;

  it.each([
    [ago(20_000), "just now"],
    [ago(MIN), "1 min ago"],
    [ago(10 * MIN), "10 min ago"],
    [ago(59 * MIN), "59 min ago"],
    [ago(60 * MIN), "1 hour ago"],
    [ago(5 * 60 * MIN), "5 hours ago"],
    [ago(24 * 60 * MIN), "1 day ago"],
    [ago(3 * 24 * 60 * MIN), "3 days ago"],
    [ago(8 * 24 * 60 * MIN), "Sep 21"],
  ])("%s → %s", (iso, label) => {
    expect(formatRelativeTime(iso, now)).toBe(label);
  });

  it("reads a timestamp without an offset as UTC", () => {
    expect(formatRelativeTime("2026-09-29T11:50:00", now)).toBe("10 min ago");
  });

  it("treats a slightly-ahead server clock as just now", () => {
    expect(formatRelativeTime(new Date(now + 30_000).toISOString(), now)).toBe("just now");
  });

  it("leaves anything that isn't an ISO date as it is", () => {
    expect(formatRelativeTime("Aug 4, 14:02", now)).toBe("Aug 4, 14:02");
  });
});
