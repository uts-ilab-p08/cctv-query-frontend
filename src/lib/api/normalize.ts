import { fmtClock } from "@/lib/time";
import type { Clip, ClipTag } from "@/types";

import type { ApiCameraDirectoryEntry, ApiClip, ApiSavedQuery, RagResultItem } from "./types";
import type { CameraDirectoryEntry, SavedQuery } from "@/types";

/**
 * `GET /api/v1/search` is a thin pass-through to the RAG service — it does
 * NOT return `Clip[]`, it returns `RagQueryResult` (`answer` + raw
 * `RagResultItem[]`). The RAG's item shape only has `video_id`, `video_url`,
 * `start_seconds`, `end_seconds`, `caption`, `score` — no camera code, tags,
 * or wall-clock date. Until the backend does this mapping itself, the
 * frontend derives the closest reasonable `Clip` from what's available:
 *
 * - `id`            -> `video_id` (stable per source video, not per event —
 *                       see note below)
 * - `confidence`    -> `score * 100`, rounded
 * - `ts`            -> `start_seconds` formatted as a clock value via `fmtClock`
 * - `objects`/`action` -> `caption` (the RAG gives us one free-text field,
 *                       not a separate object/action breakdown)
 * - `camera`/`code`/`perspective` -> unknown from this payload; left as
 *                       placeholders until the backend enriches `/search`
 * - `tags`          -> best-effort keyword match against `caption`
 *
 * This is a stopgap: once `/search` (or a follow-up endpoint) returns
 * backend-normalized `Clip`s directly, this function — and the `id` caveat
 * above — should be deleted rather than extended.
 */

const TAG_KEYWORDS: Array<[RegExp, ClipTag]> = [
  [/\b(car|van|vehicle|truck|suv|sedan|bus)\b/i, "Vehicle"],
  [/\b(enter|entry|arriv)/i, "Entry"],
  [/\b(exit|leav|depart)/i, "Exit"],
  [/\bloiter/i, "Loitering"],
  [/\b(left behind|abandon|unattended)/i, "Object Left"],
  [/\b(person|people|pedestrian|man|woman)\b/i, "Person"],
];

function inferTags(caption: string): ClipTag[] {
  const tags = new Set<ClipTag>();
  for (const [pattern, tag] of TAG_KEYWORDS) {
    if (pattern.test(caption)) tags.add(tag);
  }
  return [...tags];
}

export function ragResultItemToClip(item: RagResultItem, order: number): Clip {
  return {
    id: item.video_id,
    camera: "Unknown",
    code: "Unknown",
    perspective: "Unknown",
    ts: fmtClock(item.start_seconds),
    date: "",
    order,
    confidence: Math.round(item.score * 100),
    tags: inferTags(item.caption),
    objects: item.caption,
    action: item.caption,
    thumbnailUrl: undefined,
    videoUrl: item.video_url ?? undefined,
  };
}

export function apiClipToClip(clip: ApiClip): Clip {
  return {
    id: clip.id,
    camera: clip.camera,
    code: clip.code,
    perspective: clip.perspective,
    ts: clip.ts,
    date: clip.date,
    order: clip.order,
    confidence: clip.confidence,
    tags: clip.tags.filter((tag): tag is ClipTag =>
      ["Person", "Vehicle", "Entry", "Exit", "Loitering", "Object Left"].includes(tag),
    ),
    objects: clip.objects,
    action: clip.action,
    thumbnailUrl: clip.thumbnailUrl ?? undefined,
    videoUrl: clip.videoUrl ?? undefined,
  };
}

export function apiCameraToCameraDirectoryEntry(
  camera: ApiCameraDirectoryEntry,
): CameraDirectoryEntry {
  return camera;
}

export function apiSavedQueryToSavedQuery(query: ApiSavedQuery): SavedQuery {
  return query;
}
