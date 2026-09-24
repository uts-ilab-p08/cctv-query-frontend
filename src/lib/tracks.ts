import type { TrackBox } from "@/lib/api/types";

/**
 * The box for time `t`, linearly interpolated between the two surrounding keyframes
 * so the highlight glides instead of jumping at the keyframe rate. `null` outside
 * the tracked range: the object isn't on screen then.
 */
export function boxAt(boxes: readonly TrackBox[], t: number): TrackBox | null {
  if (boxes.length === 0 || t < boxes[0].t || t > boxes[boxes.length - 1].t) return null;
  const next = boxes.findIndex((box) => box.t >= t);
  const b = boxes[next];
  if (b.t === t || next === 0) return b;
  const a = boxes[next - 1];
  const k = (t - a.t) / (b.t - a.t);
  const lerp = (from: number, to: number) => from + (to - from) * k;
  return {
    t,
    x: lerp(a.x, b.x),
    y: lerp(a.y, b.y),
    w: lerp(a.w, b.w),
    h: lerp(a.h, b.h),
    confidence: a.confidence,
  };
}
