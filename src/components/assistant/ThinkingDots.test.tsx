import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ThinkingDots } from "@/components/assistant/ThinkingDots";

describe("ThinkingDots", () => {
  it("runs a visible wave: three accent dots, each starting a beat after the last", () => {
    render(<ThinkingDots />);

    const dots = [
      ...screen
        .getByRole("status", { name: "Assistant is thinking" })
        .querySelectorAll(".thinking-dot"),
    ] as HTMLElement[];
    expect(dots).toHaveLength(3);
    dots.forEach((dot) => expect(dot).toHaveClass("bg-accent-strong", "size-2"));
    const delays = dots.map((dot) => dot.style.animationDelay);
    expect(new Set(delays).size).toBe(3);
  });

  it("names the step the assistant is on", () => {
    render(<ThinkingDots label="Generating answer…" />);

    expect(
      screen.getByRole("status", { name: "Assistant is thinking: Generating answer…" }),
    ).toHaveTextContent("Generating answer…");
  });
});
