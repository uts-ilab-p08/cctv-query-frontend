import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  NAVIGATION_TIMEOUT_MS,
  markTransitionTarget,
  navigateWithTransition,
  withViewTransition,
} from "./viewTransition";

/** A browser with the View Transitions API, recording the update it was handed. */
function supportTransitions() {
  const updates: Array<() => unknown> = [];
  document.startViewTransition = vi.fn((update: () => unknown) => {
    updates.push(update);
    return {} as ViewTransition;
  }) as unknown as typeof document.startViewTransition;
  return updates;
}

function prefersMotion(allowed: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({ matches: allowed }) as typeof window.matchMedia;
}

describe("withViewTransition", () => {
  afterEach(() => {
    delete (document as Partial<Document>).startViewTransition;
    delete (window as Partial<Window>).matchMedia;
  });

  it("just applies the update in a browser without the API", () => {
    const update = vi.fn();

    withViewTransition(update);

    expect(update).toHaveBeenCalledTimes(1);
  });

  it("just applies the update when the user asked for reduced motion", () => {
    supportTransitions();
    prefersMotion(false);
    const update = vi.fn();

    withViewTransition(update);

    expect(update).toHaveBeenCalledTimes(1);
    expect(document.startViewTransition).not.toHaveBeenCalled();
  });

  it("hands the update to the browser's view transition otherwise", () => {
    const updates = supportTransitions();
    prefersMotion(true);
    const update = vi.fn();

    withViewTransition(update);
    expect(update).not.toHaveBeenCalled();
    updates[0]();

    expect(update).toHaveBeenCalledTimes(1);
  });
});

describe("navigateWithTransition", () => {
  const router = { push: vi.fn() };

  beforeEach(() => {
    vi.useFakeTimers();
    router.push.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (document as Partial<Document>).startViewTransition;
    delete (window as Partial<Window>).matchMedia;
  });

  it("just navigates in a browser without the API", () => {
    navigateWithTransition(router, "/results?q=red+car");

    expect(router.push).toHaveBeenCalledWith("/results?q=red+car");
  });

  it("holds the transition open until the target page has rendered", async () => {
    const updates = supportTransitions();
    prefersMotion(true);
    navigateWithTransition(router, "/results?q=red+car");

    let settled = false;
    void Promise.resolve(updates[0]()).then(() => (settled = true));
    expect(router.push).toHaveBeenCalledWith("/results?q=red+car");
    await vi.advanceTimersByTimeAsync(100);
    expect(settled).toBe(false);

    markTransitionTarget();
    await vi.advanceTimersByTimeAsync(0);
    expect(settled).toBe(true);
  });

  it("lets go after a while when the page is slow, rather than freeze the screen", async () => {
    const updates = supportTransitions();
    prefersMotion(true);
    navigateWithTransition(router, "/results?q=red+car");

    let settled = false;
    void Promise.resolve(updates[0]()).then(() => (settled = true));
    await vi.advanceTimersByTimeAsync(NAVIGATION_TIMEOUT_MS);

    expect(settled).toBe(true);
  });
});
