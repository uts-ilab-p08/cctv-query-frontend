// Cameras live in the query text itself: the RAG reads "on cameras G328, G420" and
// searches only those, so there is no separate camera filter to send. Pure helpers to
// read, add and remove camera codes in that text.

/** A MEVA camera code: `G` and two to four digits (`G328`). */
export const CAMERA_CODE_SOURCE = String.raw`\bG\d{2,4}\b`;

/** `on`/`in`/… `the` `camera(s)` right before a code — the clause the picker writes. */
const CLAUSE_PREFIX = String.raw`(?:\b(?:in|on|from|at|across)\s+)?(?:the\s+)?\bcameras?\s+`;

/** Separator before a code inside a list: `, `, `, and ` or ` and `. */
const SEPARATOR_BEFORE = /(?:\s*,\s*(?:and\s+)?|\s+and\s+)$/i;
/** Separator after a code inside a list. */
const SEPARATOR_AFTER = /^(?:\s*,\s*(?:and\s+)?|\s+and\s+)/i;

interface CodeMatch {
  code: string;
  start: number;
  end: number;
}

function findCodes(query: string): CodeMatch[] {
  return [...query.matchAll(new RegExp(CAMERA_CODE_SOURCE, "gi"))].map((m) => ({
    code: m[0].toUpperCase(),
    start: m.index,
    end: m.index + m[0].length,
  }));
}

/** The camera codes named in the query: unique, upper-cased, in order of appearance. */
export function camerasInQuery(query: string): string[] {
  return [...new Set(findCodes(query).map((match) => match.code))];
}

/** Tidy the spaces an edit leaves behind, without touching the rest of the text. */
export function tidy(query: string): string {
  return query
    .replace(/ {2,}/g, " ")
    .replace(/ +([?.!,:;])/g, "$1")
    .trim();
}

/** `camera ` ↔ `cameras ` right before the first code, to match how many are listed. */
function agreeClause(query: string): string {
  const codes = findCodes(query);
  if (codes.length === 0) return query;
  const before = query.slice(0, codes[0].start);
  const plural = new Set(codes.map((match) => match.code)).size > 1;
  const fixed = plural
    ? before.replace(/\b(c)amera(\s+)$/i, "$1ameras$2")
    : before.replace(/\b(c)ameras(\s+)$/i, "$1amera$2");
  return fixed + query.slice(codes[0].start);
}

/** The query with `code` added: after the cameras it already names, or as a new
 *  `on camera …` clause before any closing punctuation. */
export function withCamera(query: string, code: string): string {
  const upper = code.toUpperCase();
  const codes = findCodes(query);
  if (codes.some((match) => match.code === upper)) return query;

  if (codes.length === 0) {
    const [, body, tail] = /^([\s\S]*?)\s*([?.!]*)\s*$/.exec(query) ?? ["", query, ""];
    return body ? `${body} on camera ${upper}${tail}` : `on camera ${upper}${tail}`;
  }

  const last = codes[codes.length - 1];
  return agreeClause(`${query.slice(0, last.end)}, ${upper}${query.slice(last.end)}`);
}

/** The query with `code` removed: with its list separator while other cameras remain,
 *  or with its whole `on camera …` clause when it was the only one. */
export function withoutCamera(query: string, code: string): string {
  const upper = code.toUpperCase();
  const codes = findCodes(query);
  if (!codes.some((match) => match.code === upper)) return query;

  if (codes.every((match) => match.code === upper)) {
    const clause = new RegExp(String.raw`\s*${CLAUSE_PREFIX}${upper}\b,?|\s*\b${upper}\b`, "gi");
    return tidy(query.replace(clause, ""));
  }

  let text = query;
  // Right to left, so earlier offsets stay valid as later codes are cut out.
  for (const match of [...codes].reverse()) {
    if (match.code !== upper) continue;
    const before = text.slice(0, match.start);
    const after = text.slice(match.end);
    const sepBefore = SEPARATOR_BEFORE.exec(before);
    const sepAfter = SEPARATOR_AFTER.exec(after);
    if (sepBefore) text = before.slice(0, sepBefore.index) + after;
    else if (sepAfter) text = before + after.slice(sepAfter[0].length);
    else text = before + after;
  }
  return tidy(agreeClause(text));
}
