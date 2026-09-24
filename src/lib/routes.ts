/**
 * Results URL for a search. The query rides in `?q=` so a refresh, a shared link
 * or back/forward can re-run it — the store alone is lost on reload.
 */
export function resultsHref(query: string): string {
  const trimmed = query.trim();
  return trimmed ? `/results?${new URLSearchParams({ q: trimmed })}` : "/results";
}
