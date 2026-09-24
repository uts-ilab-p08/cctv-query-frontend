import type { Clip } from "@/types";

/**
 * The Results scrubber indexes a fixed 50-minute window (13:55:00–14:45:00),
 * wide enough to hold every timestamp in the demo footage set (13:58:02–14:40:09)
 * without recalculation.
 */
export const WIN_START = 50100; // 13:55:00 in seconds since midnight
export const WIN_LEN = 3000; // 50 minutes, in seconds

/** Seconds in `h:mm:ss` or `m:ss`. */
export function tsToSec(ts: string): number {
  return ts.split(":").reduce((total, part) => total * 60 + Number(part), 0);
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

/** Elapsed time inside a real video (m:ss, or h:mm:ss past an hour). */
export function fmtElapsed(sec: number): string {
  const t = Math.max(0, Math.floor(sec));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  return h > 0 ? `${h}:${pad(m)}:${pad(t % 60)}` : `${m}:${pad(t % 60)}`;
}
