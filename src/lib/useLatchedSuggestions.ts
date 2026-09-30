import { useState } from "react";

const sameList = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((item, i) => item === b[i]);

export interface LatchedSuggestions {
  /** What to draw: the current questions, or the last ones while new ones load. */
  questions: readonly string[];
  /** The questions are the previous ones, kept while the next request is in flight. */
  stale: boolean;
  /** Loading with nothing drawn yet: show a placeholder. */
  firstLoad: boolean;
}

/**
 * Suggested questions that don't blink: once some are drawn, they stay on screen while the
 * next ones load (a new context's opening questions, or an answer's follow-ups) and are
 * only replaced when the response arrives. Only the very first load gets a placeholder.
 * A response with no questions clears them.
 */
export function useLatchedSuggestions(
  current: readonly string[],
  refreshing: boolean,
): LatchedSuggestions {
  const [latched, setLatched] = useState<readonly string[]>(current);

  // Derived state, updated during render (React's documented pattern), so there is never
  // a frame showing nothing between the old questions and the new ones.
  if (current.length > 0 && !sameList(current, latched)) setLatched(current);
  if (current.length === 0 && !refreshing && latched.length > 0) setLatched([]);

  if (current.length > 0) return { questions: current, stale: false, firstLoad: false };
  if (refreshing && latched.length > 0)
    return { questions: latched, stale: true, firstLoad: false };
  return { questions: [], stale: false, firstLoad: refreshing };
}
