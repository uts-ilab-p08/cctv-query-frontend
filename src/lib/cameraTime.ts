/** The camera's own clock at a point of its video, as `YYYY-MM-DD` and `HH:MM:SS`. */
export interface CameraDateTime {
  date: string;
  time: string;
}

/**
 * The camera's local date and time `seconds` into its video. `captureStartLocal` is the
 * video's start with no offset (`2018-03-05T13:15:00`), on purpose: the recording's time
 * zone is unknown. The sum is done as if it were UTC, so the viewer's own zone and its
 * daylight-saving jumps never touch the result. Never `new Date(captureStartLocal)` with
 * local getters: that reads the string in the viewer's zone.
 *
 * Null when there is no usable start, so the caller hides the clock instead of
 * showing 00:00:00.
 */
export function cameraDateTime(
  captureStartLocal: string | null | undefined,
  seconds: number,
): CameraDateTime | null {
  if (!captureStartLocal) return null;
  const startMs = Date.parse(`${captureStartLocal}Z`);
  if (Number.isNaN(startMs)) return null;
  const iso = new Date(startMs + Math.floor(Math.max(0, seconds)) * 1000).toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 19) };
}
