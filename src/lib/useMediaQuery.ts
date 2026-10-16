import { useCallback, useSyncExternalStore } from "react";

/** Below Tailwind's `md` breakpoint: the sidebar becomes a drawer. */
export const SMALL_SCREEN_QUERY = "(max-width: 767.98px)";

/** Without matchMedia (tests, very old browsers) nothing matches. */
const listFor = (query: string): MediaQueryList | null =>
  typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia(query)
    : null;

/**
 * Whether a CSS media query matches, kept in sync as the window resizes.
 * The server render (and the first client render) assume it does not match.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = listFor(query);
      list?.addEventListener?.("change", onChange);
      return () => list?.removeEventListener?.("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => listFor(query)?.matches ?? false,
    () => false,
  );
}
