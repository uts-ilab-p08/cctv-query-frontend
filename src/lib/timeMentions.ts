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
const FOLLOWING_CITATION = /^\s*\[(\d+(?:\s*,\s*\d+)*)\](?!\()/;
/** Any citation (`[1]`, `[1, 3]`), as the RAG writes them. */
const CITATION = /\[(\d+(?:\s*,\s*\d+)*)\](?!\()/g;

/** How far, in seconds, a named time may sit outside a moment's bounds and still be it. */
const NEAR = 300;
const DAY = 24 * 60 * 60;

function secondsOfDay(time: string): number {
  const [h, m, s = 0] = time.split(":").map(Number);
  return h * 3600 + m * 60 + s;
}

const refsIn = (group: string) => group.split(",").map((part) => Number(part.trim()));

/** Seconds into the clip's video at which its camera reads `timeOfDay` (negative before
 *  the video starts), or null without a start time. The nearer way round the clock
 *  wins, so a video can run past midnight, and a time just before it starts (`11:10`
 *  for a video from 11:10:01) is a second early, not a day late. */
function offsetInVideo(clip: Clip, timeOfDay: number): number | null {
  const start = /T(\d{2}:\d{2}:\d{2})/.exec(clip.captureStartLocal ?? "")?.[1];
  if (!start) return null;
  const forward = (((timeOfDay - secondsOfDay(start)) % DAY) + DAY) % DAY;
  return forward > DAY / 2 ? forward - DAY : forward;
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

/** The candidate whose moment is closest to the time; the first on a tie. */
const closestOf = (candidates: Candidate[]) =>
  candidates.reduce((a, b) => (distance(b.clip, b.offset) < distance(a.clip, a.offset) ? b : a));

/**
 * The second to play from. An `HH:MM` time stands for that whole minute (the RAG writes
 * minutes: "around 13:15"), so when the moment starts inside it, play from the moment
 * itself; an `HH:MM:SS` time is exact. Never before the start of the video.
 */
function playFrom({ clip, offset }: Candidate, minute: boolean): number {
  const start = clip.startSeconds ?? 0;
  const sec = minute && start >= offset && start < offset + 60 ? start : offset;
  return Math.max(0, Math.round(sec));
}

function near(clips: Clip[], timeOfDay: number): Candidate[] {
  return clips.flatMap((clip) => {
    const offset = offsetInVideo(clip, timeOfDay);
    return offset !== null && distance(clip, offset) <= NEAR ? [{ clip, offset }] : [];
  });
}

/**
 * The moment a named time refers to: the citation right after it (`refs[0]`, null when
 * none); else the closest of those earlier on its line, as in "[1]/[5]: … around
 * 13:15"; else the camera named
 * earlier on its line; else the time alone. Without a citation, the candidates must all
 * be in one video (the closest moment in it wins); two videos holding the same time are
 * ambiguous, and the time stays plain text rather than jump somewhere wrong.
 */
function resolve(
  timeOfDay: number,
  minute: boolean,
  refs: Array<number | null>,
  camera: string | null,
  moments: Clip[],
): TimeTarget | null {
  const [after, ...onLine] = refs;
  const cited = (ref: number | null | undefined) =>
    ref == null
      ? []
      : near(
          moments.filter((clip) => clip.ref === ref),
          timeOfDay,
        );
  const right = cited(after)[0];
  if (right) return { clipId: right.clip.id, sec: playFrom(right, minute) };
  // Earlier on the line ("[4]/[3]: … 16:51"): whichever cited moment is closest.
  const lineCandidates = onLine.flatMap(cited);
  if (lineCandidates.length) {
    const closest = closestOf(lineCandidates);
    return { clipId: closest.clip.id, sec: playFrom(closest, minute) };
  }

  const pool = camera ? moments.filter((clip) => clip.code.toUpperCase() === camera) : moments;
  const candidates = near(pool, timeOfDay);
  const videos = new Set(candidates.map(({ clip }) => clip.videoId ?? clip.videoUrl ?? clip.id));
  if (videos.size !== 1) return null;

  const best = closestOf(candidates);
  return { clipId: best.clip.id, sec: playFrom(best, minute) };
}

/** The text of the line up to `index`. */
const lineBefore = (text: string, index: number) =>
  text.slice(text.lastIndexOf("\n", index - 1) + 1, index);

/** The camera code named last on the line before `index`, upper-cased. */
function cameraBefore(text: string, index: number): string | null {
  const codes = lineBefore(text, index).match(new RegExp(CAMERA_CODE_SOURCE, "gi"));
  return codes ? codes[codes.length - 1].toUpperCase() : null;
}

/** Citations a time may refer to: the first right after it (null when none), then
 *  every one earlier on its line. */
function refsFor(text: string, index: number, length: number): Array<number | null> {
  const after = FOLLOWING_CITATION.exec(text.slice(index + length));
  const before = [...lineBefore(text, index).matchAll(CITATION)].flatMap((m) => refsIn(m[1]));
  return [after ? refsIn(after[1])[0] : null, ...before];
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
      const target = resolve(
        secondsOfDay(start),
        start.length === 5,
        refsFor(segment, index, match.length),
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
