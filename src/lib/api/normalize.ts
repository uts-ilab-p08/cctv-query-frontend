import { fmtElapsed } from "@/lib/time";
import type { Clip, ClipTag } from "@/types";

import { clipPos } from "@/lib/time";

import type {
  ApiCameraDirectoryEntry,
  ApiClip,
  ApiSavedQuery,
  AssistantMoment,
  RagResultItem,
} from "./types";
import type { CameraDirectoryEntry, SavedQuery } from "@/types";

/**
 * `GET /api/v1/search` is a thin pass-through to the RAG service — it does
 * NOT return `Clip[]`, it returns `RagQueryResult` (`answer` + raw
 * `RagResultItem[]`). The RAG's item shape only has `video_id`, `video_url`,
 * `start_seconds`, `end_seconds`, `caption`, `score` — no camera code, tags,
 * or wall-clock date. Until the backend does this mapping itself, the
 * frontend derives the closest reasonable `Clip` from what's available:
 *
 * - `id`            -> `video_id:start_seconds` — one video can hold several
 *                       matching moments, so `video_id` alone collides. Still
 *                       NOT an event id: never pass it to `GET /clips/{id}`.
 * - `videoId`/`startSeconds`/`endSeconds` -> kept so the player can load the
 *                       source video and cue the matching moment
 * - `confidence`    -> `score * 100`, rounded
 * - `ts`            -> `start_seconds` as the offset into its video (`m:ss`); no
 *                       wall-clock time is returned yet
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
    id: `${item.video_id}:${item.start_seconds}`,
    camera: "Unknown",
    code: "Unknown",
    perspective: "Unknown",
    // Offset into the source video, straight from the endpoint. Switch to wall-clock time
    // once the RAG returns it.
    ts: fmtElapsed(item.start_seconds),
    date: "",
    order,
    confidence: Math.round(item.score * 100),
    tags: inferTags(item.caption),
    objects: item.caption,
    action: item.caption,
    thumbnailUrl: undefined,
    videoUrl: item.video_url ?? undefined,
    eventName: item.event_name?.trim() || undefined,
    videoId: item.video_id,
    startSeconds: item.start_seconds,
    endSeconds: item.end_seconds,
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

const ISO_DATE = /^\d{4}-\d{2}-\d{2}/;
const SAVED_ON_FORMAT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

/**
 * `savedOn` is a plain `string` in the OpenAPI schema — unconfirmed whether the
 * backend sends a display label ("Aug 4") or a timestamp. ISO values are
 * formatted to match the label style; anything else is shown as-is.
 */
export function apiSavedQueryToSavedQuery(query: ApiSavedQuery): SavedQuery {
  const date = ISO_DATE.test(query.savedOn) ? new Date(query.savedOn) : null;
  const savedOn =
    date && !Number.isNaN(date.getTime()) ? SAVED_ON_FORMAT.format(date) : query.savedOn;
  return { ...query, savedOn };
}

/** A clip as the assistant's context moment — the inverse of `ragResultItemToClip`. */
export function clipToAssistantMoment(clip: Clip): AssistantMoment {
  return {
    moment_id: clip.id,
    video_id: clip.videoId ?? clip.id,
    // Mock clips have no video offset; their position in the demo window stands in.
    start_seconds: clip.startSeconds ?? clipPos(clip),
    end_seconds: clip.endSeconds ?? null,
    caption: clip.eventName ?? clip.action,
    score: clip.confidence / 100,
    camera: clip.camera === "Unknown" ? null : clip.camera,
  };
}
