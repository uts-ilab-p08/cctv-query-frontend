// Inline query-token detection — the core interaction of the Home/Results search field.
// Pure and unit-testable. Detected terms are retuned in the text itself: the RAG reads
// the whole query, so nothing is sent as a separate filter.

import { CAMERA_CODE_SOURCE } from "@/lib/cameraQuery";
import { TIME_SOURCE } from "@/lib/timeQuery";

export type EntityKind =
  "subject" | "colour" | "clothing" | "event" | "date" | "time" | "scene" | "camera" | "negation";

export interface EntityDef {
  id: EntityKind;
  title: string;
  pattern: RegExp; // authored without /g; findEntities clones it with "gi"
  options: string[];
  /** Shown above the options: what the term does to the search. */
  note?: string;
}

// Dates in the forms the RAG's `temporal.dates` filters on: `2018-03-05`, `March 5`,
// `5 March`, `the 5th of March`, `the 5th`. A month needs a day beside it, so the verb
// "may" never reads as a date.
const MONTH =
  "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
const ORDINAL = String.raw`\d{1,2}(?:st|nd|rd|th)?`;
const YEAR = String.raw`(?:,?\s+\d{4})?`;
const DATE_SOURCE = [
  String.raw`\b\d{4}-\d{1,2}-\d{1,2}\b`,
  String.raw`\b(?:the\s+)?${ORDINAL}\s+(?:of\s+)?(?:${MONTH})\b${YEAR}`,
  String.raw`\b(?:${MONTH})\.?\s+${ORDINAL}\b${YEAR}`,
  String.raw`\bthe\s+\d{1,2}(?:st|nd|rd|th)\b`,
].join("|");

// Mirrors the RAG's location vocabulary (`filters.py`): its four scenes, plus the
// everyday SYNONYMS it maps onto them. Longer phrases first, so "bus station" beats "bus".
const SCENE_WORDS =
  "bus station|bus stop|medical cent(?:re|er)|hospital|clinic|school|campus|classroom|depot|admin|bus";

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
    // Colours live in `colour`, so "red sedan" is two terms rather than one hardcoded
    // pair. "bus" is left to `scene`, which the RAG filters on. Countable nouns take an
    // optional plural "s"; "men" and "women" are spelled out.
    pattern:
      /\b(people|person|anyone|someone|man|men|woman|women|(?:vehicle|car|sedan|suv|van|truck|bicycle|bike|motorcycle|package|bag|backpack|trunk|door)s?)\b/,
    options: ["person", "people", "vehicle", "car", "bicycle", "package"],
  },
  // Colour and clothing are separate kinds because a menu swaps a term for one of its
  // kind's options: a colour for a colour, a garment for a garment.
  {
    id: "colour",
    title: "Colour",
    // "after dark" is a time of day, not a colour.
    pattern: /\b(red|blue|green|yellow|orange|black|white|grey|gray|silver|(?<!after )dark)\b/,
    options: ["red", "blue", "black", "white", "grey", "dark"],
  },
  {
    id: "clothing",
    title: "Clothing",
    pattern: /\b(jacket|hoodie|coat|hat|cap|uniform)s?\b/,
    options: ["jacket", "hoodie", "coat", "hat", "cap", "uniform"],
  },
  {
    id: "event",
    title: "Event type",
    // "leave"/"left" only before what was left ("left the building", "leave a bag"):
    // "turned left", "left side" and "leave it to me" are not events. A loading dock is a
    // place, not someone loading.
    pattern:
      /\b(entered|enters|entering|entry|exited|exits|leaving|left behind|(?:leaves?|left)(?=\s+(?:a|an|the|his|her|their|behind)\b)|abandoned|unattended|(?:pick(?:s|ing|ed)?) up|(?:puts?|putting) down|(?:drop(?:s|ping|ped)?) off|loitering|loiters|parked|stopped|stationary|turned|reversed|arrived|departed|talking to|carrying|unloading|loading(?!\s+(?:dock|bay|zone|area)\b))\b/,
    options: ["entered", "exited", "loitering", "parked", "left behind", "picked up"],
  },
  {
    id: "date",
    title: "Date",
    pattern: new RegExp(DATE_SOURCE),
    options: [],
    note: "Searches only footage from that day, if it has been indexed.",
  },
  {
    id: "time",
    title: "Time range",
    // Relative days, plus clock times and ranges as timeQuery reads them ("at 7:00 pm",
    // "between 7 and 9 pm") — the picker beside the camera button edits those.
    pattern: new RegExp(
      String.raw`\b(?:last night|last 24 hours|yesterday|today|this week|after hours)\b|${TIME_SOURCE}`,
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
    id: "scene",
    title: "Location",
    pattern: new RegExp(String.raw`\b(?:${SCENE_WORDS})\b`),
    // Its options are the indexed scenes, which only /cameras knows (see QueryField).
    options: [],
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
    id: "negation",
    title: "Exclusion",
    // The RAG's NEGATIONS. "no one" asks for absence, not an exclusion.
    pattern: /\b(not|no(?!\s+one\b)|except|excluding|other than|besides|without|apart from)\b/,
    options: [],
    note: "Search matches by meaning and may still return what you exclude. A location or camera right after this word is not used to narrow the search.",
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
