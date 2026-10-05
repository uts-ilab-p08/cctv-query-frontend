// A time of day lives in the query text itself, like the cameras: the RAG reads
// "at 7:00 pm" or "between 7 and 9 pm" and searches around it, so there is no separate
// time filter to send. Pure helpers to find, read, write and remove that time.

/** A clock time: `7pm`, `7:00 pm`, `12 am` (12-hour, with a meridiem) or `19:00`
 *  (24-hour, with minutes). A bare `7` is not a time on its own. */
const CLOCK = String.raw`(?:\d{1,2}(?::[0-5]\d)?\s?[ap]m\b|(?:[01]?\d|2[0-3]):[0-5]\d(?![\d:]))`;
/** The start of a range, whose meridiem may come from its end: the `7` of "between 7
 *  and 9 pm". */
const RANGE_START = String.raw`(?:${CLOCK}|\d{1,2}(?::[0-5]\d)?(?![\d:]))`;

/**
 * A time the query names, with the word that sets it: "at 7:00 pm", "after 19:00",
 * "7pm", or a range — "between 7 and 9 pm", "from 18:00 to 20:00". Authored without
 * flags so `entities.ts` can reuse it.
 */
export const TIME_SOURCE =
  String.raw`(?<![\w:])(?:(?:between|from)\s+${RANGE_START}\s*(?:and|to|-|–)\s*${CLOCK}` +
  String.raw`|(?:(?:at|after|before|around|since|until)\s+)?${CLOCK})`;

export type TimeMode = "at" | "after" | "before" | "between";

/** A time filter as the picker edits it: 24-hour `HH:MM`, the native time input's value. */
export interface TimeFilter {
  mode: TimeMode;
  from: string;
  /** The end of a `between` range. */
  to?: string;
}

interface TimeMatch {
  text: string;
  start: number;
  end: number;
}

/** The first time the query names — the one the picker shows and replaces. */
function findTime(query: string): TimeMatch | null {
  const match = new RegExp(TIME_SOURCE, "i").exec(query);
  return match ? { text: match[0], start: match.index, end: match.index + match[0].length } : null;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Minutes past midnight of a clock time, or null. `meridiem` fills in a bare hour. */
function minutesOf(clock: string, meridiem?: "am" | "pm"): number | null {
  const match = /^(\d{1,2})(?::(\d{2}))?\s?([ap]m)?$/i.exec(clock.trim());
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? 0);
  const half = (match[3]?.toLowerCase() as "am" | "pm" | undefined) ?? meridiem;
  if (half) {
    if (hours < 1 || hours > 12) return null;
    hours = (hours % 12) + (half === "pm" ? 12 : 0);
  } else if (match[2] === undefined || hours > 23) {
    // A bare hour with no meridiem anywhere is not a time.
    return null;
  }
  return hours * 60 + minutes;
}

const toInput = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

/** The time filter the query names, or null when it names none. */
export function timeInQuery(query: string): TimeFilter | null {
  const found = findTime(query);
  if (!found) return null;
  const text = found.text.trim();

  const range = /^(?:between|from)\s+(.+?)\s*(?:and|to|-|–)\s*(\S.*)$/i.exec(text);
  if (range) {
    const end = minutesOf(range[2]);
    if (end === null) return null;
    const endHalf = /([ap]m)$/i.exec(range[2])?.[1].toLowerCase() as "am" | "pm" | undefined;
    let start = minutesOf(range[1], endHalf);
    // "between 11 and 1 pm": a start later than its end was before noon.
    if (start !== null && endHalf === "pm" && !/[ap]m$/i.test(range[1]) && start > end) {
      start -= 12 * 60;
    }
    if (start === null) return null;
    return { mode: "between", from: toInput(start), to: toInput(end) };
  }

  const prefixed = /^(at|after|before|around|since|until)\s+(.+)$/i.exec(text);
  const word = prefixed?.[1].toLowerCase();
  const minutes = minutesOf(prefixed ? prefixed[2] : text);
  if (minutes === null) return null;
  const mode: TimeMode =
    word === "after" || word === "since"
      ? "after"
      : word === "before" || word === "until"
        ? "before"
        : "at";
  return { mode, from: toInput(minutes) };
}

/** `19:00` -> `7:00 pm`, the way people write it in a question. */
export function formatClock(value: string): string {
  const [hours, minutes] = value.split(":").map(Number);
  const half = hours >= 12 ? "pm" : "am";
  return `${hours % 12 || 12}:${pad(minutes)} ${half}`;
}

/** The words the query gets for a filter: "at 7:00 pm", "between 7:00 pm and 9:00 pm". */
export function describeTime(filter: TimeFilter): string {
  if (filter.mode === "between" && filter.to) {
    return `between ${formatClock(filter.from)} and ${formatClock(filter.to)}`;
  }
  return `${filter.mode === "between" ? "at" : filter.mode} ${formatClock(filter.from)}`;
}

/** Tidy the spaces an edit leaves behind, without touching the rest of the text. */
function tidy(query: string): string {
  return query
    .replace(/ {2,}/g, " ")
    .replace(/ +([?.!,:;])/g, "$1")
    .trim();
}

/** The query with its time set to `filter`: the time it names is replaced (never a
 *  second one added), or a new clause goes before any closing punctuation. */
export function withTime(query: string, filter: TimeFilter): string {
  const words = describeTime(filter);
  const found = findTime(query);
  if (found) {
    // Keep the capital of a time that opens the sentence ("At 7:00 pm, which…").
    const cased = /^[A-Z]/.test(found.text) ? words[0].toUpperCase() + words.slice(1) : words;
    return query.slice(0, found.start) + cased + query.slice(found.end);
  }

  const [, body, tail] = /^([\s\S]*?)\s*([?.!]*)\s*$/.exec(query) ?? ["", query, ""];
  return body ? `${body} ${words}${tail}` : `${words}${tail}`;
}

/** The query without the time it names, with its `at`/`between`/… word. */
export function withoutTime(query: string): string {
  const found = findTime(query);
  if (!found) return query;
  return tidy(query.slice(0, found.start) + query.slice(found.end));
}
