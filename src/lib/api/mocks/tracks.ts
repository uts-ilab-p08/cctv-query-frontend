import type { TrackBox, TracksResponse } from "../types";

/**
 * SIMULATION of the proposed `GET /api/v1/videos/{video_id}/tracks` (contract in
 * ../types.ts). It invents one plausible object track across the moment so the
 * overlay can be built and demoed; the boxes do NOT follow anything in the real
 * footage, which is why the response is flagged `simulated`.
 */

const FRAME = { width: 1920, height: 1080 };
const KEYFRAMES_PER_SECOND = 2;

const VEHICLE = /\b(car|van|vehicle|truck|suv|sedan|bus)\b/i;
const PERSON = /\b(person|people|pedestrian|man|woman|walks?|enters?|leaves?)\b/i;

export interface SimulatedMoment {
  video_id: string;
  start_seconds: number;
  end_seconds: number;
  caption: string;
}

/** Small deterministic hash so a given moment always gets the same track. */
function seed(text: string): number {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return (h >>> 0) / 4294967295;
}

export function simulateTracks(moment: SimulatedMoment): TracksResponse {
  const label = VEHICLE.test(moment.caption)
    ? "vehicle"
    : PERSON.test(moment.caption)
      ? "person"
      : "object";
  const size =
    label === "vehicle"
      ? { w: 420, h: 230 }
      : label === "person"
        ? { w: 120, h: 300 }
        : { w: 180, h: 180 };

  const r = seed(`${moment.video_id}:${moment.start_seconds}`);
  // Travel left→right or right→left across the lower-middle of the frame.
  const leftToRight = r < 0.5;
  const y0 = FRAME.height * (0.42 + 0.2 * r);
  const span = FRAME.width - size.w - 160;

  const duration = Math.max(0.5, moment.end_seconds - moment.start_seconds);
  const steps = Math.max(1, Math.round(duration * KEYFRAMES_PER_SECOND));
  const boxes: TrackBox[] = [];
  for (let i = 0; i <= steps; i++) {
    const p = i / steps;
    const progress = leftToRight ? p : 1 - p;
    const wobble = Math.sin((p + r) * Math.PI * 2) * 18;
    const y = Math.min(FRAME.height - size.h, Math.max(0, y0 + wobble));
    boxes.push({
      t: i === steps ? moment.end_seconds : moment.start_seconds + p * duration,
      x: Math.round(80 + progress * span),
      y: Math.round(y),
      w: size.w,
      h: size.h,
      confidence: Math.round((0.78 + 0.18 * seed(`${r}:${i}`)) * 100) / 100,
    });
  }

  return {
    video_id: moment.video_id,
    frame_width: FRAME.width,
    frame_height: FRAME.height,
    objects: [{ object_id: `sim-${moment.video_id}-${moment.start_seconds}`, label, boxes }],
    simulated: true,
  };
}

/** Network-shaped wrapper, like the real endpoint would behave. */
export async function mockGetTracks(
  moment: SimulatedMoment,
  { delayMs = 300 }: { delayMs?: number } = {},
): Promise<TracksResponse> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  return simulateTracks(moment);
}
