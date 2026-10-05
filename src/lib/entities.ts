// Inline query-token detection — the core interaction of the Home/Results search field.
// Pure and unit-testable. Detected terms are retuned in the text itself: the RAG reads
// the whole query, so nothing is sent as a separate filter.

import { CAMERA_CODE_SOURCE } from "@/lib/cameraQuery";
import { TIME_SOURCE } from "@/lib/timeQuery";

export type EntityKind = "subject" | "event" | "time" | "camera" | "confidence";

export interface EntityDef {
  id: EntityKind;
  title: string;
  pattern: RegExp; // authored without /g; findEntities clones it with "gi"
  options: string[];
}

export interface EntityHit {
  start: number;
  end: number;
  def: EntityDef;
}

export type Segment =
  { kind: "text"; text: string } | { kind: "token"; text: string; hit: EntityHit };

export const ENTITY_DEFS: readonly EntityDef[] = [
  {
    id: "subject",
    title: "Subject / object",
    pattern:
      /\b(people|person|anyone|someone|man|woman|red car|red sedan|white van|vehicle|car|van|truck|package|bag)\b/,
    options: ["person", "people", "vehicle", "red sedan", "white van", "package"],
  },
  {
    id: "event",
    title: "Event type",
    pattern:
      /\b(entered|enters|entering|entry|exited|exits|leaving|left|loitering|loiters|parked|arrived|departed|dropped off)\b/,
    options: ["entered", "exited", "loitering", "parked", "arrived", "departed"],
  },
  {
    id: "time",
    title: "Time range",
    // A clock time the query names ("at 7:00 pm", "19:00", "between 7 and 9 pm"; the
    // time picker writes these too), or a relative period.
    pattern: new RegExp(
      String.raw`${TIME_SOURCE}|\b(?:last night|last 24 hours|yesterday|today|this week|after hours)\b`,
    ),
    options: [
      "today",
      "yesterday",
      "last night",
      "this week",
      "last 24 hours",
      "after 14:00",
      "before 09:00",
    ],
  },
  {
    id: "camera",
    title: "Camera",
    // The code itself (`G328`): the RAG reads it from the query and searches that camera.
    // Its options are the indexed cameras, which only /cameras knows (see QueryField).
    pattern: new RegExp(CAMERA_CODE_SOURCE),
    options: [],
  },
  {
    id: "confidence",
    title: "Confidence",
    pattern: /\b(high confidence|medium confidence|low confidence)\b/,
    options: ["high confidence", "medium confidence", "low confidence"],
  },
] as const;

/** All non-overlapping entity hits, left to right; longer match wins a tie. */
export function findEntities(text: string): EntityHit[] {
  const hits: EntityHit[] = [];
  for (const def of ENTITY_DEFS) {
    const re = new RegExp(def.pattern.source, "gi");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (m[0].length === 0) {
        re.lastIndex += 1;
        continue;
      }
      hits.push({ start: m.index, end: m.index + m[0].length, def });
    }
  }
  hits.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));
  const kept: EntityHit[] = [];
  for (const h of hits) {
    if (!kept.some((k) => h.start < k.end && k.start < h.end)) kept.push(h);
  }
  return kept;
}

/** Query string -> render segments for the highlight overlay. */
export function toSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;
  for (const hit of findEntities(text)) {
    if (hit.start > cursor) segments.push({ kind: "text", text: text.slice(cursor, hit.start) });
    segments.push({ kind: "token", text: text.slice(hit.start, hit.end), hit });
    cursor = hit.end;
  }
  if (cursor < text.length) segments.push({ kind: "text", text: text.slice(cursor) });
  return segments;
}

export function replaceRange(text: string, start: number, end: number, value: string): string {
  return text.slice(0, start) + value + text.slice(end);
}
