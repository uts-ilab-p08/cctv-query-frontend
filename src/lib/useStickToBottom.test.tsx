import { act, fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, it } from "vitest";

import { useStickToBottom } from "./useStickToBottom";

/** jsdom has no layout: give the container fixed geometry, with a growing content height. */
function withGeometry(node: HTMLElement, content: { height: number }) {
  Object.defineProperty(node, "clientHeight", { configurable: true, value: 200 });
  Object.defineProperty(node, "scrollTop", { configurable: true, writable: true, value: 0 });
  Object.defineProperty(node, "scrollHeight", {
    configurable: true,
    get: () => content.height,
  });
}

function Thread({ lines, answerKey }: { lines: string[]; answerKey: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useStickToBottom(ref, answerKey);
  return (
    <div ref={ref} data-testid="thread">
      {lines.map((line, index) => (
        <p key={index}>{line}</p>
      ))}
    </div>
  );
}

/** MutationObserver callbacks run as microtasks. */
const flush = () => act(async () => {});

describe("useStickToBottom", () => {
  it("scrolls to the bottom when a new answer arrives", async () => {
    const content = { height: 400 };
    const { rerender } = render(<Thread lines={["q"]} answerKey={0} />);
    const thread = screen.getByTestId("thread");
    withGeometry(thread, content);

    content.height = 900;
    rerender(<Thread lines={["q", "answer"]} answerKey={1} />);
    await flush();

    expect(thread.scrollTop).toBe(900);
  });

  it("follows the answer as it grows, e.g. while it streams", async () => {
    const content = { height: 400 };
    const { rerender } = render(<Thread lines={["q", "a"]} answerKey={1} />);
    const thread = screen.getByTestId("thread");
    withGeometry(thread, content);
    thread.scrollTop = 200; // at the bottom: 400 - 200

    content.height = 700;
    rerender(<Thread lines={["q", "a longer"]} answerKey={1} />);
    await flush();

    expect(thread.scrollTop).toBe(700);
  });

  it("leaves the reader where they are after they scroll up", async () => {
    const content = { height: 900 };
    const { rerender } = render(<Thread lines={["q", "a"]} answerKey={1} />);
    const thread = screen.getByTestId("thread");
    withGeometry(thread, content);
    thread.scrollTop = 100; // reading older messages, far from the bottom
    fireEvent.scroll(thread);

    content.height = 1_200;
    rerender(<Thread lines={["q", "a", "more"]} answerKey={1} />);
    await flush();

    expect(thread.scrollTop).toBe(100);
  });

  it("brings the reader back down for the next answer", async () => {
    const content = { height: 900 };
    const { rerender } = render(<Thread lines={["q", "a"]} answerKey={1} />);
    const thread = screen.getByTestId("thread");
    withGeometry(thread, content);
    thread.scrollTop = 100;
    fireEvent.scroll(thread);

    content.height = 1_400;
    rerender(<Thread lines={["q", "a", "q2", "a2"]} answerKey={2} />);
    await flush();

    expect(thread.scrollTop).toBe(1_400);
  });
});
