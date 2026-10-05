/**
 * The RAG cites its sources inline as `[1]`, `[2]` or `[1, 3]`, numbered in the order
 * `/search` returns them (see `Clip.ref`). These helpers find those citations and turn
 * them into links the chat renders as source chips.
 */

/** Inline code spans and markdown links: citation-looking text inside them isn't one. */
const SKIPPED = /`[^`]*`|\[[^\]]*\]\([^)]*\)/g;
/** `[1]` or `[1, 3]`, not followed by `(` (which would make it a link). */
const CITATION = /\[(\d+(?:\s*,\s*\d+)*)\](?!\()/g;

/** Run `replace` over the text outside code spans and links. */
export function outsideSkipped(text: string, replace: (segment: string) => string): string {
  let result = "";
  let last = 0;
  for (const match of text.matchAll(SKIPPED)) {
    result += replace(text.slice(last, match.index)) + match[0];
    last = match.index + match[0].length;
  }
  return result + replace(text.slice(last));
}

const numbers = (group: string) =>
  group
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);

/** Every source the text cites, once each, in the order it is first cited. */
export function citedRefs(text: string): number[] {
  const refs: number[] = [];
  outsideSkipped(text, (segment) => {
    for (const match of segment.matchAll(CITATION)) {
      for (const n of numbers(match[1])) if (!refs.includes(n)) refs.push(n);
    }
    return segment;
  });
  return refs;
}

/** `[1, 3]` → `[1](#cite-1)[3](#cite-3)`, for `ChatMarkdown` to render as chips. */
export function linkCitations(text: string): string {
  return outsideSkipped(text, (segment) =>
    segment.replace(CITATION, (_, group: string) =>
      numbers(group)
        .map((n) => `[${n}](#cite-${n})`)
        .join(""),
    ),
  );
}

/** The ref a `linkCitations` link points at, or null for any other link. */
export function citationRef(href: string | undefined): number | null {
  const match = href?.match(/^#cite-(\d+)$/);
  return match ? Number(match[1]) : null;
}
