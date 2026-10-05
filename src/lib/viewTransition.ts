import { prefersMotion } from "@/lib/motion";

/**
 * `view-transition-name` of the query box, the one element that morphs between screens:
 * Home's search field, Results' YOUR QUERY box and the New Query dialog's field. Only one
 * of them may carry it at a time, or the browser skips the transition.
 */
export const QUERY_BOX_TRANSITION = "query-box";

/** Longest a navigation keeps the old screen frozen while the next one loads. */
export const NAVIGATION_TIMEOUT_MS = 1200;

const canTransition = () =>
  typeof document !== "undefined" &&
  typeof document.startViewTransition === "function" &&
  prefersMotion();

/**
 * Runs a synchronous DOM update (wrap React state in `flushSync`) as a view transition, so
 * elements sharing a `view-transition-name` morph from their old place to the new one.
 * Without the API, or with reduced motion, the update just applies.
 */
export function withViewTransition(update: () => void): void {
  if (!canTransition()) {
    update();
    return;
  }
  document.startViewTransition(update);
}

/** Ends the pending navigation's transition; set while one is in flight. */
let finishNavigation: (() => void) | null = null;

/**
 * `router.push` as a view transition. The App Router doesn't say when the new page is on
 * screen, so the transition stays open until that page calls `markTransitionTarget`, or
 * `NAVIGATION_TIMEOUT_MS` passes: the screen is frozen meanwhile, so never longer.
 */
export function navigateWithTransition(router: { push: (href: string) => void }, href: string) {
  if (!canTransition()) {
    router.push(href);
    return;
  }
  document.startViewTransition(
    () =>
      new Promise<void>((resolve) => {
        const timeout = setTimeout(done, NAVIGATION_TIMEOUT_MS);
        function done() {
          clearTimeout(timeout);
          finishNavigation = null;
          resolve();
        }
        finishNavigation = done;
        router.push(href);
      }),
  );
}

/** Called by a transition's target page once it has rendered (from a layout effect). */
export function markTransitionTarget(): void {
  finishNavigation?.();
}
