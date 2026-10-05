// The time of day lives in the query text, like the cameras: the RAG reads "at 7:00 pm"
// or "between 7 and 9 pm" from q and filters by it, so there is no separate time filter
// to send. Pure helpers to read, write and remove that time in the text — the
// counterpart of cameraQuery.ts.

import { tidy } from "@/lib/cameraQuery";

export type TimeMode = "at" | "after" | "before" | "between";

export interface TimeFilter {
  mode: TimeMode;
  /** 24-hour `HH:MM`, the value a native time input reads and writes. */
  from: string;
  /** End of a `between` range, `HH:MM`. */
  to?: string;
}

export interface TimeMatch extends TimeFilter {
  start: number;
  end: number;
}

const H12 = String.raw`(?:1[0-2]|0?[1-9])`;
const H24 = String.raw`(?:[01]?\d|2[0-3])`;
const MIN = String.raw`:[0-5]\d`;
/** A clock time no one would read as a count: `7pm`, `7:00 pm`, `12 am`, `19:00`. */
const CLOCK = String.raw`\b(?:${H12}(?:${MIN})?\s?(?:am|pm)|${H24}${MIN})\b`;
/** The first half of a range may leave am/pm to the second: "between 7 and 9 pm". */
const LOOSE_CLOCK = String.raw`\b(?:${H12}(?:${MIN})?(?:\s?(?:am|pm))?|${H24}${MIN})\b`;

const PREFIX_WORDS = "at|around|about|after|since|from|before|until|till|by";
const RANGE = String.raw`\b(?:between|from)\s+${LOOSE_CLOCK}\s*(?:and|to|until|till|-|–)\s*${CLOCK}`;
const SINGLE = String.raw`(?:\b(?:${PREFIX_WORDS})\s+)?${CLOCK}`;

/** A clock time or range, with the word before it. Shared with entities.ts, which
 *  underlines it. Its trailing `\b` keeps the space after the time out of the match. */
export const TIME_SOURCE = `(?:${RANGE})|(?:${SINGLE})`;

const MODE_BY_WORD: Record<string, TimeMode> = {
  at: "at",
  around: "at",
  about: "at",
  after: "after",
  since: "after",
  from: "after",
  before: "before",
  until: "before",
  till: "before",
  by: "before",
};

const RANGE_PARTS = /^(?:between|from)\s+(.+?)\s*(?:and|to|until|till|-|–)\s*(.+)$/i;
const SINGLE_PARTS = new RegExp(String.raw`^(?:(${PREFIX_WORDS})\s+)?(.+)$`, "i");
const CLOCK_PARTS = /^(\d{1,2})(?::(\d{2}))?\s?(am|pm)?$/i;

/** One clock reading to minutes since midnight; `inherited` is the other half's am/pm. */
function minutes(clock: string, inherited?: string): number | null {
  const parts = CLOCK_PARTS.exec(clock.trim());
  if (!parts) return null;
  let hour = Number(parts[1]);
  const minute = Number(parts[2] ?? 0);
  const meridiem = (parts[3] ?? inherited ?? "").toLowerCase();
  if (meridiem) {
    if (hour < 1 || hour > 12) return null;
    hour = (hour % 12) + (meridiem === "pm" ? 12 : 0);
  }
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

const meridiemOf = (clock: string) => CLOCK_PARTS.exec(clock.trim())?.[3];

const toValue = (total: number) =>
  `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;

function parse(text: string): TimeFilter | null {
  const range = RANGE_PARTS.exec(text);
  if (range) {
    const [, first, second] = range;
    const to = minutes(second);
    if (to === null) return null;
    let from = minutes(first, meridiemOf(second));
    // "between 11 and 1 pm": 11 pm would run backwards, so the first half is am.
    if (from !== null && from > to && !meridiemOf(first)) from = minutes(first, "am");
    if (from === null) return null;
    return { mode: "between", from: toValue(from), to: toValue(to) };
  }
  const single = SINGLE_PARTS.exec(text);
  if (!single) return null;
  const at = minutes(single[2]);
  if (at === null) return null;
  return { mode: MODE_BY_WORD[single[1]?.toLowerCase() ?? "at"], from: toValue(at) };
}

/** The first clock time or range the query names, or null. */
export function timeInQuery(query: string): TimeMatch | null {
  for (const match of query.matchAll(new RegExp(TIME_SOURCE, "gi"))) {
    const filter = parse(match[0]);
    if (filter) return { ...filter, start: match.index, end: match.index + match[0].length };
  }
  return null;
}

/** An hour after `value`, capped at the end of the day: a new range's default end. */
export function hourAfter(value: string): string {
  const [hour, minute] = value.split(":").map(Number);
  return toValue(Math.min(hour * 60 + minute + 60, 23 * 60 + 59));
}

/** `19:00` → `7:00 pm`: how the picker writes a time into the question. */
export function formatClock(value: string): string {
  const [hour, minute] = value.split(":").map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "am" : "pm"}`;
}

function phrase({ mode, from, to }: TimeFilter): string {
  return mode === "between"
    ? `between ${formatClock(from)} and ${formatClock(to ?? from)}`
    : `${mode} ${formatClock(from)}`;
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
/** Nothing but a sentence end (or nothing at all) before this point. */
const atSentenceStart = (before: string) => /^\s*$|[.?!]\s+$/.test(before);

/** The query with its time set to `filter`: replacing the time it names, or as a new
 *  clause before any closing punctuation. */
export function withTime(query: string, filter: TimeFilter): string {
  const words = phrase(filter);
  const current = timeInQuery(query);
  if (current) {
    const before = query.slice(0, current.start);
    const written = atSentenceStart(before) ? capitalize(words) : words;
    return before + written + query.slice(current.end);
  }
  const [, body, tail] = /^([\s\S]*?)\s*([?.!]*)\s*$/.exec(query) ?? ["", query, ""];
  return body ? `${body} ${words}${tail}` : `${capitalize(words)}${tail}`;
}

/** The query without the time it names; the capital moves to the new first word. */
export function withoutTime(query: string): string {
  const current = timeInQuery(query);
  if (!current) return query;
  const before = query.slice(0, current.start);
  let after = query.slice(current.end);
  if (/^\s*$/.test(before)) {
    after = after.replace(/^[\s,;:]+/, "");
    if (/^\s*[A-Z]/.test(query)) after = capitalize(after);
  }
  return tidy(before + after);
}
