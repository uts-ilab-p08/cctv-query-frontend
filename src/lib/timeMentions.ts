// The RAG's answers name times on the camera's clock ("at 16:51:12–16:51:22 [1]"). Each
// becomes a link to that second of the moment's video: camera time minus the video's
// local start (`captureStartLocal`) is the offset into the file. All in the frontend.

import { CAMERA_CODE_SOURCE } from "@/lib/cameraQuery";
import { outsideSkipped } from "@/lib/citations";
import type { Clip } from "@/types";

/** Where a time link goes: a moment, and the second of its video to play from. */
export interface TimeTarget {
  clipId: string;
  sec: number;
}

/** `HH:MM:SS` or `HH:MM`, 24-hour with a two-digit hour: `0:12` is a video offset. */
const TIME = String.raw`(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?`;
/** A time, or a range of two (the link covers the range and plays from its start). */
const MENTION = new RegExp(String.raw`(?<![\d:])(${TIME})(?:\s*[–—-]\s*${TIME})?(?![\d:])`, "g");
/** A citation right after the time: `16:51:12 [1]`. */
const FOLLOWING_CITATION = /^\s*\[(\d+)/;

/** How far, in seconds, a named time may sit outside a moment's bounds and still be it. */
const NEAR = 300;
const DAY = 24 * 60 * 60;

function secondsOfDay(time: string): number {
  const [h, m, s = 0] = time.split(":").map(Number);
  return h * 3600 + m * 60 + s;
}

/** Seconds into the clip's video at which its camera reads `timeOfDay`, or null
 *  without a start time. Wraps past midnight: a video can run into the next day. */
function offsetInVideo(clip: Clip, timeOfDay: number): number | null {
  const start = /T(\d{2}:\d{2}:\d{2})/.exec(clip.captureStartLocal ?? "")?.[1];
  if (!start) return null;
  return (((timeOfDay - secondsOfDay(start)) % DAY) + DAY) % DAY;
}

/** Seconds from `offset` to the moment's bounds; 0 inside them. */
function distance(clip: Clip, offset: number): number {
  const start = clip.startSeconds ?? 0;
  const end = clip.endSeconds ?? start;
  return offset < start ? start - offset : offset > end ? offset - end : 0;
}

interface Candidate {
  clip: Clip;
  offset: number;
}

function near(clips: Clip[], timeOfDay: number): Candidate[] {
  return clips.flatMap((clip) => {
    const offset = offsetInVideo(clip, timeOfDay);
    return offset !== null && distance(clip, offset) <= NEAR ? [{ clip, offset }] : [];
  });
}

/**
 * The moment a named time refers to: the citation right after it; else the camera
 * named earlier on its line; else the time alone. Without a citation, the candidates
 * must all be in one video (the closest moment in it wins); two videos holding the same
 * time are ambiguous, and the time stays plain text rather than jump somewhere wrong.
 */
function resolve(
  timeOfDay: number,
  ref: number | null,
  camera: string | null,
  moments: Clip[],
): TimeTarget | null {
  if (ref !== null) {
    const cited = near(
      moments.filter((clip) => clip.ref === ref),
      timeOfDay,
    )[0];
    if (cited) return { clipId: cited.clip.id, sec: cited.offset };
  }

  const pool = camera ? moments.filter((clip) => clip.code.toUpperCase() === camera) : moments;
  const candidates = near(pool, timeOfDay);
  const videos = new Set(candidates.map(({ clip }) => clip.videoId ?? clip.videoUrl ?? clip.id));
  if (videos.size !== 1) return null;

  const best = candidates.reduce((a, b) =>
    distance(b.clip, b.offset) < distance(a.clip, a.offset) ? b : a,
  );
  return { clipId: best.clip.id, sec: best.offset };
}

/** The camera code named last on the line before `index`, upper-cased. */
function cameraBefore(text: string, index: number): string | null {
  const line = text.slice(text.lastIndexOf("\n", index - 1) + 1, index);
  const codes = line.match(new RegExp(CAMERA_CODE_SOURCE, "gi"));
  return codes ? codes[codes.length - 1].toUpperCase() : null;
}

/**
 * Markdown with each time the answer names (outside code and links) turned into a
 * `#time=…` link to its moment, for `ChatMarkdown` to render as a play link. A time no
 * moment can be pinned to stays as written.
 */
export function linkTimes(text: string, moments: Clip[]): string {
  if (!moments.some((clip) => clip.captureStartLocal)) return text;
  return outsideSkipped(text, (segment) =>
    segment.replace(MENTION, (match: string, start: string, index: number) => {
      const cite = FOLLOWING_CITATION.exec(segment.slice(index + match.length));
      const target = resolve(
        secondsOfDay(start),
        cite ? Number(cite[1]) : null,
        cameraBefore(segment, index),
        moments,
      );
      return target
        ? `[${match}](#time=${target.sec}&clip=${encodeURIComponent(target.clipId)})`
        : match;
    }),
  );
}

/** The target of a `linkTimes` link, or null for any other link. */
export function timeTarget(href: string | undefined): TimeTarget | null {
  const match = href?.match(/^#time=(\d+)&clip=(.+)$/);
  return match ? { sec: Number(match[1]), clipId: decodeURIComponent(match[2]) } : null;
}
