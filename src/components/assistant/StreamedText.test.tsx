import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { StreamedText } from "@/components/assistant/StreamedText";

const ANSWER = "Two vehicles entered through the north gate before noon.";

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

/** What a sighted user sees: the part of the text not hidden from assistive tech. */
const visibleText = (container: HTMLElement) =>
  container.querySelector("[data-streamed-visible]")?.textContent ?? container.textContent;

describe("StreamedText", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("reveals the text word by word, then shows it whole", () => {
    mockReducedMotion(false);
    const { container } = render(<StreamedText text={ANSWER} />);

    expect(visibleText(container)).not.toBe(ANSWER);

    act(() => vi.advanceTimersByTime(100));
    const partial = visibleText(container) ?? "";
    expect(partial.length).toBeGreaterThan(0);
    expect(ANSWER.startsWith(partial.trimEnd())).toBe(true);

    act(() => vi.advanceTimersByTime(5_000));
    expect(container).toHaveTextContent(ANSWER);
    expect(container.querySelector("[data-streamed-visible]")).toBeNull();
  });

  it("gives screen readers the whole answer at once, not every partial update", () => {
    mockReducedMotion(false);
    render(<StreamedText text={ANSWER} />);

    expect(screen.getByText(ANSWER)).toHaveClass("sr-only");
  });

  it("shows the text at once when the user prefers reduced motion", () => {
    mockReducedMotion(true);
    const { container } = render(<StreamedText text={ANSWER} />);

    expect(container).toHaveTextContent(ANSWER);
    expect(container.querySelector("[data-streamed-visible]")).toBeNull();
  });

  it("does not replay a text it already streamed when it mounts again", () => {
    mockReducedMotion(false);
    const message = { text: ANSWER };
    const first = render(<StreamedText text={message.text} streamKey={message} />);
    act(() => vi.advanceTimersByTime(5_000));
    first.unmount();

    const { container } = render(<StreamedText text={message.text} streamKey={message} />);

    expect(container).toHaveTextContent(ANSWER);
    expect(container.querySelector("[data-streamed-visible]")).toBeNull();
  });
});
