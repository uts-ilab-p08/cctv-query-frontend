import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useLatchedSuggestions } from "./useLatchedSuggestions";

type Props = { current: string[]; refreshing: boolean };
const setup = (initialProps: Props) =>
  renderHook(({ current, refreshing }: Props) => useLatchedSuggestions(current, refreshing), {
    initialProps,
  });

describe("useLatchedSuggestions", () => {
  it("asks for a placeholder on the very first load, when nothing was shown yet", () => {
    const { result } = setup({ current: [], refreshing: true });
    expect(result.current).toEqual({ questions: [], stale: false, firstLoad: true });
  });

  it("shows the questions it has", () => {
    const { result } = setup({ current: ["A?", "B?"], refreshing: false });
    expect(result.current).toEqual({ questions: ["A?", "B?"], stale: false, firstLoad: false });
  });

  it("keeps the questions on screen while new ones load, marked stale", () => {
    const { result, rerender } = setup({ current: ["A?", "B?"], refreshing: false });

    rerender({ current: [], refreshing: true });

    expect(result.current).toEqual({ questions: ["A?", "B?"], stale: true, firstLoad: false });
  });

  it("swaps in the new questions once they arrive", () => {
    const { result, rerender } = setup({ current: ["A?"], refreshing: false });
    rerender({ current: [], refreshing: true });

    rerender({ current: ["C?", "D?"], refreshing: false });

    expect(result.current).toEqual({ questions: ["C?", "D?"], stale: false, firstLoad: false });
  });

  it("shows nothing when the new answer has no questions, and forgets the old ones", () => {
    const { result, rerender } = setup({ current: ["A?"], refreshing: false });
    rerender({ current: [], refreshing: false });
    expect(result.current.questions).toEqual([]);

    rerender({ current: [], refreshing: true });
    expect(result.current).toEqual({ questions: [], stale: false, firstLoad: true });
  });
});
