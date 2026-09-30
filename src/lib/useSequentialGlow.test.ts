import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GLOW_LAP_MS, useSequentialGlow } from "./useSequentialGlow";

function mockReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: query.includes("no-preference") ? !reduce : reduce,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

describe("useSequentialGlow", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("glows one item at a time, moving on after each lap and wrapping around", () => {
    mockReducedMotion(false);
    const { result } = renderHook(() => useSequentialGlow(3));

    expect(result.current).toBe(0);
    act(() => vi.advanceTimersByTime(GLOW_LAP_MS));
    expect(result.current).toBe(1);
    act(() => vi.advanceTimersByTime(GLOW_LAP_MS));
    expect(result.current).toBe(2);
    act(() => vi.advanceTimersByTime(GLOW_LAP_MS));
    expect(result.current).toBe(0);
  });

  it("starts again from the first item when the list changes", () => {
    mockReducedMotion(false);
    const { result, rerender } = renderHook(({ count }) => useSequentialGlow(count), {
      initialProps: { count: 3 },
    });
    act(() => vi.advanceTimersByTime(GLOW_LAP_MS));
    expect(result.current).toBe(1);

    rerender({ count: 2 });

    expect(result.current).toBe(0);
  });

  it("glows nothing when there is nothing to glow", () => {
    mockReducedMotion(false);
    const { result } = renderHook(() => useSequentialGlow(0));

    expect(result.current).toBeNull();
  });

  it("glows nothing for users who prefer reduced motion", () => {
    mockReducedMotion(true);
    const { result } = renderHook(() => useSequentialGlow(3));

    expect(result.current).toBeNull();
    act(() => vi.advanceTimersByTime(GLOW_LAP_MS * 2));
    expect(result.current).toBeNull();
  });
});
