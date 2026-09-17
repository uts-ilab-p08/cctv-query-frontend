import type { Clip } from "@/types";

/**
 * The Results scrubber indexes a fixed 50-minute window (13:55:00–14:45:00),
 * wide enough to hold every timestamp in the demo footage set (13:58:02–14:40:09)
 * without recalculation.
 */
export const WIN_START = 50100; // 13:55:00 in seconds since midnight
export const WIN_LEN = 3000; // 50 minutes, in seconds

export function tsToSec(ts: string): number {
  const [h, m, s] = ts.split(":").map(Number);
  return h * 3600 + m * 60 + s;
}

/** Position of a clip's timestamp within the indexed window, in seconds. */
export function clipPos(clip: Clip): number {
  return Math.max(0, Math.min(WIN_LEN, tsToSec(clip.ts) - WIN_START));
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Absolute player clock (hh:mm:ss) for a scrubber offset within the window. */
export function fmtClock(sec: number): string {
  const t = WIN_START + Math.round(sec);
  return `${pad(Math.floor(t / 3600) % 24)}:${pad(Math.floor((t % 3600) / 60))}:${pad(t % 60)}`;
}
