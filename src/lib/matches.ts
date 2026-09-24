import type { Clip } from "@/types";

/** How many moments the Results strip shows — and the assistant answers from. */
export const TOP_MATCH_COUNT = 10;

/** Top matches by confidence, in chronological order (SPEC §2). The strip and the
 *  assistant's context share this, so the assistant answers about what's on screen. */
export function topMatches(clips: Clip[]): Clip[] {
  return [...clips]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, TOP_MATCH_COUNT)
    .sort((a, b) => a.order - b.order);
}
